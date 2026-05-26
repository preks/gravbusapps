import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  AgentChunkEvent,
  AgentStreamEvent,
  ChatMessage,
  DeepAgentSession,
  MessageAttachmentRef,
  PlanItem,
  PlanItemStatus,
  SessionConfig,
  SkillLoadedEvent,
  StartSessionResponse
} from '../types/enterpriseAgent'
import { useEnterpriseAgentClient } from './useEnterpriseAgentClient'
import { useFlowBotFabricClient } from './useFlowBotFabricClient'
import { useSessionStream } from './useSessionStream'
import { sessionToMessages } from '../utils/messageUtils'
import { isFlowBotFabricRuntime } from '../utils/fabricRuntime'

export interface ActiveSkillInfo {
  skill_id: string
  name: string
  category: string
  description: string
  icon?: string
  was_auto_detected: boolean
  version?: number
  published_version?: number | null
  current_version?: number
}

const POLL_INTERVAL_MS = 3000
/** Sparse safety-net poll when SSE is healthy. The BE now supports ETag /
 *  304 on this endpoint so polling is cheap; we keep just enough to catch a
 *  missed terminal event without re-introducing the request storm. */
const POLL_WHILE_SSE_MS = 15000
const REST_SYNC_MAX_MS = 4000
const REST_SYNC_INTERVAL_MS = 120

/**
 * Per-session cache of volatile UI state — kept alive across tab switches so
 * returning to a session re-hydrates its running flag / optimistic messages
 * / active skill instead of flashing an empty shell. The SSE buffer lives in
 * `sessionStreamRegistry`; this cache mirrors the bits that `useAgentSession`
 * owns in local state.
 *
 * Entries are trimmed to keep memory bounded (LRU over MAX_CACHE sessions).
 */
interface SessionUiStateCache {
  session: DeepAgentSession | null
  isAgentRunning: boolean
  optimisticMessages: ChatMessage[]
  activeSkill: ActiveSkillInfo | null
  lastReplyTimestamp: number
  processedTerminalAt: number
  lastAccess: number
}
const MAX_SESSION_UI_CACHE = 16
const sessionUiStateCache = new Map<string, SessionUiStateCache>()

interface AgentExecutionClient {
  startSession: (
    task: string,
    config?: SessionConfig,
    activeExternalConnectionIds?: string[],
    activeEnterpriseSkillId?: string,
    fallbackSkillId?: string
  ) => Promise<StartSessionResponse>
  activateSession: (sessionId: string) => Promise<StartSessionResponse>
  getSession: (sessionId: string) => Promise<DeepAgentSession>
  replyToInterrupt: (
    sessionId: string,
    message?: string,
    structuredInput?: Record<string, any>,
    attachmentRefs?: Array<{ id: string; name: string; mime_type: string; size: number; indexing_status?: string }>
  ) => Promise<unknown>
}

const readSessionUiCache = (sessionId: string | null): SessionUiStateCache | null => {
  if (!sessionId) return null
  const cached = sessionUiStateCache.get(sessionId)
  if (cached) cached.lastAccess = Date.now()
  return cached ?? null
}

const writeSessionUiCache = (sessionId: string | null, patch: Partial<SessionUiStateCache>): void => {
  if (!sessionId) return
  const existing = sessionUiStateCache.get(sessionId)
  const merged: SessionUiStateCache = {
    session: null,
    isAgentRunning: false,
    optimisticMessages: [],
    activeSkill: null,
    lastReplyTimestamp: 0,
    processedTerminalAt: -1,
    lastAccess: Date.now(),
    ...existing,
    ...patch
  }
  sessionUiStateCache.set(sessionId, merged)
  if (sessionUiStateCache.size > MAX_SESSION_UI_CACHE) {
    const sorted = Array.from(sessionUiStateCache.entries()).sort((a, b) => a[1].lastAccess - b[1].lastAccess)
    while (sessionUiStateCache.size > MAX_SESSION_UI_CACHE && sorted.length > 0) {
      const [oldestId] = sorted.shift()!
      if (oldestId !== sessionId) sessionUiStateCache.delete(oldestId)
    }
  }
}

const isTerminalStatus = (status: string) => status !== 'running' && status !== 'pending'

/** Last terminal status in the event stream (same overlay rule as mergedSession). */
const streamOverlayTerminalStatus = (events: AgentStreamEvent[]): string | null => {
  let status: string | null = null
  for (const ev of events) {
    if (ev.type === 'terminal') status = ev.status
  }
  return status
}

async function waitForRestSyncWithWaitingHumanStream(
  eventsSnapshot: AgentStreamEvent[],
  readRestStatus: () => DeepAgentSession['status'] | undefined,
  fetchSession: () => Promise<DeepAgentSession | null>
): Promise<void> {
  const overlay = streamOverlayTerminalStatus(eventsSnapshot)
  if (overlay !== 'waiting_for_human' || readRestStatus() !== 'running') return
  const deadline = Date.now() + REST_SYNC_MAX_MS
  while (Date.now() < deadline) {
    await fetchSession()
    const st = readRestStatus()
    if (st === 'waiting_for_human') break
    if (st !== 'running') break
    await new Promise(r => setTimeout(r, REST_SYNC_INTERVAL_MS))
  }
}

async function postInterruptWith409Retry(
  postInterrupt: () => Promise<unknown>,
  fetchSession: () => Promise<DeepAgentSession | null>
): Promise<void> {
  let attempts = 0
  while (true) {
    try {
      await postInterrupt()
      return
    } catch (error) {
      const msg = error instanceof Error ? error.message : ''
      const isConflict = /409/.test(msg) && /Session is still running|waiting_for_human/i.test(msg)
      if (isConflict && attempts < 1) {
        attempts++
        await fetchSession()
        await new Promise(r => setTimeout(r, REST_SYNC_INTERVAL_MS))
        continue
      }
      throw error
    }
  }
}

const toEpoch = (timestamp: string): number => {
  const parsed = Date.parse(timestamp)
  return Number.isNaN(parsed) ? 0 : parsed
}

function epochFromStreamEvent(event: AgentStreamEvent): number | null {
  if (!('timestamp' in event) || typeof event.timestamp !== 'string') {
    return null
  }
  return toEpoch(event.timestamp)
}

const currentTurnTrace = (events: AgentStreamEvent[]): AgentStreamEvent[] => {
  if (events.length === 0) return events

  let latestHumanSeq = -1
  for (const event of events) {
    if (event.type === 'agent_chunk' && event.role === 'human' && typeof event.seq === 'number') {
      latestHumanSeq = Math.max(latestHumanSeq, event.seq)
    }
  }

  if (latestHumanSeq < 0) return events
  return events.filter(event => !('seq' in event) || typeof event.seq !== 'number' || event.seq >= latestHumanSeq)
}

const chunkStreamKey = (chunk: AgentChunkEvent): string | null => {
  const raw = chunk.metadata?.stream_key
  return typeof raw === 'string' && raw.trim().length > 0 ? raw : null
}

const looksLikeDashboardJson = (content: string): boolean => {
  const trimmed = content.trimStart()
  if (!trimmed.startsWith('{')) return false
  return trimmed.includes('"sections"') || trimmed.includes('"chartType"') || /^\{"title"\s*:\s*"/.test(trimmed)
}

const INTERNAL_ERROR_MARKERS: readonly string[] = [
  "client error '400",
  "client error '401",
  "client error '403",
  "client error '404",
  "client error '500",
  "client error '502",
  "client error '503",
  "client error '504",
  'for more information check: https://developer.mozilla.org/',
  'flow engine http error',
  'functions service call failed',
  'promptodm lookup failed',
  'traceback (most recent call last)',
  'exception:',
  'error:'
]

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
// Bounded quantifiers prevent catastrophic backtracking on malicious input.
const EMAIL_RE = /[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{1,64}/
const STACK_FRAME_RE = /(?:^|\n)[ \t]{1,8}at[ \t]{1,4}\S{1,256}/

/**
 * Returns true when the string clearly contains raw internals (JSON payload,
 * UUID, email, stack frame, internal error blob, or anything implausibly long
 * for a status line). Used to keep tool payloads, IDs, and errors out of the
 * fading status pill, activity ticker, and agent thinking stream.
 */
export const looksLikeRawPayload = (content: string, maxLen = 200): boolean => {
  if (!content) return false
  const trimmed = content.trim()
  if (!trimmed) return false
  if (trimmed.length > maxLen) return true
  const first = trimmed.charAt(0)
  if (first === '{' || first === '[' || first === '<') return true
  if (UUID_RE.test(trimmed)) return true
  if (EMAIL_RE.test(trimmed)) return true
  if (STACK_FRAME_RE.test(trimmed)) return true
  const normalized = trimmed.toLowerCase()
  for (const marker of INTERNAL_ERROR_MARKERS) {
    if (normalized.includes(marker)) return true
  }
  return false
}

// The narrow legacy predicate is kept for the final-answer stream, which can
// legitimately be long and may contain quoted JSON-looking snippets. It only
// blocks recognised HTTP / internal error blobs.
const looksLikeInternalErrorLeak = (content: string): boolean => {
  if (!content) return false
  const normalized = content.toLowerCase()
  for (const marker of INTERNAL_ERROR_MARKERS) {
    if (normalized.includes(marker)) return true
  }
  return false
}

function sessionTraceOrEmpty(mergedSession: DeepAgentSession | null | undefined): AgentStreamEvent[] {
  return mergedSession?.trace ?? []
}

const humanizeActivityIdentifier = (raw: string): string => {
  const trimmed = raw.trim().replace(/^newwork[_-]/i, '')
  if (!trimmed) return raw.trim()
  const spaced = trimmed
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
  if (!spaced) return raw.trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

const findTurnStartEpoch = (events: AgentStreamEvent[]): number => {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const e = events[i]
    if (e.type === 'agent_chunk' && e.role === 'human') return toEpoch(e.timestamp)
  }
  return 0
}

const isResponseStreamStart = (e: AgentStreamEvent): boolean =>
  e.type === 'agent_chunk' && e.role === 'ai' && e.chunk_kind === 'response_stream'

const stepStartedActivityText = (e: AgentStreamEvent): string | null => {
  if (e.type !== 'step_started') return null
  const stepType = (e as { step_type?: string }).step_type
  if (stepType === 'thinking') return 'Thinking through the next step'
  const name = (e as { name?: string }).name
  if (!name) return null
  const friendly = humanizeActivityIdentifier(name)
  return stepType === 'subagent' ? `Delegating to ${friendly}` : `Calling ${friendly}`
}

const eventActivityText = (e: AgentStreamEvent): string | null => {
  let raw: string | null = null
  if (e.type === 'agent_chunk' && (e.chunk_kind === 'status' || e.chunk_kind === 'live_status')) {
    raw = e.content ?? null
  } else if (e.type === 'step_started') {
    raw = stepStartedActivityText(e)
  } else if (e.type === 'expert_called') {
    const name = (e as { name?: string; expert_name?: string }).expert_name ?? (e as { name?: string }).name
    raw = name ? `Consulting ${humanizeActivityIdentifier(name)}` : null
  } else if (e.type === 'decision') {
    const title = (e as { title?: string }).title
    raw = title ?? null
  }

  if (!raw) return null
  // Defense in depth: even if the backend sanitizer slipped, never let raw
  // payloads / IDs / errors render in the activity ticker or status pill.
  if (looksLikeRawPayload(raw)) return null
  return raw
}

interface ActivityRow {
  ts: number
  text: string
}

interface CollectedActivity {
  rows: ActivityRow[]
  responseStarted: boolean
}

const collectAgentActivityRows = (events: AgentStreamEvent[], turnStartEpoch: number): CollectedActivity => {
  const rows: ActivityRow[] = []
  let responseStarted = false
  for (const e of events) {
    const tsRaw = (e as { timestamp?: string }).timestamp
    const ts = typeof tsRaw === 'string' ? toEpoch(tsRaw) : 0
    if (ts < turnStartEpoch) continue
    if (isResponseStreamStart(e)) {
      responseStarted = true
      continue
    }
    const text = eventActivityText(e)?.trim()
    if (!text || looksLikeRawPayload(text)) continue
    rows.push({ ts, text })
  }
  return { rows, responseStarted }
}

const dedupeConsecutive = (values: string[]): string[] => {
  const out: string[] = []
  for (const v of values) {
    if (out[out.length - 1] === v) continue
    out.push(v)
  }
  return out
}

const isTerminalSessionStatus = (status: DeepAgentSession['status'] | undefined): boolean =>
  status === 'completed' || status === 'failed' || status === 'cancelled'

function buildStreamingContentFromSnapshots(events: AgentStreamEvent[]): string | null {
  const responseSnapshots = events
    .filter(
      (entry): entry is AgentChunkEvent =>
        entry.type === 'agent_chunk' &&
        entry.role === 'ai' &&
        entry.chunk_kind === 'response_stream' &&
        typeof entry.content === 'string' &&
        entry.content.trim().length > 0
    )
    .sort((a, b) => toEpoch(a.timestamp) - toEpoch(b.timestamp))

  if (responseSnapshots.length === 0) {
    return null
  }

  const primarySnapshots = responseSnapshots.filter(snapshot => chunkStreamKey(snapshot) !== 'continuation')
  const preferredSnapshots = primarySnapshots.length > 0 ? primarySnapshots : responseSnapshots
  const safeSnapshots = preferredSnapshots.filter(snapshot => {
    const text = snapshot.content.trim()
    return !looksLikeInternalErrorLeak(text) && !looksLikeDashboardJson(text)
  })
  if (safeSnapshots.length === 0) {
    return ''
  }

  let stableContent = ''
  for (const snapshot of safeSnapshots) {
    const nextContent = snapshot.content.trim()
    if (!nextContent) continue
    if (!stableContent) {
      stableContent = nextContent
      continue
    }
    if (nextContent.length >= stableContent.length && nextContent.startsWith(stableContent)) {
      stableContent = nextContent
    }
  }

  return stableContent || safeSnapshots[safeSnapshots.length - 1].content.trim()
}

function buildStreamingContentFromLegacyThinking(events: AgentStreamEvent[]): string {
  const legacyThinking = events
    .filter(
      (entry): entry is AgentChunkEvent =>
        entry.type === 'agent_chunk' &&
        entry.role === 'ai' &&
        entry.chunk_kind === 'thinking' &&
        typeof entry.content === 'string' &&
        entry.content.trim().length > 0
    )
    .sort((a, b) => toEpoch(a.timestamp) - toEpoch(b.timestamp))

  if (legacyThinking.length === 0) {
    return ''
  }

  return legacyThinking
    .map(e => e.content.trim())
    .filter(Boolean)
    .join('\n\n')
}

function computeStreamingDisplayContent(
  liveTurnEvents: AgentStreamEvent[],
  lastReplyTimestamp: number,
  isAgentRunning: boolean,
  mergedStatus: DeepAgentSession['status'] | undefined
): string {
  const isActivelyRunning = isAgentRunning || mergedStatus === 'running' || mergedStatus === 'pending'
  if (!isActivelyRunning) {
    return ''
  }

  if (lastReplyTimestamp > 0) {
    const hasRecentEvents = liveTurnEvents.some(event => {
      const t = epochFromStreamEvent(event)
      return t !== null && t >= lastReplyTimestamp
    })
    if (!hasRecentEvents) {
      return ''
    }
  }

  const fromSnapshots = buildStreamingContentFromSnapshots(liveTurnEvents)
  if (fromSnapshots !== null) {
    if (looksLikeDashboardJson(fromSnapshots)) {
      return 'Generating chart…'
    }
    return fromSnapshots
  }

  return buildStreamingContentFromLegacyThinking(liveTurnEvents)
}

export const useAgentSession = (
  sessionId: string | null,
  accessToken: string,
  bootstrapSession?: DeepAgentSession | null
) => {
  const promptManagerClient = useEnterpriseAgentClient(accessToken)
  const flowBotClient = useFlowBotFabricClient(accessToken)
  const client: AgentExecutionClient = isFlowBotFabricRuntime() ? flowBotClient : promptManagerClient
  const [streamVersion, setStreamVersion] = useState(0)
  const { messages: streamMessages, events, isConnected } = useSessionStream(sessionId, accessToken, streamVersion)
  const initialCached = readSessionUiCache(sessionId)
  const [session, setSession] = useState<DeepAgentSession | null>(initialCached?.session ?? null)
  const [sessionLoadError, setSessionLoadError] = useState(false)
  // Tracks that a reply POST was sent and the agent is running, even before the stream delivers
  // new events. Terminal events clear this. Per-session state survives tab switches.
  const [isAgentRunning, setIsAgentRunning] = useState(initialCached?.isAgentRunning ?? false)
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>(initialCached?.optimisticMessages ?? [])
  const [activeSkill, setActiveSkill] = useState<ActiveSkillInfo | null>(initialCached?.activeSkill ?? null)
  // Tracks when a new reply was just sent to prevent showing stale streaming content
  const [lastReplyTimestamp, setLastReplyTimestamp] = useState<number>(initialCached?.lastReplyTimestamp ?? 0)

  const matchedBootstrapSession = useMemo(
    () => (bootstrapSession?.session_id === sessionId ? bootstrapSession : null),
    [bootstrapSession, sessionId]
  )

  const sessionRef = useRef<DeepAgentSession | null>(null)
  sessionRef.current = session ?? matchedBootstrapSession
  const eventsRef = useRef<AgentStreamEvent[]>([])
  eventsRef.current = events
  // Track the event count at which we last processed a terminal, so the
  // terminal-detection effect ignores stale terminals after events are cleared.
  const processedTerminalAtRef = useRef<number>(-1)
  // Accumulates blob preview URLs keyed by attachment ID across reply() calls.
  // Used to enrich trace messages so the optimistic → trace transition is
  // seamless: the ImageBlock keeps rendering from the blob URL rather than
  // starting a proxy fetch after the optimistic message is removed.
  const previewUrlByAttachmentId = useRef<Map<string, string>>(new Map())

  const fetchSession = useCallback(async () => {
    if (!sessionId) return null
    try {
      const s = await client.getSession(sessionId)
      setSessionLoadError(false)
      setSession(s)
      return s
    } catch {
      setSessionLoadError(true)
      return null
    }
  }, [sessionId, client])

  useEffect(() => {
    // Hydrate from per-session cache so switching back to an in-flight session
    // restores its running flag / optimistic messages instead of flashing empty.
    // Falls back to a clean slate for sessions we've never seen.
    const cached = readSessionUiCache(sessionId)
    setSession(cached?.session ?? null)
    setSessionLoadError(false)
    setIsAgentRunning(cached?.isAgentRunning ?? false)
    setOptimisticMessages(cached?.optimisticMessages ?? [])
    setActiveSkill(cached?.activeSkill ?? null)
    setLastReplyTimestamp(cached?.lastReplyTimestamp ?? 0)
    processedTerminalAtRef.current = cached?.processedTerminalAt ?? -1
    if (!sessionId) {
      setStreamVersion(0)
      return
    }
    fetchSession().catch(() => undefined)
  }, [sessionId, fetchSession])

  // Persist volatile UI state back to the cache whenever it changes, so a
  // subsequent switch back to this session re-hydrates correctly.
  useEffect(() => {
    if (!sessionId) return
    writeSessionUiCache(sessionId, {
      session,
      isAgentRunning,
      optimisticMessages,
      activeSkill,
      lastReplyTimestamp,
      processedTerminalAt: processedTerminalAtRef.current
    })
  }, [sessionId, session, isAgentRunning, optimisticMessages, activeSkill, lastReplyTimestamp])

  // Unified fallback poller.
  //
  // We used to run two concurrent setInterval timers here — a generic poll
  // and a separate "watchdog" while `isAgentRunning` — both hitting the
  // session trace endpoint. That produced thousands of requests per session
  // (visible in the network panel during long turns). Now we collapse them
  // into a single cadence:
  //
  //   • SSE disconnected        → 3s (so the UI still makes progress when
  //                                   the stream is down and we rely on REST)
  //   • SSE connected           → 15s (sparse safety net; terminal events
  //                                    and explicit fetchSession calls on
  //                                    SSE reconnect do the real work).
  //
  // The BE now supports ETag + If-None-Match on this endpoint, so even when
  // the poll fires there's minimal cost when nothing changed.
  useEffect(() => {
    if (!sessionId) return

    const intervalMs = isConnected ? POLL_WHILE_SSE_MS : POLL_INTERVAL_MS
    const timer = setInterval(async () => {
      const current = sessionRef.current
      if (!current) return
      if (isTerminalStatus(current.status)) {
        clearInterval(timer)
        return
      }
      const next = await fetchSession()
      if (next && isTerminalStatus(next.status)) {
        setIsAgentRunning(false)
        clearInterval(timer)
      }
    }, intervalMs)

    return () => clearInterval(timer)
  }, [sessionId, fetchSession, isConnected])

  useEffect(() => {
    if (events.length === 0) return
    const lastEvent = events[events.length - 1]
    if (lastEvent?.type !== 'terminal') return
    // Guard: only act on a terminal event if we haven't already processed one
    // at this exact events.length. This prevents stale terminals (carried over
    // from a previous turn before the events array is cleared) from
    // prematurely resetting isAgentRunning when fetchSession ref changes.
    if (processedTerminalAtRef.current === events.length) return
    processedTerminalAtRef.current = events.length
    setIsAgentRunning(false)
    fetchSession().catch(() => undefined)
  }, [events, fetchSession])

  useEffect(() => {
    if (streamMessages.length === 0) return
    const hasRealUserMessages = streamMessages.some(m => m.type === 'user_input' && !m.id.startsWith('optimistic-'))
    if (hasRealUserMessages) {
      setOptimisticMessages([])
    }
  }, [streamMessages])

  useEffect(() => {
    if (events.length === 0) return
    // Phase 3: prefer `skill_loaded` (body actually injected) but fall
    // back to `skill_scoped` (session-start intent) so the side panel
    // populates as soon as the run knows which skill is in play.
    const isSkillEvent = (e: (typeof events)[number]): e is SkillLoadedEvent =>
      e.type === 'skill_loaded' || e.type === 'skill_scoped'
    const loaded = events.find((e): e is SkillLoadedEvent => e.type === 'skill_loaded')
    const skillEvent = loaded ?? events.find(isSkillEvent)
    if (skillEvent?.skill) {
      setActiveSkill({
        skill_id: skillEvent.skill.skill_id,
        name: skillEvent.skill.name,
        category: skillEvent.skill.category,
        description: skillEvent.skill.description,
        icon: skillEvent.skill.icon,
        was_auto_detected: skillEvent.was_auto_detected,
        version: skillEvent.skill.version,
        published_version: skillEvent.skill.published_version,
        current_version: skillEvent.skill.current_version
      })
    }
  }, [events])

  // Clear lastReplyTimestamp once we receive fresh events from the new turn
  useEffect(() => {
    if (lastReplyTimestamp === 0 || events.length === 0) return

    const hasFreshEvents = events.some(event => {
      const eventTime = epochFromStreamEvent(event)
      return eventTime !== null && eventTime >= lastReplyTimestamp
    })

    if (hasFreshEvents) {
      setLastReplyTimestamp(0)
    }
  }, [events, lastReplyTimestamp])

  const mergedSession = useMemo((): DeepAgentSession | null => {
    const restSession = session ?? matchedBootstrapSession
    if (!restSession) return null

    // Carry the bootstrap's session_attachments through whenever the REST
    // session lacks them. Right after startSession the REST `getSession()`
    // call typically returns before the flushed uploads land in the
    // backend's session record, so its `session_attachments` is briefly
    // empty even though the bootstrap captured the user's snapshot
    // (including blob preview URLs). Without this carry-over the first
    // user_input bubble loses its attachment chips/image until the
    // backend catches up — exactly the optimistic-update bug.
    const bootstrapAttachments = matchedBootstrapSession?.session_attachments
    const restAttachments = session?.session_attachments
    const mergedAttachments =
      restAttachments && restAttachments.length > 0
        ? restAttachments
        : bootstrapAttachments && bootstrapAttachments.length > 0
          ? bootstrapAttachments
          : restAttachments

    // REST session status is AUTHORITATIVE for terminal states.
    // If REST says completed/failed/cancelled, that's the final answer.
    // SSE may have stale or intermediate terminal events (e.g. waiting_for_human)
    // that should not override a completed REST status.
    const restStatus = restSession.status
    const isRestTerminal = restStatus === 'completed' || restStatus === 'failed' || restStatus === 'cancelled'

    if (isRestTerminal) {
      return { ...restSession, session_attachments: mergedAttachments }
    }

    // For non-terminal REST status, SSE terminal events provide real-time updates
    let status: DeepAgentSession['status'] = restStatus
    for (const ev of events) {
      if (ev.type === 'terminal') status = ev.status
    }
    return { ...restSession, status, session_attachments: mergedAttachments }
  }, [session, matchedBootstrapSession, events])

  const messages: ChatMessage[] = useMemo(() => {
    // Production-grade approach: Server (REST session.trace) is the source of truth.
    // SSE streamMessages are ONLY used for real-time updates during active streaming.
    // Once the session reaches a terminal state, REST trace is authoritative.

    const restSession = session ?? matchedBootstrapSession
    const isRestTerminal = restSession && isTerminalStatus(restSession.status)

    // Get authoritative messages from REST session trace
    const rawTraceMessages = mergedSession ? sessionToMessages(mergedSession) : []

    // Re-hydrate attachment preview_urls from the in-session blob URL cache so
    // the ImageBlock can render from a local blob instead of kicking off a proxy
    // fetch after the optimistic message is removed. This is a ref read (not a
    // reactive dep) — the enrichment is applied whenever the memo re-runs for
    // other reasons (mergedSession update, optimisticMessages change, etc.).
    const cachedUrls = previewUrlByAttachmentId.current
    const traceMessages =
      cachedUrls.size > 0
        ? rawTraceMessages.map(msg => {
            if (!msg.attachments?.length) return msg
            let changed = false
            const enrichedAtts = msg.attachments.map(att => {
              if (att.preview_url) return att
              const url = cachedUrls.get(att.id)
              if (!url) return att
              changed = true
              return { ...att, preview_url: url }
            })
            return changed ? { ...msg, attachments: enrichedAtts } : msg
          })
        : rawTraceMessages

    if (isRestTerminal && !isAgentRunning) {
      // Session is complete - use REST trace as the single source of truth.
      // Trace is already in correct order from the server.
      return traceMessages
    }

    // Session is running - show REST trace + any SSE messages not yet in trace.
    // Dedupe strictly by stable ChatMessage.id (no fragile seq-suffix parsing —
    // many message types like expert_call / tool_call / tool_result use
    // step_id-based ids WITHOUT a trailing `:seq`, and the previous sort would
    // pull every such message to the bottom of the conversation regardless of
    // where it actually belonged, causing experts / tool calls to visually
    // "shift under" later user replies and appear duplicated above/below.
    //
    // Both `traceMessages` and `streamMessages` already come out of
    // `deriveMessagesFromEvents` in server/seq order, so preserving each
    // source's ordering and merging them is sufficient — no global re-sort.
    const traceIds = new Set(traceMessages.map(m => m.id))
    const newStreamMessages = streamMessages.filter(m => !traceIds.has(m.id))

    return [...traceMessages, ...newStreamMessages, ...optimisticMessages]
  }, [streamMessages, mergedSession, optimisticMessages, isAgentRunning, session, matchedBootstrapSession])

  const liveTurnEvents = useMemo(() => {
    if (events.length > 0) return currentTurnTrace(events)
    return currentTurnTrace(sessionTraceOrEmpty(mergedSession))
  }, [events, mergedSession])

  // Extract greeting from the ENTIRE session history, not just current turn
  // This ensures we only show one greeting at the very beginning
  const streamingGreeting = useMemo(() => {
    const allEvents = events.length > 0 ? events : sessionTraceOrEmpty(mergedSession)
    const greetingEvents = allEvents
      .filter(
        (entry): entry is AgentChunkEvent =>
          entry.type === 'agent_chunk' &&
          entry.role === 'ai' &&
          entry.chunk_kind === 'final' &&
          typeof entry.content === 'string' &&
          entry.content.trim().length > 0
      )
      .sort((a, b) => toEpoch(a.timestamp) - toEpoch(b.timestamp))

    // Only return the FIRST greeting ever, not per-turn
    return greetingEvents[0]?.content.trim() ?? ''
  }, [events, mergedSession])

  const streamingContent = useMemo(
    () => computeStreamingDisplayContent(liveTurnEvents, lastReplyTimestamp, isAgentRunning, mergedSession?.status),
    [isAgentRunning, liveTurnEvents, mergedSession?.status, lastReplyTimestamp]
  )

  // Extract agent reasoning/thinking from ALL session events (not filtered by turn)
  // This ensures thinking is visible even after human-in-the-loop replies
  const streamingThinking = useMemo(() => {
    // Show thinking during active sessions, but also keep it visible briefly after completion
    const allEvents = events.length > 0 ? events : sessionTraceOrEmpty(mergedSession)
    const thinkingSnapshots = allEvents
      .filter(
        (entry): entry is AgentChunkEvent =>
          entry.type === 'agent_chunk' &&
          entry.role === 'ai' &&
          entry.chunk_kind === 'agent_reasoning' &&
          typeof entry.content === 'string' &&
          entry.content.trim().length > 0
      )
      // Reasoning can legitimately be long; gate only on payload-shape markers
      // (JSON / UUID / email / stack frame / internal error) so a leaked tool
      // body never renders as the agent's thinking.
      .filter(entry => !looksLikeRawPayload(entry.content, Number.MAX_SAFE_INTEGER))
      .sort((a, b) => toEpoch(a.timestamp) - toEpoch(b.timestamp))

    if (thinkingSnapshots.length > 0) {
      const latestThinking = thinkingSnapshots[thinkingSnapshots.length - 1]
      return latestThinking.content.trim()
    }

    return ''
  }, [events, mergedSession])

  // Extract the latest status update from agent_chunk events with chunk_kind='status'
  // This provides real-time status headlines during agent initialization and execution
  const statusHeadline = useMemo(() => {
    // Clear status when session is completed/failed/cancelled
    if (
      mergedSession?.status === 'completed' ||
      mergedSession?.status === 'failed' ||
      mergedSession?.status === 'cancelled'
    ) {
      return null
    }

    if (mergedSession?.status === 'pending') {
      return 'Preparing your files and starting the session...'
    }

    if (!events || events.length === 0) return null

    const statusEvents = events
      .filter((e): e is AgentChunkEvent => e.type === 'agent_chunk' && e.chunk_kind === 'status')
      .sort((a, b) => toEpoch(b.timestamp) - toEpoch(a.timestamp))

    for (const evt of statusEvents) {
      const text = (evt.content ?? '').replace(/🔄\s*/, '')
      if (!text) continue
      if (looksLikeRawPayload(text)) continue
      return text
    }

    return null
  }, [events, mergedSession?.status])

  // Phase 4 UX: live_status pill text (ephemeral, takes precedence over
  // statusHeadline). Only counts events within the last 5 seconds so a stale
  // "Calling X..." pill doesn't outlive the tool call itself.
  const liveStatusHeadline = useMemo(() => {
    if (
      mergedSession?.status === 'completed' ||
      mergedSession?.status === 'failed' ||
      mergedSession?.status === 'cancelled'
    ) {
      return null
    }

    if (!events || events.length === 0) return null

    const cutoff = Date.now() - 5000
    const liveEvents = events
      .filter((e): e is AgentChunkEvent => e.type === 'agent_chunk' && e.chunk_kind === 'live_status')
      .filter(e => toEpoch(e.timestamp) >= cutoff)
      .sort((a, b) => toEpoch(b.timestamp) - toEpoch(a.timestamp))

    for (const evt of liveEvents) {
      const text = (evt.content ?? '').replace(/🔄\s*/, '')
      if (!text) continue
      if (looksLikeRawPayload(text)) continue
      return text
    }

    return null
  }, [events, mergedSession?.status])

  // Composed display value — live_status wins when present, otherwise fall
  // back to the existing persisted status headline.
  const displayStatus = liveStatusHeadline ?? statusHeadline

  // Phase 4+ UX: grounded reveal hook state.
  // ack: the single template-built acknowledgement line emitted right after
  // the router decides. Cleared when the session reaches a terminal state.
  const ackHeadline = useMemo(() => {
    if (
      mergedSession?.status === 'completed' ||
      mergedSession?.status === 'failed' ||
      mergedSession?.status === 'cancelled'
    ) {
      return null
    }
    if (!events || events.length === 0) return null
    const ackEvents = events
      .filter((e): e is AgentChunkEvent => e.type === 'agent_chunk' && e.chunk_kind === 'ack')
      .sort((a, b) => toEpoch(b.timestamp) - toEpoch(a.timestamp))
    return ackEvents[0]?.content?.trim() || null
  }, [events, mergedSession?.status])

  // planItems: the agent's checklist. Source-of-truth precedence:
  //   1. mergedSession.todos (authoritative; populated via REST refresh +
  //      SSE write_todos/update_todos events). This is what the right
  //      panel and bottom activity card already use, and it carries the
  //      agent's rich descriptions and live status transitions.
  //   2. Latest plan_reveal / plan_update SSE chunk (only useful in the
  //      brief 0..3 second window before the agent has written its first
  //      checklist - acts as an "initial sketch" placeholder).
  const planItems = useMemo<PlanItem[]>(() => {
    if (
      mergedSession?.status === 'completed' ||
      mergedSession?.status === 'failed' ||
      mergedSession?.status === 'cancelled'
    ) {
      return []
    }

    const normalizeStatus = (raw: unknown): PlanItemStatus => {
      const source = typeof raw === 'string' ? raw : 'pending'
      const s = source.toLowerCase().replace(/[-\s]/g, '_')
      if (s === 'in_progress' || s === 'inprogress' || s === 'active' || s === 'running') return 'in_progress'
      if (s === 'done' || s === 'completed' || s === 'finished') return 'done'
      if (s === 'failed' || s === 'error') return 'failed'
      if (s === 'skipped' || s === 'cancelled') return 'skipped'
      return 'pending'
    }

    const sessionTodos = mergedSession?.todos as unknown as
      | Array<{ id?: string; text?: string; description?: string; content?: string; status?: string }>
      | undefined
    if (Array.isArray(sessionTodos) && sessionTodos.length > 0) {
      const fromTodos = sessionTodos
        .map((t, idx) => {
          const label = String(t?.text || t?.description || t?.content || '').trim()
          if (!label) return null
          return {
            id: String(t?.id || `todo-${idx + 1}`),
            label,
            status: normalizeStatus(t?.status)
          }
        })
        .filter((x): x is PlanItem => x !== null)
      if (fromTodos.length > 0) return fromTodos
    }

    if (!events || events.length === 0) return []
    const planEvents = events
      .filter(
        (e): e is AgentChunkEvent =>
          e.type === 'agent_chunk' && (e.chunk_kind === 'plan_reveal' || e.chunk_kind === 'plan_update')
      )
      .sort((a, b) => toEpoch(a.timestamp) - toEpoch(b.timestamp))
    const latest = planEvents[planEvents.length - 1]
    const rawItems = latest?.metadata?.items as
      | Array<{ id?: string; label?: string; text?: string; status?: string }>
      | undefined
    if (!Array.isArray(rawItems)) return []
    return rawItems
      .map((it, idx) => {
        const label = String(it?.label || it?.text || '').trim()
        if (!label) return null
        return {
          id: String(it?.id || `plan-${idx + 1}`),
          label,
          status: normalizeStatus(it?.status)
        }
      })
      .filter((x): x is PlanItem => x !== null)
  }, [events, mergedSession?.status, mergedSession?.todos])

  // Phase 4+ TTFT UX: agentActivityLines — a flowing 3-line "what the agent
  // is doing right now" ticker derived ENTIRELY from real-time signals the
  // backend already emits (no extra LLM call). Sources for the CURRENT turn:
  //   - chunk_kind="status"      (progressive milestones from background.py)
  //   - chunk_kind="live_status" (throttled real-time tool/expert pill text)
  //   - step_started events      (humanised tool / subagent / thinking start)
  //   - decision events          (router / pack / capability decisions)
  // Consecutive duplicates are collapsed. The newest line is at the end of
  // the array so the consumer can render them as a slide-up stack. Suppressed
  // entirely once the real response_stream begins for this turn so the
  // bubble can animate out before the answer renders.
  const agentActivityLines = useMemo<string[]>(() => {
    if (isTerminalSessionStatus(mergedSession?.status)) return []
    if (!events || events.length === 0) return []

    const turnStartEpoch = findTurnStartEpoch(events)
    const collected = collectAgentActivityRows(events, turnStartEpoch)
    if (collected.responseStarted) return []

    collected.rows.sort((a, b) => a.ts - b.ts)
    return dedupeConsecutive(collected.rows.map(r => r.text)).slice(-3)
  }, [events, mergedSession?.status])

  const startSession = useCallback(
    async (
      task: string,
      config?: SessionConfig,
      activeExternalConnectionIds?: string[],
      activeEnterpriseSkillId?: string,
      fallbackSkillId?: string
    ): Promise<StartSessionResponse> => {
      return client.startSession(task, config, activeExternalConnectionIds, activeEnterpriseSkillId, fallbackSkillId)
    },
    [client]
  )

  const activateSession = useCallback(
    async (targetSessionId: string): Promise<StartSessionResponse> => client.activateSession(targetSessionId),
    [client]
  )

  const reply = useCallback(
    async (message?: string, structuredInput?: Record<string, any>, attachments?: MessageAttachmentRef[]) => {
      if (!sessionId) return

      // Cache any blob preview URLs from the snapshot immediately — before the
      // REST sync wait — so the optimistic message and any subsequent trace
      // message can render the image from a local blob URL instead of waiting
      // for a proxy round-trip (see messages useMemo below).
      if (attachments) {
        for (const att of attachments) {
          if (att.preview_url) {
            previewUrlByAttachmentId.current.set(att.id, att.preview_url)
          }
        }
      }

      // Show the user's message bubble immediately — before the REST sync wait
      // — so there is zero perceived latency between pressing Send and seeing
      // the message (with any attached image) appear in the chat.
      const optimisticId = `optimistic-${Date.now()}`
      if (message && !structuredInput) {
        const optimisticMessage: ChatMessage = {
          id: optimisticId,
          type: 'user_input',
          timestamp: new Date().toISOString(),
          content: message,
          ...(attachments && attachments.length > 0 ? { attachments } : {})
        }
        setOptimisticMessages(prev => [...prev, optimisticMessage])
      }

      // Avoid TS control-flow narrowing on sessionRef inside the sync loop (ref updates after fetch).
      const readRestStatus = (): DeepAgentSession['status'] | undefined => sessionRef.current?.status

      await waitForRestSyncWithWaitingHumanStream(eventsRef.current, readRestStatus, fetchSession)

      setIsAgentRunning(true)
      setLastReplyTimestamp(Date.now()) // Mark when we sent a new reply to prevent showing stale content
      const attachmentRefs = attachments?.map(a => ({
        id: a.id,
        name: a.name,
        mime_type: a.mime_type,
        size: a.size,
        indexing_status: a.indexing_status
      }))
      const postInterrupt = () => client.replyToInterrupt(sessionId, message, structuredInput, attachmentRefs)

      try {
        await postInterruptWith409Retry(postInterrupt, fetchSession)
        if (!isFlowBotFabricRuntime()) {
          setStreamVersion(v => v + 1)
        }
        await fetchSession()
        setOptimisticMessages(prev => prev.filter(m => m.id !== optimisticId))
      } catch (error) {
        console.error('[reply] Error sending to backend:', error instanceof Error ? error.message : 'Request failed')
        setIsAgentRunning(false)
        setOptimisticMessages(prev => prev.filter(m => m.id !== optimisticId))
        throw error
      }
    },
    [sessionId, client, fetchSession]
  )

  return {
    session: mergedSession,
    messages,
    events,
    streamingGreeting,
    streamingContent,
    streamingThinking,
    statusHeadline,
    liveStatusHeadline,
    displayStatus,
    ackHeadline,
    planItems,
    agentActivityLines,
    isConnected,
    isStreaming:
      isAgentRunning || (!!mergedSession && (mergedSession.status === 'running' || mergedSession.status === 'pending')),
    isWaitingForInput: mergedSession?.status === 'waiting_for_human',
    sessionLoadError,
    activeSkill,
    startSession,
    activateSession,
    reply,
    retrySessionLoad: fetchSession
  }
}

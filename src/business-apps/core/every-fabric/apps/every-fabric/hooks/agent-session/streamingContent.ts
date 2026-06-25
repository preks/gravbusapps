import type { AgentChunkEvent, AgentStreamEvent, DeepAgentSession } from '../../types/enterpriseAgent'
import { isTerminalStatus } from './sessionStatus'
import { looksLikeDashboardJson, looksLikeInternalErrorLeak } from './streamPayloadGuards'
import { epochFromStreamEvent, toEpoch } from './traceTurn'

const STREAM_DEBUG =
  typeof window !== 'undefined' &&
  ((window as unknown as { __FABRIC_STREAM_DEBUG__?: boolean }).__FABRIC_STREAM_DEBUG__ === true ||
    localStorage.getItem('fabric_stream_debug') === '1')

function logStreamDebug(message: string, detail?: Record<string, unknown>): void {
  if (!STREAM_DEBUG) return
  if (detail) {
    console.debug('[fabric-stream]', message, detail)
  } else {
    console.debug('[fabric-stream]', message)
  }
}

const chunkStreamKey = (chunk: AgentChunkEvent): string | null => {
  const raw = chunk.metadata?.stream_key
  return typeof raw === 'string' && raw.trim().length > 0 ? raw : null
}

const chunkSegmentId = (chunk: AgentChunkEvent): number => {
  const raw = chunk.metadata?.segment_id
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0
}

const responseStreamIdentity = (chunk: AgentChunkEvent): string =>
  `${chunkStreamKey(chunk) ?? 'primary'}:${chunkSegmentId(chunk)}`

const demotedResponseStreamIdentities = (events: AgentStreamEvent[]): Set<string> => {
  const demoted = new Set<string>()
  for (const entry of events) {
    if (entry.type !== 'agent_chunk' || entry.chunk_kind !== 'agent_reasoning') continue
    const metadata = entry.metadata ?? {}
    if (metadata.source !== 'response_stream') continue
    const sourceKey = typeof metadata.source_stream_key === 'string' ? metadata.source_stream_key : 'primary'
    const sourceSegment = typeof metadata.source_segment_id === 'number' ? metadata.source_segment_id : 0
    demoted.add(`${sourceKey}:${sourceSegment}`)
  }
  return demoted
}

function buildStreamingContentFromSnapshots(events: AgentStreamEvent[]): string | null {
  const demoted = demotedResponseStreamIdentities(events)
  const responseSnapshots = events
    .filter(
      (entry): entry is AgentChunkEvent =>
        entry.type === 'agent_chunk' &&
        entry.role === 'ai' &&
        entry.chunk_kind === 'response_stream' &&
        typeof entry.content === 'string' &&
        entry.content.trim().length > 0 &&
        !demoted.has(responseStreamIdentity(entry))
    )
    .sort((a, b) => {
      const seqDelta = (a.seq ?? 0) - (b.seq ?? 0)
      if (seqDelta !== 0) return seqDelta
      return toEpoch(a.timestamp) - toEpoch(b.timestamp)
    })

  if (responseSnapshots.length === 0) {
    return null
  }

  const safeSnapshots = responseSnapshots.filter(snapshot => {
    const text = snapshot.content.trim()
    // Long-form answer prose is expected here — do not apply the short status-line
    // length guard (looksLikeRawPayload maxLen) or snapshots freeze once they
    // exceed ~500 chars and the final answer appears to "dump" at turn end.
    const safe = !looksLikeInternalErrorLeak(text) && !looksLikeDashboardJson(text)
    if (!safe && STREAM_DEBUG) {
      logStreamDebug('filtered response_stream snapshot', {
        seq: snapshot.seq,
        chars: text.length,
        internalError: looksLikeInternalErrorLeak(text),
        dashboardJson: looksLikeDashboardJson(text)
      })
    }
    return safe
  })
  if (safeSnapshots.length === 0) {
    logStreamDebug('no safe response_stream snapshots', {
      total: responseSnapshots.length,
      latestChars: responseSnapshots[responseSnapshots.length - 1]?.content.trim().length
    })
    return ''
  }

  const latestSnapshot = safeSnapshots[safeSnapshots.length - 1]
  const latestIdentity = responseStreamIdentity(latestSnapshot)
  const activeSegmentSnapshots = safeSnapshots.filter(snapshot => responseStreamIdentity(snapshot) === latestIdentity)
  const content =
    activeSegmentSnapshots[activeSegmentSnapshots.length - 1]?.content.trim() ?? latestSnapshot.content.trim()
  logStreamDebug('selected response_stream snapshot', {
    seq: latestSnapshot.seq,
    chars: content.length,
    segment: latestIdentity
  })
  return content
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

export function computeStreamingDisplayContent(
  liveTurnEvents: AgentStreamEvent[],
  lastReplyTimestamp: number,
  isAgentRunning: boolean,
  mergedStatus: DeepAgentSession['status'] | undefined
): string {
  const isActivelyRunning = isAgentRunning || mergedStatus === 'running' || mergedStatus === 'pending'
  if (!isActivelyRunning && !(mergedStatus && isTerminalStatus(mergedStatus))) {
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
    const trimmed = fromSnapshots.trim()
    if (!trimmed || looksLikeDashboardJson(trimmed)) {
      return 'Generating chart…'
    }
    return trimmed
  }

  return buildStreamingContentFromLegacyThinking(liveTurnEvents)
}

export function extractStreamingGreeting(events: AgentStreamEvent[], mergedSession: DeepAgentSession | null): string {
  const allEvents = events.length > 0 ? events : (mergedSession?.trace ?? [])
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

  return greetingEvents[0]?.content.trim() ?? ''
}

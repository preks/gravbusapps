/**
 * Module-level singleton that owns every in-flight SSE connection to
 * `POST /flowbot/api/agent/v2/chat` and `GET /flowbot/api/agent/v2/chat/resume/{run_id}`.
 *
 * Why a singleton, not per-hook state:
 *  - The user can run agents in **many sessions concurrently** and we
 *    must keep streaming all of them in the background regardless of
 *    which session the UI currently has open (the ticket requirement).
 *  - React components mount/unmount as the user switches sidebars,
 *    opens the chat dashboard, navigates routes. Owning the connection
 *    here means a component unmount no longer kills the run.
 *  - After a hard refresh the singleton is gone, but it can rebuild
 *    itself from `GET /active-runs` + persisted `lastEventId` and
 *    seamlessly resume all background runs via the resume endpoint.
 *
 * The connection logic itself is fetch + ReadableStream + TextDecoderStream
 * (matching what `useFlowBot.ts` did inline before). Parsed SSE frames
 * are fan-out delivered to any number of registered subscribers per
 * runId; the React hook(s) consume them via the provided handlers.
 *
 * No client-side timeout is set on the fetch — long agent runs are a
 * first-class requirement. The backend emits 15s SSE comment heartbeats
 * to keep proxies awake; on actual disconnect we reconnect with
 * exponential backoff.
 */

import { resolveFlowbotBaseUrl } from '@/common/utils/flowbotUtils'
import { useStreamStore, type RunStatus } from './streamStore'

/** Wire payload yielded to subscribers for every SSE frame. */
export interface ParsedSSEFrame {
  /** SSE `event:` field (e.g. `output-item`, `session-id`, `run-id`). */
  event: string
  /** Raw `data:` payload as a single string (caller JSON.parses if needed). */
  data: string
  /** SSE `id:` field, if present — Redis stream entry id used for resume. */
  id: string | null
}

/** Set of callbacks one subscriber wants invoked for "their" run. */
export interface RunSubscriberHandlers {
  /** Fired for every parsed frame, including envelope (session-id, run-id). */
  onFrame?: (frame: ParsedSSEFrame) => void
  /** Convenience: fired when the SSE `session-id` envelope arrives. */
  onSessionId?: (sessionId: string) => void
  /** Convenience: fired when the SSE `run-id` envelope arrives. */
  onRunId?: (runId: string) => void
  /** Fired once when the run reaches a terminal state (server closed clean). */
  onTerminate?: (reason: 'completed' | 'errored' | 'cancelled' | 'disconnected') => void
  /** Fired when the manager could not reconnect after all retries. */
  onUnrecoverable?: (error: unknown) => void
}

interface ActiveSubscription {
  runId: string
  sessionId: string | null
  controller: AbortController
  retryAttempts: number
  /** True once we've seen any terminal indicator and stop reconnecting. */
  terminated: boolean
  /** Token used for reconnect calls. */
  accessToken: string
  /** Subscribers fanned-out for this run. */
  handlers: Set<RunSubscriberHandlers>
}

const RECONNECT_BASE_MS = 250
const RECONNECT_MAX_MS = 5_000
const RECONNECT_MAX_ATTEMPTS = 6

/** Module-level singleton state. */
const subscriptions = new Map<string, ActiveSubscription>()
/**
 * runId pending: we know we've started a connection but we don't have a
 * subscription record yet (e.g. mid-bootstrap). Used to deduplicate
 * concurrent `resume()` calls for the same run.
 */
const inflightResumes = new Set<string>()

let bootstrapped = false
let bootstrapPromise: Promise<void> | null = null

function readerLoopInstrumentation(reason: string, runId: string, extra?: unknown): void {
  // Centralised log point so users can grep `[FlowBotStream]` to follow
  // the lifecycle of any single run across reconnects.
  if (extra !== undefined) {
    console.log(`[FlowBotStream][${runId}] ${reason}`, extra)
  } else {
    console.log(`[FlowBotStream][${runId}] ${reason}`)
  }
}

/** Parse one SSE frame (multiple `event:`/`data:`/`id:` lines, blank-line terminated). */
function parseFrame(frame: string): ParsedSSEFrame {
  let event = 'message'
  let data = ''
  let id: string | null = null
  for (const rawLine of frame.split('\n')) {
    const line = rawLine.replace(/\r$/, '')
    if (line.startsWith(':')) {
      // SSE comment / heartbeat — ignore.
      continue
    }
    if (line.startsWith('event:')) {
      event = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      data += line.slice(5).trimStart()
    } else if (line.startsWith('id:')) {
      id = line.slice(3).trim() || null
    }
  }
  return { event, data, id }
}

function dispatchFrameToSubscribers(sub: ActiveSubscription, frame: ParsedSSEFrame) {
  for (const handlers of sub.handlers) {
    try {
      handlers.onFrame?.(frame)
      if (frame.event === 'session-id') {
        try {
          const sid = JSON.parse(frame.data) as string
          handlers.onSessionId?.(sid)
        } catch {
          /* malformed; ignore */
        }
      } else if (frame.event === 'run-id') {
        try {
          const rid = JSON.parse(frame.data) as string
          handlers.onRunId?.(rid)
        } catch {
          /* malformed; ignore */
        }
      }
    } catch (err) {
      console.error('[FlowBotStream] subscriber handler threw', err)
    }
  }
}

function dispatchTerminate(sub: ActiveSubscription, reason: 'completed' | 'errored' | 'cancelled' | 'disconnected') {
  for (const handlers of sub.handlers) {
    try {
      handlers.onTerminate?.(reason)
    } catch (err) {
      console.error('[FlowBotStream] subscriber onTerminate threw', err)
    }
  }
}

async function consumeStream(
  body: ReadableStream<Uint8Array>,
  runId: string,
  sub: ActiveSubscription
): Promise<'completed' | 'disconnected'> {
  const reader = body.pipeThrough(new TextDecoderStream()).getReader()
  let buf = ''
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) {
        // Server closed the response cleanly (typically after the
        // terminal __end__ entry was observed by the backend).
        return 'completed'
      }
      buf += value
      const parts = buf.split('\n\n')
      buf = parts.pop() ?? ''
      for (const part of parts) {
        if (!part) continue
        const frame = parseFrame(part)
        if (frame.id) {
          useStreamStore.getState().updateLastEventId(runId, frame.id)
        }
        if (!frame.event || frame.event === 'message') {
          if (!frame.data) continue
        }
        dispatchFrameToSubscribers(sub, frame)
      }
    }
  } finally {
    try {
      reader.releaseLock()
    } catch {
      /* noop */
    }
  }
}

function scheduleReconnect(runId: string, sub: ActiveSubscription) {
  if (sub.terminated) return
  if (sub.retryAttempts >= RECONNECT_MAX_ATTEMPTS) {
    readerLoopInstrumentation('reconnect attempts exhausted; giving up', runId)
    sub.terminated = true
    useStreamStore.getState().setRunStatus(runId, 'errored', 'disconnected from agent')
    for (const handlers of sub.handlers) {
      try {
        handlers.onUnrecoverable?.(new Error('Reconnect attempts exhausted'))
      } catch {
        /* noop */
      }
    }
    dispatchTerminate(sub, 'disconnected')
    subscriptions.delete(runId)
    return
  }

  const delay = Math.min(RECONNECT_BASE_MS * 2 ** sub.retryAttempts, RECONNECT_MAX_MS)
  sub.retryAttempts += 1
  useStreamStore.getState().setRunStatus(runId, 'reconnecting')
  readerLoopInstrumentation(
    `scheduling reconnect attempt ${sub.retryAttempts}/${RECONNECT_MAX_ATTEMPTS} in ${delay}ms`,
    runId
  )

  setTimeout(() => {
    if (sub.terminated) return
    const lastEventId = useStreamStore.getState().runs[runId]?.lastEventId ?? null
    resume(runId, { accessToken: sub.accessToken, lastEventId }).catch(err => {
      readerLoopInstrumentation('reconnect failed', runId, err)
      scheduleReconnect(runId, sub)
    })
  }, delay)
}

/**
 * Start a brand-new agent run via `POST /v2/chat`. Returns the
 * server-assigned `runId` once the envelope arrives. The connection is
 * tracked in the manager so it survives the React component that
 * triggered the send call.
 *
 * `handlers` may include callbacks for frames / session-id / run-id /
 * terminate. The same set may be passed to `attach` later to re-bind
 * after a remount.
 */
export async function startRun(options: {
  url: string
  formData: FormData
  accessToken: string
  /**
   * Provisional session id known by the caller, if any. Used as a
   * tentative pointer in the store until the server confirms via the
   * `session-id` envelope.
   */
  provisionalSessionId: string | null
  handlers: RunSubscriberHandlers
}): Promise<{
  runId: string | null
  /** Resolves when the stream reaches a terminal state (or fails permanently). */
  complete: Promise<'completed' | 'errored' | 'cancelled' | 'disconnected'>
}> {
  const { url, formData, accessToken, provisionalSessionId, handlers } = options

  const controller = new AbortController()

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'text/event-stream'
    },
    body: formData,
    signal: controller.signal
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const err = new Error(`Flowbot stream HTTP ${res.status} ${res.statusText} ${text}`)
    ;(err as { status?: number }).status = res.status
    throw err
  }
  if (!res.body) throw new Error('No body in streaming response')

  // We don't know the runId until the first envelope frame; create a
  // temporary subscription keyed by a placeholder and re-key once we
  // have it. To keep things simpler the subscription record itself is
  // built in `consumePromoting()` after the first frame.
  let promotedRunId: string | null = null
  let promotedSessionId: string | null = provisionalSessionId
  let sub: ActiveSubscription | null = null

  const wrapHandlers: RunSubscriberHandlers = {
    onFrame: frame => {
      if (frame.event === 'run-id' && !promotedRunId) {
        try {
          promotedRunId = JSON.parse(frame.data) as string
        } catch {
          /* malformed; ignore */
        }
        if (promotedRunId) {
          // Materialise the subscription now that we have a real runId.
          sub = {
            runId: promotedRunId,
            sessionId: promotedSessionId,
            controller,
            retryAttempts: 0,
            terminated: false,
            accessToken,
            handlers: new Set([handlers])
          }
          subscriptions.set(promotedRunId, sub)
          useStreamStore.getState().registerRun({
            runId: promotedRunId,
            sessionId: promotedSessionId ?? '',
            status: 'streaming'
          })
        }
      }
      if (frame.event === 'session-id') {
        try {
          promotedSessionId = JSON.parse(frame.data) as string
          if (promotedRunId && sub) {
            sub.sessionId = promotedSessionId
            useStreamStore.getState().registerRun({
              runId: promotedRunId,
              sessionId: promotedSessionId,
              status: 'streaming'
            })
          }
        } catch {
          /* malformed; ignore */
        }
      }
      if (frame.id && promotedRunId) {
        useStreamStore.getState().updateLastEventId(promotedRunId, frame.id)
      }
      handlers.onFrame?.(frame)
      if (frame.event === 'session-id' && promotedSessionId) {
        handlers.onSessionId?.(promotedSessionId)
      } else if (frame.event === 'run-id' && promotedRunId) {
        handlers.onRunId?.(promotedRunId)
      }
    },
    onSessionId: handlers.onSessionId,
    onRunId: handlers.onRunId,
    onTerminate: reason => {
      handlers.onTerminate?.(reason)
    },
    onUnrecoverable: handlers.onUnrecoverable
  }

  // Resolve `runId` as soon as we see the run-id envelope; resolve
  // `complete` only once we hit a terminal state (so callers that
  // chain off stream end still work).
  let runIdResolve!: (rid: string | null) => void
  const runIdReady = new Promise<string | null>(resolve => {
    runIdResolve = resolve
  })
  let runIdResolved = false
  let completeResolve!: (reason: 'completed' | 'errored' | 'cancelled' | 'disconnected') => void
  const completePromise = new Promise<'completed' | 'errored' | 'cancelled' | 'disconnected'>(resolve => {
    completeResolve = resolve
  })

  const originalOnFrame = wrapHandlers.onFrame
  wrapHandlers.onFrame = (frame: ParsedSSEFrame) => {
    originalOnFrame?.(frame)
    if (!runIdResolved && frame.event === 'run-id') {
      runIdResolved = true
      runIdResolve(promotedRunId)
    }
  }
  // Defensive: if we never see a run-id within 5s (shouldn't happen),
  // still resolve so the caller doesn't hang.
  setTimeout(() => {
    if (!runIdResolved) {
      runIdResolved = true
      runIdResolve(promotedRunId)
    }
  }, 5_000)

  const originalOnTerminate = wrapHandlers.onTerminate
  wrapHandlers.onTerminate = reason => {
    originalOnTerminate?.(reason)
    completeResolve(reason)
  }

  void (async () => {
    const tempSubForLoop: ActiveSubscription = {
      runId: '',
      sessionId: promotedSessionId,
      controller,
      retryAttempts: 0,
      terminated: false,
      accessToken,
      handlers: new Set([wrapHandlers])
    }

    let outcome: 'completed' | 'disconnected' = 'disconnected'
    try {
      outcome = await consumeStream(res.body!, '__pending__', tempSubForLoop)
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') {
        // Explicit cancel; clean up subscription.
        if (promotedRunId && sub) {
          sub.terminated = true
          dispatchTerminate(sub, 'cancelled')
          useStreamStore.getState().clearRun(promotedRunId)
          subscriptions.delete(promotedRunId)
        }
        if (!runIdResolved) {
          runIdResolved = true
          runIdResolve(null)
        }
        completeResolve('cancelled')
        return
      }
      readerLoopInstrumentation('initial stream errored', promotedRunId ?? '__pending__', err)
    }

    if (!promotedRunId) {
      // We never learned the runId — nothing more we can do.
      handlers.onTerminate?.('errored')
      if (!runIdResolved) {
        runIdResolved = true
        runIdResolve(null)
      }
      completeResolve('errored')
      return
    }

    if (outcome === 'completed') {
      sub!.terminated = true
      useStreamStore.getState().clearRun(promotedRunId)
      subscriptions.delete(promotedRunId)
      dispatchTerminate(sub!, 'completed')
      return
    }

    // Disconnected — reconnect via /resume.
    if (sub) {
      scheduleReconnect(promotedRunId, sub)
    }
  })()

  const runId = await runIdReady
  return { runId, complete: completePromise }
}

/**
 * Reconnect to an existing in-flight run via `GET /v2/chat/resume/{runId}`.
 *
 * Idempotent: if we already have a live subscription for this runId we
 * just register the (optional) extra handlers on it and return early.
 */
export async function resume(
  runId: string,
  options: {
    accessToken: string
    /** Optional. If absent we use whatever lastEventId is in the store. */
    lastEventId?: string | null
    /** Optional extra handlers to attach for the lifetime of this resume. */
    handlers?: RunSubscriberHandlers
  }
): Promise<void> {
  const existing = subscriptions.get(runId)
  if (existing) {
    if (options.handlers) existing.handlers.add(options.handlers)
    return
  }
  if (inflightResumes.has(runId)) {
    // Another call to resume for the same run is already in flight; let
    // it install the subscription and silently no-op here.
    return
  }
  inflightResumes.add(runId)

  const lastEventId = options.lastEventId ?? useStreamStore.getState().runs[runId]?.lastEventId ?? null
  const baseUrl = resolveFlowbotBaseUrl()
  const params = new URLSearchParams()
  if (lastEventId) params.set('last_event_id', lastEventId)
  const url = `${baseUrl}/flowbot/api/agent/v2/chat/resume/${runId}${params.toString() ? `?${params.toString()}` : ''}`

  let response: Response
  try {
    const controller = new AbortController()
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
        Accept: 'text/event-stream'
      },
      signal: controller.signal
    })
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      const err = new Error(`Resume HTTP ${response.status} ${response.statusText} ${text}`)
      ;(err as { status?: number }).status = response.status
      if (response.status === 404) {
        // Run already finished/expired on the server; drop the local pointer.
        useStreamStore.getState().clearRun(runId)
      }
      throw err
    }
    if (!response.body) throw new Error('No body on resume response')

    const known = useStreamStore.getState().runs[runId]
    const sub: ActiveSubscription = {
      runId,
      sessionId: known?.sessionId ?? null,
      controller,
      retryAttempts: 0,
      terminated: false,
      accessToken: options.accessToken,
      handlers: new Set(options.handlers ? [options.handlers] : [])
    }
    subscriptions.set(runId, sub)
    useStreamStore.getState().setRunStatus(runId, 'streaming')

    void (async () => {
      let outcome: 'completed' | 'disconnected' = 'disconnected'
      try {
        outcome = await consumeStream(response.body!, runId, sub)
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') {
          sub.terminated = true
          dispatchTerminate(sub, 'cancelled')
          useStreamStore.getState().clearRun(runId)
          subscriptions.delete(runId)
          return
        }
        readerLoopInstrumentation('resume stream errored', runId, err)
      }

      if (outcome === 'completed') {
        sub.terminated = true
        useStreamStore.getState().clearRun(runId)
        subscriptions.delete(runId)
        dispatchTerminate(sub, 'completed')
        return
      }

      scheduleReconnect(runId, sub)
    })()
  } finally {
    inflightResumes.delete(runId)
  }
}

/**
 * Add subscriber handlers to an already-live subscription. Returns a
 * detach function the caller should invoke in their cleanup so we don't
 * leak handlers on unmount.
 *
 * If no subscription exists for this runId we eagerly call resume().
 */
export function attach(runId: string, handlers: RunSubscriberHandlers, accessToken: string): () => void {
  const existing = subscriptions.get(runId)
  if (existing) {
    existing.handlers.add(handlers)
  } else {
    // Kick off resume in the background; subscriber's onFrame will fire
    // for any frames received once it lands.
    void resume(runId, { accessToken, handlers }).catch(err => {
      console.warn('[FlowBotStream] eager-attach resume failed', err)
    })
  }
  return () => detach(runId, handlers)
}

export function detach(runId: string, handlers: RunSubscriberHandlers): void {
  const sub = subscriptions.get(runId)
  if (!sub) return
  sub.handlers.delete(handlers)
  // Note: we intentionally DO NOT close the connection when the handler
  // set empties — the whole point is that the agent keeps running in
  // the background. The subscription is cleaned up on terminal events
  // or explicit cancel().
}

/**
 * Cancel an in-flight run by id. By default POSTs `/chat/cancel` (which
 * sets the Redis cancel flag and rolls back the session turn) and then
 * aborts the local SSE fetch so we close the reader promptly.
 *
 * Callers that want to make the network call themselves (so they can
 * read the returned `message` OutputItem the backend emits to describe
 * side-effects of the cancelled turn) can pass `skipNetwork: true` to
 * skip the manager's own POST and just close the local subscription.
 */
export async function cancel(params: {
  runId: string
  sessionId: string
  accessToken: string
  /** When true, do not POST /chat/cancel — caller will handle it. */
  skipNetwork?: boolean
}): Promise<void> {
  const { runId, sessionId, accessToken, skipNetwork } = params
  if (!skipNetwork) {
    try {
      const baseUrl = resolveFlowbotBaseUrl()
      const form = new FormData()
      form.append('session_id', sessionId)
      form.append('run_id', runId)
      await fetch(`${baseUrl}/flowbot/api/agent/chat/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form
      })
    } catch (err) {
      console.warn('[FlowBotStream] cancel POST failed', err)
    }
  }
  const sub = subscriptions.get(runId)
  if (sub) {
    sub.terminated = true
    try {
      sub.controller.abort()
    } catch {
      /* noop */
    }
    dispatchTerminate(sub, 'cancelled')
    useStreamStore.getState().clearRun(runId)
    subscriptions.delete(runId)
  } else {
    useStreamStore.getState().clearRun(runId)
  }
}

/**
 * One-time bootstrap call: ask the backend for every in-flight run that
 * belongs to the authenticated user, then resume each one. Safe to call
 * many times — only the first run actually hits the network.
 *
 * Returns the list of runIds we resumed (excluding ones we already knew).
 */
export async function bootstrap(accessToken: string): Promise<string[]> {
  if (bootstrapped) return []
  if (bootstrapPromise) {
    await bootstrapPromise
    return []
  }

  bootstrapPromise = (async () => {
    try {
      const baseUrl = resolveFlowbotBaseUrl()
      const res = await fetch(`${baseUrl}/flowbot/api/agent/active-runs`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json'
        }
      })
      if (!res.ok) {
        console.warn('[FlowBotStream] bootstrap /active-runs returned', res.status)
        return
      }
      const payload = (await res.json()) as Array<{
        run_id: string
        session_id: string
        status: string
        started_at: string
      }>
      const serverRuns = payload.map(r => ({
        runId: r.run_id,
        sessionId: r.session_id,
        status: (r.status === 'completed' || r.status === 'cancelled' || r.status === 'errored'
          ? r.status
          : 'streaming') as RunStatus,
        startedAt: new Date(r.started_at).getTime() || Date.now()
      }))
      useStreamStore.getState().hydrateFromServer(serverRuns)

      const resumed: string[] = []
      for (const sr of serverRuns) {
        if (sr.status !== 'streaming') continue
        if (subscriptions.has(sr.runId)) continue
        try {
          await resume(sr.runId, { accessToken })
          resumed.push(sr.runId)
        } catch (err) {
          console.warn(`[FlowBotStream] bootstrap resume failed for ${sr.runId}`, err)
        }
      }
    } catch (err) {
      console.warn('[FlowBotStream] bootstrap failed', err)
    } finally {
      bootstrapped = true
    }
  })()
  await bootstrapPromise
  return []
}

/** Reset bootstrap state — only used by tests / logout flows. */
export function __resetBootstrapForTests(): void {
  bootstrapped = false
  bootstrapPromise = null
  for (const sub of subscriptions.values()) {
    try {
      sub.controller.abort()
    } catch {
      /* noop */
    }
  }
  subscriptions.clear()
  inflightResumes.clear()
}

/** Returns true if the manager currently holds an open subscription for runId. */
export function hasActiveSubscription(runId: string): boolean {
  return subscriptions.has(runId)
}

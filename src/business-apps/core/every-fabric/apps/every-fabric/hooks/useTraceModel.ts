import { useMemo } from 'react'
import type { AgentStreamEvent, DeepAgentSession } from '../types/enterpriseAgent'
import { buildMeshTraceModel, buildTraceModel, EMPTY_TRACE_MODEL, type TraceModel } from '../utils/traceModel'

interface UseTraceModelOptions {
  /** SSE events for the active session (preferred when streaming). */
  liveEvents: AgentStreamEvent[]
  /** Loaded REST session — its `trace` is used when no live events are present. */
  session: DeepAgentSession | null
  /** True when a session is actively streaming. */
  isStreaming?: boolean
  /**
   * When true, build an execution-only graph (drops catalog ``tool_available``
   * rows, merges agent nodes, etc.). Used by the session mesh — not trace explorer.
   */
  meshMode?: boolean
}

interface UseTraceModelResult {
  model: TraceModel
  /**
   * Origin of the events used to build the model. `merged` means both REST
   * and live contributed at least one event. Useful for diagnostics; the
   * UI does not need to branch on it.
   */
  source: 'live' | 'rest' | 'merged' | 'empty'
}

/**
 * Stable identifier used to deduplicate the same event when it arrives via
 * both REST `session.trace` and the SSE live stream. Mirrors the dedupe
 * logic in `sessionStreamRegistry` so the two layers stay in lockstep.
 */
const dedupeKey = (event: AgentStreamEvent): string => {
  if ('event_id' in event && event.event_id) return `id:${event.event_id}`
  if ('seq' in event && typeof event.seq === 'number') return `seq:${event.seq}`
  // Last-resort key — content-based hash for events without IDs/seqs.
  // This is intentionally heavy and only triggers on malformed events.
  return JSON.stringify(event)
}

/**
 * Returns the union of `a` and `b` with duplicates removed. Order from `a`
 * is preserved first so that the REST trace (which is the persisted record
 * for completed sessions) wins on field-level differences in the rare case
 * the same event is sent by both sources.
 *
 * Exported so other derived hooks (e.g. `useFabricCases`) can share the
 * exact REST + live merge semantics — keeping all derived state in
 * lockstep on page reload.
 */
export function mergeEvents(a: AgentStreamEvent[], b: AgentStreamEvent[]): AgentStreamEvent[] {
  if (b.length === 0) return a
  if (a.length === 0) return b
  const seen = new Set<string>()
  const result: AgentStreamEvent[] = []
  for (const event of a) {
    const key = dedupeKey(event)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(event)
  }
  for (const event of b) {
    const key = dedupeKey(event)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(event)
  }
  return result
}

/**
 * Builds a `TraceModel` from REST `session.trace` and the live SSE stream
 * **merged together**, deduplicated by `event_id` / `seq`.
 *
 * The previous implementation picked one source or the other, preferring
 * live events when present. That broke page refreshes of completed
 * sessions: the SSE endpoint may legitimately replay only a subset of the
 * persisted trace (e.g. the most recent turn or a single terminal event),
 * which is shorter than what the user saw before refresh. Picking the
 * live source unconditionally then truncated the mesh, the decisions list
 * and the runtime stat to whatever fragment SSE delivered.
 *
 * Merging is safe because:
 *   - `buildMeshTraceModel` sorts events internally, so feed order does not
 *     matter.
 *   - Events from both layers carry stable `event_id` / `seq`, so an event
 *     that arrives via both sources is deduped exactly once.
 *   - During a live session the SSE stream is already a superset of
 *     `session.trace` (REST is just the persisted snapshot), so the merge
 *     reduces to the live events. No behaviour change for active runs.
 */
export function useTraceModel(options: UseTraceModelOptions): UseTraceModelResult {
  const { liveEvents, session, isStreaming, meshMode = false } = options

  return useMemo(() => {
    const restEvents = (session?.trace ?? []) as AgentStreamEvent[]
    const merged = mergeEvents(restEvents, liveEvents)

    if (merged.length === 0) {
      return { model: EMPTY_TRACE_MODEL, source: 'empty' as const }
    }

    let source: UseTraceModelResult['source']
    if (restEvents.length > 0 && liveEvents.length > 0) {
      source = 'merged'
    } else if (liveEvents.length > 0) {
      source = 'live'
    } else {
      source = 'rest'
    }

    const build = meshMode ? buildMeshTraceModel : buildTraceModel
    return { model: build(merged), source }
    // `isStreaming` participates in the dep array so a transition from
    // running → completed re-evaluates even if the event list reference is stable.
  }, [liveEvents, session?.trace, isStreaming, meshMode])
}

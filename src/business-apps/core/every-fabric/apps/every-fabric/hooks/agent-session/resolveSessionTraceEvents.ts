import type { AgentChunkEvent, AgentStreamEvent } from '../../types/enterpriseAgent'
import { mergeEvents } from '../useTraceModel'

const responseStreamSegmentKey = (chunk: AgentChunkEvent): string => {
  const streamKey =
    typeof chunk.metadata?.stream_key === 'string' && chunk.metadata.stream_key.trim().length > 0
      ? chunk.metadata.stream_key
      : 'primary'
  const segmentId =
    typeof chunk.metadata?.segment_id === 'number' && Number.isFinite(chunk.metadata.segment_id)
      ? chunk.metadata.segment_id
      : 0
  return `${streamKey}:${segmentId}`
}

/**
 * Cumulative response_stream rows can appear twice after REST+SSE merge (different
 * seq/event_id for the same segment). Keep the newest snapshot per segment per
 * turn. Segment ids reset on every follow-up, so global coalescing by
 * `primary:0` would move/drop previous-turn answers in memory.
 */
function coalesceCumulativeResponseStreams(events: AgentStreamEvent[]): AgentStreamEvent[] {
  const latestBySegment = new Map<string, AgentChunkEvent>()
  let turnIndex = 0
  for (const event of events) {
    if (event.type !== 'agent_chunk' || event.role !== 'ai' || event.chunk_kind !== 'response_stream') {
      if (event.type === 'terminal' || event.type === 'turn_snapshot') turnIndex += 1
      continue
    }
    const key = `${turnIndex}:${responseStreamSegmentKey(event)}`
    const existing = latestBySegment.get(key)
    if (!existing || (event.seq ?? 0) >= (existing.seq ?? 0)) {
      latestBySegment.set(key, event)
    }
  }
  if (latestBySegment.size === 0) return events

  const seenSegments = new Set<string>()
  const result: AgentStreamEvent[] = []
  turnIndex = 0
  for (const event of events) {
    if (event.type === 'agent_chunk' && event.role === 'ai' && event.chunk_kind === 'response_stream') {
      const key = `${turnIndex}:${responseStreamSegmentKey(event)}`
      if (seenSegments.has(key)) continue
      seenSegments.add(key)
      result.push(latestBySegment.get(key) ?? event)
      continue
    }
    result.push(event)
    if (event.type === 'terminal' || event.type === 'turn_snapshot') turnIndex += 1
  }
  return result
}

/**
 * Merge REST `session.trace` with live SSE events (deduped by event_id/seq), then
 * collapse cumulative response_stream snapshots to one row per segment per turn.
 * Live-only preference dropped stale in-memory snapshots when REST had a fresher
 * coalesced row.
 */
export function resolveSessionTraceEvents(
  liveEvents: AgentStreamEvent[],
  sessionTrace: AgentStreamEvent[] | undefined
): AgentStreamEvent[] {
  const restEvents = sessionTrace ?? []
  if (liveEvents.length === 0) return restEvents
  if (restEvents.length === 0) return liveEvents
  return coalesceCumulativeResponseStreams(mergeEvents(restEvents, liveEvents))
}

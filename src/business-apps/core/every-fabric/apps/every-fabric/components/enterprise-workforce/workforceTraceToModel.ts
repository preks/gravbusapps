// Adapter: WorkforceRunTraceEvent[] -> mesh TraceModel.
//
// Workforce runs are deep-agent sessions, so their `session.trace` entries are
// the very same structured events the interactive SSE stream emits. The mesh /
// trace-explorer renderer already knows how to normalize `AgentStreamEvent[]`
// via `buildMeshTraceModel`, so this adapter only has to:
//   1. drop malformed entries (no string `type`),
//   2. guarantee a monotonic `seq` (REST traces occasionally omit it), and
//   3. hand the list to `buildMeshTraceModel` unchanged.
//
// `WorkforceRunTraceEvent` is intentionally loose (open record); the cast to
// `AgentStreamEvent` is safe because `buildMeshTraceModel` reads only known fields
// and ignores everything else (Tolerant Reader).

import type { AgentStreamEvent } from '../../types/enterpriseAgent'
import { EMPTY_TRACE_MODEL, buildMeshTraceModel, type TraceModel } from '../../utils/traceModel'
import type { WorkforceRunTraceEvent } from './workforceTypes'

function normalizeEvents(trace: readonly WorkforceRunTraceEvent[]): AgentStreamEvent[] {
  const events: AgentStreamEvent[] = []
  trace.forEach((entry, index) => {
    if (!entry || typeof entry.type !== 'string' || entry.type.length === 0) return
    const seq = typeof entry.seq === 'number' && Number.isFinite(entry.seq) ? entry.seq : index + 1
    events.push({ ...entry, seq } as unknown as AgentStreamEvent)
  })
  return events
}

/** Build a mesh-ready TraceModel from a workforce run's trace events. */
export function workforceTraceToModel(trace: readonly WorkforceRunTraceEvent[] | undefined): TraceModel {
  if (!trace || trace.length === 0) return EMPTY_TRACE_MODEL
  const events = normalizeEvents(trace)
  if (events.length === 0) return EMPTY_TRACE_MODEL
  return buildMeshTraceModel(events)
}

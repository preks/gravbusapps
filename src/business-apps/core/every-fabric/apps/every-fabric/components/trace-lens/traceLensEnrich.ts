// Trace Lens — raw-event enrichment pre-pass.
//
// Rewrites the (seq-sorted) raw trace before span building:
//
// 1. Collapses the burst of per-tool `tool_available` events emitted at
//    session setup into a single `tool_available_summary` marker carrying
//    the full tool list (one row instead of ~40).
// 2. Pairs `hitl_requested` → `hitl_resolved` into a synthetic `hitl_wait`
//    event so the dead time spent waiting for a human renders as a real
//    span with its true duration instead of being invisible.
//
// Pure module — no React, no network — so it is unit-testable alongside
// traceLensModel.

import type { RawTraceEvent } from './traceLensModel'

function readStr(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}
function readNum(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}
function parseTs(value: unknown): number | null {
  const s = readStr(value)
  if (!s) return null
  const ms = Date.parse(s)
  return Number.isNaN(ms) ? null : ms
}

function collapseToolAvailable(events: RawTraceEvent[]): RawTraceEvent[] {
  const toolRefs: string[] = []
  let firstEvent: RawTraceEvent | null = null
  for (const ev of events) {
    if (readStr(ev.type) !== 'tool_available') continue
    if (!firstEvent) firstEvent = ev
    const ref = readStr(ev.tool_ref)
    if (ref) toolRefs.push(ref)
  }
  if (!firstEvent) return events

  const summary: RawTraceEvent = {
    type: 'tool_available_summary',
    seq: readNum(firstEvent.seq) ?? 0,
    event_id: readStr(firstEvent.event_id) ?? 'tool-available-summary',
    timestamp: firstEvent.timestamp,
    tool_count: toolRefs.length,
    tools: toolRefs
  }
  const out: RawTraceEvent[] = []
  let inserted = false
  for (const ev of events) {
    if (readStr(ev.type) === 'tool_available') {
      if (!inserted) {
        out.push(summary)
        inserted = true
      }
      continue
    }
    out.push(ev)
  }
  return out
}

interface PendingHitlRequest {
  requestId: string
  seq: number
  timestamp: string | undefined
  ts: number | null
  title: string | undefined
}

function synthesizeHitlWaits(events: RawTraceEvent[]): RawTraceEvent[] {
  const pending: PendingHitlRequest[] = []
  const out: RawTraceEvent[] = []

  for (const ev of events) {
    out.push(ev)
    const type = readStr(ev.type)
    if (type === 'hitl_requested') {
      const request = (ev.request ?? {}) as Record<string, unknown>
      pending.push({
        requestId: readStr(request.request_id) ?? readStr(ev.event_id) ?? '',
        seq: readNum(ev.seq) ?? 0,
        timestamp: readStr(ev.timestamp),
        ts: parseTs(ev.timestamp),
        title: readStr(request.title)
      })
      continue
    }
    if (type !== 'hitl_resolved' || pending.length === 0) continue

    // Match by request_id when present, else the oldest open request.
    const resolvedRequestId = readStr(ev.request_id)
    let index = resolvedRequestId ? pending.findIndex(p => p.requestId === resolvedRequestId) : 0
    if (index < 0) index = 0
    const [request] = pending.splice(index, 1)

    const resolvedTs = parseTs(ev.timestamp)
    const waitMs = request.ts !== null && resolvedTs !== null ? Math.max(0, resolvedTs - request.ts) : undefined
    out.push({
      type: 'hitl_wait',
      // Right after the request marker so the wait span reads chronologically.
      seq: request.seq + 0.5,
      event_id: `${request.requestId || 'hitl'}:wait`,
      timestamp: request.timestamp,
      duration_ms: waitMs,
      title: request.title,
      request_id: request.requestId,
      resolved_by: readStr(ev.resolved_by)
    })
  }
  return out
}

/** Apply all enrichment passes to a seq-sorted raw trace. */
export function enrichRawTraceEvents(events: RawTraceEvent[]): RawTraceEvent[] {
  return synthesizeHitlWaits(collapseToolAvailable(events))
}

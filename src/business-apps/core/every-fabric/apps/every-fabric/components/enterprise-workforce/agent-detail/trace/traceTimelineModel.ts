// Pure model layer for the grouped run-trace timeline.
//
// Converts the raw `WorkforceRunTraceEvent[]` firehose into pre-grouped,
// human-readable rows: `*_started` / `*_completed` pairs collapse into a
// single row, decisions carry their full rationale / chosen / alternatives /
// confidence, and every row records its actor (who) + timestamp (when) +
// rationale (why) so the backtrace can answer those three questions.
//
// Kept free of React so it can be unit-tested without a DOM and reused by
// both the Trace tab and the Run drawer.

import type { WorkforceRunTraceEvent } from '../../workforceTypes'

export type TraceCategory =
  | 'tool'
  | 'decision'
  | 'policy'
  | 'hitl'
  | 'approval'
  | 'cost'
  | 'skill'
  | 'thinking'
  | 'message'
  | 'status'
  | 'system'

export interface TraceActor {
  kind: string
  displayName: string
}

export interface TraceDecisionDetail {
  category: string
  chosen: string | null
  rationale: string | null
  alternatives: string[]
  confidence: number | null
}

export interface TimelineRow {
  key: string
  title: string
  subtitle: string | null
  body: string | null
  durationMs: number | null
  startedAt: string | null
  category: TraceCategory
  actor: TraceActor | null
  decision: TraceDecisionDetail | null
  raw: Record<string, unknown>
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0)
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && !Number.isNaN(value) ? value : null
}

export function classifyEvent(type: string): TraceCategory {
  if (type.startsWith('tool_approval')) return 'approval'
  if (type.startsWith('tool_')) return 'tool'
  if (type.startsWith('decision')) return 'decision'
  if (type.startsWith('policy')) return 'policy'
  if (type.startsWith('cost')) return 'cost'
  if (type.startsWith('skill')) return 'skill'
  if (
    type.startsWith('ask_human') ||
    type.includes('human_in_loop') ||
    type.includes('waiting_for_human') ||
    type.startsWith('hitl')
  ) {
    return 'hitl'
  }
  if (type.includes('approval') || type.includes('approved') || type.includes('escalat')) {
    return 'approval'
  }
  if (type.startsWith('message') || type.startsWith('llm') || type.startsWith('agent_message')) {
    return 'message'
  }
  return 'system'
}

// Human-readable titles for known event types so the timeline reads like a
// transcript instead of dumping raw snake_case type names.
const EVENT_TITLES: Record<string, string> = {
  workforce_run_started: 'Run started',
  session_started: 'Session started',
  session_resumed: 'Session resumed',
  terminal: 'Run finished',
  hitl_requested: 'Waiting for human',
  capability_missing: 'Capability missing',
  cost_attribution: 'Cost recorded',
  tool_approval_requested: 'Approval requested',
  tool_approval_resolved: 'Approval resolved',
  artifact_created: 'Created artifact',
  expert_selected: 'Selected expert',
  tool_available: 'Tool available'
}

// agent_chunk events carry the bulk of the "what is it doing right now" signal.
// We turn the raw chunk into a readable line driven by its chunk_kind.
function chunkLabel(kind: string | null): { label: string; category: TraceCategory } {
  switch (kind) {
    case 'thinking':
    case 'agent_reasoning':
      return { label: 'Thinking', category: 'thinking' }
    case 'tool':
      return { label: 'Tool', category: 'tool' }
    case 'plan_reveal':
    case 'plan_update':
      return { label: 'Plan update', category: 'system' }
    case 'final':
    case 'response_stream':
      return { label: 'Response', category: 'message' }
    case 'ack':
      return { label: 'Acknowledged', category: 'status' }
    case 'status':
    case 'live_status':
    default:
      return { label: 'Status', category: 'status' }
  }
}

function humanizeType(type: string): string {
  return EVENT_TITLES[type] ?? type.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())
}

function skillName(event: WorkforceRunTraceEvent): string | null {
  const skill = event.skill
  if (skill && typeof skill === 'object') {
    const record = skill as Record<string, unknown>
    return asString(record.name) ?? asString(record.skill_id)
  }
  return null
}

// Streaming chunk kinds whose cumulative snapshots should collapse into a
// single row instead of one row per ~120ms backend flush. Messages and
// thinking are coalesced separately so they never merge into each other.
const STREAM_MESSAGE_KINDS = new Set(['response_stream', 'final'])
const STREAM_THINKING_KINDS = new Set(['thinking', 'agent_reasoning'])

type StreamGroup = 'message' | 'thinking'

function streamGroupOf(chunkKind: string | null): StreamGroup | null {
  if (chunkKind && STREAM_MESSAGE_KINDS.has(chunkKind)) return 'message'
  if (chunkKind && STREAM_THINKING_KINDS.has(chunkKind)) return 'thinking'
  return null
}

function streamKeyOf(event: WorkforceRunTraceEvent): string {
  const metadata = event.metadata
  if (metadata && typeof metadata === 'object') {
    const raw = (metadata as Record<string, unknown>).stream_key
    if (typeof raw === 'string' && raw.trim().length > 0) return raw
  }
  return 'primary'
}

interface StreamAccumulator {
  group: StreamGroup
  streamKey: string
  firstEvent: WorkforceRunTraceEvent
  bestContent: string
  bestEvent: WorkforceRunTraceEvent
}

// Collapse consecutive cumulative streaming snapshots (same group + stream key
// whose text grows as a prefix) into a single representative event carrying the
// longest snapshot but the first snapshot's timestamp/id. A content reset (the
// next snapshot is not a continuation of the running text) starts a new group,
// so distinct assistant messages stay on separate rows.
export function coalesceStreamingChunks(trace: readonly WorkforceRunTraceEvent[]): WorkforceRunTraceEvent[] {
  const out: WorkforceRunTraceEvent[] = []
  let acc: StreamAccumulator | null = null

  const flush = (): void => {
    if (!acc) return
    out.push({
      ...acc.bestEvent,
      event_id: asString(acc.firstEvent.event_id) ?? acc.bestEvent.event_id,
      timestamp: asString(acc.firstEvent.timestamp) ?? acc.bestEvent.timestamp,
      content: acc.bestContent
    })
    acc = null
  }

  trace.forEach(event => {
    const group = asString(event.type) === 'agent_chunk' ? streamGroupOf(asString(event.chunk_kind)) : null
    if (!group) {
      flush()
      out.push(event)
      return
    }
    const key = streamKeyOf(event)
    const content = asString(event.content) ?? ''
    const isContinuation =
      acc !== null &&
      acc.group === group &&
      acc.streamKey === key &&
      (content.startsWith(acc.bestContent) || acc.bestContent.startsWith(content))
    if (!isContinuation || !acc) {
      flush()
      acc = { group, streamKey: key, firstEvent: event, bestContent: content, bestEvent: event }
      return
    }
    if (content.length >= acc.bestContent.length) {
      acc.bestContent = content
      acc.bestEvent = event
    }
  })

  flush()
  return out
}

// Build the row for an agent_chunk. Coalesced message/thinking rows use a
// stable label as the title and carry the full text in the body; tool chunks
// name the tool; everything else falls back to a short content headline.
function rowFromChunk(event: WorkforceRunTraceEvent, index: number): TimelineRow {
  const { label, category } = chunkLabel(asString(event.chunk_kind))
  const content = asString(event.content)
  const toolName = asString(event.tool_name)
  let title = label
  let body: string | null = null
  if (category === 'tool' && toolName) {
    title = `Called ${toolName}`
    body = content
  } else if (category === 'message' || category === 'thinking') {
    title = label
    body = content
  } else if (content) {
    title = content.length > 120 ? `${content.slice(0, 117)}…` : content
    body = content.length > 120 ? content : null
  }
  return {
    key: asString(event.event_id) ?? `${index}:agent_chunk`,
    title,
    subtitle: null,
    body,
    durationMs: null,
    startedAt: asString(event.timestamp),
    category,
    actor: extractActor(event),
    decision: null,
    raw: event as Record<string, unknown>
  }
}

export function formatDuration(ms: number | null): string | null {
  if (ms === null) return null
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`
}

export function diffMs(startIso: string | null, endIso: string | null): number | null {
  if (!startIso || !endIso) return null
  const start = Date.parse(startIso)
  const end = Date.parse(endIso)
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null
  return end - start
}

function extractActor(event: WorkforceRunTraceEvent): TraceActor | null {
  const raw = event.actor
  if (!raw || typeof raw !== 'object') return null
  const actor = raw as Record<string, unknown>
  const kind = asString(actor.kind) ?? 'agent'
  const displayName = asString(actor.display_name) ?? asString(actor.name) ?? asString(actor.id) ?? kind
  return { kind, displayName }
}

function extractDecision(event: WorkforceRunTraceEvent): TraceDecisionDetail {
  return {
    category: asString(event.category) ?? 'decision',
    chosen: asString(event.chosen),
    rationale: asString(event.rationale),
    alternatives: asStringArray(event.alternatives),
    confidence: asNumber(event.confidence)
  }
}

function policyTitle(event: WorkforceRunTraceEvent): { title: string; subtitle: string | null } {
  const policy = (event.policy as Record<string, unknown> | undefined) ?? {}
  const title = asString(policy.title) ?? asString(policy.policy_id) ?? 'Policy applied'
  return { title: `Applied policy: ${title}`, subtitle: asString(policy.policy_id) }
}

function rowFromPair(
  baseType: string,
  start: WorkforceRunTraceEvent,
  end: WorkforceRunTraceEvent,
  index: number
): TimelineRow {
  const name = asString(start.name) ?? asString(end.name) ?? baseType
  const startedAt = asString(start.timestamp)
  const endedAt = asString(end.timestamp)
  const isToolStep = baseType === 'tool' || asString(start.step_type) === 'tool' || Boolean(asString(start.tool_name))
  const category: TraceCategory = isToolStep ? 'tool' : classifyEvent(`${baseType}_started`)
  const body = asString(end.message) ?? asString(end.output) ?? asString(start.task) ?? asString(start.message)

  let title: string
  if (isToolStep) title = `Called ${name}`
  else if (baseType === 'subagent') title = `Delegated to ${name}`
  else if (baseType === 'expert') title = `Asked expert ${name}`
  else if (baseType === 'step') title = name === baseType ? 'Step' : name
  else title = `${humanizeType(baseType)} · ${name}`

  return {
    key: asString(start.event_id) ?? `${index}:${baseType}`,
    title,
    subtitle: asString(start.tool_call_id) ?? asString(end.tool_call_id),
    body,
    durationMs: diffMs(startedAt, endedAt),
    startedAt,
    category,
    actor: extractActor(start) ?? extractActor(end),
    decision: null,
    raw: { started: start, completed: end }
  }
}

function rowFromSingle(type: string, event: WorkforceRunTraceEvent, index: number): TimelineRow {
  const category = classifyEvent(type)
  let title = humanizeType(type)
  let subtitle: string | null = null
  let decision: TraceDecisionDetail | null = null

  if (category === 'decision') {
    decision = extractDecision(event)
    title = asString(event.title) ?? (decision.chosen ? `Decision: ${decision.chosen}` : 'Decision')
    subtitle = decision.category
  } else if (type === 'policy_applied') {
    const resolved = policyTitle(event)
    title = resolved.title
    subtitle = resolved.subtitle
  } else if (category === 'skill') {
    const skill = skillName(event)
    title = type === 'skill_loaded' ? `Loaded skill ${skill ?? ''}`.trim() : `Considered skill ${skill ?? ''}`.trim()
  } else if (type === 'terminal') {
    const status = asString(event.status)
    title = status ? `Run ${status}` : 'Run finished'
  } else {
    // Fall back to the event's own name only when it adds information.
    const name = asString(event.name)
    if (name && name !== type) title = `${humanizeType(type)} · ${name}`
  }

  return {
    key: asString(event.event_id) ?? `${index}:${type}`,
    title,
    subtitle,
    body:
      asString(event.task) ??
      asString(event.message) ??
      asString(event.text) ??
      asString(event.content) ??
      decision?.rationale ??
      null,
    durationMs: null,
    startedAt: asString(event.timestamp),
    category,
    actor: extractActor(event),
    decision,
    raw: event as Record<string, unknown>
  }
}

// Convert the raw event stream into pre-grouped rows. The pairing rule is
// intentionally simple: a `*_started` event consumes the next matching
// `*_completed` event with the same correlation key. Anything that does not
// pair (or fires once) stands on its own.
export function buildRows(trace: readonly WorkforceRunTraceEvent[] | undefined): TimelineRow[] {
  if (!trace || trace.length === 0) return []
  const rows: TimelineRow[] = []
  const pendingStarts = new Map<string, { index: number; event: WorkforceRunTraceEvent }>()
  const events = coalesceStreamingChunks(trace)

  events.forEach((event, index) => {
    const type = asString(event.type) ?? 'event'

    if (type === 'agent_chunk') {
      rows.push(rowFromChunk(event, index))
      return
    }

    const correlationKey =
      asString(event.tool_call_id) ??
      asString(event.call_id) ??
      asString(event.correlation_id) ??
      asString(event.step_id) ??
      asString(event.name) ??
      null

    if (type.endsWith('_started') && correlationKey) {
      pendingStarts.set(`${type.slice(0, -'_started'.length)}:${correlationKey}`, { index, event })
      return
    }

    if (type.endsWith('_completed') && correlationKey) {
      const baseType = type.slice(0, -'_completed'.length)
      const match = pendingStarts.get(`${baseType}:${correlationKey}`)
      if (match) {
        pendingStarts.delete(`${baseType}:${correlationKey}`)
        rows.push(rowFromPair(baseType, match.event, event, match.index))
        return
      }
    }

    rows.push(rowFromSingle(type, event, index))
  })

  for (const pending of pendingStarts.values()) {
    rows.push(rowFromSingle(asString(pending.event.type) ?? 'event', pending.event, pending.index))
  }

  rows.sort((a, b) => {
    const at = a.startedAt ? Date.parse(a.startedAt) : 0
    const bt = b.startedAt ? Date.parse(b.startedAt) : 0
    return at - bt
  })

  return rows
}

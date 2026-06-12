// Trace Lens — normalization model.
//
// Turns a DeepAgentSession's raw `trace` (an ordered list of AgentStreamEvent)
// plus the backend debug-trace enrichment (metadata.timings + diagnostics)
// into a LangSmith-style span tree: every tool / subagent / expert / skill /
// decision / HITL / routing event laid out in call order, with waterfall
// offsets, durations, inputs and outputs.
//
// This module is pure (no React, no network) so it can be unit-tested and
// reused by the "Copy for Cursor" exporter.

import type { DeepAgentSession } from '../../types/enterpriseAgent'
import { enrichRawTraceEvents } from './traceLensEnrich'

/** Loose view over a raw trace event — the FE union omits a few persisted fields
 *  (parent_step_id, subagent_id, plan, …) that the backend writer does emit. */
export type RawTraceEvent = Record<string, unknown>

export type SpanKind =
  | 'tool'
  | 'thinking'
  | 'subagent'
  | 'expert'
  | 'skill'
  | 'decision'
  | 'routing'
  | 'hitl'
  | 'wait'
  | 'approval'
  | 'capability_missing'
  | 'artifact'
  | 'pack'
  | 'cost'
  | 'llm'
  | 'workforce'
  | 'status'
  | 'message'
  | 'terminal'
  | 'error'

export type SpanStatus = 'running' | 'done' | 'failed' | 'pending' | 'info'

export interface TraceSpan {
  id: string
  parentId: string | null
  kind: SpanKind
  /** True for point-in-time events (decisions, routing, skills, markers). */
  marker: boolean
  name: string
  status: SpanStatus
  seq: number
  /** Offset from run start, in ms. */
  startMs: number
  /** Offset from run start, in ms (== startMs for markers / running spans). */
  endMs: number
  durationMs: number | null
  timestamp: string | null
  input?: unknown
  output?: string
  /** Classified failure type (http_5xx, timeout, permission_required, …) for failed tools. */
  errorType?: string
  /** Event-kind-specific payload (decision rationale, routing plan, skill meta, …). */
  detail?: Record<string, unknown>
  depth: number
  children: TraceSpan[]
}

export interface TraceLensTimings {
  route?: string
  ttftMs?: number
  phases?: Record<string, number>
  router?: Record<string, unknown>
  raw?: Record<string, unknown>
}

export interface TraceLensSlowPhase {
  name: string
  ms: number
  thresholdMs: number
}

export interface TraceLensFailedTool {
  tool: string
  status?: string
  error?: string | null
  seq?: number | null
}

export interface TraceLensRepeatedTool {
  tool: string
  count: number
}

export interface TraceLensDiagnostics {
  timings?: TraceLensTimings
  slowPhases: TraceLensSlowPhase[]
  failedTools: TraceLensFailedTool[]
  repeatedTools: TraceLensRepeatedTool[]
  warnings: string[]
  langsmithUrl?: string
  langsmithFilter?: string
}

export interface TraceLensSummary {
  sessionId: string
  status: string
  route?: string
  input: string
  output?: string
  createdAt?: string
  ttftMs?: number
  durationMs?: number
  totalDurationMs?: number
  toolCount: number
  subagentCount: number
  expertCount: number
  skillCount: number
  decisionCount: number
  hitlCount: number
  errorCount: number
  failedToolCount: number
  tokensUsed?: number
  estimatedCostUsd?: number
  cacheHitRatio?: number
  /** 'workforce' when the trace carries a workforce_run_started kickoff event. */
  origin: 'chat' | 'workforce'
  /** Workforce agent display name (workforce runs only). */
  agentName?: string
  /** Run source: manual | schedule | webhook | inbound_email (workforce only). */
  source?: string
  llmCallCount: number
  llmAvgLatencyMs?: number
  /** Total time spent waiting on humans (synthesized hitl_wait spans). */
  hitlWaitMs?: number
}

export interface TraceLensModel {
  /** Root spans (tree). */
  roots: TraceSpan[]
  /** Pre-order flattened spans with depth set — render order for the waterfall. */
  flat: TraceSpan[]
  totalMs: number
  startTs: number | null
  summary: TraceLensSummary
  diagnostics: TraceLensDiagnostics
  rawEventCount: number
}

// ── small typed readers ────────────────────────────────────────────────────

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined
}
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

interface MutableSpan extends Omit<TraceSpan, 'children'> {
  _startTs: number | null
  _closed: boolean
  children: MutableSpan[]
}

const POINT_KIND_BY_TYPE: Record<string, SpanKind> = {
  decision: 'decision',
  routing_plan: 'routing',
  skill_loaded: 'skill',
  skill_scoped: 'skill',
  skill_detection_skipped: 'skill',
  hitl_requested: 'hitl',
  hitl_resolved: 'hitl',
  structured_input_request: 'hitl',
  tool_approval_requested: 'approval',
  tool_approval_resolved: 'approval',
  capability_missing: 'capability_missing',
  artifact_preview: 'artifact',
  artifact_created: 'artifact',
  pack_loaded: 'pack',
  pack_detection_skipped: 'pack',
  policy_applied: 'decision',
  cost_attribution: 'cost',
  workforce_run_started: 'workforce',
  tool_available_summary: 'status'
}

function markerName(type: string, ev: RawTraceEvent): string {
  switch (type) {
    case 'decision':
      return readStr(ev.title) || 'Decision'
    case 'routing_plan': {
      const plan = asRecord(ev.plan)
      const mode = plan ? readStr(plan.mode) : undefined
      return mode ? `Routing plan · ${mode}` : 'Routing plan'
    }
    case 'skill_loaded':
    case 'skill_scoped': {
      const skill = asRecord(ev.skill)
      const name = skill ? readStr(skill.name) || readStr(skill.skill_id) : undefined
      return `Skill: ${name || 'unknown'}`
    }
    case 'skill_detection_skipped':
      return 'Skill detection skipped'
    case 'hitl_requested': {
      const req = asRecord(ev.request)
      return `Human input: ${(req && readStr(req.title)) || 'requested'}`
    }
    case 'hitl_resolved':
      return 'Human input resolved'
    case 'structured_input_request':
      return `Form: ${readStr(ev.title) || 'requested'}`
    case 'tool_approval_requested': {
      const a = asRecord(ev.approval)
      return `Approval: ${(a && readStr(a.tool_ref)) || 'requested'}`
    }
    case 'tool_approval_resolved': {
      const r = asRecord(ev.resolution)
      return `Approval ${(r && readStr(r.decision)) || 'resolved'}`
    }
    case 'capability_missing':
      return `Capability missing: ${readStr(ev.expert_name) || readStr(ev.title) || ''}`.trim()
    case 'artifact_preview':
      return `Artifact ${readStr(ev.subtype) || ''}: ${readStr(ev.title) || readStr(ev.artifact_type) || ''}`.trim()
    case 'artifact_created':
      return `Artifact: ${readStr(ev.name) || ''}`.trim()
    case 'pack_loaded': {
      const pack = asRecord(ev.execution_pack)
      return `Pack loaded: ${(pack && readStr(pack.name)) || ''}`.trim()
    }
    case 'pack_detection_skipped':
      return 'Pack detection skipped'
    case 'policy_applied': {
      const p = asRecord(ev.policy)
      return `Policy: ${(p && readStr(p.title)) || ''}`.trim()
    }
    case 'cost_attribution':
      return 'Cost attribution'
    case 'workforce_run_started': {
      const agent = readStr(ev.agent_name)
      const source = readStr(ev.source)
      const label = agent ? `Run started: ${agent}` : 'Workforce run started'
      return source ? `${label} (${source})` : label
    }
    case 'tool_available_summary':
      return `Tools bound (${readNum(ev.tool_count) ?? 0})`
    default:
      return type
  }
}

function statusFrom(raw: unknown): SpanStatus {
  const s = readStr(raw)
  if (!s) return 'done'
  if (s === 'failed' || s === 'error') return 'failed'
  if (s === 'running' || s === 'pending') return 'running'
  return 'done'
}

/** Build the LangSmith-style span tree from a session's raw trace. */
export function buildTraceLensSpans(session: DeepAgentSession): {
  roots: TraceSpan[]
  flat: TraceSpan[]
  totalMs: number
  startTs: number | null
} {
  const events = ((session.trace ?? []) as unknown[]).filter(
    (e): e is RawTraceEvent => Boolean(e) && typeof e === 'object'
  )
  const sorted = enrichRawTraceEvents([...events].sort((a, b) => (readNum(a.seq) ?? 0) - (readNum(b.seq) ?? 0)))

  const startTs = sorted.reduce<number | null>((min, ev) => {
    const ts = parseTs(ev.timestamp)
    if (ts === null) return min
    return min === null ? ts : Math.min(min, ts)
  }, null)

  const offset = (ts: number | null): number => (ts === null || startTs === null ? 0 : Math.max(0, ts - startTs))

  const byId = new Map<string, MutableSpan>()
  /** Maps ``subagent_id`` (and other aliases) → ``step_id`` for tree nesting. */
  const stepAliases = new Map<string, string>()
  const order: MutableSpan[] = []
  let synthetic = 0

  const resolveParentId = (raw: string | null | undefined): string | null => {
    if (!raw) return null
    if (byId.has(raw)) return raw
    const aliased = stepAliases.get(raw)
    if (aliased && byId.has(aliased)) return aliased
    return null
  }

  const registerStepAlias = (stepId: string, ev: RawTraceEvent): void => {
    const subId = readStr(ev.subagent_id)
    if (subId) stepAliases.set(subId, stepId)
  }

  const delegationInput = (ev: RawTraceEvent): Record<string, unknown> | undefined => {
    const task = readStr(ev.task_summary)
    const agent = readStr(ev.agent_name) ?? readStr(ev.expert_name)
    const description = readStr(ev.agent_description)
    if (!task && !agent && !description) return undefined
    return { task, agent, description }
  }

  const delegationSpanName = (kind: 'subagent' | 'expert', ev: RawTraceEvent): string => {
    const label =
      kind === 'expert'
        ? readStr(ev.expert_name) || readStr(ev.name) || 'expert'
        : readStr(ev.agent_name) || readStr(ev.name) || 'sub-agent'
    return `Delegated → ${label}`
  }

  const open = (
    id: string,
    kind: SpanKind,
    name: string,
    ev: RawTraceEvent,
    extra: Partial<MutableSpan> = {}
  ): MutableSpan => {
    const ts = parseTs(ev.timestamp)
    const span: MutableSpan = {
      id,
      parentId: resolveParentId(readStr(ev.parent_step_id) || readStr(ev.subagent_id)),
      kind,
      marker: false,
      name,
      status: 'running',
      seq: readNum(ev.seq) ?? order.length,
      startMs: offset(ts),
      endMs: offset(ts),
      durationMs: null,
      timestamp: readStr(ev.timestamp) ?? null,
      input: ev.input,
      _startTs: ts,
      _closed: false,
      children: [],
      depth: 0,
      ...extra
    }
    byId.set(id, span)
    order.push(span)
    return span
  }

  const applyErrorMeta = (span: MutableSpan, ev: RawTraceEvent): void => {
    const errorType = readStr(ev.error_type)
    if (!errorType) return
    span.errorType = errorType
    span.detail = { ...span.detail, error_type: errorType }
    if (ev.is_critical === true) span.detail.is_critical = true
  }

  const applyDelegationMeta = (span: MutableSpan, ev: RawTraceEvent, eventType: string): void => {
    if (eventType !== 'subagent_completed' && eventType !== 'expert_completed') return
    const nested = readNum(ev.nested_tool_count)
    if (nested !== undefined) {
      span.detail = { ...span.detail, nested_tool_count: nested }
      if (nested > 0) {
        span.name = `${span.name} · ${nested} nested tool${nested === 1 ? '' : 's'}`
      }
    }
    const taskSummary = readStr(ev.task_summary)
    if (taskSummary) span.detail = { ...span.detail, task_summary: taskSummary }
    const agentDescription = readStr(ev.agent_description)
    if (agentDescription) span.detail = { ...span.detail, agent_description: agentDescription }
    const agentName = readStr(ev.agent_name) || readStr(ev.expert_name)
    if (agentName) span.detail = { ...span.detail, agent_name: agentName }
  }

  const close = (id: string | undefined, ev: RawTraceEvent, eventType = ''): void => {
    if (!id) return
    const span = byId.get(id)
    const ts = parseTs(ev.timestamp)
    const durationMs = readNum(ev.duration_ms) ?? null
    if (!span) {
      // Completed event without a matching start — surface it standalone.
      const created = open(id || `orphan-${synthetic++}`, 'tool', readStr(ev.name) || 'step', ev)
      created.status = statusFrom(ev.status)
      created.output = readStr(ev.output)
      created.durationMs = durationMs
      created._closed = true
      if (durationMs !== null) created.endMs = created.startMs + durationMs
      else created.endMs = offset(ts)
      applyErrorMeta(created, ev)
      applyDelegationMeta(created, ev, eventType)
      return
    }
    span._closed = true
    span.status = statusFrom(ev.status)
    if (readStr(ev.output) !== undefined) span.output = readStr(ev.output)
    if (readStr(ev.name) && !span.name) span.name = readStr(ev.name) as string
    span.durationMs = durationMs ?? (ts !== null && span._startTs !== null ? ts - span._startTs : null)
    span.endMs = durationMs !== null ? span.startMs + durationMs : offset(ts)
    applyErrorMeta(span, ev)
    applyDelegationMeta(span, ev, eventType)
  }

  const addMarker = (type: string, ev: RawTraceEvent): void => {
    const kind = POINT_KIND_BY_TYPE[type] ?? 'status'
    const id = readStr(ev.event_id) || `${type}-${synthetic++}`
    const span = open(id, kind, markerName(type, ev), ev, { marker: true, status: 'info' })
    span.parentId = null
    span.durationMs = 0
    span._closed = true
    span.detail = { type, ...ev }
    // The workforce kickoff event is the run's root: surface the task as the
    // marker output (chat runs get the equivalent via the "User message" row).
    if (type === 'workforce_run_started') span.output = readStr(ev.task)
  }

  for (const ev of sorted) {
    const type = readStr(ev.type) ?? ''
    switch (type) {
      case 'step_started': {
        const stepType = readStr(ev.step_type)
        const kind: SpanKind = stepType === 'subagent' ? 'subagent' : stepType === 'thinking' ? 'thinking' : 'tool'
        open(readStr(ev.step_id) || `step-${synthetic++}`, kind, readStr(ev.name) || stepType || 'step', ev)
        break
      }
      case 'subagent_spawned': {
        const stepId = readStr(ev.step_id) || `sub-${synthetic++}`
        registerStepAlias(stepId, ev)
        open(stepId, 'subagent', delegationSpanName('subagent', ev), ev, {
          input: delegationInput(ev),
          detail: {
            task_summary: readStr(ev.task_summary),
            agent_description: readStr(ev.agent_description),
            agent_name: readStr(ev.agent_name)
          }
        })
        break
      }
      case 'expert_called': {
        const stepId = readStr(ev.step_id) || `exp-${synthetic++}`
        registerStepAlias(stepId, ev)
        open(stepId, 'expert', delegationSpanName('expert', ev), ev, {
          input: delegationInput(ev),
          detail: {
            task_summary: readStr(ev.task_summary),
            agent_description: readStr(ev.agent_description),
            expert_name: readStr(ev.expert_name)
          }
        })
        break
      }
      case 'step_completed':
      case 'subagent_completed':
      case 'expert_completed':
        close(readStr(ev.step_id), ev, type)
        break
      case 'llm_call': {
        // One span per model call, drained right after the call completes —
        // the timestamp marks the end, so backdate the start by the latency.
        const duration = readNum(ev.duration_ms) ?? 0
        const span = open(
          readStr(ev.event_id) || `llm-${synthetic++}`,
          'llm',
          `LLM · ${readStr(ev.model) || 'model'}`,
          ev
        )
        span.startMs = Math.max(0, span.startMs - duration)
        span.endMs = span.startMs + duration
        span.durationMs = duration
        span.status = 'done'
        span._closed = true
        span.output = readStr(ev.completion_preview)
        span.detail = {
          type,
          model: readStr(ev.model),
          stage: readStr(ev.stage),
          prompt_tokens: readNum(ev.prompt_tokens),
          cached_prompt_tokens: readNum(ev.cached_prompt_tokens),
          completion_tokens: readNum(ev.completion_tokens),
          total_tokens: readNum(ev.total_tokens),
          cache_hit_ratio: readNum(ev.cache_hit_ratio),
          cost_usd: readNum(ev.cost_usd),
          finish_reason: readStr(ev.finish_reason)
        }
        break
      }
      case 'hitl_wait': {
        // Synthesized by traceLensEnrich from hitl_requested → hitl_resolved.
        const duration = readNum(ev.duration_ms) ?? null
        const span = open(
          readStr(ev.event_id) || `wait-${synthetic++}`,
          'wait',
          readStr(ev.title) ? `Waiting for human · ${readStr(ev.title)}` : 'Waiting for human',
          ev
        )
        span.durationMs = duration
        span.endMs = duration !== null ? span.startMs + duration : span.startMs
        span.status = 'done'
        span._closed = true
        span.detail = { type, request_id: readStr(ev.request_id), resolved_by: readStr(ev.resolved_by) }
        break
      }
      case 'agent_chunk': {
        const role = readStr(ev.role)
        const chunkKind = readStr(ev.chunk_kind)
        const content = readStr(ev.content) ?? ''
        if (role === 'human') {
          const s = open(readStr(ev.event_id) || `msg-${synthetic++}`, 'message', 'User message', ev, {
            marker: true,
            status: 'info'
          })
          s.parentId = null
          s.durationMs = 0
          s._closed = true
          s.output = content
          s.detail = { role }
        } else if (role === 'ai' && (chunkKind === 'final' || readStr(ev.instant))) {
          const s = open(readStr(ev.event_id) || `msg-${synthetic++}`, 'message', 'Assistant message', ev, {
            marker: true,
            status: 'info'
          })
          s.parentId = null
          s.durationMs = 0
          s._closed = true
          s.output = content
          s.detail = { role, chunk_kind: chunkKind }
        }
        // Incremental ai tokens / tool chunks / status pills are intentionally
        // dropped — tool work is captured by step_started/step_completed spans.
        break
      }
      case 'terminal': {
        const s = open(readStr(ev.event_id) || `terminal-${synthetic++}`, 'terminal', 'Terminal', ev, {
          marker: true
        })
        s.parentId = null
        s.durationMs = 0
        s._closed = true
        s.status = statusFrom(ev.status)
        s.output = readStr(ev.output) ?? undefined
        s.detail = { type, status: readStr(ev.status), duration_ms: readNum(ev.duration_ms) }
        break
      }
      case 'error': {
        const s = open(`error-${synthetic++}`, 'error', readStr(ev.message) || 'Error', ev, { marker: true })
        s.parentId = null
        s.durationMs = 0
        s._closed = true
        s.status = 'failed'
        s.detail = { type, message: readStr(ev.message) }
        break
      }
      case '':
        break
      default:
        if (type in POINT_KIND_BY_TYPE) addMarker(type, ev)
        break
    }
  }

  // Determine run end for any spans still open (running session).
  const knownEnd = order.reduce((max, s) => Math.max(max, s.endMs, s.startMs), 0)
  for (const span of order) {
    if (!span._closed) span.endMs = Math.max(span.startMs, knownEnd)
  }

  // Assemble tree.
  const roots: MutableSpan[] = []
  for (const span of order) {
    const parent = span.parentId ? byId.get(span.parentId) : undefined
    if (parent && parent !== span) parent.children.push(span)
    else roots.push(span)
  }

  const flat: TraceSpan[] = []
  const visit = (span: MutableSpan, depth: number): void => {
    span.depth = depth
    flat.push(span as unknown as TraceSpan)
    span.children.sort((a, b) => a.seq - b.seq)
    for (const child of span.children) visit(child, depth + 1)
  }
  roots.sort((a, b) => a.seq - b.seq)
  for (const root of roots) visit(root, 0)

  const totalMs = Math.max(knownEnd, readNum(session.total_duration_ms) ?? 0)

  return { roots: roots as unknown as TraceSpan[], flat, totalMs, startTs }
}

// ── diagnostics / enrichment ────────────────────────────────────────────────

/** Raw debug-trace payload shape (subset we rely on). */
export interface DebugTracePayload {
  metadata?: Record<string, unknown>
  diagnostics?: Record<string, unknown>
}

export function parseDiagnostics(debug: DebugTracePayload | null | undefined): TraceLensDiagnostics {
  const out: TraceLensDiagnostics = { slowPhases: [], failedTools: [], repeatedTools: [], warnings: [] }
  if (!debug) return out

  const timingsRaw = asRecord(asRecord(debug.metadata)?.timings)
  if (timingsRaw) {
    out.timings = {
      route: readStr(timingsRaw.route),
      ttftMs: readNum(timingsRaw.ttft_ms),
      phases: asRecord(timingsRaw.phases) as Record<string, number> | undefined,
      router: asRecord(timingsRaw.router),
      raw: timingsRaw
    }
  }

  const diag = asRecord(debug.diagnostics)
  if (diag) {
    const slow = Array.isArray(diag.slow_phases) ? diag.slow_phases : []
    out.slowPhases = slow
      .map(asRecord)
      .filter((p): p is Record<string, unknown> => Boolean(p))
      .map(p => ({ name: readStr(p.name) || '', ms: readNum(p.ms) || 0, thresholdMs: readNum(p.threshold_ms) || 0 }))

    const failed = Array.isArray(diag.failed_tools) ? diag.failed_tools : []
    out.failedTools = failed
      .map(asRecord)
      .filter((p): p is Record<string, unknown> => Boolean(p))
      .map(p => ({
        tool: readStr(p.tool) || '',
        status: readStr(p.status),
        error: readStr(p.error) ?? null,
        seq: readNum(p.seq) ?? null
      }))

    const repeated = Array.isArray(diag.repeated_tools) ? diag.repeated_tools : []
    out.repeatedTools = repeated
      .map(asRecord)
      .filter((p): p is Record<string, unknown> => Boolean(p))
      .map(p => ({ tool: readStr(p.tool) || '', count: readNum(p.count) || 0 }))

    if (Array.isArray(diag.warnings)) out.warnings = diag.warnings.filter((w): w is string => typeof w === 'string')

    const ls = asRecord(diag.langsmith)
    if (ls) {
      out.langsmithUrl = readStr(ls.console_url)
      out.langsmithFilter = readStr(ls.filter)
    }
  }
  return out
}

// ── full model ───────────────────────────────────────────────────────────────

export function buildTraceLensModel(session: DeepAgentSession, debug?: DebugTracePayload | null): TraceLensModel {
  const { roots, flat, totalMs, startTs } = buildTraceLensSpans(session)
  const diagnostics = parseDiagnostics(debug)

  const count = (kind: SpanKind): number => flat.filter(s => s.kind === kind && !s.marker).length
  const markerCount = (kind: SpanKind): number => flat.filter(s => s.kind === kind).length

  const cost = (session.cost_summary ?? undefined) as Record<string, unknown> | undefined

  const workforceStart = flat.find(s => s.kind === 'workforce')
  const llmSpans = flat.filter(s => s.kind === 'llm')
  const llmLatencies = llmSpans.map(s => s.durationMs).filter((d): d is number => typeof d === 'number' && d > 0)
  const llmAvgLatencyMs =
    llmLatencies.length > 0 ? Math.round(llmLatencies.reduce((sum, d) => sum + d, 0) / llmLatencies.length) : undefined
  const hitlWaitTotal = flat.filter(s => s.kind === 'wait').reduce((sum, s) => sum + (s.durationMs ?? 0), 0)

  const summary: TraceLensSummary = {
    sessionId: session.session_id,
    status: session.status,
    route: diagnostics.timings?.route,
    input: session.input,
    output: session.output ?? undefined,
    createdAt: session.created_at,
    ttftMs: diagnostics.timings?.ttftMs,
    durationMs: session.duration_ms,
    totalDurationMs: session.total_duration_ms ?? (totalMs || undefined),
    toolCount: count('tool'),
    subagentCount: count('subagent'),
    expertCount: count('expert'),
    skillCount: markerCount('skill'),
    decisionCount: markerCount('decision'),
    hitlCount: markerCount('hitl'),
    errorCount: markerCount('error'),
    failedToolCount: diagnostics.failedTools.length || flat.filter(s => s.status === 'failed' && !s.marker).length,
    tokensUsed: cost ? readNum(cost.tokens_used) : undefined,
    estimatedCostUsd: cost ? readNum(cost.estimated_cost_usd) : undefined,
    cacheHitRatio: cost ? readNum(cost.cache_hit_ratio) : undefined,
    origin: workforceStart ? 'workforce' : 'chat',
    agentName: workforceStart ? readStr(workforceStart.detail?.agent_name) : undefined,
    source: workforceStart ? readStr(workforceStart.detail?.source) : undefined,
    llmCallCount: llmSpans.length,
    llmAvgLatencyMs,
    hitlWaitMs: hitlWaitTotal > 0 ? hitlWaitTotal : undefined
  }

  return { roots, flat, totalMs, startTs, summary, diagnostics, rawEventCount: (session.trace ?? []).length }
}

// ── formatting helpers (shared by UI + exporter) ─────────────────────────────

export function formatMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '—'
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)}s`
  const m = Math.floor(ms / 60_000)
  const s = Math.round((ms % 60_000) / 1000)
  return `${m}m ${s}s`
}

export const SPAN_KIND_LABEL: Record<SpanKind, string> = {
  tool: 'Tool',
  thinking: 'Thinking',
  subagent: 'Sub-agent',
  expert: 'Expert',
  skill: 'Skill',
  decision: 'Decision',
  routing: 'Routing',
  hitl: 'Human-in-the-loop',
  wait: 'Waiting',
  approval: 'Approval',
  capability_missing: 'Capability gap',
  artifact: 'Artifact',
  pack: 'Execution pack',
  cost: 'Cost',
  llm: 'LLM call',
  workforce: 'Workforce',
  status: 'Status',
  message: 'Message',
  terminal: 'Terminal',
  error: 'Error'
}

/** Tailwind (gba:) accent classes per span kind — text + soft bg + bar. */
export const SPAN_KIND_ACCENT: Record<SpanKind, { text: string; bg: string; bar: string }> = {
  tool: { text: 'gba:text-sky-600', bg: 'gba:bg-sky-500/10', bar: 'gba:bg-sky-500' },
  thinking: { text: 'gba:text-slate-500', bg: 'gba:bg-slate-500/10', bar: 'gba:bg-slate-400' },
  subagent: { text: 'gba:text-emerald-600', bg: 'gba:bg-emerald-500/10', bar: 'gba:bg-emerald-500' },
  expert: { text: 'gba:text-violet-600', bg: 'gba:bg-violet-500/10', bar: 'gba:bg-violet-500' },
  skill: { text: 'gba:text-teal-600', bg: 'gba:bg-teal-500/10', bar: 'gba:bg-teal-500' },
  decision: { text: 'gba:text-amber-600', bg: 'gba:bg-amber-500/10', bar: 'gba:bg-amber-500' },
  routing: { text: 'gba:text-amber-600', bg: 'gba:bg-amber-500/10', bar: 'gba:bg-amber-500' },
  hitl: { text: 'gba:text-orange-600', bg: 'gba:bg-orange-500/10', bar: 'gba:bg-orange-500' },
  wait: { text: 'gba:text-orange-600', bg: 'gba:bg-orange-500/10', bar: 'gba:bg-orange-400' },
  approval: { text: 'gba:text-orange-600', bg: 'gba:bg-orange-500/10', bar: 'gba:bg-orange-500' },
  capability_missing: { text: 'gba:text-rose-600', bg: 'gba:bg-rose-500/10', bar: 'gba:bg-rose-500' },
  artifact: { text: 'gba:text-indigo-600', bg: 'gba:bg-indigo-500/10', bar: 'gba:bg-indigo-500' },
  pack: { text: 'gba:text-cyan-600', bg: 'gba:bg-cyan-500/10', bar: 'gba:bg-cyan-500' },
  cost: { text: 'gba:text-fuchsia-600', bg: 'gba:bg-fuchsia-500/10', bar: 'gba:bg-fuchsia-500' },
  llm: { text: 'gba:text-purple-600', bg: 'gba:bg-purple-500/10', bar: 'gba:bg-purple-500' },
  workforce: { text: 'gba:text-emerald-700', bg: 'gba:bg-emerald-500/10', bar: 'gba:bg-emerald-600' },
  status: { text: 'gba:text-muted-foreground', bg: 'gba:bg-muted', bar: 'gba:bg-muted-foreground/40' },
  message: { text: 'gba:text-foreground', bg: 'gba:bg-muted', bar: 'gba:bg-foreground/30' },
  terminal: { text: 'gba:text-emerald-700', bg: 'gba:bg-emerald-500/10', bar: 'gba:bg-emerald-600' },
  error: { text: 'gba:text-rose-700', bg: 'gba:bg-rose-500/10', bar: 'gba:bg-rose-600' }
}

export function prettyValue(value: unknown, maxLen = 0): string {
  if (value === undefined || value === null) return ''
  let text: string
  if (typeof value === 'string') {
    // Try to pretty-print embedded JSON for readability.
    const trimmed = value.trim()
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        text = JSON.stringify(JSON.parse(trimmed), null, 2)
      } catch {
        text = value
      }
    } else {
      text = value
    }
  } else {
    try {
      text = JSON.stringify(value, null, 2)
    } catch {
      text = String(value)
    }
  }
  if (maxLen > 0 && text.length > maxLen) return `${text.slice(0, maxLen)}\n…[truncated ${text.length - maxLen} chars]`
  return text
}

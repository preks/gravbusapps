// Trace Lens — "Copy for Cursor" exporter.
//
// Produces a single deterministic, complete report for one run that is both
// human-readable (indented Markdown call tree) and machine-readable (a fenced
// JSON block with the normalized span tree). Designed to be pasted straight
// into Cursor (or any LLM) to debug what the agent did, in which order, with
// timings and full inputs/outputs.

import { formatMs, prettyValue, SPAN_KIND_LABEL, type TraceLensModel, type TraceSpan } from './traceLensModel'

const IO_CAP = 4000

function statusGlyph(span: TraceSpan): string {
  if (span.marker) return '•'
  if (span.status === 'failed') return '✗'
  if (span.status === 'running') return '…'
  return '✓'
}

function indentBlock(text: string, pad: string): string {
  return text
    .split('\n')
    .map(line => `${pad}${line}`)
    .join('\n')
}

function renderSpan(span: TraceSpan, lines: string[]): void {
  const indent = '  '.repeat(span.depth)
  const timing = span.marker ? `@${formatMs(span.startMs)}` : `${formatMs(span.durationMs)}`
  const errorSuffix = span.errorType ? ` [error_type=${span.errorType}]` : ''
  const header = `${indent}- [${span.seq}] ${statusGlyph(span)} ${SPAN_KIND_LABEL[span.kind]}: ${span.name} (${timing})${errorSuffix}`
  lines.push(header)

  const detailPad = `${indent}    `
  if (span.input !== undefined && span.input !== null && !span.marker) {
    const input = prettyValue(span.input, IO_CAP)
    if (input.trim()) {
      lines.push(`${detailPad}input:`)
      lines.push(indentBlock(input, `${detailPad}  `))
    }
  }
  if (span.output && span.output.trim()) {
    lines.push(`${detailPad}output:`)
    lines.push(indentBlock(prettyValue(span.output, IO_CAP), `${detailPad}  `))
  }
  if (span.detail && Object.keys(span.detail).length > 0) {
    const detail = { ...span.detail }
    delete (detail as Record<string, unknown>).type
    // Decisions carry the most useful free text — surface rationale inline.
    const rationale = typeof detail.rationale === 'string' ? detail.rationale : undefined
    const chosen = typeof detail.chosen === 'string' ? detail.chosen : undefined
    if (chosen) lines.push(`${detailPad}chosen: ${chosen}`)
    if (rationale) lines.push(`${detailPad}rationale: ${rationale}`)
  }
}

export function formatRunForCursor(model: TraceLensModel): string {
  const s = model.summary
  const d = model.diagnostics
  const lines: string[] = []

  lines.push(`# Every Fabric run trace — ${s.sessionId}`)
  lines.push('')
  lines.push('## Summary')
  lines.push(`- status: ${s.status}`)
  lines.push(`- origin: ${s.origin}${s.source ? ` (${s.source})` : ''}`)
  if (s.agentName) lines.push(`- agent: ${s.agentName}`)
  if (s.route) lines.push(`- route: ${s.route}`)
  if (s.createdAt) lines.push(`- created_at: ${s.createdAt}`)
  if (s.ttftMs !== undefined) lines.push(`- ttft: ${formatMs(s.ttftMs)}`)
  if (s.durationMs !== undefined) lines.push(`- turn_duration: ${formatMs(s.durationMs)}`)
  if (s.totalDurationMs !== undefined) lines.push(`- total_duration: ${formatMs(s.totalDurationMs)}`)
  lines.push(
    `- counts: tools=${s.toolCount} subagents=${s.subagentCount} experts=${s.expertCount} skills=${s.skillCount} decisions=${s.decisionCount} hitl=${s.hitlCount} llm_calls=${s.llmCallCount} failed_tools=${s.failedToolCount} errors=${s.errorCount}`
  )
  if (s.llmAvgLatencyMs !== undefined) lines.push(`- llm_avg_latency: ${formatMs(s.llmAvgLatencyMs)}`)
  if (s.hitlWaitMs !== undefined) lines.push(`- human_wait_total: ${formatMs(s.hitlWaitMs)}`)
  if (s.tokensUsed !== undefined || s.estimatedCostUsd !== undefined) {
    const parts: string[] = []
    if (s.tokensUsed !== undefined) parts.push(`tokens=${s.tokensUsed}`)
    if (s.estimatedCostUsd !== undefined) parts.push(`cost_usd=${s.estimatedCostUsd}`)
    if (s.cacheHitRatio !== undefined) parts.push(`cache_hit=${(s.cacheHitRatio * 100).toFixed(0)}%`)
    lines.push(`- cost: ${parts.join(' ')}`)
  }
  lines.push('')
  lines.push('## Input')
  lines.push('```')
  lines.push(prettyValue(s.input, IO_CAP))
  lines.push('```')

  if (d.slowPhases.length || d.failedTools.length || d.repeatedTools.length || d.warnings.length) {
    lines.push('')
    lines.push('## Diagnostics')
    for (const w of d.warnings) lines.push(`- ⚠️ ${w}`)
    for (const p of d.slowPhases)
      lines.push(`- slow phase: ${p.name} = ${formatMs(p.ms)} (threshold ${formatMs(p.thresholdMs)})`)
    for (const t of d.failedTools) lines.push(`- failed tool: ${t.tool}${t.error ? ` — ${t.error}` : ''}`)
    for (const r of d.repeatedTools) lines.push(`- repeated tool: ${r.tool} ×${r.count}`)
    if (d.langsmithUrl)
      lines.push(`- langsmith: ${d.langsmithUrl}${d.langsmithFilter ? ` (filter: ${d.langsmithFilter})` : ''}`)
  }

  lines.push('')
  lines.push('## Call tree (in execution order)')
  lines.push('')
  if (model.flat.length === 0) lines.push('_No trace events recorded._')
  for (const span of model.flat) renderSpan(span, lines)

  if (s.output && s.output.trim()) {
    lines.push('')
    lines.push('## Final output')
    lines.push('```')
    lines.push(prettyValue(s.output, IO_CAP * 2))
    lines.push('```')
  }

  // Machine-readable block: the normalized tree, full (uncapped) I/O.
  lines.push('')
  lines.push('## Machine-readable (normalized trace JSON)')
  lines.push('```json')
  lines.push(JSON.stringify(toExportJson(model), null, 2))
  lines.push('```')

  return lines.join('\n')
}

interface ExportSpan {
  seq: number
  kind: string
  name: string
  status: string
  marker: boolean
  start_ms: number
  end_ms: number
  duration_ms: number | null
  error_type?: string
  input?: unknown
  output?: string
  detail?: Record<string, unknown>
  children: ExportSpan[]
}

function spanToExport(span: TraceSpan): ExportSpan {
  const out: ExportSpan = {
    seq: span.seq,
    kind: span.kind,
    name: span.name,
    status: span.status,
    marker: span.marker,
    start_ms: span.startMs,
    end_ms: span.endMs,
    duration_ms: span.durationMs,
    children: span.children.map(spanToExport)
  }
  if (span.errorType !== undefined) out.error_type = span.errorType
  if (span.input !== undefined) out.input = span.input
  if (span.output !== undefined) out.output = span.output
  if (span.detail && Object.keys(span.detail).length > 0) out.detail = span.detail
  return out
}

export function toExportJson(model: TraceLensModel): Record<string, unknown> {
  return {
    session_id: model.summary.sessionId,
    summary: model.summary,
    diagnostics: model.diagnostics,
    total_ms: model.totalMs,
    tree: model.roots.map(spanToExport)
  }
}

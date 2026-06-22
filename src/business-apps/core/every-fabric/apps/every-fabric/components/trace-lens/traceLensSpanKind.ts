import type { SpanKind } from './traceLensModel'

const SPAN_KIND_I18N_KEY: Record<SpanKind, string> = {
  tool: 'trace-lens-span-kind-tool',
  thinking: 'trace-lens-span-kind-thinking',
  subagent: 'trace-lens-span-kind-subagent',
  expert: 'trace-lens-span-kind-expert',
  skill: 'trace-lens-span-kind-skill',
  decision: 'trace-lens-span-kind-decision',
  routing: 'trace-lens-span-kind-routing',
  hitl: 'trace-lens-span-kind-hitl',
  wait: 'trace-lens-span-kind-wait',
  approval: 'trace-lens-span-kind-approval',
  capability_missing: 'trace-lens-span-kind-capability-missing',
  artifact: 'trace-lens-span-kind-artifact',
  pack: 'trace-lens-span-kind-pack',
  cost: 'trace-lens-span-kind-cost',
  llm: 'trace-lens-span-kind-llm',
  workforce: 'trace-lens-span-kind-workforce',
  status: 'trace-lens-span-kind-status',
  message: 'trace-lens-span-kind-message',
  terminal: 'trace-lens-span-kind-terminal',
  error: 'trace-lens-span-kind-error'
}

export function spanKindLabel(kind: SpanKind, t: (key: string) => string): string {
  return t(SPAN_KIND_I18N_KEY[kind])
}

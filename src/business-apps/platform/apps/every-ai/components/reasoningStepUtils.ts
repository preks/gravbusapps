/**
 * Pure helpers for the Cursor-style reasoning-step UI.
 *
 * Lives in its own module so the unit tests can import the helpers without
 * pulling in the full ``OutputRenderers.tsx`` dependency tree (charts,
 * calendar, design-system primitives, …).
 */
import type {
  AnswerOutput,
  OutputItem,
  ReasoningStepKind,
  ReasoningStepOutput,
  ReasoningStepStatus
} from '../types/models'

/**
 * Short, ALL-CAPS label shown next to the status icon. Lets the user
 * eyeball at-a-glance which kind of step ran (tool call vs. RAG lookup
 * vs. inner GraphQL generation).
 */
export const REASONING_KIND_LABEL: Record<ReasoningStepKind, string> = {
  tool_call: 'Tool',
  handoff: 'Handoff',
  graphql_generate: 'GraphQL',
  graphql_execute: 'GraphQL',
  internal_search: 'Search',
  rag_lookup: 'RAG',
  thought: 'Thought'
}

export const REASONING_STATUS_STYLE: Record<ReasoningStepStatus, string> = {
  running: 'gba:text-primary',
  done: 'gba:text-emerald-600 dark:gba:text-emerald-400',
  error: 'gba:text-destructive'
}

export function formatReasoningDuration(started?: number | null, ended?: number | null): string | null {
  if (typeof started !== 'number' || typeof ended !== 'number') return null
  const seconds = Math.max(0, ended - started)
  if (seconds < 1) return `${Math.round(seconds * 1000)} ms`
  return `${seconds.toFixed(seconds < 10 ? 1 : 0)} s`
}

export function prettifyJson(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

/**
 * Try to extract a human-meaningful "code payload" (GraphQL query, SQL, …)
 * out of a step's ``args`` / ``result`` so we can render it with a syntax
 * hint inline instead of as pure JSON. Looks at conventional key names only
 * — anything unrecognised falls back to prettified JSON.
 */
/**
 * Decide whether the agent has finished delivering its answer for the
 * current turn. The reasoning trail collapses behind a single "Show
 * reasoning" button only after this returns true — until then we keep
 * each step inline so the user can watch the agent think live.
 *
 * "Complete" means the turn contains at least one *finalized* deliverable:
 *   - an ``answer`` without the streaming sentinel,
 *   - a flow proposal / entity card / scheduled meeting / error / etc.
 *
 * Intermediate items (``tool``, ``loading``, ``reasoning_step``,
 * ``reasoning_step_update``, ``text_delta``, document-stream chunks) do
 * NOT count as completion signals.
 */
export function isTurnComplete(outputs: ReadonlyArray<OutputItem | null | undefined>): boolean {
  for (const output of outputs) {
    const outputType = output?.type ?? 'unknown'
    if (
      outputType === 'tool' ||
      outputType === 'loading' ||
      outputType === 'reasoning_step' ||
      outputType === 'reasoning_step_update' ||
      outputType === 'text_delta' ||
      outputType === 'document_stream_start' ||
      outputType === 'document_stream_chunk' ||
      outputType === 'unknown'
    ) {
      continue
    }
    if (outputType === 'answer') {
      const ans = output as AnswerOutput & { __streaming?: boolean }
      if (ans.__streaming !== true) return true
      continue
    }
    return true
  }
  return false
}

/**
 * Extract the short, human-readable narration line attached to a reasoning
 * step (e.g. "Finding teammates of Mike Krupskii in the AI & Machine Learning
 * team"). The backend places it on `args.reason` for every tool call that
 * carries a reason — the same content the legacy ephemeral `tool` chip
 * renders.
 *
 * Rendering this directly on the step lets the description survive past
 * the "Show reasoning" collapse: the legacy `tool` chip is pruned when
 * the final answer arrives, but `reasoning_step` entries are persisted, so
 * any narration we pin to them stays visible inside the expanded panel.
 *
 * Returns `null` when no usable narration is present (handoff steps,
 * thought/RAG steps emitted via the reasoning bus, tool calls the model
 * invoked without a `reason` arg, …) so the renderer can skip the row.
 */
export function extractStepReason(step: ReasoningStepOutput): string | null {
  const explicit = step.narration
  if (typeof explicit === 'string' && explicit.trim()) {
    return explicit.trim()
  }
  const args = step.args
  if (!args || typeof args !== 'object') return null
  const reason = (args as Record<string, unknown>).reason
  if (typeof reason !== 'string') return null
  const trimmed = reason.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Decide which reasoning steps from the current agent turn should render
 * inline in the live chat flow.
 *
 * While the turn is still in progress we surface only the LATEST step (the
 * one the agent is actively working on) so the chat stays calm — earlier
 * steps remain in state and become visible together once the user clicks
 * "Show reasoning" after the canonical answer arrives. Once the turn is
 * complete, the inline render is skipped entirely: all steps are folded
 * into the `ReasoningStepsGroup` collapse instead.
 */
export function selectInlineReasoningStepIds(
  outputs: ReadonlyArray<OutputItem | null | undefined>,
  turnIsComplete: boolean
): ReadonlySet<string> {
  if (turnIsComplete) return new Set<string>()
  let lastId: string | null = null
  for (const output of outputs) {
    if (output?.type === 'reasoning_step') {
      const id = (output as ReasoningStepOutput).id
      if (typeof id === 'string') lastId = id
    }
  }
  return lastId ? new Set<string>([lastId]) : new Set<string>()
}

/**
 * Return all reasoning steps from the current agent turn EXCEPT the latest
 * one — only meaningful while the turn is still in progress.
 *
 * Used by `UnifiedAIMessageRenderer` to back a live "Show previous steps"
 * collapse: the active step keeps rendering inline (so the user can watch
 * the agent think), and earlier steps stay one click away even before the
 * canonical answer arrives. Once the turn is complete we return an empty
 * list — the final `ReasoningStepsGroup` (variant="final") takes over and
 * folds the full trail, including the previously-active step.
 */
export function selectPreviousReasoningSteps(
  outputs: ReadonlyArray<OutputItem | null | undefined>,
  turnIsComplete: boolean
): ReasoningStepOutput[] {
  if (turnIsComplete) return []
  const steps: ReasoningStepOutput[] = []
  for (const output of outputs) {
    if (output?.type === 'reasoning_step') {
      steps.push(output as ReasoningStepOutput)
    }
  }
  if (steps.length <= 1) return []
  return steps.slice(0, -1)
}

export function extractCodeHint(
  kind: ReasoningStepKind,
  payload: unknown
): { language: 'graphql' | 'json'; code: string } | null {
  if (!payload || typeof payload !== 'object') return null
  const record = payload as Record<string, unknown>
  const candidateKey = ['query', 'final_query', 'draft_query', 'graphql'].find(
    k => typeof record[k] === 'string' && (record[k] as string).trim()
  )
  if (!candidateKey) return null
  if (kind === 'graphql_generate' || kind === 'graphql_execute' || kind === 'tool_call') {
    return { language: 'graphql', code: record[candidateKey] as string }
  }
  return { language: 'json', code: record[candidateKey] as string }
}

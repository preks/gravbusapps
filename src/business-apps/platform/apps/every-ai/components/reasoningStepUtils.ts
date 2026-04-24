/**
 * Pure helpers for the Cursor-style reasoning-step UI.
 *
 * Lives in its own module so the unit tests can import the helpers without
 * pulling in the full ``OutputRenderers.tsx`` dependency tree (charts,
 * calendar, design-system primitives, …).
 */
import type { ReasoningStepKind, ReasoningStepStatus } from '../types/models'

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

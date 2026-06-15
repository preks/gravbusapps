// Pure fact extractors for the full-screen run detail. Kept React-free so the
// header/body components stay small and the resolution logic is unit-testable.
//
// The run's `metadata.workforce` block carries the agent display name, trigger
// source, and trigger summary the live feed already surfaces; we read the same
// shape here so the run detail header and the command center agree on "who" and
// "what caused it" without a second request.

import type {
  WorkforceRun,
  WorkforceRunDomainAction,
  WorkforceRunSource,
  WorkforceRunTraceEvent
} from '../workforceTypes'
import { mergeDomainActions, resolveFlowActionsFromTrace } from './flowTraceActions'

function asText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function workforceBlock(run: WorkforceRun): Record<string, unknown> {
  const meta = run.metadata
  if (meta && typeof meta === 'object') {
    const block = (meta as Record<string, unknown>).workforce
    if (block && typeof block === 'object') return block as Record<string, unknown>
  }
  return {}
}

export function resolveAgentName(run: WorkforceRun, nameById: Record<string, string>): string {
  const block = workforceBlock(run)
  return asText(block.agent_display_name) ?? nameById[run.agent_id] ?? run.agent_id.slice(0, 8)
}

export function resolveSource(run: WorkforceRun): WorkforceRunSource | null {
  if (run.source) return run.source
  const raw = asText(workforceBlock(run).source)
  return (raw as WorkforceRunSource | null) ?? null
}

// Trigger name isn't a first-class field on WorkforceRun, so resolve it
// best-effort: the workforce trigger summary first, then the inbound payload
// subject. Returns null when nothing reliable is present.
export function resolveTriggerName(run: WorkforceRun): string | null {
  const trigger = workforceBlock(run).trigger
  if (trigger && typeof trigger === 'object') {
    const name = asText((trigger as Record<string, unknown>).name)
    if (name) return name
  }
  const payload = run.trigger_payload
  if (payload && typeof payload === 'object') {
    return asText((payload as Record<string, unknown>).subject)
  }
  return null
}

// Pull the first plausibly-renderable text field out of an arbitrary
// `pending_structured_input` payload so the operator sees the draft inline.
export function extractDraftBody(payload: Record<string, unknown> | null | undefined): string | null {
  if (!payload) return null
  const candidateKeys = ['draft', 'reply', 'message', 'body', 'email_body', 'content', 'text']
  for (const key of candidateKeys) {
    const value = payload[key]
    if (typeof value === 'string' && value.trim().length > 0) return value
  }
  return null
}

export function extractDraftSubject(payload: Record<string, unknown> | null | undefined): string | null {
  if (!payload) return null
  return asText(payload.subject)
}

// Prefer the generalized `actions` summary; fall back to the legacy CRM-only
// list (tagging it with the `crm` domain) so older runs still render links.
// When a trace is available, also surface flow rows as soon as
// `newwork_trigger_flow` completes — before REST `run.actions` catches up.
export function resolveDomainActions(
  run: WorkforceRun,
  trace?: readonly WorkforceRunTraceEvent[]
): WorkforceRunDomainAction[] {
  const fromRun =
    run.actions && run.actions.length > 0
      ? run.actions
      : (run.crm_actions ?? []).map(action => ({ ...action, domain: 'crm' }))
  return mergeDomainActions(fromRun, resolveFlowActionsFromTrace(trace))
}

export function formatBytes(size: number): string {
  if (!Number.isFinite(size) || size <= 0) return '0 B'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

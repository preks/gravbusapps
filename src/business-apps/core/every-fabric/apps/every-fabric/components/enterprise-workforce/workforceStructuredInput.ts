// Helpers for generic structured-input / tool-permission HITL in the Workforce
// run surfaces. Mirrors `workforceComposeEmail` but for the non-email forms
// (ask_human_structured, tool_permission_request). Detects when the run's
// pending interrupt is a renderable structured form so the run detail and the
// digital workplace dialog can show the same interactive UI as Every Fabric
// chat instead of a read-only preview.

import type { InputFieldSchema, StructuredInputRequestEvent } from '../../types/enterpriseAgent'

const COMPOSE_EMAIL_FORM_ID = 'compose_email'
const TOOL_PERMISSION_FORM_ID = 'tool_permission_request'

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

/**
 * Returns the pending structured-input request when it is an interactive form
 * we can render (a field-based `ask_human_structured` form or a
 * `tool_permission_request`). Returns null for compose_email (handled by
 * `getComposeEmailPending`) and for plain free-text questions without fields.
 */
export function getStructuredInputPending(
  pending: Record<string, unknown> | null | undefined
): StructuredInputRequestEvent | null {
  if (!pending || typeof pending !== 'object') return null

  const formId = typeof pending.form_id === 'string' ? pending.form_id : null
  if (!formId || formId === COMPOSE_EMAIL_FORM_ID) return null

  const isToolPermission = formId === TOOL_PERMISSION_FORM_ID
  const fields = Array.isArray(pending.fields) ? (pending.fields as InputFieldSchema[]) : []
  if (!isToolPermission && fields.length === 0) return null

  const base = pending as Partial<StructuredInputRequestEvent>
  const normalized: StructuredInputRequestEvent = {
    ...(pending as Record<string, unknown>),
    type: 'structured_input_request',
    seq: typeof base.seq === 'number' ? base.seq : 0,
    event_id: asString(base.event_id, formId),
    timestamp: asString(base.timestamp, ''),
    form_id: formId,
    title: asString(base.title, 'Awaiting your input'),
    description: asString(base.description, ''),
    fields,
    allow_partial_submit: base.allow_partial_submit === true
  }
  return normalized
}

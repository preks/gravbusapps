import type { TaskTemplateFormData, TaskTemplateSchedulingType as SchedulingType } from './types'

const LEGACY_EVENTS = 'EVENTS'

function resolvedEventSourceEntityIdForSave(): string | null {
  /** Scope and domain events are mutually exclusive; no per-record event narrowing in payload. */
  return null
}

export interface ParsedTaskTemplateExtensions {
  schedulingType: SchedulingType | 'EVENTS'
  eventTriggerEnabled: boolean
  eventSourceEntityType: string
  eventSourceEntityId: string
  scopeLimited: boolean
  scopedEntityType: string
  scopedEntityId: string
  eventInvestmentGroupRef: string
  eventInvestmentTypeRef: string
}

export function parseTaskTemplateExtensions(
  additionalProperties: Record<string, unknown> | null | undefined
): ParsedTaskTemplateExtensions {
  const ap = additionalProperties || {}
  let schedulingType = (ap.schedulingType as string) || 'ONCE'
  let eventTriggerEnabled = Boolean(ap.eventTriggerEnabled)

  if (schedulingType === LEGACY_EVENTS) {
    eventTriggerEnabled = true
    const migrated = (ap.recurrenceSchedulingType as string) || ''
    schedulingType =
      migrated && migrated !== LEGACY_EVENTS ? migrated : (ap.legacyRecurrenceSchedulingType as string) || 'CUSTOM'
  }

  const scopedEntityType = (ap.scopedEntityType as string) || ''
  const scopedEntityId = (ap.scopedEntityId as string) || ''

  return {
    schedulingType: schedulingType as ParsedTaskTemplateExtensions['schedulingType'],
    eventTriggerEnabled,
    eventSourceEntityType: (ap.eventSourceEntityType as string) || '',
    eventSourceEntityId: (ap.eventSourceEntityId as string) || '',
    scopeLimited: Boolean(ap.scopeLimited ?? (scopedEntityType && scopedEntityId)),
    scopedEntityType,
    scopedEntityId,
    eventInvestmentGroupRef: (ap.eventInvestmentGroupRef as string) || (ap.investmentGroupRef as string) || '',
    eventInvestmentTypeRef: (ap.eventInvestmentTypeRef as string) || (ap.investmentTypeRef as string) || ''
  }
}

/**
 * Enforce exactly one of scope vs domain events for the form. Legacy rows may have both, neither, or one.
 * - Both on: keep **one record** (stricter) and drop event-side values when building form state.
 * - Neither on: default to **domain events** (user must pick entity type before save).
 */
export function normalizeTaskTemplateLinkageForForm(ext: ParsedTaskTemplateExtensions): {
  scopeLimited: boolean
  eventTriggerEnabled: boolean
} {
  if (ext.scopeLimited && ext.eventTriggerEnabled) {
    return { scopeLimited: true, eventTriggerEnabled: false }
  }
  if (!ext.scopeLimited && !ext.eventTriggerEnabled) {
    return { scopeLimited: false, eventTriggerEnabled: true }
  }
  return { scopeLimited: ext.scopeLimited, eventTriggerEnabled: ext.eventTriggerEnabled }
}

/** Merge event/scope + recurrence metadata into additionalProperties for API persistence. */
export function mergeExtensionsIntoAdditionalProperties(
  data: TaskTemplateFormData,
  existingAdditional?: Record<string, unknown> | null
): Record<string, unknown> {
  const base: Record<string, unknown> = existingAdditional != null ? { ...existingAdditional } : {}
  const st = data.schedulingType
  if (st && st !== LEGACY_EVENTS) {
    base.schedulingType = st
  }
  base.eventTriggerEnabled = data.eventTriggerEnabled
  base.eventSourceEntityType = data.eventTriggerEnabled ? data.eventSourceEntityType || null : null
  base.eventSourceEntityId = resolvedEventSourceEntityIdForSave()
  base.scopeLimited = data.scopeLimited
  base.scopedEntityType = data.scopeLimited ? data.scopedEntityType || null : null
  base.scopedEntityId = data.scopeLimited ? data.scopedEntityId || null : null
  base.eventInvestmentGroupRef = data.eventTriggerEnabled ? data.eventInvestmentGroupRef || null : null
  base.eventInvestmentTypeRef = data.eventTriggerEnabled ? data.eventInvestmentTypeRef || null : null
  // Legacy JSON keys still read by some services
  base.investmentGroupRef = data.eventTriggerEnabled ? data.eventInvestmentGroupRef || null : null
  base.investmentTypeRef = data.eventTriggerEnabled ? data.eventInvestmentTypeRef || null : null
  return base
}

export function formSchedulingTypeForInput(
  parsed: ParsedTaskTemplateExtensions
): TaskTemplateFormData['schedulingType'] {
  if (parsed.schedulingType === LEGACY_EVENTS) {
    return 'CUSTOM'
  }
  return parsed.schedulingType as TaskTemplateFormData['schedulingType']
}

/**
 * Target-field adapters for bridging UI field names (which sometimes carry a
 * root segment like `investment.name`) and backend field names (which drop the
 * segment for investment flows).
 */

import type { FieldMapping } from '@/common/components/common-relations/apps/data-import/types'

export type TargetFieldAdapters = {
  uiAllowedFields: Set<string>
  backendAllowedFields: Set<string>
  uiToBackend: Map<string, string>
  backendToUi: Map<string, string>
  ambiguousBackendFields: Set<string>
}

function toBackendTargetField(uiField: string, stripRootSegment: boolean): string {
  if (!stripRootSegment) return uiField
  const separatorIndex = uiField.indexOf('.')
  return separatorIndex > -1 ? uiField.slice(separatorIndex + 1) : uiField
}

export function buildTargetFieldAdapters(targetFields: string[], stripRootSegment: boolean): TargetFieldAdapters {
  const uiAllowedFields = new Set(targetFields)
  const backendAllowedFields = new Set<string>()
  const uiToBackend = new Map<string, string>()
  const backendToUiCandidates = new Map<string, Set<string>>()
  const ambiguousBackendFields = new Set<string>()

  for (const uiField of targetFields) {
    const backendField = toBackendTargetField(uiField, stripRootSegment)
    uiToBackend.set(uiField, backendField)
    backendAllowedFields.add(backendField)

    const candidates = backendToUiCandidates.get(backendField) ?? new Set<string>()
    candidates.add(uiField)
    backendToUiCandidates.set(backendField, candidates)
  }

  const backendToUi = new Map<string, string>()
  for (const [backendField, candidates] of backendToUiCandidates.entries()) {
    if (candidates.size === 1) {
      backendToUi.set(backendField, [...candidates][0])
      continue
    }
    ambiguousBackendFields.add(backendField)
  }

  return {
    uiAllowedFields,
    backendAllowedFields,
    uiToBackend,
    backendToUi,
    ambiguousBackendFields
  }
}

export function toBackendMappings(mappings: FieldMapping[], adapters: TargetFieldAdapters): FieldMapping[] {
  return mappings.map(mapping => ({
    ...mapping,
    targetField: adapters.uiToBackend.get(mapping.targetField) ?? mapping.targetField
  }))
}

export function resolveInitialTargetField(targetField: string, adapters: TargetFieldAdapters): string {
  if (adapters.uiAllowedFields.has(targetField)) return targetField

  const mapped = adapters.backendToUi.get(targetField)
  if (mapped) return mapped

  if (adapters.ambiguousBackendFields.has(targetField)) {
    console.warn(`[Import] Ambiguous backend target field ignored during initial mapping: ${targetField}`)
  }
  return targetField
}

export function restoreUiTargetFieldNames(
  records: Record<string, unknown>[],
  adapters: TargetFieldAdapters
): Record<string, unknown>[] {
  if (records.length === 0) return records

  return records.map(record => {
    const updated = { ...record }
    for (const [backendTarget, uiTarget] of adapters.backendToUi.entries()) {
      if (backendTarget in updated && !(uiTarget in updated)) {
        updated[uiTarget] = updated[backendTarget]
      }
    }
    return updated
  })
}

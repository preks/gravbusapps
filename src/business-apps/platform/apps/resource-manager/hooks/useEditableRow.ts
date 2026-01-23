import { useMemo } from 'react'
import type { UseEditableStateResult } from './useEditableState'

/**
 * Hook to manage editable row state and field access
 * Eliminates duplicate getFieldValue/isFieldEdited logic across table rows
 */
export function useEditableRow<T extends { id: string }>(entry: T, editableState: UseEditableStateResult<T>) {
  const entryId = entry.id
  const edits = editableState.state.editedEntries.get(entryId)
  const hasEdits = editableState.hasEdits(entryId)
  const isSaving = editableState.state.savingEntryId === entryId && editableState.state.isSaving

  // Get field value (edited if exists, otherwise original)
  const getFieldValue = useMemo(
    () => (field: keyof T) => {
      const editedValue = edits?.[field]
      return editedValue !== undefined ? editedValue : entry[field]
    },
    [edits, entry]
  )

  // Check if field is edited
  const isFieldEdited = useMemo(
    () => (field: keyof T) => {
      return editableState.isFieldEdited(entryId, field)
    },
    [editableState, entryId]
  )

  // Normalize array values (handles string[], object[], or mixed arrays)
  const normalizeArrayValue = useMemo(
    () =>
      <K extends keyof T>(field: K): string[] => {
        const rawValue = getFieldValue(field)
        if (!Array.isArray(rawValue)) return []

        return rawValue.map(item => {
          if (typeof item === 'string') return item
          if (typeof item === 'object' && item !== null) {
            return (item as any)?.id || (item as any)?.name || String(item)
          }
          return String(item)
        })
      },
    [getFieldValue]
  )

  return {
    entryId,
    edits,
    hasEdits,
    isSaving,
    getFieldValue,
    isFieldEdited,
    normalizeArrayValue
  }
}

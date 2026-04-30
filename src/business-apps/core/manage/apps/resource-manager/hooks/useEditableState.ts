import React, { useState, useCallback, useMemo } from 'react'

export interface EditableState<T> {
  editedEntries: Map<string, Partial<T>>
  isSaving: boolean
  savingEntryId: string | null
  draftEntryIds: Set<string>
}

export interface UseEditableStateResult<T> {
  state: EditableState<T>
  setState: React.Dispatch<React.SetStateAction<EditableState<T>>>
  getFieldValue: (entryId: string, field: keyof T) => any
  isFieldEdited: (entryId: string, field: keyof T) => boolean
  hasEdits: (entryId: string) => boolean
  isDraft: (entryId: string) => boolean
  onFieldEdit: (entryId: string, field: keyof T, value: any) => void
  onDiscardEntry: (entryId: string) => void
  setSaving: (entryId: string | null, isSaving: boolean) => void
  clearAllEdits: () => void
}

export function useEditableState<T extends { id: string }>(entries: T[]): UseEditableStateResult<T> {
  const [state, setState] = useState<EditableState<T>>({
    editedEntries: new Map(),
    isSaving: false,
    savingEntryId: null,
    draftEntryIds: new Set()
  })

  // Get current value (edited if exists, otherwise original)
  const getFieldValue = useCallback(
    (entryId: string, field: keyof T) => {
      const entry = entries.find(e => e.id === entryId)
      if (!entry) return undefined

      const editedValue = state.editedEntries.get(entryId)?.[field]
      return editedValue ?? entry[field]
    },
    [entries, state.editedEntries]
  )

  // Check if a field has been edited
  const isFieldEdited = useCallback(
    (entryId: string, field: keyof T) => {
      return state.editedEntries.get(entryId)?.[field] !== undefined
    },
    [state.editedEntries]
  )

  // Check if entry has any edits
  const hasEdits = useCallback(
    (entryId: string) => {
      return state.editedEntries.has(entryId) && state.editedEntries.get(entryId) !== undefined
    },
    [state.editedEntries]
  )

  // Check if entry is a draft
  const isDraft = useCallback(
    (entryId: string) => {
      return state.draftEntryIds.has(entryId)
    },
    [state.draftEntryIds]
  )

  // Handle field edit
  const onFieldEdit = useCallback((entryId: string, field: keyof T, value: any) => {
    setState(prev => {
      const newEdited = new Map(prev.editedEntries)
      const currentEdits = newEdited.get(entryId) || {}
      newEdited.set(entryId, {
        ...currentEdits,
        [field]: value
      })
      return {
        ...prev,
        editedEntries: newEdited
      }
    })
  }, [])

  // Discard edits for an entry
  const onDiscardEntry = useCallback((entryId: string) => {
    setState(prev => {
      const newEdited = new Map(prev.editedEntries)
      newEdited.delete(entryId)
      return {
        ...prev,
        editedEntries: newEdited
      }
    })
  }, [])

  // Set saving state
  const setSaving = useCallback((entryId: string | null, isSaving: boolean) => {
    setState(prev => ({
      ...prev,
      isSaving,
      savingEntryId: entryId
    }))
  }, [])

  // Clear all edits
  const clearAllEdits = useCallback(() => {
    setState(prev => ({
      ...prev,
      editedEntries: new Map()
    }))
  }, [])

  return useMemo(
    () => ({
      state,
      setState,
      getFieldValue,
      isFieldEdited,
      hasEdits,
      isDraft,
      onFieldEdit,
      onDiscardEntry,
      setSaving,
      clearAllEdits
    }),
    [
      state,
      setState,
      getFieldValue,
      isFieldEdited,
      hasEdits,
      isDraft,
      onFieldEdit,
      onDiscardEntry,
      setSaving,
      clearAllEdits
    ]
  )
}

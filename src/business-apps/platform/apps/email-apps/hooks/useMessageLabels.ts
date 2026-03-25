import { useState, useEffect, useMemo, useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { useLabelSuggestions } from './useLabelSuggestions'
import { normalizeLabelName, normalizeLabelObjects } from '../utils/labelUtils'
import { runOptimisticLabelMutation } from '../utils/runOptimisticLabelMutation'
import type { AddLabelInput, EmailLabel } from '../types'

interface UseMessageLabelsArgs {
  messageId?: string
  labels?: unknown
  isEditorOpen: boolean
  setIsEditorOpen?: Dispatch<SetStateAction<boolean>>
  onAddLabels: (labels: AddLabelInput[]) => Promise<EmailLabel[] | null>
  onRemoveLabel: (label: string) => Promise<EmailLabel[] | null>
  closeEditorOnSuccess?: boolean
  onAddSuccess?: (updatedLabels: EmailLabel[]) => Promise<void> | void
  onAddError?: () => void
  onRemoveSuccess?: (updatedLabels: EmailLabel[]) => Promise<void> | void
  onRemoveError?: () => void
}

export const useMessageLabels = ({
  messageId,
  labels,
  isEditorOpen,
  setIsEditorOpen,
  onAddLabels,
  onRemoveLabel,
  closeEditorOnSuccess = false,
  onAddSuccess,
  onAddError,
  onRemoveSuccess,
  onRemoveError
}: UseMessageLabelsArgs) => {
  const [labelInput, setLabelInput] = useState('')
  const [selectedLabelColor, setSelectedLabelColor] = useState<string | null>(null)
  const [editingLabelOriginalName, setEditingLabelOriginalName] = useState<string | null>(null)
  const [isMutatingLabels, setIsMutatingLabels] = useState(false)
  const [localLabels, setLocalLabels] = useState<EmailLabel[]>(normalizeLabelObjects(labels || []))
  const [suggestionRefreshTick, setSuggestionRefreshTick] = useState(0)
  const [activeLabelSuggestionIndex, setActiveLabelSuggestionIndex] = useState(-1)

  useEffect(() => {
    setLocalLabels(normalizeLabelObjects(labels || []))
  }, [labels])

  useEffect(() => {
    setLabelInput('')
    setSelectedLabelColor(null)
    setEditingLabelOriginalName(null)
    setActiveLabelSuggestionIndex(-1)
    setIsEditorOpen?.(false)
  }, [messageId, setIsEditorOpen])

  useEffect(() => {
    if (isEditorOpen) return
    setLabelInput('')
    setSelectedLabelColor(null)
    setEditingLabelOriginalName(null)
    setActiveLabelSuggestionIndex(-1)
  }, [isEditorOpen])

  useEffect(() => {
    setActiveLabelSuggestionIndex(-1)
  }, [labelInput, isEditorOpen])

  const existingLabelNames = useMemo(() => localLabels.map(label => label.name), [localLabels])
  const { suggestions: labelSuggestions, isLoading: isLoadingSuggestions } = useLabelSuggestions({
    query: labelInput,
    existingLabels: existingLabelNames,
    refreshKey: suggestionRefreshTick
  })

  const submitLabelDraft = useCallback(
    async (rawName: string) => {
      if (!messageId || isMutatingLabels) return

      const previousName = editingLabelOriginalName ? normalizeLabelName(editingLabelOriginalName) : null
      const nextName = previousName ?? normalizeLabelName(rawName)
      if (!nextName) return

      const color =
        typeof selectedLabelColor === 'string' && selectedLabelColor.trim() ? selectedLabelColor.trim() : undefined
      const payload: AddLabelInput = color ? { name: nextName, color } : { name: nextName }
      const previous = localLabels

      setLabelInput('')
      await runOptimisticLabelMutation({
        previousLabels: previous,
        setLocalLabels,
        setIsMutating: setIsMutatingLabels,
        getOptimisticLabels: existing => {
          const merged = previousName ? existing.filter(label => label.name !== previousName) : [...existing]
          const idx = merged.findIndex(label => label.name === nextName)
          const nextLabel: EmailLabel = {
            id: idx >= 0 ? merged[idx].id : '',
            name: nextName,
            color: payload.color || null
          }
          if (idx >= 0) {
            merged[idx] = nextLabel
          } else {
            merged.push(nextLabel)
          }
          return normalizeLabelObjects(merged)
        },
        mutate: async () => {
          if (previousName && previousName !== nextName) {
            const removed = await onRemoveLabel(previousName)
            if (!removed) throw new Error('Failed to rename label')
          }
          const result = await onAddLabels([payload])
          if (!result) throw new Error('Failed to add labels')
          return normalizeLabelObjects(result)
        },
        onSuccess: async updatedLabels => {
          if (closeEditorOnSuccess) {
            setIsEditorOpen?.(false)
          }
          setSelectedLabelColor(null)
          setEditingLabelOriginalName(null)
          setSuggestionRefreshTick(prev => prev + 1)
          await onAddSuccess?.(updatedLabels)
        },
        onError: () => {
          onAddError?.()
        }
      })
    },
    [
      messageId,
      isMutatingLabels,
      editingLabelOriginalName,
      selectedLabelColor,
      localLabels,
      onRemoveLabel,
      onAddLabels,
      closeEditorOnSuccess,
      setIsEditorOpen,
      onAddSuccess,
      onAddError
    ]
  )

  const handleAddFromMenu = useCallback(async () => {
    const name = normalizeLabelName(labelInput)
    await submitLabelDraft(name)
  }, [submitLabelDraft, labelInput])

  const handleAddSuggestionFromMenu = useCallback(
    async (suggestionName: string) => {
      await submitLabelDraft(suggestionName)
    },
    [submitLabelDraft]
  )

  const handleStartEditFromMenu = useCallback(
    (label: EmailLabel) => {
      setEditingLabelOriginalName(label.name)
      setLabelInput(label.name)
      setSelectedLabelColor(label.color)
      setIsEditorOpen?.(true)
    },
    [setIsEditorOpen]
  )

  const handleRemoveFromMenu = useCallback(
    async (label: string) => {
      if (!isMutatingLabels) {
        const normalizedName = normalizeLabelName(label)
        if (!normalizedName) return

        await runOptimisticLabelMutation({
          previousLabels: localLabels,
          setLocalLabels,
          setIsMutating: setIsMutatingLabels,
          getOptimisticLabels: existing => existing.filter(current => current.name !== normalizedName),
          mutate: async () => {
            const result = await onRemoveLabel(normalizedName)
            if (!result) throw new Error('Failed to remove label')
            return normalizeLabelObjects(result)
          },
          onSuccess: async updatedLabels => {
            setSuggestionRefreshTick(prev => prev + 1)
            await onRemoveSuccess?.(updatedLabels)
          },
          onError: () => {
            onRemoveError?.()
          }
        })
      }
    },
    [isMutatingLabels, localLabels, onRemoveLabel, onRemoveSuccess, onRemoveError]
  )

  const shouldShowLabelSuggestions = !editingLabelOriginalName && normalizeLabelName(labelInput).length > 0

  return {
    labelInput,
    setLabelInput,
    selectedLabelColor,
    setSelectedLabelColor,
    editingLabelOriginalName,
    setEditingLabelOriginalName,
    isMutatingLabels,
    localLabels,
    labelSuggestions,
    isLoadingSuggestions,
    activeLabelSuggestionIndex,
    setActiveLabelSuggestionIndex,
    shouldShowLabelSuggestions,
    handleAddFromMenu,
    handleAddSuggestionFromMenu,
    handleStartEditFromMenu,
    handleRemoveFromMenu
  }
}

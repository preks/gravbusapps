import { useState, useEffect, useMemo, useCallback } from 'react'
import { useLabelSuggestions } from './useLabelSuggestions'
import { normalizeLabelName, normalizeLabelObjects } from '../utils/labelUtils'
import { runOptimisticLabelMutation } from '../utils/runOptimisticLabelMutation'
import type { AddLabelInput, EmailLabel, EmailMessageSummary } from '../types'

interface UseEmailListItemLabelsArgs {
  message: EmailMessageSummary
  onAddLabels: (labels: AddLabelInput[]) => Promise<EmailLabel[] | null>
  onRemoveLabel: (label: string) => Promise<EmailLabel[] | null>
}

export const useEmailListItemLabels = ({ message, onAddLabels, onRemoveLabel }: UseEmailListItemLabelsArgs) => {
  const [isLabelsExpanded, setIsLabelsExpanded] = useState(false)
  const [labelInput, setLabelInput] = useState('')
  const [selectedLabelColor, setSelectedLabelColor] = useState<string | null>(null)
  const [editingLabelOriginalName, setEditingLabelOriginalName] = useState<string | null>(null)
  const [isMutatingLabels, setIsMutatingLabels] = useState(false)
  const [localLabels, setLocalLabels] = useState<EmailLabel[]>(normalizeLabelObjects(message.labels || []))
  const [suggestionRefreshTick, setSuggestionRefreshTick] = useState(0)
  const [activeLabelSuggestionIndex, setActiveLabelSuggestionIndex] = useState(-1)

  useEffect(() => {
    setLocalLabels(normalizeLabelObjects(message.labels || []))
  }, [message.labels])

  useEffect(() => {
    setLabelInput('')
    setSelectedLabelColor(null)
    setEditingLabelOriginalName(null)
    setIsLabelsExpanded(false)
    setActiveLabelSuggestionIndex(-1)
  }, [message.id])

  useEffect(() => {
    if (isLabelsExpanded) return
    setLabelInput('')
    setSelectedLabelColor(null)
    setEditingLabelOriginalName(null)
    setActiveLabelSuggestionIndex(-1)
  }, [isLabelsExpanded])

  useEffect(() => {
    setActiveLabelSuggestionIndex(-1)
  }, [labelInput, isLabelsExpanded])

  const existingLabelNames = useMemo(() => localLabels.map(label => label.name), [localLabels])

  const { suggestions: labelSuggestions, isLoading: isLoadingSuggestions } = useLabelSuggestions({
    query: labelInput,
    existingLabels: existingLabelNames,
    refreshKey: suggestionRefreshTick
  })

  const addLabelsFromMenu = useCallback(
    async (labelsToAdd: AddLabelInput[]) => {
      if (isMutatingLabels) return

      const previousName = editingLabelOriginalName ? normalizeLabelName(editingLabelOriginalName) : null
      const requestedName = previousName ?? normalizeLabelName(labelsToAdd[0]?.name || '')
      if (!requestedName) return

      const color =
        typeof labelsToAdd[0]?.color === 'string' && labelsToAdd[0].color?.trim()
          ? labelsToAdd[0].color.trim()
          : undefined
      const payload: AddLabelInput = color ? { name: requestedName, color } : { name: requestedName }

      setLabelInput('')
      await runOptimisticLabelMutation({
        previousLabels: localLabels,
        setLocalLabels,
        setIsMutating: setIsMutatingLabels,
        getOptimisticLabels: existing => {
          const merged = previousName ? existing.filter(label => label.name !== previousName) : [...existing]
          const idx = merged.findIndex(label => label.name === requestedName)
          const nextLabel: EmailLabel = {
            id: idx >= 0 ? merged[idx].id : '',
            name: requestedName,
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
          if (previousName && previousName !== requestedName) {
            const removed = await onRemoveLabel(previousName)
            if (!removed) throw new Error('Failed to rename label')
          }

          const result = await onAddLabels([payload])
          if (!result) throw new Error('Failed to add labels')
          return normalizeLabelObjects(result)
        },
        onSuccess: () => {
          setSelectedLabelColor(null)
          setEditingLabelOriginalName(null)
          setSuggestionRefreshTick(prev => prev + 1)
        }
      })
    },
    [isMutatingLabels, localLabels, editingLabelOriginalName, onAddLabels, onRemoveLabel]
  )

  const handleAddFromMenu = useCallback(async () => {
    const name = normalizeLabelName(labelInput)
    await addLabelsFromMenu([{ name, ...(selectedLabelColor ? { color: selectedLabelColor } : {}) }])
  }, [addLabelsFromMenu, labelInput, selectedLabelColor])

  const handleAddSuggestionFromMenu = useCallback(
    async (suggestionName: string) => {
      await addLabelsFromMenu([{ name: suggestionName, ...(selectedLabelColor ? { color: selectedLabelColor } : {}) }])
    },
    [addLabelsFromMenu, selectedLabelColor]
  )

  const handleStartEditFromMenu = useCallback((label: EmailLabel) => {
    setEditingLabelOriginalName(label.name)
    setLabelInput(label.name)
    setSelectedLabelColor(label.color)
    setIsLabelsExpanded(true)
  }, [])

  const handleRemoveFromMenu = useCallback(
    async (label: string) => {
      if (isMutatingLabels) return
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
        onSuccess: () => {
          setSuggestionRefreshTick(prev => prev + 1)
        }
      })
    },
    [isMutatingLabels, localLabels, onRemoveLabel]
  )

  const shouldShowLabelSuggestions = !editingLabelOriginalName && normalizeLabelName(labelInput).length > 0

  return {
    isLabelsExpanded,
    setIsLabelsExpanded,
    labelInput,
    setLabelInput,
    selectedLabelColor,
    setSelectedLabelColor,
    editingLabelOriginalName,
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

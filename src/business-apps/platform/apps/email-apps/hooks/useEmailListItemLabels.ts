import { useState } from 'react'
import { useMessageLabels } from './useMessageLabels'
import type { AddLabelInput, EmailLabel, EmailMessageSummary } from '../types'

interface UseEmailListItemLabelsArgs {
  message: EmailMessageSummary
  onAddLabels: (labels: AddLabelInput[]) => Promise<EmailLabel[] | null>
  onRemoveLabel: (label: string) => Promise<EmailLabel[] | null>
}

export const useEmailListItemLabels = ({ message, onAddLabels, onRemoveLabel }: UseEmailListItemLabelsArgs) => {
  const [isLabelsExpanded, setIsLabelsExpanded] = useState(false)
  const {
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
  } = useMessageLabels({
    messageId: message.id,
    labels: message.labels,
    isEditorOpen: isLabelsExpanded,
    setIsEditorOpen: setIsLabelsExpanded,
    onAddLabels,
    onRemoveLabel
  })

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

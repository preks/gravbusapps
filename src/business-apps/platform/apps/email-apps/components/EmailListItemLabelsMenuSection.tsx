import React from 'react'
import { EditableLabelList } from './labels/EditableLabelList'
import { LabelColorPickerGrid } from './labels/LabelColorPickerGrid'
import { LabelEditorPanel } from './labels/LabelEditorPanel'
import type { EmailLabel } from '../types'

interface EmailListItemLabelsMenuSectionProps {
  messageId: string
  testId: string
  labelInput: string
  setLabelInput: React.Dispatch<React.SetStateAction<string>>
  editingLabelOriginalName: string | null
  isMutatingLabels: boolean
  shouldShowLabelSuggestions: boolean
  labelSuggestions: { id: string; name: string }[]
  activeLabelSuggestionIndex: number
  setActiveLabelSuggestionIndex: React.Dispatch<React.SetStateAction<number>>
  labelSuggestionsContent: React.ReactNode
  localLabels: EmailLabel[]
  selectedLabelColor: string | null
  setSelectedLabelColor: React.Dispatch<React.SetStateAction<string | null>>
  onAddFromMenu: () => Promise<void>
  onAddSuggestionFromMenu: (suggestionName: string) => Promise<void>
  onStartEditFromMenu: (label: EmailLabel) => void
  onRemoveFromMenu: (labelName: string) => Promise<void>
  t: (key: string, vars?: Record<string, string | number>) => string
}

export const EmailListItemLabelsMenuSection: React.FC<EmailListItemLabelsMenuSectionProps> = ({
  messageId,
  testId,
  labelInput,
  setLabelInput,
  editingLabelOriginalName,
  isMutatingLabels,
  shouldShowLabelSuggestions,
  labelSuggestions,
  activeLabelSuggestionIndex,
  setActiveLabelSuggestionIndex,
  labelSuggestionsContent,
  localLabels,
  selectedLabelColor,
  setSelectedLabelColor,
  onAddFromMenu,
  onAddSuggestionFromMenu,
  onStartEditFromMenu,
  onRemoveFromMenu,
  t
}) => {
  return (
    <div className="gba:px-1.5 gba:py-1.5 gba:space-y-1.5">
      <LabelEditorPanel
        labelInput={labelInput}
        setLabelInput={setLabelInput}
        editingLabelOriginalName={editingLabelOriginalName}
        isMutatingLabels={isMutatingLabels}
        shouldShowLabelSuggestions={shouldShowLabelSuggestions}
        labelSuggestions={labelSuggestions}
        activeLabelSuggestionIndex={activeLabelSuggestionIndex}
        setActiveLabelSuggestionIndex={setActiveLabelSuggestionIndex}
        onAddSuggestion={onAddSuggestionFromMenu}
        onSubmit={onAddFromMenu}
        placeholder={t('list-context-labels-placeholder')}
        inputTestId={`${testId}-context-labels-input`}
        addButtonTestId={`${testId}-context-labels-add`}
        labelSuggestionsContent={labelSuggestionsContent}
      />
      {localLabels.length === 0 ? (
        <p className="gba:text-xs gba:text-muted-foreground gba:px-1">{t('list-context-labels-empty')}</p>
      ) : (
        <div className="gba:max-h-40 gba:overflow-auto gba:space-y-1">
          <EditableLabelList
            labels={localLabels}
            messageId={messageId}
            isMutating={isMutatingLabels}
            variant="menu"
            keyPrefix="menu-label"
            editTestIdPrefix={`${testId}-context-label-edit`}
            removeTestIdPrefix={`${testId}-context-label-remove`}
            onStartEdit={onStartEditFromMenu}
            onRemove={labelName => void onRemoveFromMenu(labelName)}
          />
        </div>
      )}
      <div className="gba:space-y-0.5">
        <p className="gba:m-0 gba:text-xs gba:leading-none gba:text-muted-foreground">
          {t('list-context-labels-color-title')}
        </p>
        <LabelColorPickerGrid
          selectedColor={selectedLabelColor}
          onToggleColor={hex => setSelectedLabelColor(prev => (prev === hex ? null : hex))}
          testIdPrefix={`${testId}-context-label-color`}
        />
      </div>
    </div>
  )
}

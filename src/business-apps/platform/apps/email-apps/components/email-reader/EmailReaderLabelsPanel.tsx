import React from 'react'
import { Button, Popover, PopoverContent, PopoverTrigger } from '@newwork/nw-design-system'
import { Plus } from 'lucide-react'
import { EditableLabelList } from '../labels/EditableLabelList'
import { LabelColorPickerGrid } from '../labels/LabelColorPickerGrid'
import { LabelEditorPanel } from '../labels/LabelEditorPanel'
import type { EmailLabel } from '../../types'

interface EmailReaderLabelsPanelProps {
  messageId: string
  localLabels: EmailLabel[]
  labelsInput: string
  setLabelsInput: React.Dispatch<React.SetStateAction<string>>
  selectedLabelColor: string | null
  setSelectedLabelColor: React.Dispatch<React.SetStateAction<string | null>>
  editingLabelOriginalName: string | null
  setEditingLabelOriginalName: React.Dispatch<React.SetStateAction<string | null>>
  isAddLabelMenuOpen: boolean
  setIsAddLabelMenuOpen: React.Dispatch<React.SetStateAction<boolean>>
  isMutatingLabels: boolean
  shouldShowLabelSuggestions: boolean
  labelSuggestions: { id: string; name: string }[]
  activeLabelSuggestionIndex: number
  setActiveLabelSuggestionIndex: React.Dispatch<React.SetStateAction<number>>
  labelSuggestionsContent: React.ReactNode
  onHandleAddLabel: () => Promise<void>
  onAddSuggestion: (suggestionName: string) => Promise<void>
  onStartEditLabel: (label: EmailLabel) => void
  onRemoveLabel: (label: string) => Promise<void>
  t: (key: string, vars?: Record<string, string | number>) => string
  testId: string
}

export const EmailReaderLabelsPanel: React.FC<EmailReaderLabelsPanelProps> = ({
  messageId,
  localLabels,
  labelsInput,
  setLabelsInput,
  selectedLabelColor,
  setSelectedLabelColor,
  editingLabelOriginalName,
  setEditingLabelOriginalName,
  isAddLabelMenuOpen,
  setIsAddLabelMenuOpen,
  isMutatingLabels,
  shouldShowLabelSuggestions,
  labelSuggestions,
  activeLabelSuggestionIndex,
  setActiveLabelSuggestionIndex,
  labelSuggestionsContent,
  onHandleAddLabel,
  onAddSuggestion,
  onStartEditLabel,
  onRemoveLabel,
  t,
  testId
}) => {
  return (
    <div className="gba:mb-4 gba:space-y-2">
      <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-1.5">
        <span className="gba:text-xs gba:text-muted-foreground">{t('reader-labels-title')}</span>
        {localLabels.length === 0 && (
          <span className="gba:text-xs gba:text-muted-foreground">{t('reader-labels-empty')}</span>
        )}
        <EditableLabelList
          labels={localLabels}
          messageId={messageId}
          isMutating={isMutatingLabels}
          variant="inline"
          keyPrefix="label"
          editTestIdPrefix={`${testId}-edit-label`}
          removeTestIdPrefix={`${testId}-remove-label`}
          onStartEdit={onStartEditLabel}
          onRemove={labelName => void onRemoveLabel(labelName)}
        />
        <div className="gba:inline-flex gba:items-center">
          <Popover
            open={isAddLabelMenuOpen}
            onOpenChange={open => {
              setIsAddLabelMenuOpen(open)
              if (!open) {
                setLabelsInput('')
                setSelectedLabelColor(null)
                setEditingLabelOriginalName(null)
              }
            }}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="gba:h-5 gba:w-5"
                disabled={isMutatingLabels}
                data-testid={`${testId}-labels-menu-toggle`}
              >
                <Plus className="gba:w-3 gba:h-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              side="bottom"
              sideOffset={8}
              onOpenAutoFocus={event => {
                if (editingLabelOriginalName) event.preventDefault()
              }}
              className="gba:z-50 gba:w-40 gba:border gba:rounded-md gba:bg-popover gba:p-1.5 gba:space-y-1.5"
              data-testid={`${testId}-labels-menu`}
            >
              <LabelEditorPanel
                labelInput={labelsInput}
                setLabelInput={setLabelsInput}
                editingLabelOriginalName={editingLabelOriginalName}
                isMutatingLabels={isMutatingLabels}
                shouldShowLabelSuggestions={shouldShowLabelSuggestions}
                labelSuggestions={labelSuggestions}
                activeLabelSuggestionIndex={activeLabelSuggestionIndex}
                setActiveLabelSuggestionIndex={setActiveLabelSuggestionIndex}
                onAddSuggestion={onAddSuggestion}
                onSubmit={onHandleAddLabel}
                placeholder={t('reader-labels-input-placeholder')}
                inputTestId={`${testId}-labels-input`}
                addButtonTestId={`${testId}-labels-add`}
                inputClassName="gba:h-6 gba:min-w-0 gba:flex-1 gba:text-xs gba:placeholder:text-xs"
                labelSuggestionsContent={labelSuggestionsContent}
              />
              <div className="gba:space-y-0.5">
                <p className="gba:m-0 gba:text-xs gba:leading-none gba:text-muted-foreground">
                  {t('reader-labels-color-title')}
                </p>
                <LabelColorPickerGrid
                  selectedColor={selectedLabelColor}
                  onToggleColor={hex => setSelectedLabelColor(prev => (prev === hex ? null : hex))}
                  testIdPrefix={`${testId}-label-color`}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  )
}

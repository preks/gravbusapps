import React from 'react'
import { Input, Button, Badge } from '@newwork/nw-design-system'
import { Plus, Check, X } from 'lucide-react'
import { LABEL_COLOR_PALETTE, getLabelChipClassName } from '../utils/labelUtils'
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
      <div className="gba:flex gba:w-full gba:items-center gba:gap-1">
        <Input
          value={labelInput}
          onChange={event => setLabelInput(event.target.value)}
          readOnly={!!editingLabelOriginalName}
          onKeyDown={event => {
            if (event.key === 'ArrowDown' && shouldShowLabelSuggestions && labelSuggestions.length > 0) {
              event.preventDefault()
              setActiveLabelSuggestionIndex(prev => Math.min(prev + 1, labelSuggestions.length - 1))
              return
            }
            if (event.key === 'ArrowUp' && shouldShowLabelSuggestions && labelSuggestions.length > 0) {
              event.preventDefault()
              setActiveLabelSuggestionIndex(prev => Math.max(prev - 1, -1))
              return
            }
            if (event.key === 'Enter') {
              event.preventDefault()
              if (activeLabelSuggestionIndex >= 0 && labelSuggestions[activeLabelSuggestionIndex]) {
                void onAddSuggestionFromMenu(labelSuggestions[activeLabelSuggestionIndex].name)
                return
              }
              void onAddFromMenu()
            }
          }}
          placeholder={t('list-context-labels-placeholder')}
          className="gba:h-6 gba:min-w-0 gba:flex-1 gba:text-xs"
          data-testid={`${testId}-context-labels-input`}
        />
        <Button
          variant="outline"
          size="sm"
          className="gba:h-6 gba:w-6 gba:px-0"
          onClick={() => void onAddFromMenu()}
          disabled={isMutatingLabels}
          data-testid={`${testId}-context-labels-add`}
        >
          {editingLabelOriginalName ? (
            <Check className="gba:w-3.5 gba:h-3.5" />
          ) : (
            <Plus className="gba:w-3.5 gba:h-3.5" />
          )}
        </Button>
      </div>
      {shouldShowLabelSuggestions && (
        <div className="gba:border gba:rounded-md gba:p-1.5 gba:space-y-1">{labelSuggestionsContent}</div>
      )}
      {localLabels.length === 0 ? (
        <p className="gba:text-xs gba:text-muted-foreground gba:px-1">{t('list-context-labels-empty')}</p>
      ) : (
        <div className="gba:max-h-40 gba:overflow-auto gba:space-y-1">
          {localLabels.map(label => (
            <div
              key={`${messageId}-menu-label-${label.id || label.name}`}
              className="gba:flex gba:w-full gba:items-center gba:gap-1"
            >
              <button
                type="button"
                className="gba:flex-1 gba:inline-flex"
                onClick={() => onStartEditFromMenu(label)}
                disabled={isMutatingLabels}
                data-testid={`${testId}-context-label-edit-${label.name}`}
              >
                <Badge
                  variant="secondary"
                  className={`gba:text-[10px] gba:h-6 gba:w-full gba:justify-start ${getLabelChipClassName(label.color)}`}
                >
                  {label.name}
                </Badge>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="gba:h-6 gba:w-6"
                onClick={() => void onRemoveFromMenu(label.name)}
                disabled={isMutatingLabels}
                data-testid={`${testId}-context-label-remove-${label.name}`}
              >
                <X className="gba:w-3 gba:h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="gba:space-y-0.5">
        <p className="gba:m-0 gba:text-xs gba:leading-none gba:text-muted-foreground">
          {t('list-context-labels-color-title')}
        </p>
        <div className="gba:grid gba:w-fit gba:grid-cols-4 gba:gap-x-5 gba:gap-y-1">
          {LABEL_COLOR_PALETTE.map(option => (
            <button
              key={option.id}
              type="button"
              className={`gba:h-5 gba:w-5 gba:rounded-sm gba:border ${option.swatchClassName} ${
                selectedLabelColor === option.hex ? 'gba:ring-2 gba:ring-primary-ring gba:ring-offset-1' : ''
              }`}
              onClick={() => setSelectedLabelColor(prev => (prev === option.hex ? null : option.hex))}
              data-testid={`${testId}-context-label-color-${option.id}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

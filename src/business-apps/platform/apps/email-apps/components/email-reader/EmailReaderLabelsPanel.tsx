import React from 'react'
import { Badge, Button, Input, Popover, PopoverContent, PopoverTrigger } from '@newwork/nw-design-system'
import { Plus, X, Check } from 'lucide-react'
import { LABEL_COLOR_PALETTE, getLabelChipClassName } from '../../utils/labelUtils'
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
        {localLabels.map(label => (
          <span
            key={`${messageId}-label-${label.id || label.name}`}
            className="gba:inline-flex gba:items-center gba:gap-1"
          >
            <button
              type="button"
              className="gba:inline-flex"
              onClick={() => onStartEditLabel(label)}
              disabled={isMutatingLabels}
              data-testid={`${testId}-edit-label-${label.name}`}
            >
              <Badge variant="secondary" className={`gba:h-5 gba:text-[10px] ${getLabelChipClassName(label.color)}`}>
                {label.name}
              </Badge>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="gba:h-5 gba:w-5"
              onClick={() => void onRemoveLabel(label.name)}
              disabled={isMutatingLabels}
              data-testid={`${testId}-remove-label-${label.name}`}
            >
              <X className="gba:w-3 gba:h-3" />
            </Button>
          </span>
        ))}
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
              <div className="gba:flex gba:w-full gba:items-center gba:gap-1">
                <Input
                  value={labelsInput}
                  onChange={e => setLabelsInput(e.target.value)}
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
                        void onAddSuggestion(labelSuggestions[activeLabelSuggestionIndex].name)
                        return
                      }
                      void onHandleAddLabel()
                    }
                  }}
                  placeholder={t('reader-labels-input-placeholder')}
                  className="gba:h-6 gba:min-w-0 gba:flex-1 gba:text-xs gba:placeholder:text-xs"
                  data-testid={`${testId}-labels-input`}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void onHandleAddLabel()}
                  disabled={isMutatingLabels}
                  className="gba:h-6 gba:w-6 gba:px-0"
                  data-testid={`${testId}-labels-add`}
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
              <div className="gba:space-y-0.5">
                <p className="gba:m-0 gba:text-xs gba:leading-none gba:text-muted-foreground">
                  {t('reader-labels-color-title')}
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
                      data-testid={`${testId}-label-color-${option.id}`}
                    />
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  )
}

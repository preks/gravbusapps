import React from 'react'
import { Input, Button } from '@newwork/nw-design-system'
import { Plus, Check } from 'lucide-react'

interface LabelSuggestionItem {
  id: string
  name: string
}

interface LabelEditorPanelProps {
  labelInput: string
  setLabelInput: React.Dispatch<React.SetStateAction<string>>
  editingLabelOriginalName: string | null
  isMutatingLabels: boolean
  shouldShowLabelSuggestions: boolean
  labelSuggestions: LabelSuggestionItem[]
  activeLabelSuggestionIndex: number
  setActiveLabelSuggestionIndex: React.Dispatch<React.SetStateAction<number>>
  onAddSuggestion: (suggestionName: string) => Promise<void>
  onSubmit: () => Promise<void>
  placeholder: string
  inputTestId: string
  addButtonTestId: string
  inputClassName?: string
  labelSuggestionsContent: React.ReactNode
}

export const LabelEditorPanel: React.FC<LabelEditorPanelProps> = ({
  labelInput,
  setLabelInput,
  editingLabelOriginalName,
  isMutatingLabels,
  shouldShowLabelSuggestions,
  labelSuggestions,
  activeLabelSuggestionIndex,
  setActiveLabelSuggestionIndex,
  onAddSuggestion,
  onSubmit,
  placeholder,
  inputTestId,
  addButtonTestId,
  inputClassName = 'gba:h-6 gba:min-w-0 gba:flex-1 gba:text-xs',
  labelSuggestionsContent
}) => {
  return (
    <>
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
                void onAddSuggestion(labelSuggestions[activeLabelSuggestionIndex].name)
                return
              }
              void onSubmit()
            }
          }}
          placeholder={placeholder}
          className={inputClassName}
          data-testid={inputTestId}
        />
        <Button
          variant="outline"
          size="sm"
          className="gba:h-6 gba:w-6 gba:px-0"
          onClick={() => void onSubmit()}
          disabled={isMutatingLabels}
          data-testid={addButtonTestId}
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
    </>
  )
}

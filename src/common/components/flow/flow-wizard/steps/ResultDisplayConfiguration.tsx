import React from 'react'
import { Label, Select, Textarea } from '@newwork/nw-design-system'
import { Eye } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

type ResultDisplayMode = 'all' | 'include' | 'exclude'

interface ResultDisplayConfigurationProps {
  step: any
  testId: string
  onUpdateStep: (updates: any) => void
}

function parseFields(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map(field => field.trim())
    .filter(Boolean)
}

function fieldsToText(fields: unknown): string {
  return Array.isArray(fields) ? fields.filter(field => typeof field === 'string').join('\n') : ''
}

export const ResultDisplayConfiguration: React.FC<ResultDisplayConfigurationProps> = ({
  step,
  testId,
  onUpdateStep
}) => {
  const configuredFields = Array.isArray(step.resultDisplay?.fields) ? step.resultDisplay.fields : []
  const mode: ResultDisplayMode = step.resultDisplay
    ? step.resultDisplay.mode === 'exclude'
      ? 'exclude'
      : 'include'
    : 'all'

  const updateMode = (nextMode: ResultDisplayMode) => {
    if (nextMode === 'all') {
      onUpdateStep({ resultDisplay: undefined })
      return
    }

    onUpdateStep({
      resultDisplay: {
        mode: nextMode,
        fields: configuredFields
      }
    })
  }

  const updateFields = (value: string) => {
    if (mode === 'all') return

    onUpdateStep({
      resultDisplay: {
        mode,
        fields: parseFields(value)
      }
    })
  }

  return (
    <div className="gba:space-y-4 gba:pt-2">
      <div className="gba:rounded-md gba:border gba:border-border gba:bg-muted/20 gba:p-3 gba:text-sm gba:text-muted-foreground">
        <div className="gba:mb-1 gba:flex gba:items-center gba:gap-2 gba:font-medium gba:text-foreground">
          <Eye className="gba:h-4 gba:w-4" />
          {getTranslationFromI18nKeyAndLabel('flow.creator.resultDisplay.title', 'Captured data display')}
        </div>
        <p>
          {getTranslationFromI18nKeyAndLabel(
            'flow.creator.resultDisplay.description',
            'Choose which captured fields are shown in approval result views. HTTP metadata is always hidden.'
          )}
        </p>
      </div>

      <div className="gba:space-y-2" data-testid={`${testId}-result-display-mode-field`}>
        <Label htmlFor={`${testId}-result-display-mode`}>
          {getTranslationFromI18nKeyAndLabel('flow.creator.resultDisplay.mode', 'Display mode')}:
        </Label>
        <Select
          id={`${testId}-result-display-mode`}
          value={mode}
          onChange={event => updateMode(event.target.value as ResultDisplayMode)}
          data-testid={`${testId}-result-display-mode-select`}
        >
          <option value="all">
            {getTranslationFromI18nKeyAndLabel('flow.creator.resultDisplay.showAll', 'Show all fields')}
          </option>
          <option value="include">
            {getTranslationFromI18nKeyAndLabel('flow.creator.resultDisplay.include', 'Show only selected fields')}
          </option>
          <option value="exclude">
            {getTranslationFromI18nKeyAndLabel('flow.creator.resultDisplay.exclude', 'Hide selected fields')}
          </option>
        </Select>
      </div>

      <div className="gba:space-y-2" data-testid={`${testId}-result-display-fields-field`}>
        <Label htmlFor={`${testId}-result-display-fields`}>
          {getTranslationFromI18nKeyAndLabel('flow.creator.resultDisplay.fields', 'Field keys')}:
        </Label>
        <Textarea
          id={`${testId}-result-display-fields`}
          value={fieldsToText(configuredFields)}
          onChange={event => updateFields(event.target.value)}
          disabled={mode === 'all'}
          placeholder={'overall_risk\nfix_summary\nevidence'}
          className="gba:min-h-[120px]"
          data-testid={`${testId}-result-display-fields-input`}
        />
        <p className="gba:text-xs gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel(
            'flow.creator.resultDisplay.fieldsHelp',
            'Enter one field per line or separate fields with commas. Matching ignores case and separators.'
          )}
        </p>
      </div>
    </div>
  )
}

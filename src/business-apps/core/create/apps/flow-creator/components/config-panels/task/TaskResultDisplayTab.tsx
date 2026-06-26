import React from 'react'
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea
} from '@newwork/nw-design-system'
import { Eye } from 'lucide-react'
import type { StepResultDisplay } from '@/common/data/flow/types/flowTemplate'
import type { FlowStudioUpdateOptions, TaskNodeConfig } from '../../../types/studioTypes'

type ResultDisplayMode = 'all' | 'include' | 'exclude'

interface TaskResultDisplayTabProps {
  config: TaskNodeConfig
  update: (partial: Partial<TaskNodeConfig>, options?: FlowStudioUpdateOptions) => void
  t: (key: string) => string
  testId: string
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

function resolveMode(resultDisplay?: StepResultDisplay): ResultDisplayMode {
  if (!resultDisplay) return 'all'
  return resultDisplay.mode === 'exclude' ? 'exclude' : 'include'
}

export const TaskResultDisplayTab: React.FC<TaskResultDisplayTabProps> = ({ config, update, t, testId }) => {
  const configuredFields = Array.isArray(config.resultDisplay?.fields) ? config.resultDisplay.fields : []
  const mode = resolveMode(config.resultDisplay)

  const updateMode = (nextMode: ResultDisplayMode) => {
    if (nextMode === 'all') {
      update({ resultDisplay: undefined })
      return
    }

    update({
      resultDisplay: {
        mode: nextMode,
        fields: configuredFields
      }
    })
  }

  const updateFields = (value: string) => {
    if (mode === 'all') return

    update({
      resultDisplay: {
        mode,
        fields: parseFields(value)
      }
    })
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-4">
      <div className="gba:rounded-lg gba:border gba:border-border gba:bg-muted/40 gba:p-3 gba:text-sm gba:text-muted-foreground">
        <div className="gba:mb-1 gba:flex gba:items-center gba:gap-2 gba:font-medium gba:text-foreground">
          <Eye className="gba:h-4 gba:w-4" />
          {t('result-display-title')}
        </div>
        <p>{t('result-display-description')}</p>
      </div>

      <div className="gba:flex gba:flex-col gba:gap-1.5" data-testid={`${testId}-result-display-mode-field`}>
        <Label className="gba:text-xs" htmlFor={`${testId}-result-display-mode`}>
          {t('result-display-mode')}
        </Label>
        <Select value={mode} onValueChange={value => updateMode(value as ResultDisplayMode)}>
          <SelectTrigger id={`${testId}-result-display-mode`} data-testid={`${testId}-result-display-mode-select`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('result-display-show-all')}</SelectItem>
            <SelectItem value="include">{t('result-display-include')}</SelectItem>
            <SelectItem value="exclude">{t('result-display-exclude')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="gba:flex gba:flex-col gba:gap-1.5" data-testid={`${testId}-result-display-fields-field`}>
        <Label className="gba:text-xs" htmlFor={`${testId}-result-display-fields`}>
          {t('result-display-fields')}
        </Label>
        <Textarea
          id={`${testId}-result-display-fields`}
          value={fieldsToText(configuredFields)}
          onChange={event => updateFields(event.target.value)}
          disabled={mode === 'all'}
          placeholder={'overall_risk\nfix_summary\nevidence'}
          className="gba:min-h-[120px] gba:bg-background"
          data-testid={`${testId}-result-display-fields-input`}
        />
        <p className="gba:text-xs gba:text-muted-foreground">{t('result-display-fields-help')}</p>
      </div>
    </div>
  )
}

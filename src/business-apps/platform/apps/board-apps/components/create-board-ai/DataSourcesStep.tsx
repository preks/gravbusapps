/**
 * DataSourcesStep - the data source review & field selection step
 * within the AI board creation dialog.
 */

import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { AIDataSourceSuggestions } from './AIDataSourceSuggestions'
import type { DataSourceSuggestion } from '../../hooks/useBoardAI'

export interface DataSourcesStepProps {
  suggestions: DataSourceSuggestion[]
  selectedDS: Set<string>
  onToggle: (entityType: string) => void
  onSetPrimary: (entityType: string) => void
  isAnalyzing: boolean
  summary?: string
  onAnalyze: () => void
  hasPrompt: boolean
  importLimit: string
  onImportLimitChange: (value: string) => void
  fieldSelections: Map<string, Set<string>>
  onToggleField: (entityType: string, fieldKey: string) => void
  'data-testid'?: string
}

export const DataSourcesStep: React.FC<DataSourcesStepProps> = ({
  suggestions,
  selectedDS,
  onToggle,
  onSetPrimary,
  isAnalyzing,
  summary,
  onAnalyze,
  hasPrompt,
  importLimit,
  onImportLimitChange,
  fieldSelections,
  onToggleField,
  'data-testid': testId = 'ds-step'
}) => (
  <div className="gba:py-2 gba:space-y-3">
    <AIDataSourceSuggestions
      suggestions={suggestions}
      selected={selectedDS}
      onToggle={onToggle}
      onSetPrimary={onSetPrimary}
      isAnalyzing={isAnalyzing}
      summary={summary}
      onAnalyze={onAnalyze}
      hasPrompt={hasPrompt}
      fieldSelections={fieldSelections}
      onToggleField={onToggleField}
      data-testid={`${testId}-suggestions`}
    />
    <div className="gba:flex gba:items-center gba:gap-2 gba:pt-1">
      <span className="gba:text-xs gba:text-muted-foreground gba:whitespace-nowrap">Records to import:</span>
      <Select value={importLimit} onValueChange={onImportLimitChange} data-testid={`${testId}-import-limit`}>
        <SelectTrigger className="gba:h-7 gba:w-28 gba:text-xs" data-testid={`${testId}-import-limit-trigger`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="50">50</SelectItem>
          <SelectItem value="100">100</SelectItem>
          <SelectItem value="500">500</SelectItem>
          <SelectItem value="1000">1 000</SelectItem>
          <SelectItem value="all">All</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
)

import React from 'react'
import { Input, Label, Checkbox } from '@newwork/nw-design-system'

export interface PromptStepProps {
  prompt: string
  onPromptChange: (v: string) => void
  includeSampleData: boolean
  onIncludeSampleDataChange: (v: boolean) => void
  suggestDataSources: boolean
  onSuggestDataSourcesChange: (v: boolean) => void
  error: string | null
  busy: boolean
  testId: string
}

export const PromptStep: React.FC<PromptStepProps> = ({
  prompt,
  onPromptChange,
  includeSampleData,
  onIncludeSampleDataChange,
  suggestDataSources,
  onSuggestDataSourcesChange,
  error,
  busy,
  testId
}) => (
  <div className="gba:py-3 gba:space-y-3">
    <div>
      <Label htmlFor="ai-prompt" className="gba:text-xs gba:mb-1 gba:block">
        Describe what you want to build
      </Label>
      <Input
        id="ai-prompt"
        placeholder="e.g. Employee onboarding board with candidates, departments and managers"
        value={prompt}
        onChange={e => onPromptChange(e.target.value)}
        autoFocus
        disabled={busy}
        data-testid={`${testId}-prompt`}
      />
    </div>
    <label className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer">
      <Checkbox
        checked={includeSampleData}
        onCheckedChange={v => onIncludeSampleDataChange(Boolean(v))}
        data-testid={`${testId}-sample-data`}
      />
      <span className="gba:text-xs">Generate sample data (10 rows)</span>
    </label>
    <label className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer">
      <Checkbox
        checked={suggestDataSources}
        onCheckedChange={v => onSuggestDataSourcesChange(Boolean(v))}
        data-testid={`${testId}-suggest-ds`}
      />
      <span className="gba:text-xs">Suggest system data sources</span>
    </label>
    <p className="gba:text-xs gba:text-muted-foreground">
      AI will create columns, views, groups, and dashboard widgets based on your description.
      {suggestDataSources ? ' It will also analyze which NEWWORK system data can populate your board.' : ''}
    </p>
    {error && <p className="gba:text-xs gba:text-destructive">{error}</p>}
  </div>
)

/**
 * AIDataSourceSuggestions - displays AI-suggested system data sources split
 * into a PRIMARY row source (radio - all suggestions as candidates) and
 * AUXILIARY select-options sources (checkboxes for non-primary entities).
 */

import React, { useMemo } from 'react'
import { Badge, Checkbox, Button, Spinner } from '@newwork/nw-design-system'
import { Database, TableProperties, ListFilter, RefreshCw, Star } from 'lucide-react'
import type { DataSourceSuggestion } from '../../hooks/useBoardAI'
import { ENTITY_REGISTRY, ENTITY_CATEGORY_LABELS, type EntityCategory } from '../../queries/entityQueries'
import { FieldSelector } from './FieldSelector'

export interface AIDataSourceSuggestionsProps {
  suggestions: DataSourceSuggestion[]
  selected: Set<string>
  onToggle: (entityType: string) => void
  onSetPrimary: (entityType: string) => void
  isAnalyzing: boolean
  summary?: string
  onAnalyze: () => void
  hasPrompt: boolean
  fieldSelections?: Map<string, Set<string>>
  onToggleField?: (entityType: string, fieldKey: string) => void
  'data-testid'?: string
}

export const AIDataSourceSuggestions: React.FC<AIDataSourceSuggestionsProps> = ({
  suggestions,
  selected,
  onToggle,
  onSetPrimary,
  isAnalyzing,
  summary,
  onAnalyze,
  hasPrompt,
  fieldSelections,
  onToggleField,
  'data-testid': testId = 'ai-datasource-suggestions'
}) => {
  const primaryEntity = useMemo(() => suggestions.find(s => s.role === 'primary')?.entityType, [suggestions])
  const auxiliarySources = useMemo(
    () => suggestions.filter(s => s.entityType !== primaryEntity).sort((a, b) => b.confidence - a.confidence),
    [suggestions, primaryEntity]
  )

  if (isAnalyzing) {
    return (
      <div className="gba:flex gba:flex-col gba:items-center gba:gap-2 gba:py-8" data-testid={testId}>
        <Spinner size="sm" />
        <p className="gba:text-sm gba:text-muted-foreground">Analyzing available system data...</p>
      </div>
    )
  }

  if (suggestions.length === 0) {
    return (
      <div className="gba:flex gba:flex-col gba:items-center gba:gap-2 gba:py-8" data-testid={testId}>
        <Database className="gba:w-8 gba:h-8 gba:text-muted-foreground" />
        <p className="gba:text-sm gba:text-muted-foreground gba:text-center">
          No data sources found. Try adjusting your board description.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onAnalyze}
          disabled={!hasPrompt}
          data-testid={`${testId}-retry-btn`}
        >
          <RefreshCw className="gba:w-3.5 gba:h-3.5 gba:mr-1" /> Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="gba:space-y-4" data-testid={testId}>
      {summary && <p className="gba:text-xs gba:text-muted-foreground gba:leading-relaxed">{summary}</p>}

      <div className="gba:max-h-[50vh] gba:overflow-y-auto gba:space-y-4 gba:pr-1">
        <PrimarySection
          suggestions={suggestions}
          primaryEntity={primaryEntity}
          onSetPrimary={onSetPrimary}
          fieldSelections={fieldSelections}
          onToggleField={onToggleField}
          testId={testId}
        />

        {auxiliarySources.length > 0 && (
          <AuxiliarySection sources={auxiliarySources} selected={selected} onToggle={onToggle} testId={testId} />
        )}
      </div>

      <div className="gba:flex gba:items-center gba:justify-between">
        <p className="gba:text-xs gba:text-muted-foreground">
          {selected.size} of {suggestions.length} source{suggestions.length !== 1 ? 's' : ''} selected
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onAnalyze}
          disabled={!hasPrompt}
          className="gba:text-xs gba:h-6 gba:px-2"
          data-testid={`${testId}-reanalyze-btn`}
        >
          <RefreshCw className="gba:w-3 gba:h-3 gba:mr-1" /> Re-analyze
        </Button>
      </div>
    </div>
  )
}

interface PrimarySectionProps {
  suggestions: DataSourceSuggestion[]
  primaryEntity?: string
  onSetPrimary: (entityType: string) => void
  fieldSelections?: Map<string, Set<string>>
  onToggleField?: (entityType: string, fieldKey: string) => void
  testId: string
}

const PrimarySection: React.FC<PrimarySectionProps> = ({
  suggestions,
  primaryEntity,
  onSetPrimary,
  fieldSelections,
  onToggleField,
  testId
}) => (
  <div className="gba:space-y-1.5">
    <div className="gba:flex gba:items-center gba:gap-1.5">
      <Star className="gba:w-3.5 gba:h-3.5 gba:text-primary" />
      <span className="gba:text-xs gba:font-semibold gba:text-foreground">Primary data source (board rows)</span>
    </div>
    <p className="gba:text-[11px] gba:text-muted-foreground">
      Records from this source become the main rows. Select one:
    </p>
    <div className="gba:space-y-0.5">
      {suggestions.map(s => {
        const isActive = s.entityType === primaryEntity
        const entityDef = ENTITY_REGISTRY[s.entityType]
        const catLabel = entityDef ? ENTITY_CATEGORY_LABELS[entityDef.category as EntityCategory] : undefined

        if (!isActive) {
          return (
            <button
              key={s.entityType}
              type="button"
              onClick={() => onSetPrimary(s.entityType)}
              className="gba:w-full gba:text-left gba:flex gba:items-center gba:gap-2 gba:py-1 gba:px-1 gba:rounded gba:hover:bg-accent/50 gba:transition-colors"
              data-testid={`${testId}-primary-${s.entityType}`}
            >
              <div className="gba:w-3.5 gba:h-3.5 gba:rounded-full gba:border-2 gba:border-muted-foreground gba:shrink-0" />
              <Database className="gba:w-3 gba:h-3 gba:text-muted-foreground gba:shrink-0" />
              <span className="gba:text-sm gba:text-muted-foreground">{entityDef?.displayName || s.entityType}</span>
              {catLabel && (
                <Badge variant="secondary" className="gba:text-[10px] gba:py-0 gba:shrink-0">
                  {catLabel}
                </Badge>
              )}
            </button>
          )
        }

        return (
          <div
            key={s.entityType}
            className="gba:rounded-md gba:border gba:border-primary gba:bg-primary/5 gba:p-2.5"
            data-testid={`${testId}-primary-${s.entityType}`}
          >
            <button type="button" onClick={() => onSetPrimary(s.entityType)} className="gba:w-full gba:text-left">
              <div className="gba:flex gba:items-center gba:gap-2">
                <div className="gba:w-3.5 gba:h-3.5 gba:rounded-full gba:border-2 gba:border-primary gba:shrink-0 gba:flex gba:items-center gba:justify-center">
                  <div className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-primary" />
                </div>
                <Database className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground gba:shrink-0" />
                <span className="gba:text-sm gba:font-medium gba:truncate">
                  {entityDef?.displayName || s.entityType}
                </span>
                {catLabel && (
                  <Badge variant="secondary" className="gba:text-[10px] gba:py-0 gba:shrink-0">
                    {catLabel}
                  </Badge>
                )}
                <Badge variant="outline" className="gba:text-[10px] gba:py-0 gba:shrink-0 gba:ml-auto">
                  <TableProperties className="gba:w-2.5 gba:h-2.5 gba:mr-0.5" /> Rows
                </Badge>
              </div>
              <p className="gba:text-xs gba:text-muted-foreground gba:mt-1 gba:pl-[22px]">{s.purpose}</p>
            </button>
            {fieldSelections && onToggleField && (
              <div className="gba:pl-[22px]">
                <FieldSelector
                  entityType={s.entityType}
                  selectedFields={fieldSelections.get(s.entityType) ?? new Set()}
                  onToggleField={onToggleField}
                  data-testid={`${testId}-fields-${s.entityType}`}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  </div>
)

interface AuxiliarySectionProps {
  sources: DataSourceSuggestion[]
  selected: Set<string>
  onToggle: (entityType: string) => void
  testId: string
}

const AuxiliarySection: React.FC<AuxiliarySectionProps> = ({ sources, selected, onToggle, testId }) => (
  <div className="gba:space-y-2">
    <div className="gba:flex gba:items-center gba:gap-1.5">
      <ListFilter className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground" />
      <span className="gba:text-xs gba:font-semibold gba:text-foreground">Dropdown options (select columns)</span>
    </div>
    <p className="gba:text-[11px] gba:text-muted-foreground">
      These sources populate select/dropdown columns with real values:
    </p>
    <div className="gba:space-y-1.5">
      {sources.map(s => {
        const isSelected = selected.has(s.entityType)
        const entityDef = ENTITY_REGISTRY[s.entityType]
        return (
          <div
            key={s.entityType}
            className={`gba:rounded-md gba:border gba:p-2.5 gba:transition-colors ${
              isSelected ? 'gba:border-primary gba:bg-primary/5' : 'gba:border-border'
            }`}
            data-testid={`${testId}-aux-${s.entityType}`}
          >
            <div className="gba:flex gba:items-start gba:gap-2">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggle(s.entityType)}
                className="gba:mt-0.5 gba:shrink-0"
                data-testid={`${testId}-aux-${s.entityType}-cb`}
              />
              <div className="gba:flex-1 gba:min-w-0">
                <div className="gba:flex gba:items-center gba:gap-1.5">
                  <span className="gba:text-sm gba:font-medium">{entityDef?.displayName || s.entityType}</span>
                  <Badge variant="outline" className="gba:text-[10px] gba:py-0 gba:shrink-0 gba:ml-auto">
                    <ListFilter className="gba:w-2.5 gba:h-2.5 gba:mr-0.5" /> Select Options
                  </Badge>
                </div>
                <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">{s.purpose}</p>
                {s.targetColumn && s.sourceField && (
                  <p className="gba:text-[10px] gba:text-muted-foreground gba:mt-0.5">
                    {s.sourceField} &rarr; column &ldquo;{s.targetColumn}&rdquo;
                  </p>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  </div>
)

import React, { useMemo } from 'react'
import {
  Button,
  Badge,
  Label,
  Spinner,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@newwork/nw-design-system'
import { ChevronLeft, Sparkles, Rows3, Columns3, GitMerge, ListChecks } from 'lucide-react'
import type { MergePlan } from '../../hooks/useBoardAI'
import type { BoardColumn } from '../../types'
import type { EntityQueryDef } from '../../queries/entityQueries'

type Strategy = MergePlan['strategy']

export interface MergePreviewProps {
  entityDef: EntityQueryDef
  existingColumns: BoardColumn[]
  mergePlan: MergePlan | null
  isAnalyzing: boolean
  aiError: string | null
  strategy: Strategy
  onStrategyChange: (s: Strategy) => void
  joinExistingCol: string
  onJoinExistingColChange: (col: string) => void
  joinNewCol: string
  onJoinNewColChange: (col: string) => void
  populateTargetCol: string
  onPopulateTargetColChange: (col: string) => void
  populateSourceField: string
  onPopulateSourceFieldChange: (field: string) => void
  selectedFields: string[]
  onBack: () => void
  onNext: () => void
  'data-testid'?: string
}

const STRATEGY_INFO: Record<Strategy, { icon: React.ElementType; label: string; desc: string }> = {
  populateOptions: {
    icon: ListChecks,
    label: 'Populate column options',
    desc: 'Use imported values as dropdown options for an existing column (e.g. employee names for "Assigned To")'
  },
  addRows: { icon: Rows3, label: 'Add as new rows', desc: 'Import records as separate rows alongside existing data' },
  addColumns: {
    icon: Columns3,
    label: 'Enrich existing rows',
    desc: 'Match records by a key and add new fields as columns'
  },
  hybrid: { icon: GitMerge, label: 'Hybrid', desc: 'Enrich matched rows, add unmatched as new rows' }
}

const STRATEGY_ORDER: Strategy[] = ['populateOptions', 'addRows', 'addColumns', 'hybrid']

export const MergePreview: React.FC<MergePreviewProps> = ({
  entityDef,
  existingColumns,
  mergePlan,
  isAnalyzing,
  aiError,
  strategy,
  onStrategyChange,
  joinExistingCol,
  onJoinExistingColChange,
  joinNewCol,
  onJoinNewColChange,
  populateTargetCol,
  onPopulateTargetColChange,
  populateSourceField,
  onPopulateSourceFieldChange,
  selectedFields,
  onBack,
  onNext,
  'data-testid': testId = 'merge-preview'
}) => {
  const needsJoinKey = strategy === 'addColumns' || strategy === 'hybrid'
  const needsPopulateConfig = strategy === 'populateOptions'

  const existingColOptions = useMemo(
    () => existingColumns.filter(c => c.type === 'text' || c.type === 'number' || c.type === 'email'),
    [existingColumns]
  )

  const selectableColumns = existingColumns

  const canContinue = useMemo(() => {
    if (isAnalyzing) return false
    if (needsJoinKey && (!joinExistingCol || !joinNewCol)) return false
    if (needsPopulateConfig && (!populateTargetCol || !populateSourceField)) return false
    return true
  }, [
    isAnalyzing,
    needsJoinKey,
    joinExistingCol,
    joinNewCol,
    needsPopulateConfig,
    populateTargetCol,
    populateSourceField
  ])

  return (
    <div data-testid={testId}>
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
        <Button variant="ghost" size="sm" onClick={onBack} data-testid={`${testId}-back`}>
          <ChevronLeft className="gba:w-4 gba:h-4 gba:mr-1" /> Back
        </Button>
        <Badge variant="secondary">Combine data</Badge>
      </div>

      <p className="gba:text-xs gba:text-muted-foreground gba:mb-4">
        This board already has data. Choose how to combine {entityDef.displayName} with existing records.
      </p>

      {isAnalyzing && (
        <div className="gba:flex gba:items-center gba:gap-2 gba:rounded gba:border gba:border-border gba:p-3 gba:mb-4 gba:bg-muted/30">
          <Spinner size="sm" />
          <span className="gba:text-xs">AI is analyzing the best merge strategy...</span>
        </div>
      )}

      {mergePlan && !isAnalyzing && (
        <div className="gba:rounded gba:border gba:border-primary/20 gba:bg-primary/5 gba:p-3 gba:mb-4">
          <div className="gba:flex gba:items-center gba:gap-1.5 gba:mb-1">
            <Sparkles className="gba:w-3.5 gba:h-3.5 gba:text-primary" />
            <span className="gba:text-xs gba:font-medium gba:text-primary">AI Recommendation</span>
            <Badge variant="secondary" className="gba:ml-auto gba:text-xs">
              {Math.round(mergePlan.confidence * 100)}% confidence
            </Badge>
          </div>
          <p className="gba:text-xs gba:text-foreground">{mergePlan.explanation}</p>
        </div>
      )}

      {aiError && !isAnalyzing && <p className="gba:text-xs gba:text-destructive gba:mb-4">{aiError}</p>}

      <div className="gba:space-y-2 gba:mb-4">
        <Label className="gba:text-xs gba:font-medium">Merge strategy</Label>
        {STRATEGY_ORDER.map(s => {
          const info = STRATEGY_INFO[s]
          const Icon = info.icon
          const isSelected = strategy === s
          const isRecommended = mergePlan?.strategy === s
          return (
            <div
              key={s}
              role="button"
              tabIndex={0}
              onClick={() => onStrategyChange(s)}
              onKeyDown={e => {
                if (e.key === ' ' || e.key === 'Enter') onStrategyChange(s)
              }}
              className={`gba:flex gba:items-start gba:gap-3 gba:rounded gba:border gba:p-3 gba:cursor-pointer gba:transition-colors gba:select-none ${
                isSelected ? 'gba:border-primary gba:bg-primary/5' : 'gba:border-border gba:hover:border-primary/40'
              }`}
              data-testid={`${testId}-strategy-${s}`}
            >
              <Icon
                className={`gba:w-4 gba:h-4 gba:mt-0.5 gba:shrink-0 ${isSelected ? 'gba:text-primary' : 'gba:text-muted-foreground'}`}
              />
              <div className="gba:flex-1 gba:min-w-0">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <span className="gba:text-xs gba:font-medium">{info.label}</span>
                  {isRecommended && (
                    <Badge variant="secondary" className="gba:text-xs gba:px-1.5 gba:py-0">
                      AI pick
                    </Badge>
                  )}
                </div>
                <p className="gba:text-xs gba:text-muted-foreground">{info.desc}</p>
              </div>
            </div>
          )
        })}
      </div>

      {needsPopulateConfig && (
        <div className="gba:rounded gba:border gba:border-border gba:p-3 gba:mb-4 gba:space-y-3">
          <Label className="gba:text-xs gba:font-medium">Configure options</Label>
          <p className="gba:text-xs gba:text-muted-foreground">
            Pick which column to populate and which {entityDef.displayName} field to use as option values.
          </p>
          <div className="gba:grid gba:grid-cols-2 gba:gap-3">
            <div>
              <Label className="gba:text-xs">Target column</Label>
              <Select value={populateTargetCol} onValueChange={onPopulateTargetColChange}>
                <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-populate-target`}>
                  <SelectValue placeholder="Select column..." />
                </SelectTrigger>
                <SelectContent>
                  {selectableColumns.map(c => (
                    <SelectItem key={c.name} value={c.name}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="gba:text-xs">Value from {entityDef.displayName}</Label>
              <Select value={populateSourceField} onValueChange={onPopulateSourceFieldChange}>
                <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-populate-source`}>
                  <SelectValue placeholder="Select field..." />
                </SelectTrigger>
                <SelectContent>
                  {selectedFields.map(f => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {needsJoinKey && (
        <div className="gba:rounded gba:border gba:border-border gba:p-3 gba:mb-4 gba:space-y-3">
          <Label className="gba:text-xs gba:font-medium">Join key</Label>
          <p className="gba:text-xs gba:text-muted-foreground">
            Pick which column in existing data matches a field in {entityDef.displayName}.
          </p>
          <div className="gba:grid gba:grid-cols-2 gba:gap-3">
            <div>
              <Label className="gba:text-xs">Existing column</Label>
              <Select value={joinExistingCol} onValueChange={onJoinExistingColChange}>
                <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-join-existing`}>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {existingColOptions.map(c => (
                    <SelectItem key={c.name} value={c.name}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="gba:text-xs">{entityDef.displayName} field</Label>
              <Select value={joinNewCol} onValueChange={onJoinNewColChange}>
                <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-join-new`}>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {selectedFields.map(f => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      <Button onClick={onNext} disabled={!canContinue} className="gba:w-full" data-testid={`${testId}-next-btn`}>
        Continue to import
      </Button>
    </div>
  )
}

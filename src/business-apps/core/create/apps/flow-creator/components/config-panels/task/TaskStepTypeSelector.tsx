import React, { useMemo } from 'react'
import { Button, Label, useTranslation } from '@newwork/nw-design-system'
import { Bot, Brain, CheckCircle2, ClipboardList, Code2, Info, Plug, UserCheck } from 'lucide-react'
import { FlowStepType } from '@/business-apps/flow/apps/creator/types/flowTemplate'
import translations from '../../../_i18n'

const META: Record<
  FlowStepType,
  {
    Icon: React.FC<{ className?: string }>
    description: string
    isAI?: boolean
  }
> = {
  TASK: { Icon: ClipboardList, description: 'User task with assignee.' },
  APPROVAL: { Icon: UserCheck, description: 'Approve or reject.' },
  INFORMATION: { Icon: Info, description: 'Share info to acknowledge.' },
  ACKNOWLEDGE: { Icon: CheckCircle2, description: 'Quick acknowledgment.' },
  FUNCTION: { Icon: Code2, description: 'Run an automated function.' },
  AI_AGENT: { Icon: Brain, description: 'Agent step with permissions.', isAI: true },
  AI_TASK_EXPERT: { Icon: Bot, description: '', isAI: true }
}

/**
 * Hint carried for FUNCTION steps to distinguish "this step calls a connector"
 * vs "this step calls a plain function". Under the hood both are FlowStepType.FUNCTION.
 */
export type FunctionCategoryHint = 'connectors' | 'functions'

interface TaskStepTypeSelectorProps {
  options: FlowStepType[]
  value: FlowStepType
  onChange: (next: FlowStepType) => void
  title: string
  getLabel: (type: FlowStepType) => string
  /**
   * When the currently selected step type is FUNCTION, the selector renders two
   * sub-tiles (Connector / Function) instead of a single FUNCTION tile. This prop
   * is the current hint that drives which sub-tile is highlighted.
   */
  functionCategoryHint?: FunctionCategoryHint
  /** Called when the user picks a sub-tile; the parent persists the hint on functionConfig. */
  onFunctionCategoryChange?: (next: FunctionCategoryHint) => void
  'data-testid'?: string
}

export const TaskStepTypeSelector: React.FC<TaskStepTypeSelectorProps> = ({
  options,
  value,
  onChange,
  title,
  getLabel,
  functionCategoryHint,
  onFunctionCategoryChange,
  'data-testid': testId = 'task-step-type-selector'
}) => {
  const { t } = useTranslation(translations)
  const getDescription = (type: FlowStepType): string => {
    if (type === FlowStepType.AI_TASK_EXPERT) return t('task-step-type-ai-task-expert-description')
    return META[type]?.description ?? ''
  }
  const available = useMemo(() => {
    // Always include currently selected value so legacy steps still render.
    const unique = Array.from(new Set([...options, value]))
    return unique
  }, [options, value])

  const isAISelected = META[value]?.isAI === true
  const isFunctionSelected = value === FlowStepType.FUNCTION
  let groupSuffix: string
  if (isAISelected) {
    groupSuffix = 'group-ai'
  } else if (isFunctionSelected) {
    groupSuffix = 'group-function'
  } else {
    groupSuffix = 'group-human'
  }

  const visibleOptions = useMemo(() => {
    if (isAISelected) {
      const ai = available.filter(t => META[t]?.isAI === true)
      // Keep order stable and intentional: EveryAI Agent first, then AI Task Expert.
      const ordered: FlowStepType[] = []
      if (ai.includes(FlowStepType.AI_AGENT)) ordered.push(FlowStepType.AI_AGENT)
      if (ai.includes(FlowStepType.AI_TASK_EXPERT)) ordered.push(FlowStepType.AI_TASK_EXPERT)
      return ordered.length > 0 ? ordered : ai
    }
    if (isFunctionSelected) {
      return available.filter(t => t === FlowStepType.FUNCTION)
    }
    return available.filter(t => META[t]?.isAI !== true && t !== FlowStepType.FUNCTION)
  }, [available, isAISelected, isFunctionSelected])

  return (
    <div className="gba:flex gba:flex-col gba:gap-3" data-testid={testId}>
      <div className="gba:flex gba:items-center gba:justify-between">
        <Label className="gba:text-xs gba:font-semibold gba:text-foreground">{title}</Label>
      </div>

      {/**
       * When the task is in the FUNCTION family, render two peer sub-tiles
       * (Connector / Function) so the user can refine without leaving this panel.
       * Both sub-tiles keep stepType = FUNCTION; only functionConfig.categoryHint
       * changes, which drives the FunctionSelector's default filter below.
       */}
      {isFunctionSelected && onFunctionCategoryChange ? (
        <div className="gba:flex gba:flex-col gba:gap-2" data-testid={`${testId}-${groupSuffix}`}>
          <div className="gba:grid gba:grid-cols-2 gba:gap-2">
            {[
              {
                hint: 'connectors' as const,
                Icon: Plug,
                label: 'Connector',
                description: 'Call an external system'
              },
              {
                hint: 'functions' as const,
                Icon: Code2,
                label: 'Function',
                description: 'Run a business function'
              }
            ].map(tile => {
              const isSelected = functionCategoryHint === tile.hint
              return (
                <Button
                  key={tile.hint}
                  type="button"
                  variant="outline"
                  onClick={() => onFunctionCategoryChange(tile.hint)}
                  className={[
                    'gba:h-auto gba:py-3 gba:px-3 gba:justify-start gba:items-start gba:flex gba:flex-col gba:gap-1 gba:bg-background',
                    isSelected ? 'gba:border-primary gba:ring-1 gba:ring-ring' : 'gba:border-border'
                  ].join(' ')}
                  data-testid={`${testId}-tile-function-${tile.hint}`}
                >
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <tile.Icon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                    <span className="gba:text-xs gba:font-semibold gba:text-foreground">{tile.label}</span>
                  </div>
                  <span className="gba:text-[11px] gba:text-muted-foreground gba:line-clamp-2">{tile.description}</span>
                </Button>
              )
            })}
          </div>
        </div>
      ) : (
        visibleOptions.length > 0 && (
          <div className="gba:flex gba:flex-col gba:gap-2" data-testid={`${testId}-${groupSuffix}`}>
            <div className="gba:grid gba:grid-cols-2 gba:gap-2">
              {visibleOptions.map(type => {
                const meta = META[type]
                const Icon = meta?.Icon ?? ClipboardList
                const isSelected = value === type
                return (
                  <Button
                    key={type}
                    type="button"
                    variant="outline"
                    onClick={() => onChange(type)}
                    className={[
                      'gba:h-auto gba:py-3 gba:px-3 gba:justify-start gba:items-start gba:flex gba:flex-col gba:gap-1 gba:bg-background',
                      isSelected ? 'gba:border-primary gba:ring-1 gba:ring-ring' : 'gba:border-border'
                    ].join(' ')}
                    data-testid={`${testId}-tile-${String(type).toLowerCase()}`}
                  >
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Icon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                      <span className="gba:text-xs gba:font-semibold gba:text-foreground">{getLabel(type)}</span>
                    </div>
                    <span className="gba:text-[11px] gba:text-muted-foreground gba:line-clamp-2">
                      {getDescription(type)}
                    </span>
                  </Button>
                )
              })}
            </div>
          </div>
        )
      )}
    </div>
  )
}

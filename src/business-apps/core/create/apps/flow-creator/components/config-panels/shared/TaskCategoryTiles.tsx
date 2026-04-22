import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { Sparkles, UserCheck, Zap } from 'lucide-react'
import { FlowStepType } from '@/business-apps/flow/apps/creator/types/flowTemplate'
import type { DesignerMode } from '../../../types/studioTypes'

export type TaskCategoryId = 'user-task' | 'ai-task' | 'function-task'

/**
 * Optional UI hint forwarded by automation tiles. Connector vs plain function is a
 * sub-refinement surfaced inside the task General tab (TaskStepTypeSelector), so the
 * outer category tiles below don't emit a hint — the refinement happens one level
 * deeper, which keeps the Add Step / Switch Type entry points to three choices.
 */
export type TaskCategoryHint = 'connectors' | 'functions' | undefined

export const TASK_CATEGORY_OPTIONS: Array<{
  id: TaskCategoryId
  stepType: FlowStepType
  label: string
  description: string
  Icon: React.FC<{ className?: string }>
  advancedOnly?: boolean
}> = [
  {
    id: 'user-task',
    stepType: FlowStepType.TASK,
    label: 'User Task',
    description: 'Assigned to people',
    Icon: UserCheck
  },
  {
    id: 'ai-task',
    stepType: FlowStepType.AI_AGENT,
    label: 'AI Task',
    description: 'Let AI do the work',
    Icon: Sparkles
  },
  {
    id: 'function-task',
    stepType: FlowStepType.FUNCTION,
    label: 'Function',
    // Short enough to fit in the tile's single-line column in AddStepPanel while
    // still hinting that connectors live inside this family (refined one level deeper).
    description: 'Function or connector',
    Icon: Zap,
    advancedOnly: true
  }
]

interface TaskCategoryTilesProps {
  mode: DesignerMode
  selectedId?: TaskCategoryId
  onSelect: (opt: (typeof TASK_CATEGORY_OPTIONS)[number]) => void
  className?: string
  'data-testid'?: string
}

export const TaskCategoryTiles: React.FC<TaskCategoryTilesProps> = ({
  mode,
  selectedId,
  onSelect,
  className,
  'data-testid': testId = 'flow-studio-task-category-tiles'
}) => {
  const visible = TASK_CATEGORY_OPTIONS.filter(opt => mode === 'advanced' || !opt.advancedOnly)

  return (
    <div className={['gba:grid gba:grid-cols-2 gba:gap-2', className].filter(Boolean).join(' ')} data-testid={testId}>
      {visible.map(opt => {
        const isSelected = selectedId === opt.id
        return (
          <Button
            key={opt.id}
            className={[
              'gba:w-full gba:h-auto gba:py-3 gba:px-3 gba:flex gba:items-center gba:justify-between gba:gap-3',
              isSelected ? 'gba:border-primary gba:ring-1 gba:ring-ring' : 'gba:border-border'
            ].join(' ')}
            type="button"
            variant="outline"
            onClick={() => onSelect(opt)}
            data-testid={`${testId}-tile-${opt.id}`}
          >
            <div className="gba:flex gba:items-center gba:gap-3 gba:min-w-0">
              <div className="gba:flex gba:items-center gba:justify-center gba:w-9 gba:h-9 gba:rounded-lg gba:bg-muted gba:text-foreground gba:flex-shrink-0">
                <opt.Icon className="gba:h-4 gba:w-4" />
              </div>
              <div className="gba:flex gba:flex-col gba:items-start gba:leading-tight gba:min-w-0">
                <span className="gba:text-xs gba:font-semibold gba:text-foreground">{opt.label}</span>
                <span className="gba:text-xs gba:text-muted-foreground gba:truncate">{opt.description}</span>
              </div>
            </div>
          </Button>
        )
      })}
    </div>
  )
}

import React, { useMemo } from 'react'
import { Label } from '@newwork/nw-design-system'
import { FlowStepType } from '@/business-apps/flow/apps/creator/types/flowTemplate'
import type { DesignerMode, TaskNodeConfig } from '../../types/studioTypes'
import { TaskCategoryTiles } from '../shared/TaskCategoryTiles'

interface TaskSwitchTypePanelProps {
  mode: DesignerMode
  config: TaskNodeConfig
  onSwitch: (nextType: FlowStepType) => void
  t: (key: string) => string
  'data-testid'?: string
}

export const TaskSwitchTypePanel: React.FC<TaskSwitchTypePanelProps> = ({
  mode,
  config,
  onSwitch,
  t,
  'data-testid': testId = 'flow-studio-task-switch-type'
}) => {
  const selectedCategoryId = useMemo(() => {
    if (config.stepType === FlowStepType.FUNCTION) return 'function-task'
    if ([FlowStepType.AI_AGENT, FlowStepType.AI_TASK_EXPERT].includes(config.stepType)) return 'ai-task'
    return 'user-task'
  }, [config.stepType])

  return (
    <div className="gba:flex gba:flex-col gba:gap-3" data-testid={testId}>
      <div className="gba:flex gba:flex-col gba:gap-1">
        <Label className="gba:text-xs gba:font-semibold gba:text-foreground">{t('task-switch-type')}</Label>
        <p className="gba:text-xs gba:text-muted-foreground">
          Switch between User tasks, AI tasks, and automation functions. You can refine the subtype afterwards.
        </p>
      </div>

      <TaskCategoryTiles
        mode={mode}
        selectedId={selectedCategoryId}
        onSelect={opt => {
          if (opt.id === 'user-task') {
            // Switching to "User Task" goes to the human task family.
            onSwitch(FlowStepType.TASK)
            return
          }
          if (opt.id === 'ai-task') {
            // Switching to "AI Task" defaults to EveryAI Agent.
            onSwitch(FlowStepType.AI_AGENT)
            return
          }
          // "Function" → FUNCTION family. Connector vs plain function is refined one
          // level deeper inside the General tab (TaskStepTypeSelector).
          onSwitch(FlowStepType.FUNCTION)
        }}
        data-testid={`${testId}-tiles`}
      />
    </div>
  )
}

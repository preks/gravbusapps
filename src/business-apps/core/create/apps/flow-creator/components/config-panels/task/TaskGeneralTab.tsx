import React from 'react'
import { Label } from '@newwork/nw-design-system'
import { Info } from 'lucide-react'
import { FlowStepType } from '@/business-apps/flow/apps/creator/types/flowTemplate'
import type { DesignerMode, TaskNodeConfig } from '../../../types/studioTypes'
import type { FlowStudioData } from '../../../hooks/useFlowStudioData'
import { ExpressionEditor } from '@/common/components/flow/expression-editor'
import { useStudioExpressionSuggestions } from '../../../hooks/useStudioExpressionSuggestions'
import { TaskStepTypeSelector } from './TaskStepTypeSelector'
import { AgentSelector } from './AgentSelector'
import { FunctionSelector } from './FunctionSelector'
import { PermissionContextSection } from './PermissionContextSection'
import { AgentOutputSchemaSection } from './AgentOutputSchemaSection'

interface TaskGeneralTabProps {
  mode: DesignerMode
  config: TaskNodeConfig
  accessToken: string
  studioData: FlowStudioData
  stepTypeOptions: FlowStepType[]
  update: (partial: Partial<TaskNodeConfig>) => void
  onUpdateLabel: (title: string) => void
  t: (key: string) => string
  testId: string
}

export const TaskGeneralTab: React.FC<TaskGeneralTabProps> = ({
  mode,
  config,
  accessToken,
  studioData,
  stepTypeOptions,
  update,
  onUpdateLabel,
  t,
  testId
}) => {
  const expressionSuggestions = useStudioExpressionSuggestions()

  const applyStepType = (nextType: FlowStepType) => {
    const isAutomation = [FlowStepType.FUNCTION, FlowStepType.AI_AGENT, FlowStepType.AI_TASK_EXPERT].includes(nextType)
    update({
      stepType: nextType,
      kind: isAutomation ? 'SYSTEM' : 'USER',
      permissionContext:
        nextType === FlowStepType.AI_AGENT
          ? (config.permissionContext ?? {
              contextType: 'USER',
              permissions: ['read', 'write', 'execute']
            })
          : undefined,
      ...(mode === 'simple' && nextType === FlowStepType.AI_TASK_EXPERT
        ? {
            simpleAIConfig: {
              instruction: config.simpleAIConfig?.instruction ?? ''
            }
          }
        : {})
    })
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-4">
      <TaskStepTypeSelector
        options={stepTypeOptions}
        value={config.stepType}
        title={t('task-type')}
        getLabel={type => t(`task-type-${type.toLowerCase()}`)}
        humanGroupLabel={t('task-type-group-human')}
        aiGroupLabel={t('task-type-group-ai')}
        onChange={applyStepType}
        data-testid={`${testId}-task-type`}
      />

      {config.stepType === FlowStepType.APPROVAL && (
        <div
          className="gba:flex gba:items-start gba:gap-2 gba:rounded-lg gba:border gba:border-border gba:bg-muted gba:p-3"
          data-testid={`${testId}-approval-tip`}
        >
          <div className="gba:mt-0.5 gba:flex gba:items-center gba:justify-center gba:w-6 gba:h-6 gba:rounded-md gba:bg-info-secondary gba:flex-shrink-0">
            <Info className="gba:h-4 gba:w-4 gba:text-info-secondary-foreground" />
          </div>
          <div className="gba:flex gba:flex-col gba:gap-0.5">
            <span className="gba:text-xs gba:font-semibold gba:text-foreground">Tip</span>
            <span className="gba:text-xs gba:text-muted-foreground">
              If you need decision-based approvals with separate branches (Approve/Reject) or return-to-step flows, use
              a <span className="gba:font-medium gba:text-foreground">Decision</span> node in{' '}
              <span className="gba:font-medium gba:text-foreground">Approval</span> mode.
            </span>
          </div>
        </div>
      )}

      <div className="gba:flex gba:flex-col gba:gap-1.5">
        <Label className="gba:text-xs gba:font-medium">{t('task-title')}</Label>
        <ExpressionEditor
          value={config.title}
          onChange={next => {
            update({ title: next })
            onUpdateLabel(next)
          }}
          suggestions={expressionSuggestions}
          placeholder="Enter task title… Type {{ to insert data."
          allowFreeText
          singleLine
          data-testid={`${testId}-title`}
        />
      </div>

      {![FlowStepType.AI_TASK_EXPERT, FlowStepType.FUNCTION].includes(config.stepType) && (
        <div className="gba:flex gba:flex-col gba:gap-1.5">
          <Label className="gba:text-xs gba:font-medium">
            {config.stepType === FlowStepType.AI_AGENT ? t('task-instruction') : t('task-message')}
          </Label>
          <ExpressionEditor
            value={config.message ?? ''}
            onChange={value => update({ message: value })}
            suggestions={expressionSuggestions}
            placeholder={
              config.stepType === FlowStepType.AI_AGENT
                ? 'Describe what the agent should do… Type {{ to insert data.'
                : 'Write a short message… Type {{ to insert data.'
            }
            allowFreeText
            multiline
            data-testid={`${testId}-message`}
          />
        </div>
      )}

      {mode === 'advanced' && config.stepType === FlowStepType.AI_TASK_EXPERT && (
        <AgentSelector config={config} update={update} studioData={studioData} testId={testId} />
      )}

      {mode === 'advanced' && config.stepType === FlowStepType.AI_AGENT && (
        <AgentOutputSchemaSection
          config={config}
          update={update}
          title={t('task-output-schema-title')}
          description={t('task-output-schema-desc')}
          testId={testId}
        />
      )}

      {mode === 'advanced' && config.stepType === FlowStepType.FUNCTION && (
        <FunctionSelector config={config} update={update} studioData={studioData} testId={testId} />
      )}

      {mode === 'advanced' && config.stepType === FlowStepType.AI_AGENT && (
        <PermissionContextSection
          mode={mode}
          value={config.permissionContext}
          accessToken={accessToken}
          onChange={next => update({ permissionContext: next })}
          data-testid={`${testId}-permission`}
        />
      )}
    </div>
  )
}

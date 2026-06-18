import React from 'react'
import { Info } from 'lucide-react'
import { FlowStepType } from '@/common/data/flow/types/flowTemplate'
import type { DesignerMode, TaskNodeConfig } from '../../../types/studioTypes'
import type { FlowStudioData } from '../../../hooks/useFlowStudioData'
import { useStudioExpressionSuggestions } from '../../../hooks/useStudioExpressionSuggestions'
import { AgentSelector } from '../../step-fields/automation/AgentSelector'
import { FunctionSelector } from '../../step-fields/automation/FunctionSelector'
import { PermissionContextSection } from '../../step-fields/permissions/PermissionContextSection'
import { AgentOutputSchemaSection } from '../../step-fields/automation/AgentOutputSchemaSection'
import { TaskLinksSection } from '../../step-fields/links/TaskLinksSection'
import { StepTitleField } from '../../step-fields/title-message/StepTitleField'
import { StepMessageField } from '../../step-fields/title-message/StepMessageField'
import { StepDueTimeField } from '../../step-fields/timing/StepDueTimeField'
import { useFlowContextDataSources } from '../../step-fields/useFlowContextDataSources'

interface TaskGeneralTabProps {
  nodeId: string
  mode: DesignerMode
  config: TaskNodeConfig
  accessToken: string
  studioData: FlowStudioData
  update: (partial: Partial<TaskNodeConfig>) => void
  onUpdateLabel: (title: string) => void
  t: (key: string) => string
  testId: string
}

export const TaskGeneralTab: React.FC<TaskGeneralTabProps> = ({
  nodeId,
  mode,
  config,
  accessToken,
  studioData,
  update,
  onUpdateLabel,
  t,
  testId
}) => {
  const expressionSuggestions = useStudioExpressionSuggestions()
  const dataSources = useFlowContextDataSources(studioData)

  const showLinksSection = ![FlowStepType.AI_TASK_EXPERT, FlowStepType.FUNCTION].includes(config.stepType)
  const showMessageField = ![FlowStepType.AI_TASK_EXPERT, FlowStepType.FUNCTION].includes(config.stepType)
  const messageVariant = config.stepType === FlowStepType.AI_AGENT ? 'instruction' : 'default'

  const isAutomationStepType = [FlowStepType.FUNCTION, FlowStepType.AI_AGENT, FlowStepType.AI_TASK_EXPERT].includes(
    config.stepType
  )
  const automationFieldMode: DesignerMode = isAutomationStepType ? 'advanced' : mode

  return (
    <div className="gba:flex gba:flex-col gba:gap-4">
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

      <StepTitleField
        label={t('step-title')}
        placeholder={t('step-title-placeholder')}
        value={config.title}
        onChange={next => {
          update({ title: next })
          onUpdateLabel(next)
        }}
        suggestions={expressionSuggestions}
        dataSources={dataSources}
        data-testid={`${testId}-title`}
      />

      {showMessageField && (
        <StepMessageField
          label={messageVariant === 'instruction' ? t('task-instruction') : t('step-message')}
          placeholder={
            messageVariant === 'instruction' ? t('step-instruction-placeholder') : t('step-message-placeholder')
          }
          value={config.message ?? ''}
          onChange={value => update({ message: value })}
          suggestions={expressionSuggestions}
          dataSources={dataSources}
          data-testid={`${testId}-message`}
        />
      )}

      {showLinksSection && (
        <TaskLinksSection
          nodeId={nodeId}
          value={config.links ?? []}
          onChange={next => update({ links: next })}
          t={t}
          data-testid={`${testId}-links`}
        />
      )}

      {config.kind === 'USER' && (
        <StepDueTimeField
          valueMinutes={config.dueInMinutes}
          onChange={dueInMinutes => update({ dueInMinutes })}
          data-testid={`${testId}-due`}
        />
      )}

      {config.stepType === FlowStepType.AI_TASK_EXPERT && (
        <AgentSelector config={config} update={update} studioData={studioData} testId={testId} />
      )}

      {config.stepType === FlowStepType.AI_AGENT && (
        <AgentOutputSchemaSection
          config={config}
          update={update}
          title={t('task-output-schema-title')}
          description={t('task-output-schema-desc')}
          testId={testId}
        />
      )}

      {config.stepType === FlowStepType.FUNCTION && (
        <FunctionSelector config={config} update={update} studioData={studioData} testId={testId} />
      )}

      {config.stepType === FlowStepType.AI_AGENT && (
        <PermissionContextSection
          mode={automationFieldMode}
          value={config.permissionContext}
          accessToken={accessToken}
          onChange={next => update({ permissionContext: next })}
          data-testid={`${testId}-permission`}
        />
      )}
    </div>
  )
}

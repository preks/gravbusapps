import React, { useEffect } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../../../_i18n'
import { useStudioExpressionSuggestions } from '../../../hooks/useStudioExpressionSuggestions'
import type { DecisionNodeConfig, DesignerMode, FlowStudioUpdateOptions } from '../../../types/studioTypes'
import type { FlowStudioData } from '../../../hooks/useFlowStudioData'
import { AssignmentMode } from '@/common/data/flow/types/flowTemplate'
import { TaskLinksSection } from '../../step-fields/links/TaskLinksSection'
import { StepTitleField } from '../../step-fields/title-message/StepTitleField'
import { StepMessageField } from '../../step-fields/title-message/StepMessageField'
import { StepDueTimeField } from '../../step-fields/timing/StepDueTimeField'
import { useFlowContextDataSources } from '../../step-fields/useFlowContextDataSources'
import { DecisionOutcomesSection, type DecisionOutcomesSectionProps } from './DecisionOutcomesSection'

interface DecisionGeneralTabProps {
  nodeId: string
  config: DecisionNodeConfig
  mode: DesignerMode
  testId: string
  studioData: FlowStudioData
  update: (partial: Partial<DecisionNodeConfig>, options?: FlowStudioUpdateOptions) => void
  outcomes: Omit<DecisionOutcomesSectionProps, 'config' | 'mode' | 'update' | 'testId'>
}

export const DecisionGeneralTab: React.FC<DecisionGeneralTabProps> = ({
  nodeId,
  config,
  mode,
  testId,
  studioData,
  update,
  outcomes
}) => {
  const { t } = useTranslation(translations)
  const expressionSuggestions = useStudioExpressionSuggestions()
  const dataSources = useFlowContextDataSources(studioData)

  useEffect(() => {
    if (config.userConfig) return

    update(
      {
        userConfig: {
          userDecisionType: 'APPROVAL',
          message: 'Please select an outcome.',
          options: [],
          assignment: {
            targets: { users: ['{{$orgchart.managerByUserId[$workflow.initiator]}}'] },
            assignmentMode: AssignmentMode.ASSIGN_SINGLE,
            allowReassignment: true
          }
        }
      },
      { markDirty: false }
    )
  }, [config.userConfig, update])

  return (
    <div className="gba:flex gba:flex-col gba:gap-4">
      <StepTitleField
        label={t('step-title')}
        placeholder={t('step-title-placeholder')}
        value={config.userConfig?.title ?? ''}
        onChange={value =>
          update({ userConfig: { ...(config.userConfig as object), title: value } as DecisionNodeConfig['userConfig'] })
        }
        suggestions={expressionSuggestions}
        dataSources={dataSources}
        data-testid={`${testId}-title`}
      />

      <StepMessageField
        label={t('step-message')}
        placeholder={t('step-message-placeholder')}
        value={config.userConfig?.message ?? ''}
        onChange={value =>
          update({
            userConfig: { ...(config.userConfig as object), message: value } as DecisionNodeConfig['userConfig']
          })
        }
        suggestions={expressionSuggestions}
        dataSources={dataSources}
        data-testid={`${testId}-message`}
      />

      <TaskLinksSection
        nodeId={nodeId}
        value={config.links ?? []}
        onChange={next => update({ links: next })}
        t={t}
        data-testid={`${testId}-links`}
      />

      {mode === 'advanced' ? (
        <StepDueTimeField
          valueMinutes={config.userConfig?.timeoutMinutes}
          onChange={timeoutMinutes => update({ userConfig: { ...config.userConfig!, timeoutMinutes } })}
          data-testid={`${testId}-due`}
        />
      ) : null}

      <div className="gba:h-px gba:bg-border" />

      <DecisionOutcomesSection config={config} mode={mode} testId={testId} update={update} {...outcomes} />
    </div>
  )
}

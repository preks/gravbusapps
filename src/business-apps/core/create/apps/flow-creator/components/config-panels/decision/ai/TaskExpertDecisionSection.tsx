import React, { useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../../../../_i18n'
import type { DecisionNodeConfig, DesignerMode } from '../../../../types/studioTypes'
import type { ExpressionSuggestionItem } from '@/common/components/flow/expression-editor'
import type { PromptODM } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { DecisionHumanFallbackSection } from './DecisionHumanFallbackSection'
import { DecisionTaskExpertMappingSection } from './DecisionTaskExpertMappingSection'
import { DecisionTaskExpertReasoningPathSection } from './DecisionTaskExpertReasoningPathSection'
import type { PromptParameterGroups } from '../../../../utils/promptParameterUtils'
import { AgentParamMappingSection } from '../../shared/AgentParamMappingSection'
import { TaskExpertSelectorSection } from '../../shared/TaskExpertSelectorSection'

interface TaskExpertDecisionSectionProps {
  mode: DesignerMode
  variant: 'simple' | 'advanced'
  aiConfig: any
  studioAgentsLoading: boolean
  selectedTaskExpert?: PromptODM
  candidates: Array<{ _id: string; name: string; description?: string }>
  onSelectTaskExpert: (promptId: string) => void
  onChangeTaskExpertVersion: (promptVersion: number) => void
  availablePromptVersions: number[]
  promptVersionsLoading: boolean
  mappingWrapperConfig: DecisionNodeConfig
  mappingWrapperUpdate: (partial: Partial<DecisionNodeConfig>) => void
  mappingSuggestions: ExpressionSuggestionItem[]
  promptParams: PromptParameterGroups
  promptParamsLoading: boolean
  decisionResultEnumOptions: string[]
  schemaPaths: string[]
  onChangeReasoningPath: (path: string | undefined) => void
  accessToken: string
  availableStartFields: Array<{ name: string; label: string }>
  expressionSuggestions: ExpressionSuggestionItem[]
  dataSources?: React.ComponentProps<typeof DecisionHumanFallbackSection>['dataSources']
  onChangeAiConfig: (next: any) => void
  testId: string
}

export const TaskExpertDecisionSection: React.FC<TaskExpertDecisionSectionProps> = ({
  mode,
  variant,
  aiConfig,
  studioAgentsLoading,
  selectedTaskExpert,
  candidates,
  onSelectTaskExpert,
  onChangeTaskExpertVersion,
  availablePromptVersions,
  promptVersionsLoading,
  mappingWrapperConfig,
  mappingWrapperUpdate,
  mappingSuggestions,
  promptParams,
  promptParamsLoading,
  decisionResultEnumOptions,
  schemaPaths,
  onChangeReasoningPath,
  accessToken,
  availableStartFields,
  expressionSuggestions,
  dataSources,
  onChangeAiConfig,
  testId
}) => {
  const { t } = useTranslation(translations)
  const mappingTestId = variant === 'simple' ? `${testId}-taskexpert-mapping-simple` : `${testId}-taskexpert-mapping`
  const inputParamSuggestions = useMemo(
    () =>
      expressionSuggestions.filter(
        suggestion =>
          suggestion.source === 'steps' ||
          suggestion.source === 'trigger' ||
          suggestion.source === 'workflow' ||
          suggestion.source === 'orgchart'
      ),
    [expressionSuggestions]
  )

  const updateParam = (groupId: 'system' | 'user', paramName: string, expression: string) => {
    const mapKey = groupId === 'system' ? 'systemParamsMap' : 'userParamsMap'
    const currentMap = { ...(aiConfig?.[mapKey] ?? {}) }
    currentMap[paramName] = expression
    onChangeAiConfig({
      ...(aiConfig ?? {
        executor: 'TASK_EXPERT',
        humanInstructions: '',
        escalation: { mode: 'USER', assignment: { targets: null, assignmentMode: 'CLAIM' } }
      }),
      [mapKey]: currentMap
    })
  }

  return (
    <>
      <div className="gba:flex gba:flex-col gba:gap-2 gba:p-3 gba:rounded-lg gba:bg-muted">
        <TaskExpertSelectorSection
          selectedId={String(aiConfig.promptId || '') || undefined}
          selectedName={selectedTaskExpert?.name}
          selectedDescription={selectedTaskExpert?.description}
          candidates={candidates}
          loading={studioAgentsLoading}
          selectedVersion={aiConfig.promptVersion}
          availableVersions={availablePromptVersions}
          versionsLoading={promptVersionsLoading}
          onSelect={onSelectTaskExpert}
          onChangeVersion={onChangeTaskExpertVersion}
          testId={`${testId}-taskexpert`}
        />

        <AgentParamMappingSection
          params={promptParams}
          values={aiConfig}
          loading={promptParamsLoading}
          suggestions={inputParamSuggestions}
          onChangeParam={updateParam}
          testId={`${testId}-taskexpert-params`}
          description={t('decision-ai-taskexpert-params-desc')}
        />
      </div>

      <DecisionTaskExpertMappingSection
        config={mappingWrapperConfig}
        update={mappingWrapperUpdate}
        mode={mode}
        testId={mappingTestId}
        suggestions={mappingSuggestions}
        decisionResultEnumOptions={decisionResultEnumOptions}
      />

      {variant === 'advanced' ? (
        <DecisionTaskExpertReasoningPathSection
          value={aiConfig.reasoningPath}
          schemaPaths={schemaPaths}
          onChange={onChangeReasoningPath}
          data-testid={`${testId}-ai-taskexpert-reasoning-path`}
        />
      ) : null}

      <DecisionHumanFallbackSection
        mode={mode}
        variant={variant}
        executor="TASK_EXPERT"
        aiConfig={aiConfig}
        accessToken={accessToken}
        availableStartFields={availableStartFields}
        expressionSuggestions={expressionSuggestions}
        dataSources={dataSources}
        onChange={onChangeAiConfig}
        data-testid={testId}
      />
    </>
  )
}

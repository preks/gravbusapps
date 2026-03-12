import React, { useMemo } from 'react'
import { Label, useTranslation } from '@newwork/nw-design-system'
import translations from '../../../_i18n'
import type { FlowStudioData } from '../../../hooks/useFlowStudioData'
import type { DecisionNodeConfig, DesignerMode } from '../../../types/studioTypes'
import { useStudioExpressionSuggestions } from '../../../hooks/useStudioExpressionSuggestions'
import { DecisionExecutorTabs } from './ai/DecisionExecutorTabs'
import { EveryAiDecisionSection } from './ai/EveryAiDecisionSection'
import { TaskExpertDecisionSection } from './ai/TaskExpertDecisionSection'
import { useAIDecisionConfigState } from './ai/useAIDecisionConfigState'

interface AIDecisionConfigProps {
  nodeId: string
  config: DecisionNodeConfig
  update: (partial: Partial<DecisionNodeConfig>) => void
  mode: DesignerMode
  testId: string
  accessToken: string
  studioData: FlowStudioData
  availableStartFields: Array<{ name: string; label: string }>
}

export const AIDecisionConfig: React.FC<AIDecisionConfigProps> = ({
  nodeId,
  config,
  update,
  mode,
  testId,
  accessToken,
  studioData,
  availableStartFields
}) => {
  const { t } = useTranslation(translations)
  const expressionSuggestions = useStudioExpressionSuggestions()
  const dataSources = useMemo(
    () => ({
      catalogs: studioData.catalogs,
      catalogsLoading: studioData.catalogsLoading,
      catalogsError: studioData.catalogsError,
      catalogsQuery: studioData.catalogsQuery,
      catalogsHasMore: studioData.catalogsHasMore,
      searchCatalogs: studioData.searchCatalogs,
      loadMoreCatalogs: studioData.loadMoreCatalogs,
      entities: studioData.entities,
      entitiesLoading: studioData.entitiesLoading,
      entitiesError: studioData.entitiesError
    }),
    [
      studioData.catalogs,
      studioData.catalogsError,
      studioData.catalogsHasMore,
      studioData.catalogsLoading,
      studioData.catalogsQuery,
      studioData.entities,
      studioData.entitiesError,
      studioData.entitiesLoading,
      studioData.loadMoreCatalogs,
      studioData.searchCatalogs
    ]
  )

  const {
    advancedExecutor,
    executorForSimple,
    getAiConfigOrDefault,
    decisionTaskExperts,
    selectedTaskExpert,
    decisionResultEnumOptions,
    taskExpertSchemaPaths,
    taskExpertMappingExpressionSuggestions,
    mappingWrapperConfig,
    mappingWrapperUpdate,
    onSelectPolicy,
    onSelectTaskExpert,
    changeExecutor,
    onChangeReasoningPath
  } = useAIDecisionConfigState({ config, update, studioData })

  if (mode === 'simple') {
    return (
      <>
        <div className="gba:flex gba:flex-col gba:gap-1.5">
          <Label className="gba:text-xs gba:font-medium">{t('decision-ai-executor-label')}</Label>
          <DecisionExecutorTabs
            value={executorForSimple}
            variant="simple"
            testIdPrefix={testId}
            onValueChange={next => changeExecutor(next, 'simple')}
          />
        </div>

        {executorForSimple === 'EVERYAI' ? (
          <EveryAiDecisionSection
            mode={mode}
            variant="simple"
            aiConfig={getAiConfigOrDefault('EVERYAI')}
            accessToken={accessToken}
            availableStartFields={availableStartFields}
            expressionSuggestions={expressionSuggestions}
            dataSources={dataSources}
            onChangeAiConfig={next => update({ aiConfig: next })}
            onSelectPolicy={onSelectPolicy}
            links={config.links ?? []}
            onChangeLinks={next => update({ links: next })}
            nodeId={nodeId}
            testId={testId}
          />
        ) : (
          <TaskExpertDecisionSection
            mode={mode}
            variant="simple"
            aiConfig={getAiConfigOrDefault('TASK_EXPERT')}
            studioAgentsLoading={Boolean(studioData.agentsLoading)}
            selectedTaskExpertName={selectedTaskExpert?.name}
            candidates={decisionTaskExperts}
            onSelectTaskExpert={onSelectTaskExpert}
            mappingWrapperConfig={mappingWrapperConfig}
            mappingWrapperUpdate={mappingWrapperUpdate}
            mappingSuggestions={taskExpertMappingExpressionSuggestions}
            decisionResultEnumOptions={decisionResultEnumOptions}
            schemaPaths={taskExpertSchemaPaths}
            onChangeReasoningPath={onChangeReasoningPath}
            accessToken={accessToken}
            availableStartFields={availableStartFields}
            expressionSuggestions={expressionSuggestions}
            dataSources={dataSources}
            onChangeAiConfig={next => update({ aiConfig: next })}
            testId={testId}
          />
        )}
      </>
    )
  }

  return (
    <>
      <div className="gba:flex gba:flex-col gba:gap-1.5">
        <Label className="gba:text-xs gba:font-medium">{t('decision-ai-executor-label')}</Label>
        <DecisionExecutorTabs
          value={advancedExecutor}
          variant="advanced"
          testIdPrefix={testId}
          onValueChange={next => changeExecutor(next, 'advanced')}
        />
        <p className="gba:text-xs gba:text-muted-foreground">
          {advancedExecutor === 'EVERYAI'
            ? t('decision-ai-executor-everyai-desc')
            : t('decision-ai-executor-taskexpert-desc')}
        </p>
      </div>

      {advancedExecutor === 'EVERYAI' ? (
        <EveryAiDecisionSection
          mode={mode}
          variant="advanced"
          aiConfig={getAiConfigOrDefault('EVERYAI')}
          accessToken={accessToken}
          availableStartFields={availableStartFields}
          expressionSuggestions={expressionSuggestions}
          dataSources={dataSources}
          onChangeAiConfig={next => update({ aiConfig: next })}
          onSelectPolicy={onSelectPolicy}
          links={config.links ?? []}
          onChangeLinks={next => update({ links: next })}
          nodeId={nodeId}
          testId={testId}
        />
      ) : (
        <TaskExpertDecisionSection
          mode={mode}
          variant="advanced"
          aiConfig={getAiConfigOrDefault('TASK_EXPERT')}
          studioAgentsLoading={Boolean(studioData.agentsLoading)}
          selectedTaskExpertName={selectedTaskExpert?.name}
          candidates={decisionTaskExperts}
          onSelectTaskExpert={onSelectTaskExpert}
          mappingWrapperConfig={mappingWrapperConfig}
          mappingWrapperUpdate={mappingWrapperUpdate}
          mappingSuggestions={taskExpertMappingExpressionSuggestions}
          decisionResultEnumOptions={decisionResultEnumOptions}
          schemaPaths={taskExpertSchemaPaths}
          onChangeReasoningPath={onChangeReasoningPath}
          accessToken={accessToken}
          availableStartFields={availableStartFields}
          expressionSuggestions={expressionSuggestions}
          dataSources={dataSources}
          onChangeAiConfig={next => update({ aiConfig: next })}
          testId={testId}
        />
      )}
    </>
  )
}

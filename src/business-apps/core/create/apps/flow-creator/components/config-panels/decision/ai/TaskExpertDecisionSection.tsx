import React from 'react'
import { Label, useTranslation } from '@newwork/nw-design-system'
import translations from '../../../../_i18n'
import type { DecisionNodeConfig, DesignerMode } from '../../../../types/studioTypes'
import type { ExpressionSuggestionItem } from '@/common/components/flow/expression-editor'
import { DecisionHumanFallbackSection } from './DecisionHumanFallbackSection'
import { DecisionTaskExpertMappingSection } from './DecisionTaskExpertMappingSection'
import { DecisionTaskExpertPicker } from './DecisionTaskExpertPicker'
import { DecisionTaskExpertReasoningPathSection } from './DecisionTaskExpertReasoningPathSection'

interface TaskExpertDecisionSectionProps {
  mode: DesignerMode
  variant: 'simple' | 'advanced'
  aiConfig: any
  studioAgentsLoading: boolean
  selectedTaskExpertName?: string
  candidates: Array<{ _id: string; name: string; description?: string }>
  onSelectTaskExpert: (promptId: string) => void
  mappingWrapperConfig: DecisionNodeConfig
  mappingWrapperUpdate: (partial: Partial<DecisionNodeConfig>) => void
  mappingSuggestions: ExpressionSuggestionItem[]
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
  selectedTaskExpertName,
  candidates,
  onSelectTaskExpert,
  mappingWrapperConfig,
  mappingWrapperUpdate,
  mappingSuggestions,
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
  const pickerTestId = variant === 'simple' ? `${testId}-ai-taskexpert-picker-simple` : `${testId}-ai-taskexpert-prompt`
  const mappingTestId = variant === 'simple' ? `${testId}-taskexpert-mapping-simple` : `${testId}-taskexpert-mapping`

  return (
    <>
      <div className="gba:flex gba:flex-col gba:gap-1.5">
        <Label className="gba:text-xs gba:font-medium">{t('task-type-ai_task_expert')}</Label>
        <p className="gba:text-xs gba:text-muted-foreground">{t('decision-ai-taskexpert-picker-desc')}</p>
        <DecisionTaskExpertPicker
          agentsLoading={studioAgentsLoading}
          selectedId={String(aiConfig.promptId || '') || undefined}
          selectedName={selectedTaskExpertName}
          candidates={candidates}
          onSelect={onSelectTaskExpert}
          data-testid={pickerTestId}
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

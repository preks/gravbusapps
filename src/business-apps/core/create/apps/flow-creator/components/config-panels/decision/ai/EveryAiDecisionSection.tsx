import React from 'react'
import { Label, useTranslation } from '@newwork/nw-design-system'
import translations from '../../../../_i18n'
import type { DesignerMode } from '../../../../types/studioTypes'
import type { ExpressionSuggestionItem } from '@/common/components/flow/expression-editor'
import { FlowContextExpressionEditor } from '../../../shared/FlowContextExpressionEditor'
import { DecisionHumanFallbackSection } from './DecisionHumanFallbackSection'
import { DecisionPolicyPicker } from './DecisionPolicyPicker'

interface EveryAiDecisionSectionProps {
  mode: DesignerMode
  variant: 'simple' | 'advanced'
  aiConfig: any
  accessToken: string
  availableStartFields: Array<{ name: string; label: string }>
  expressionSuggestions: ExpressionSuggestionItem[]
  dataSources?: React.ComponentProps<typeof FlowContextExpressionEditor>['dataSources']
  onChangeAiConfig: (next: any) => void
  onSelectPolicy: (policy: { id?: string; title?: string; entryVersion?: string }) => void
  testId: string
}

export const EveryAiDecisionSection: React.FC<EveryAiDecisionSectionProps> = ({
  mode,
  variant,
  aiConfig,
  accessToken,
  availableStartFields,
  expressionSuggestions,
  dataSources,
  onChangeAiConfig,
  onSelectPolicy,
  testId
}) => {
  const { t } = useTranslation(translations)
  const instructionsTestId =
    variant === 'simple' ? `${testId}-ai-decision-instructions` : `${testId}-ai-decision-instructions-adv`
  const policyTestId = variant === 'simple' ? `${testId}-ai-policy` : `${testId}-ai-policy-adv`

  return (
    <>
      <div className="gba:flex gba:flex-col gba:gap-1.5">
        <Label className="gba:text-xs gba:font-medium">{t('decision-ai-instructions-label')}</Label>
        <p className="gba:text-xs gba:text-muted-foreground">{t('decision-ai-instructions-desc')}</p>
        <FlowContextExpressionEditor
          value={aiConfig.instructions ?? ''}
          onChange={value => onChangeAiConfig({ ...aiConfig, executor: 'EVERYAI', instructions: value })}
          suggestions={expressionSuggestions}
          dataSources={dataSources}
          placeholder={t('decision-ai-instructions-placeholder')}
          allowFreeText
          multiline
          data-testid={instructionsTestId}
        />
      </div>

      <DecisionPolicyPicker
        accessToken={accessToken}
        policyDocumentId={aiConfig.policyDocumentId}
        policyDocumentTitle={aiConfig.policyDocumentTitle}
        onSelect={onSelectPolicy as any}
        data-testid={policyTestId}
      />

      <DecisionHumanFallbackSection
        mode={mode}
        variant={variant}
        executor="EVERYAI"
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

import React from 'react'
import { Label, useTranslation } from '@newwork/nw-design-system'
import translations from '../../../../_i18n'
import type { DecisionNodeConfig, DesignerMode } from '../../../../types/studioTypes'
import type { ExpressionSuggestionItem } from '@/common/components/flow/expression-editor'
import { LogicDecisionConfig } from '../LogicDecisionConfig'

interface DecisionTaskExpertMappingSectionProps {
  config: DecisionNodeConfig
  update: (partial: Partial<DecisionNodeConfig>) => void
  mode: DesignerMode
  testId: string
  suggestions: ExpressionSuggestionItem[]
  decisionResultEnumOptions: string[]
}

export const DecisionTaskExpertMappingSection: React.FC<DecisionTaskExpertMappingSectionProps> = ({
  config,
  update,
  mode,
  testId,
  suggestions,
  decisionResultEnumOptions
}) => {
  const { t } = useTranslation(translations)

  return (
    <>
      <div className="gba:flex gba:flex-col gba:gap-1.5">
        <Label className="gba:text-xs gba:font-medium">{t('decision-ai-taskexpert-mapping-label')}</Label>
        <p className="gba:text-xs gba:text-muted-foreground">{t('decision-ai-taskexpert-mapping-desc')}</p>
      </div>
      <LogicDecisionConfig
        config={config}
        update={update}
        mode={mode}
        testId={testId}
        expressionSuggestionsOverride={suggestions}
        stringEnumOptionsByExpression={{
          '$steps.self.resultData.decisionResult': decisionResultEnumOptions
        }}
      />
    </>
  )
}

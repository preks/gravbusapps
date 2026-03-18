import React, { useMemo } from 'react'
import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../../../_i18n'
import { useStudioExpressionSuggestions } from '../../../hooks/useStudioExpressionSuggestions'
import type { DecisionNodeConfig, DesignerMode } from '../../../types/studioTypes'
import type { ExpressionSuggestionItem } from '@/common/components/flow/expression-editor'
import { LogicConditionRow } from './LogicConditionRow'

type LogicDecisionConfigProps = {
  config: DecisionNodeConfig
  update: (partial: Partial<DecisionNodeConfig>) => void
  mode: DesignerMode
  testId: string
  expressionSuggestionsOverride?: ExpressionSuggestionItem[]
  /** Optional string enum choices for RHS, keyed by LHS expression (without {{ }}). */
  stringEnumOptionsByExpression?: Record<string, string[]>
}

export const LogicDecisionConfig: React.FC<LogicDecisionConfigProps> = ({
  config,
  update,
  mode,
  testId,
  expressionSuggestionsOverride,
  stringEnumOptionsByExpression
}) => {
  const { t } = useTranslation(translations)
  const conditions = config.logicConfig?.conditions ?? []
  const studioSuggestions = useStudioExpressionSuggestions()
  const expressionSuggestions = expressionSuggestionsOverride ?? studioSuggestions

  const stepValueSuggestions = useMemo(
    () => expressionSuggestions.filter(s => s.source === 'steps' || s.source === 'trigger'),
    [expressionSuggestions]
  )

  const setConditions = (next: Array<{ expression: string; branchId: string }>) =>
    update({ logicConfig: { conditions: next } })

  return (
    <>
      <p className="gba:text-xs gba:text-muted-foreground">
        {mode === 'simple' ? t('logic-description-simple') : t('logic-description-advanced')}
      </p>

      <div className="gba:flex gba:flex-col gba:gap-2">
        {conditions.map((condition, index) => (
          <LogicConditionRow
            key={condition.branchId + '-' + index}
            config={config}
            condition={condition}
            index={index}
            conditions={conditions}
            setConditions={setConditions}
            testId={testId}
            t={t}
            stepValueSuggestions={stepValueSuggestions}
            stringEnumOptionsByExpression={stringEnumOptionsByExpression}
            mode={mode}
          />
        ))}

        <Button
          variant="outline"
          size="sm"
          onClick={() => setConditions([...conditions, { expression: '', branchId: config.branches[0]?.id ?? '' }])}
          data-testid={`${testId}-logic-add-condition`}
        >
          Add condition
        </Button>

        <div className="gba:flex gba:flex-col gba:gap-1.5">
          <Label className="gba:text-xs gba:font-medium">{t('logic-default')}</Label>
          <Select
            value={config.defaultBranch ?? config.branches[0]?.id ?? ''}
            onValueChange={v => update({ defaultBranch: v })}
          >
            <SelectTrigger data-testid={`${testId}-logic-default`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {config.branches.map(branch => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  )
}

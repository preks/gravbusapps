import React from 'react'
import { Input, Label } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface RuleIdentitySectionProps {
  isUpdate: boolean
  ruleCode: string
  ruleName: string
  onChangeCode: (value: string) => void
  onChangeName: (value: string) => void
  onBlurCode: () => void
  onBlurName: () => void
  showCodeError: boolean
  showNameError: boolean
  errors: { code?: string; name?: string }
}

const RuleIdentitySection: React.FC<RuleIdentitySectionProps> = ({
  isUpdate,
  ruleCode,
  ruleName,
  onChangeCode,
  onChangeName,
  onBlurCode,
  onBlurName,
  showCodeError,
  showNameError,
  errors
}) => {
  return (
    <>
      <div className="gba:mb-4" data-testid="ccr-rule-code-container">
        <div className="gba:space-y-2">
          <Label htmlFor="ccrRuleCode">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.current_rule_code_label',
              'Rule Code'
            )}{' '}
            *
          </Label>
          <Input
            id="ccrRuleCode"
            name="ccrRuleCode"
            className="gba:w-full"
            placeholder={getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.current_rule_code_placeholder',
              'Enter Rule Code'
            )}
            data-testid="ccr-code-input"
            value={ruleCode}
            disabled={isUpdate}
            onChange={e => onChangeCode(e.target.value)}
            onBlur={onBlurCode}
          />
          {showCodeError && (
            <div className="gba:text-sm gba:text-destructive" data-testid="ccr-code-error">
              {errors.code}
            </div>
          )}
        </div>
      </div>

      <div className="gba:mb-4" data-testid="ccr-rule-name-container">
        <div className="gba:space-y-2">
          <Label htmlFor="ccrRuleName">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.current_rule_name_label',
              'Rule Name'
            )}{' '}
            *
          </Label>
          <Input
            id="ccrRuleName"
            name="ccrRuleName"
            className="gba:w-full"
            placeholder={getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.current_rule_name_placeholder',
              'Enter Rule Name'
            )}
            data-testid="ccr-name-input"
            value={ruleName}
            disabled={isUpdate}
            onChange={e => onChangeName(e.target.value)}
            onBlur={onBlurName}
          />
          {showNameError && (
            <div className="gba:text-sm gba:text-destructive" data-testid="ccr-name-error">
              {errors.name}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default RuleIdentitySection

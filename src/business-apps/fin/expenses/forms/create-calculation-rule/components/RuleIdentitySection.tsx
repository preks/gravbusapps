import React from 'react'
import { InputField } from '@newwork/gravity-ui-catalog'
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
      <div className={`gba:mb-4`} data-testid="ccr-rule-code-container">
        <div className={`gba:relative`}>
          <InputField
            label={getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.current_rule_code_label',
              'Rule Code'
            )}
            name="ccrRuleCode"
            placeholder={getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.current_rule_code_placeholder',
              'Enter Rule Code'
            )}
            data-testid="ccr-code-input"
            autoFocus={false}
            value={ruleCode}
            disabled={isUpdate}
            onChange={(field: any) => onChangeCode(field?.value ?? '')}
            onBlur={onBlurCode}
            required
          />
          {showCodeError && (
            <div
              className="gba:mt-1 gba:pl-1 gba:text-[14px]"
              style={{ color: '#ff4d4f' }}
              data-testid="ccr-code-error"
            >
              {errors.code}
            </div>
          )}
        </div>
      </div>

      <div className={`gba:mb-4`} data-testid="ccr-rule-name-container">
        <div className={`gba:relative`}>
          <InputField
            label={getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.current_rule_name_label',
              'Rule Name'
            )}
            name="ccrRuleName"
            placeholder={getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.current_rule_name_placeholder',
              'Enter Rule Name'
            )}
            data-testid="ccr-name-input"
            autoFocus={false}
            value={ruleName}
            disabled={isUpdate}
            onChange={(field: any) => onChangeName(field?.value ?? '')}
            onBlur={onBlurName}
            required
          />
          {showNameError && (
            <div
              className="gba:mt-1 gba:pl-1 gba:text-[14px]"
              style={{ color: '#ff4d4f' }}
              data-testid="ccr-name-error"
            >
              {errors.name}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default RuleIdentitySection

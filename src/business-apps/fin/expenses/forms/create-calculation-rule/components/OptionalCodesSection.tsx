import React from 'react'
import { Input, Label } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface OptionalCodesSectionProps {
  isUpdate: boolean
  advancePaymentCode: string
  taxesCode: string
  nonPayableCode: string
  onChangeAdvance: (value: string) => void
  onChangeTaxes: (value: string) => void
  onChangeNonPayable: (value: string) => void
}

const OptionalCodesSection: React.FC<OptionalCodesSectionProps> = ({
  isUpdate,
  advancePaymentCode,
  taxesCode,
  nonPayableCode,
  onChangeAdvance,
  onChangeTaxes,
  onChangeNonPayable
}) => {
  return (
    <>
      <div className="gba:mb-4" data-testid="ccr-advance-payment-code-container">
        <div className="gba:space-y-2">
          <Label htmlFor="ccrAdvancePaymentCode">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.advance_payment_code_input_label',
              'Advance Payment Code'
            )}
          </Label>
          <Input
            id="ccrAdvancePaymentCode"
            name="ccrAdvancePaymentCode"
            className="gba:w-full"
            placeholder={getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.advance_payment_code_input_placeholder',
              'Enter Advance Payment Code'
            )}
            data-testid="ccr-advance-payment-code-input"
            value={advancePaymentCode}
            disabled={isUpdate}
            onChange={e => onChangeAdvance(e.target.value)}
          />
        </div>
      </div>

      <div className="gba:mb-4" data-testid="ccr-taxes-code-container">
        <div className="gba:space-y-2">
          <Label htmlFor="ccrTaxesCode">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.taxes_code_input_label',
              'Taxes Code'
            )}
          </Label>
          <Input
            id="ccrTaxesCode"
            name="ccrTaxesCode"
            className="gba:w-full"
            placeholder={getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.taxes_code_input_placeholder',
              'Enter Taxes Code'
            )}
            data-testid="ccr-taxes-code-input"
            value={taxesCode}
            disabled={isUpdate}
            onChange={e => onChangeTaxes(e.target.value)}
          />
        </div>
      </div>

      <div className="gba:mb-4" data-testid="ccr-nonpayable-code-container">
        <div className="gba:space-y-2">
          <Label htmlFor="ccrNonPayableCode">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.nonpayable_code_input_label',
              'Non Payable Code'
            )}
          </Label>
          <Input
            id="ccrNonPayableCode"
            name="ccrNonPayableCode"
            className="gba:w-full"
            placeholder={getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.nonpayable_code_input_placeholder',
              'Enter Non Payable Code'
            )}
            data-testid="ccr-nonpayable-code-input"
            value={nonPayableCode}
            disabled={isUpdate}
            onChange={e => onChangeNonPayable(e.target.value)}
          />
        </div>
      </div>
    </>
  )
}

export default OptionalCodesSection

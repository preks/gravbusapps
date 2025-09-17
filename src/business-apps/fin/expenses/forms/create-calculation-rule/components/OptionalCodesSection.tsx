import React from 'react';
import { InputField } from '@newwork/gravity-ui-catalog';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

interface OptionalCodesSectionProps {
  isUpdate: boolean;
  advancePaymentCode: string;
  taxesCode: string;
  nonPayableCode: string;
  onChangeAdvance: (value: string) => void;
  onChangeTaxes: (value: string) => void;
  onChangeNonPayable: (value: string) => void;
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
      <div className={`gba:mb-4`} data-testid="ccr-advance-payment-code-container">
        <div className={`gba:relative`}>
          <InputField
            label={getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.advance_payment_code_input_label', 'Advance Payment Code')}
            name="ccrAdvancePaymentCode"
            placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.advance_payment_code_input_placeholder', 'Enter Advance Payment Code')}
            data-testid="ccr-advance-payment-code-input"
            value={advancePaymentCode}
            disabled={isUpdate}
            onChange={(field: any) => onChangeAdvance(field?.value ?? '')}
            required={false}
          />
        </div>
      </div>

      <div className={`gba:mb-4`} data-testid="ccr-taxes-code-container">
        <div className={`gba:relative`}>
          <InputField
            label={getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.taxes_code_input_label', 'Taxes Code')}
            name="ccrTaxesCode"
            placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.taxes_code_input_placeholder', 'Enter Taxes Code')}
            data-testid="ccr-taxes-code-input"
            value={taxesCode}
            disabled={isUpdate}
            onChange={(field: any) => onChangeTaxes(field?.value ?? '')}
            required={false}
          />
        </div>
      </div>

      <div className={`gba:mb-4`} data-testid="ccr-nonpayable-code-container">
        <div className={`gba:relative`}>
          <InputField
            label={getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.nonpayable_code_input_label', 'Non Payable Code')}
            name="ccrNonPayableCode"
            placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.nonpayable_code_input_placeholder', 'Enter Non Payable Code')}
            data-testid="ccr-nonpayable-code-input"
            value={nonPayableCode}
            disabled={isUpdate}
            onChange={(field: any) => onChangeNonPayable(field?.value ?? '')}
            required={false}
          />
        </div>
      </div>
    </>
  );
};

export default OptionalCodesSection;



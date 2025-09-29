import React from 'react';
import { SelectField } from '@newwork/gravity-ui-catalog';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

interface SelectsSectionProps {
  isUpdate: boolean;
  calculationTypeId: string | null;
  countryRefId: string | null;
  currencyId: string | null;
  calculationTypeOptions: any[];
  countryOptions: any[];
  currencyOptions: any[];
  onChangeCalculation: (value: string | null) => void;
  onChangeCountry: (value: string | null) => void;
  onChangeCurrency: (value: string | null) => void;
  onBlurCalculation: () => void;
  onBlurCountry: () => void;
  onBlurCurrency: () => void;
  showCalculationError: boolean;
  showCountryError: boolean;
  showCurrencyError: boolean;
  errors: { calculationType?: string; countryRefId?: string; currencyId?: string };
}

const SelectsSection: React.FC<SelectsSectionProps> = ({
  isUpdate,
  calculationTypeId,
  countryRefId,
  currencyId,
  calculationTypeOptions,
  countryOptions,
  currencyOptions,
  onChangeCalculation,
  onChangeCountry,
  onChangeCurrency,
  onBlurCalculation,
  onBlurCountry,
  onBlurCurrency,
  showCalculationError,
  showCountryError,
  showCurrencyError,
  errors
}) => {
  return (
    <>
      <div className={`gba:mb-4`} data-testid="ccr-calculation-type-container">
        <div className={`gba:relative`}>
          <SelectField
            allowClear
            label={getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.current_rule_period_label', 'Rule Calculation')}
            name="ccrCalculationType"
            placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.current_rule_period_placeholder', 'Select Rule Calculation')}
            data-testid="ccr-calculation-select"
            data={calculationTypeOptions}
            value={calculationTypeId || undefined}
            disabled={isUpdate}
            onChange={(value: any) => onChangeCalculation(value?.value ?? null)}
            onBlur={onBlurCalculation}
            required
          />
          {showCalculationError && (
            <div className="gba:mt-1 gba:pl-1 gba:text-[14px]" style={{ color: '#ff4d4f' }} data-testid="ccr-calculation-error">
              {errors.calculationType}
            </div>
          )}
        </div>
      </div>

      <div className={`gba:mb-4`} data-testid="ccr-country-container">
        <div className={`gba:relative`}>
          <SelectField
            allowClear
            label={getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.country_ref_select_label', 'Country')}
            name="ccrCountry"
            placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.country_ref_select_placeholder', 'Select Country')}
            data-testid="ccr-country-select"
            data={countryOptions}
            value={countryRefId || undefined}
            disabled={isUpdate}
            onChange={(value: any) => onChangeCountry(value?.value ?? null)}
            onBlur={onBlurCountry}
            required
          />
          {showCountryError && (
            <div className="gba:mt-1 gba:pl-1 gba:text-[14px]" style={{ color: '#ff4d4f' }} data-testid="ccr-country-error">
              {errors.countryRefId}
            </div>
          )}
        </div>
      </div>

      <div className={`gba:mb-4`} data-testid="ccr-currency-container">
        <div className={`gba:relative`}>
          <SelectField
            allowClear
            label={getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.currency_label', 'Currency')}
            name="ccrCurrency"
            placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.currency_placeholder', 'Select Currency')}
            data-testid="ccr-currency-select"
            data={currencyOptions}
            isDataSorted={false}
            value={currencyId || undefined}
            disabled={isUpdate}
            onChange={(value: any) => onChangeCurrency(value?.value ?? null)}
            onBlur={onBlurCurrency}
            required
          />
          {showCurrencyError && (
            <div className="gba:mt-1 gba:pl-1 gba:text-[14px]" style={{ color: '#ff4d4f' }} data-testid="ccr-currency-error">
              {errors.currencyId}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SelectsSection;



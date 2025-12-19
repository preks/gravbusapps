import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Label } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface SelectsSectionProps {
  isUpdate: boolean
  calculationTypeId: string | null
  countryRefId: string | null
  currencyId: string | null
  calculationTypeOptions: any[]
  countryOptions: any[]
  currencyOptions: any[]
  onChangeCalculation: (value: string | null) => void
  onChangeCountry: (value: string | null) => void
  onChangeCurrency: (value: string | null) => void
  onBlurCalculation: () => void
  onBlurCountry: () => void
  onBlurCurrency: () => void
  showCalculationError: boolean
  showCountryError: boolean
  showCurrencyError: boolean
  errors: { calculationType?: string; countryRefId?: string; currencyId?: string }
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
      <div className="gba:mb-4" data-testid="ccr-calculation-type-container">
        <div className="gba:space-y-2">
          <Label htmlFor="ccrCalculationType">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.current_rule_period_label',
              'Rule Calculation'
            )}{' '}
            *
          </Label>
          <Select
            value={calculationTypeId || undefined}
            onValueChange={value => onChangeCalculation(value || null)}
            disabled={isUpdate}
          >
            <SelectTrigger className="gba:w-full" data-testid="ccr-calculation-select" onBlur={onBlurCalculation}>
              <SelectValue
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.current_rule_period_placeholder',
                  'Select Rule Calculation'
                )}
              />
            </SelectTrigger>
            <SelectContent>
              {calculationTypeOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {showCalculationError && (
            <div className="gba:text-sm gba:text-destructive" data-testid="ccr-calculation-error">
              {errors.calculationType}
            </div>
          )}
        </div>
      </div>

      <div className="gba:mb-4" data-testid="ccr-country-container">
        <div className="gba:space-y-2">
          <Label htmlFor="ccrCountry">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.country_ref_select_label',
              'Country'
            )}{' '}
            *
          </Label>
          <Select
            value={countryRefId || undefined}
            onValueChange={value => onChangeCountry(value || null)}
            disabled={isUpdate}
          >
            <SelectTrigger className="gba:w-full" data-testid="ccr-country-select" onBlur={onBlurCountry}>
              <SelectValue
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.country_ref_select_placeholder',
                  'Select Country'
                )}
              />
            </SelectTrigger>
            <SelectContent>
              {countryOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {showCountryError && (
            <div className="gba:text-sm gba:text-destructive" data-testid="ccr-country-error">
              {errors.countryRefId}
            </div>
          )}
        </div>
      </div>

      <div className="gba:mb-4" data-testid="ccr-currency-container">
        <div className="gba:space-y-2">
          <Label htmlFor="ccrCurrency">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.currency_label',
              'Currency'
            )}{' '}
            *
          </Label>
          <Select
            value={currencyId || undefined}
            onValueChange={value => onChangeCurrency(value || null)}
            disabled={isUpdate}
          >
            <SelectTrigger className="gba:w-full" data-testid="ccr-currency-select" onBlur={onBlurCurrency}>
              <SelectValue
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.currency_placeholder',
                  'Select Currency'
                )}
              />
            </SelectTrigger>
            <SelectContent>
              {currencyOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {showCurrencyError && (
            <div className="gba:text-sm gba:text-destructive" data-testid="ccr-currency-error">
              {errors.currencyId}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default SelectsSection

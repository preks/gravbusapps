import React from 'react'
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../_i18n'

export interface CurrencyDropdownProps {
  availableCurrencies: string[]
  selectedCurrency: string | null
  onCurrencyChange: (code: string | null) => void
  testIdPrefix?: string
  /** When set, used instead of Fluent `filter-currency-label`. */
  currencyLabelText?: string
  /** When set, used instead of Fluent `filter-all-currencies-short`. */
  allCurrenciesOptionText?: string
}

const ALL_VALUE = 'ALL'

export const CurrencyDropdown = React.memo(function CurrencyDropdown({
  availableCurrencies,
  selectedCurrency,
  onCurrencyChange,
  testIdPrefix = 'expense-plans',
  currencyLabelText,
  allCurrenciesOptionText
}: CurrencyDropdownProps) {
  const { t } = useTranslation(translations)

  if (availableCurrencies.length === 0) return null

  const value = selectedCurrency ?? ALL_VALUE
  const labelText = currencyLabelText ?? t('filter-currency-label')
  const allOptionText = allCurrenciesOptionText ?? t('filter-all-currencies-short')

  const handleValueChange = (v: string) => {
    onCurrencyChange(v === ALL_VALUE ? null : v)
  }

  return (
    <div className="gba:flex gba:items-center gba:gap-2" data-testid={`${testIdPrefix}-currency-filter`}>
      <Label className="gba:text-sm gba:font-medium gba:shrink-0 gba:whitespace-nowrap">{labelText}:</Label>
      <Select value={value} onValueChange={handleValueChange}>
        <SelectTrigger className="gba:w-32" data-testid={`${testIdPrefix}-currency-select`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>{allOptionText}</SelectItem>
          {availableCurrencies.map(code => (
            <SelectItem key={code} value={code}>
              {code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
})

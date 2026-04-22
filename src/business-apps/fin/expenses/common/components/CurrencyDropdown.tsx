import React from 'react'
import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface CurrencyDropdownProps {
  availableCurrencies: string[]
  selectedCurrency: string | null
  onCurrencyChange: (code: string | null) => void
  testIdPrefix?: string
}

const ALL_VALUE = 'ALL'

export const CurrencyDropdown = React.memo(function CurrencyDropdown({
  availableCurrencies,
  selectedCurrency,
  onCurrencyChange,
  testIdPrefix = 'expense-plans'
}: CurrencyDropdownProps) {
  if (availableCurrencies.length === 0) return null

  const value = selectedCurrency ?? ALL_VALUE

  const handleValueChange = (v: string) => {
    onCurrencyChange(v === ALL_VALUE ? null : v)
  }

  return (
    <div className="gba:flex gba:items-center gba:gap-2" data-testid={`${testIdPrefix}-currency-filter`}>
      <Label className="gba:text-sm gba:font-medium gba:shrink-0 gba:whitespace-nowrap">
        {getTranslationFromI18nKeyAndLabel(
          'lowcoder:create_expense_item.change_expense_item_container.current_currency_label',
          'Currency'
        )}
        :
      </Label>
      <Select value={value} onValueChange={handleValueChange}>
        <SelectTrigger className="gba:w-32" data-testid={`${testIdPrefix}-currency-select`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>
            {getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.all_currencies', 'All')}
          </SelectItem>
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

import React from 'react'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface CurrencyOption {
  readonly currencyRef: string
  readonly code: string
}

interface CurrencySelectFilterProps {
  readonly currencyRef: string
  readonly onCurrencyChange: (ref: string) => void
  readonly currencies: readonly CurrencyOption[]
  readonly testIdPrefix: string
}

const CurrencySelectFilter: React.FC<CurrencySelectFilterProps> = ({
  currencyRef,
  onCurrencyChange,
  currencies,
  testIdPrefix
}) => (
  <div className="gba:w-full">
    <Select onValueChange={val => onCurrencyChange(val === '__all__' ? '' : val)} value={currencyRef || '__all__'}>
      <SelectTrigger data-testid={`${testIdPrefix}-currency-select`} className="gba:border-border">
        <SelectValue
          placeholder={getTranslationFromI18nKeyAndLabel(
            'lowcoder:manager_expense_landing_page.all_currencies',
            'All Currencies'
          )}
        />
      </SelectTrigger>
      <SelectContent>
        <SelectItem key="__all__" value="__all__" data-testid={`${testIdPrefix}-currency-option-all`}>
          {getTranslationFromI18nKeyAndLabel('lowcoder:manager_expense_landing_page.all_currencies', 'All Currencies')}
        </SelectItem>
        {(currencies || []).map(c => (
          <SelectItem
            key={c.currencyRef}
            value={c.currencyRef}
            data-testid={`${testIdPrefix}-currency-option-${c.code}`}
          >
            {c.code}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)

export default CurrencySelectFilter

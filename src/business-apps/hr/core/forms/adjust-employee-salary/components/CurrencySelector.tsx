import React from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Input,
  useTranslation
} from '@newwork/nw-design-system'
import type { Control, Path } from 'react-hook-form'
import type { AdjustEmployeeSalaryFormValues, CurrencyOption } from '../types'
import translations from '../../_i18n'

interface CurrencySelectorProps {
  control: Control<AdjustEmployeeSalaryFormValues>
  currencies: CurrencyOption[]
  /** If true, currency is prefilled from bank account and cannot be changed */
  isReadonly?: boolean
}

const CurrencySelector: React.FC<CurrencySelectorProps> = ({ control, currencies, isReadonly = false }) => {
  const { t } = useTranslation(translations)
  const placeholderSelect = t('action-select-placeholder', { defaultValue: 'Please Select' })

  return (
    <FormField
      control={control}
      name={'currency' as Path<AdjustEmployeeSalaryFormValues>}
      rules={{
        required: t('assign-salary-currency-required')
      }}
      render={({ field }) => {
        // Find selected currency for display (avoid "RON - RON" when code and value are the same)
        const selectedCurrency = currencies.find(c => c.id === field.value)
        const displayValue = selectedCurrency
          ? selectedCurrency.code === selectedCurrency.value
            ? selectedCurrency.code
            : `${selectedCurrency.code} - ${selectedCurrency.value}`
          : ''

        return (
          <FormItem>
            <FormLabel data-testid="assign-employee-salary-currency-label">
              {t('adjust-salary-currency')}
              <span className="gba:text-destructive"> *</span>
            </FormLabel>
            {isReadonly ? (
              // Readonly display - show as disabled input with currency value
              <FormControl>
                <Input
                  value={displayValue}
                  disabled
                  readOnly
                  className="gba:bg-muted"
                  data-testid="assign-employee-salary-currency-readonly"
                />
              </FormControl>
            ) : (
              // Editable select dropdown
              <Select
                value={(field.value as string) || undefined}
                onValueChange={(value: string) => field.onChange(value)}
              >
                <FormControl>
                  <SelectTrigger className="gba:w-full" data-testid="assign-employee-salary-currency-select">
                    <SelectValue placeholder={placeholderSelect} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {currencies.map(currency => (
                    <SelectItem
                      key={currency.id}
                      value={currency.id}
                      data-testid={`assign-employee-salary-currency-option-${currency.code}`}
                    >
                      {currency.code === currency.value ? currency.code : `${currency.code} - ${currency.value}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}

export default CurrencySelector

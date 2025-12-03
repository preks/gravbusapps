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
  useTranslation
} from '@newwork/nw-design-system'
import type { Control, Path } from 'react-hook-form'
import type { AdjustEmployeeSalaryFormValues, CurrencyOption } from '../types'
import translations from '../../_i18n'

interface CurrencySelectorProps {
  control: Control<AdjustEmployeeSalaryFormValues>
  currencies: CurrencyOption[]
}

const CurrencySelector: React.FC<CurrencySelectorProps> = ({ control, currencies }) => {
  const { t } = useTranslation(translations)
  const placeholderSelect = t('action-select-placeholder', { defaultValue: 'Please Select' })

  return (
    <FormField
      control={control}
      name={'currency' as Path<AdjustEmployeeSalaryFormValues>}
      rules={{
        required: t('assign-salary-currency-required')
      }}
      render={({ field }) => (
        <FormItem>
          <FormLabel data-testid="assign-employee-salary-currency-label">
            {t('adjust-salary-currency')}
            <span className="gba:text-destructive"> *</span>
          </FormLabel>
          <Select value={(field.value as string) || undefined} onValueChange={(value: string) => field.onChange(value)}>
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
                  {currency.code} - {currency.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export default CurrencySelector

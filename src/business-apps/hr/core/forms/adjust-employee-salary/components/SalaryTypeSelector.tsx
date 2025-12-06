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
import type { AdjustEmployeeSalaryFormValues, SalaryType } from '../types'
import translations from '../../_i18n'

interface SalaryTypeSelectorProps {
  control: Control<AdjustEmployeeSalaryFormValues>
}

const SalaryTypeSelector: React.FC<SalaryTypeSelectorProps> = ({ control }) => {
  const { t } = useTranslation(translations)
  const placeholderSelect = t('action-select-placeholder', { defaultValue: 'Please Select' })

  return (
    <FormField
      control={control}
      name={'salaryType' as Path<AdjustEmployeeSalaryFormValues>}
      rules={{
        required: t('assign-salary-type-required')
      }}
      render={({ field }) => (
        <FormItem>
          <FormLabel data-testid="assign-employee-salary-type-label">
            {t('assign-salary-type')}
            <span className="gba:text-destructive"> *</span>
          </FormLabel>
          <Select
            value={(field.value as string) || undefined}
            onValueChange={(value: SalaryType) => field.onChange(value)}
          >
            <FormControl>
              <SelectTrigger className="gba:w-full" data-testid="assign-employee-salary-type-select">
                <SelectValue placeholder={placeholderSelect} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="yearlyMonthly" data-testid="assign-employee-salary-type-option-yearly-monthly">
                {t('assign-salary-type-yearly-monthly')}
              </SelectItem>
              <SelectItem value="hourly" data-testid="assign-employee-salary-type-option-hourly">
                {t('assign-salary-type-hourly')}
              </SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export default SalaryTypeSelector

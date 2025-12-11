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
import type { AdjustEmployeeSalaryFormValues } from '../types'
import translations from '../../_i18n'

interface SalaryFrequencySelectorProps {
  control: Control<AdjustEmployeeSalaryFormValues>
  /** Whether hourly salary data exists for this employee */
  hasHourlySalary?: boolean
  /** Whether annual/monthly salary data exists for this employee */
  hasAnnualMonthlySalary?: boolean
}

const SalaryFrequencySelector: React.FC<SalaryFrequencySelectorProps> = ({
  control,
  hasHourlySalary = false,
  hasAnnualMonthlySalary = true
}) => {
  const { t } = useTranslation(translations)
  const placeholderSelect = t('action-select-placeholder', { defaultValue: 'Please Select' })

  return (
    <FormField
      control={control}
      name={'adjustmentFrequency' as Path<AdjustEmployeeSalaryFormValues>}
      rules={{
        required: t('adjust-salary-frequency-required')
      }}
      render={({ field }) => (
        <FormItem>
          <FormLabel data-testid="adjust-employee-salary-frequency-label">
            {t('adjust-salary-frequency')}
            <span className="gba:text-destructive"> *</span>
          </FormLabel>
          <Select
            value={(field.value as string) || undefined}
            onValueChange={(value: 'annually' | 'monthly' | 'hourly') => field.onChange(value)}
          >
            <FormControl>
              <SelectTrigger className="gba:w-full" data-testid="adjust-employee-salary-frequency-select">
                <SelectValue placeholder={placeholderSelect} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem
                value="annually"
                disabled={!hasAnnualMonthlySalary}
                data-testid="adjust-employee-salary-frequency-option-annually"
              >
                {t('adjust-salary-frequency-annually')}
              </SelectItem>
              <SelectItem
                value="monthly"
                disabled={!hasAnnualMonthlySalary}
                data-testid="adjust-employee-salary-frequency-option-monthly"
              >
                {t('adjust-salary-frequency-monthly')}
              </SelectItem>
              <SelectItem
                value="hourly"
                disabled={!hasHourlySalary}
                data-testid="adjust-employee-salary-frequency-option-hourly"
              >
                {t('adjust-salary-frequency-hourly')}
              </SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export default SalaryFrequencySelector

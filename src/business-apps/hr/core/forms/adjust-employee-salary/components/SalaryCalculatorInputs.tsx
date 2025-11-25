import React, { useMemo } from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  useTranslation
} from '@newwork/nw-design-system'
import { useWatch } from 'react-hook-form'
import type { Control, Path } from 'react-hook-form'
import type { AdjustEmployeeSalaryFormValues } from '../types'
import translations from '../../_i18n'

interface SalaryCalculatorInputsProps {
  control: Control<AdjustEmployeeSalaryFormValues>
  adjustmentFrequency: 'annually' | 'monthly' | 'hourly'
}

const SalaryCalculatorInputs: React.FC<SalaryCalculatorInputsProps> = ({ control, adjustmentFrequency }) => {
  const { t } = useTranslation(translations)
  const placeholderEnter = t('action-enter-placeholder', { defaultValue: 'Please Enter' })

  // Watch both field values to determine which should be disabled
  const amountIncrease = useWatch({ control, name: 'amountIncrease' })
  const percentageIncrease = useWatch({ control, name: 'percentageIncrease' })

  // Calculate disabled states - disable one when the other has a value
  const isAmountDisabled = useMemo(() => {
    return percentageIncrease != null && percentageIncrease > 0
  }, [percentageIncrease])

  const isPercentageDisabled = useMemo(() => {
    return amountIncrease != null && amountIncrease > 0
  }, [amountIncrease])

  const frequencyLabels: Record<'annually' | 'monthly' | 'hourly', string> = {
    annually: t('adjust-salary-frequency-annually'),
    monthly: t('adjust-salary-frequency-monthly'),
    hourly: t('adjust-salary-frequency-hourly')
  }

  // Shared validation function
  const validateField = (
    value: string | number | null,
    formValues: AdjustEmployeeSalaryFormValues
  ): string | boolean => {
    // Only validate if this field has a value (not disabled)
    if (value !== null && value !== undefined && value !== '') {
      const numValue = typeof value === 'string' ? Number.parseFloat(value) : value
      if (typeof numValue === 'number' && (Number.isNaN(numValue) || numValue <= 0)) {
        return t('adjust-salary-adjustment-value-positive')
      }
    }
    // Check if at least one field has a value
    const hasAmount = formValues.amountIncrease != null && formValues.amountIncrease > 0
    const hasPercentage = formValues.percentageIncrease != null && formValues.percentageIncrease > 0
    if (!hasAmount && !hasPercentage) {
      return t('adjust-salary-adjustment-value-required')
    }
    return true
  }

  // Shared onChange handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, fieldOnChange: (value: number | null) => void) => {
    const val = e.target.value
    if (val === '') {
      fieldOnChange(null)
      return
    }
    const parsed = Number.parseFloat(val)
    const newValue = Number.isNaN(parsed) ? null : parsed
    fieldOnChange(newValue)
  }

  return (
    <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
      {/* Amount Increase Input */}
      <FormField
        control={control}
        name={'amountIncrease' as Path<AdjustEmployeeSalaryFormValues>}
        rules={{ validate: validateField }}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="adjust-employee-salary-amount-label">
              {t('adjust-salary-increase-amount')} ({frequencyLabels[adjustmentFrequency]})
              <span className="gba:text-destructive"> *</span>
            </FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.01"
                min="0"
                disabled={isAmountDisabled}
                className="gba:w-full"
                value={field.value ?? ''}
                onChange={e => handleInputChange(e, field.onChange)}
                placeholder={placeholderEnter}
                data-testid="adjust-employee-salary-amount-input"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Percentage Increase Input */}
      <FormField
        control={control}
        name={'percentageIncrease' as Path<AdjustEmployeeSalaryFormValues>}
        rules={{ validate: validateField }}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="adjust-employee-salary-percentage-label">
              {t('adjust-salary-increase-percentage')}
              <span className="gba:text-destructive"> *</span>
            </FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.01"
                min="0"
                disabled={isPercentageDisabled}
                className="gba:w-full"
                value={field.value ?? ''}
                onChange={e => handleInputChange(e, field.onChange)}
                placeholder={placeholderEnter}
                data-testid="adjust-employee-salary-percentage-input"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

export default SalaryCalculatorInputs

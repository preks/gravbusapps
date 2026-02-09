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
import type { Control, Path, ControllerRenderProps } from 'react-hook-form'
import type { AdjustEmployeeSalaryFormValues } from '../types'
import translations from '../../_i18n'
import { useNumericInput } from '@/common/hooks/forms/useNumericInput'

interface SalaryCalculatorInputsProps {
  control: Control<AdjustEmployeeSalaryFormValues>
  adjustmentFrequency: 'annually' | 'monthly' | 'hourly'
  currentSalaryAnnual: number
  currentSalaryMonthly: number | null
  currentSalaryHourly: number | null
}

// Separate component to properly use hooks
interface NumericInputFieldProps {
  field: ControllerRenderProps<AdjustEmployeeSalaryFormValues, any>
  maxValue: number
  minValue?: number
  disabled: boolean
  label: string
  placeholder: string
  testId: string
}

const NumericInputField: React.FC<NumericInputFieldProps> = ({
  field,
  maxValue,
  minValue,
  disabled,
  label,
  placeholder,
  testId
}) => {
  const numericInput = useNumericInput(field.value, field.onChange, {
    maxDecimals: 2,
    allowNegative: true, // Allow negative values for salary reductions
    maxValue,
    minValue // Set minimum value (negative of current salary for reductions)
  })

  return (
    <FormItem>
      <FormLabel data-testid={`${testId}-label`} className="gba:whitespace-nowrap">
        {label}
        <span className="gba:text-destructive"> *</span>
      </FormLabel>
      <FormControl>
        <Input
          type="text"
          inputMode="decimal"
          disabled={disabled}
          className="gba:w-full"
          value={numericInput.displayValue}
          onChange={numericInput.handleChange}
          onKeyDown={numericInput.handleKeyDown}
          onPaste={numericInput.handlePaste}
          placeholder={placeholder}
          data-testid={`${testId}-input`}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )
}

const SalaryCalculatorInputs: React.FC<SalaryCalculatorInputsProps> = ({
  control,
  adjustmentFrequency,
  currentSalaryAnnual,
  currentSalaryMonthly,
  currentSalaryHourly
}) => {
  const { t } = useTranslation(translations)
  const placeholderEnter = t('action-enter-placeholder', { defaultValue: 'Please Enter' })

  // Watch both field values to determine which should be disabled
  const amountIncrease = useWatch({ control, name: 'amountIncrease' })
  const percentageIncrease = useWatch({ control, name: 'percentageIncrease' })

  // Calculate disabled states - disable one when the other has a value (positive or negative)
  const isAmountDisabled = useMemo(() => {
    return percentageIncrease != null && percentageIncrease !== 0
  }, [percentageIncrease])

  const isPercentageDisabled = useMemo(() => {
    return amountIncrease != null && amountIncrease !== 0
  }, [amountIncrease])

  const frequencyLabels: Record<'annually' | 'monthly' | 'hourly', string> = {
    annually: t('adjust-salary-frequency-annually'),
    monthly: t('adjust-salary-frequency-monthly'),
    hourly: t('adjust-salary-frequency-hourly')
  }

  // Validation limits
  const AMOUNT_MAX_VALUE = 100_000_000 // 100 million
  const PERCENTAGE_MAX_VALUE = 100 // 100%

  // Get current salary based on adjustment frequency
  const getCurrentSalaryForFrequency = useMemo(() => {
    if (adjustmentFrequency === 'hourly') {
      return currentSalaryHourly || currentSalaryAnnual / 2080 // 2080 = 40 hours/week * 52 weeks
    }
    if (adjustmentFrequency === 'monthly') {
      return currentSalaryMonthly || currentSalaryAnnual / 12
    }
    return currentSalaryAnnual
  }, [adjustmentFrequency, currentSalaryAnnual, currentSalaryMonthly, currentSalaryHourly])

  // Validation function for amount field
  const validateAmountField = (
    value: string | number | null,
    formValues: AdjustEmployeeSalaryFormValues
  ): string | boolean => {
    // Only validate if this field has a value (not disabled)
    if (value !== null && value !== undefined && value !== '') {
      const numValue = typeof value === 'string' ? Number.parseFloat(value) : value

      // Allow negative values (for salary reductions), but reject zero and NaN
      if (typeof numValue === 'number' && (Number.isNaN(numValue) || numValue === 0)) {
        return t('adjust-salary-adjustment-value-not-zero')
      }

      // Check if amount reduction exceeds current salary
      if (typeof numValue === 'number' && numValue < 0) {
        const currentSalary = getCurrentSalaryForFrequency
        const absoluteReduction = Math.abs(numValue)
        if (absoluteReduction > currentSalary) {
          return t('adjust-salary-reduction-exceeds-current', {
            current: currentSalary.toFixed(2),
            frequency: frequencyLabels[adjustmentFrequency]
          })
        }
      }
    }

    // Check if at least one field has a non-zero value (positive or negative)
    const hasAmount = formValues.amountIncrease != null && formValues.amountIncrease !== 0
    const hasPercentage = formValues.percentageIncrease != null && formValues.percentageIncrease !== 0
    if (!hasAmount && !hasPercentage) {
      return t('adjust-salary-adjustment-value-required')
    }
    return true
  }

  // Validation function for percentage field
  const validatePercentageField = (
    value: string | number | null,
    formValues: AdjustEmployeeSalaryFormValues
  ): string | boolean => {
    // Only validate if this field has a value (not disabled)
    if (value !== null && value !== undefined && value !== '') {
      const numValue = typeof value === 'string' ? Number.parseFloat(value) : value

      // Allow negative values (for salary reductions), but reject zero and NaN
      if (typeof numValue === 'number' && (Number.isNaN(numValue) || numValue === 0)) {
        return t('adjust-salary-adjustment-value-not-zero')
      }

      // Check if percentage reduction exceeds 100%
      if (typeof numValue === 'number' && numValue < 0) {
        const absolutePercentage = Math.abs(numValue)
        if (absolutePercentage > 100) {
          return t('adjust-salary-reduction-exceeds-100-percent')
        }
      }
    }

    // Check if at least one field has a non-zero value (positive or negative)
    const hasAmount = formValues.amountIncrease != null && formValues.amountIncrease !== 0
    const hasPercentage = formValues.percentageIncrease != null && formValues.percentageIncrease !== 0
    if (!hasAmount && !hasPercentage) {
      return t('adjust-salary-adjustment-value-required')
    }
    return true
  }

  return (
    <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
      {/* Amount Increase Input */}
      <FormField
        control={control}
        name={'amountIncrease' as Path<AdjustEmployeeSalaryFormValues>}
        rules={{ validate: validateAmountField }}
        render={({ field }) => (
          <NumericInputField
            field={field}
            maxValue={AMOUNT_MAX_VALUE}
            minValue={-getCurrentSalaryForFrequency}
            disabled={isAmountDisabled}
            label={`${t('adjust-salary-increase-amount')} (${frequencyLabels[adjustmentFrequency]})`}
            placeholder={placeholderEnter}
            testId="adjust-employee-salary-amount"
          />
        )}
      />

      {/* Percentage Increase Input */}
      <FormField
        control={control}
        name={'percentageIncrease' as Path<AdjustEmployeeSalaryFormValues>}
        rules={{ validate: validatePercentageField }}
        render={({ field }) => (
          <NumericInputField
            field={field}
            maxValue={PERCENTAGE_MAX_VALUE}
            minValue={-100}
            disabled={isPercentageDisabled}
            label={t('adjust-salary-increase-percentage')}
            placeholder={placeholderEnter}
            testId="adjust-employee-salary-percentage"
          />
        )}
      />
    </div>
  )
}

export default SalaryCalculatorInputs

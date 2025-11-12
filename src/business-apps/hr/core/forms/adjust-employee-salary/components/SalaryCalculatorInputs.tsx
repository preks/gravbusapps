import React, { useRef, useEffect } from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  useTranslation
} from '@newwork/nw-design-system'
import type { Control, Path } from 'react-hook-form'
import { useWatch } from 'react-hook-form'
import type { AdjustEmployeeSalaryFormValues } from '../types'
import { calculatePercentageFromAmount, calculateAmountFromPercentage } from '../utils/salaryCalculator'
import translations from '../../../apps/employee-record/_i18n'

interface SalaryCalculatorInputsProps {
  control: Control<AdjustEmployeeSalaryFormValues>
  setValue: (name: keyof AdjustEmployeeSalaryFormValues, value: any) => void
  currentSalary: number
}

const SalaryCalculatorInputs: React.FC<SalaryCalculatorInputsProps> = ({ control, setValue, currentSalary }) => {
  const { t } = useTranslation(translations)
  const placeholderEnter = t('action-enter-placeholder', { defaultValue: 'Please Enter' })

  const amountIncrease = useWatch({ control, name: 'amountIncrease' }) || null
  const percentageIncrease = useWatch({ control, name: 'percentageIncrease' }) || null

  const lastChangedRef = useRef<'amount' | 'percentage' | null>(null)
  const isUpdatingRef = useRef(false)

  // Sync values when one changes
  useEffect(() => {
    if (isUpdatingRef.current) return

    if (amountIncrease && amountIncrease > 0 && lastChangedRef.current === 'amount' && currentSalary > 0) {
      const calculatedPercentage = calculatePercentageFromAmount(currentSalary, amountIncrease)
      if (Math.abs((percentageIncrease || 0) - calculatedPercentage) > 0.01) {
        isUpdatingRef.current = true
        setValue('percentageIncrease', Math.round(calculatedPercentage * 100) / 100, { shouldValidate: false })
        setTimeout(() => {
          isUpdatingRef.current = false
        }, 10)
      }
    } else if (
      percentageIncrease &&
      percentageIncrease > 0 &&
      lastChangedRef.current === 'percentage' &&
      currentSalary > 0
    ) {
      const calculatedAmount = calculateAmountFromPercentage(currentSalary, percentageIncrease)
      if (Math.abs((amountIncrease || 0) - calculatedAmount) > 0.01) {
        isUpdatingRef.current = true
        setValue('amountIncrease', Math.round(calculatedAmount * 100) / 100, { shouldValidate: false })
        setTimeout(() => {
          isUpdatingRef.current = false
        }, 10)
      }
    }
  }, [amountIncrease, percentageIncrease, currentSalary, setValue])

  return (
    <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
      {/* Amount Increase Input */}
      <FormField
        control={control}
        name={'amountIncrease' as Path<AdjustEmployeeSalaryFormValues>}
        rules={{
          validate: (value: string | number | null) => {
            if (value === null || value === undefined || value === '') {
              if (!percentageIncrease || percentageIncrease === 0) {
                return t('adjust-salary-adjustment-value-required')
              }
              return true
            }
            const numValue = typeof value === 'string' ? parseFloat(value) : value
            if (typeof numValue === 'number' && (Number.isNaN(numValue) || numValue < 0)) {
              return t('adjust-salary-adjustment-value-positive')
            }
            return true
          }
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="adjust-employee-salary-amount-label">
              {t('adjust-salary-increase-amount')}
              <span className="gba:text-destructive"> *</span>
            </FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.01"
                min="0"
                className="gba:w-full"
                value={field.value ?? ''}
                onChange={e => {
                  const val = e.target.value
                  const parsed = parseFloat(val)
                  const newValue = val === '' ? null : Number.isNaN(parsed) ? null : parsed
                  field.onChange(newValue)
                  lastChangedRef.current = 'amount'
                  if (!newValue || newValue === 0) {
                    setValue('percentageIncrease', null)
                  }
                }}
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
        rules={{
          validate: (value: string | number | null) => {
            if (value === null || value === undefined || value === '') {
              if (!amountIncrease || amountIncrease === 0) {
                return t('adjust-salary-adjustment-value-required')
              }
              return true
            }
            const numValue = typeof value === 'string' ? parseFloat(value) : value
            if (typeof numValue === 'number' && (Number.isNaN(numValue) || numValue < 0)) {
              return t('adjust-salary-adjustment-value-positive')
            }
            return true
          }
        }}
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
                className="gba:w-full"
                value={field.value ?? ''}
                onChange={e => {
                  const val = e.target.value
                  const parsed = parseFloat(val)
                  const newValue = val === '' ? null : Number.isNaN(parsed) ? null : parsed
                  field.onChange(newValue)
                  lastChangedRef.current = 'percentage'
                  if (!newValue || newValue === 0) {
                    setValue('amountIncrease', null)
                  }
                }}
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

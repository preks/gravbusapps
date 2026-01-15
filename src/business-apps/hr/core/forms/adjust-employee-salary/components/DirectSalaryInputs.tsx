import React, { useMemo } from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Card,
  useTranslation
} from '@newwork/nw-design-system'
import { useWatch } from 'react-hook-form'
import type { Control, Path, ControllerRenderProps } from 'react-hook-form'
import type { AdjustEmployeeSalaryFormValues } from '../types'
import { formatCurrencyString } from '@/common/utils/numberFormatter'
import translations from '../../_i18n'
import { useNumericInput } from '@/common/hooks/forms/useNumericInput'

interface DirectSalaryInputsProps {
  control: Control<AdjustEmployeeSalaryFormValues>
  currencyCode: string
  locale: string
  /** Employee's weekly working hours - used to calculate expected monthly wage for hourly workers */
  weeklyHours?: number | null
}

// Separate component for salary input with hooks
interface SalaryInputFieldProps {
  field: ControllerRenderProps<AdjustEmployeeSalaryFormValues, any>
  maxValue: number
  label: string
  placeholder: string
  testId: string
}

const SalaryInputField: React.FC<SalaryInputFieldProps> = ({ field, maxValue, label, placeholder, testId }) => {
  const salaryInput = useNumericInput(field.value, field.onChange, {
    maxDecimals: 2,
    allowNegative: false,
    maxValue,
    minValue: 0
  })

  return (
    <FormItem>
      <FormLabel data-testid={`${testId}-label`}>
        {label}
        <span className="gba:text-destructive"> *</span>
      </FormLabel>
      <FormControl>
        <Input
          type="text"
          inputMode="decimal"
          className="gba:w-full"
          value={salaryInput.displayValue}
          onChange={salaryInput.handleChange}
          onKeyDown={salaryInput.handleKeyDown}
          onPaste={salaryInput.handlePaste}
          placeholder={placeholder}
          data-testid={`${testId}-input`}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )
}

const DirectSalaryInputs: React.FC<DirectSalaryInputsProps> = ({
  control,
  currencyCode,
  locale,
  weeklyHours = null
}) => {
  const { t } = useTranslation(translations)
  const placeholderEnter = t('action-enter-placeholder', { defaultValue: 'Please Enter' })

  // Validation limits
  const MONTHLY_SALARY_MAX_VALUE = 10_000_000 // 10 million monthly
  const HOURLY_SALARY_MAX_VALUE = 100_000 // 100k per hour

  const salaryType = useWatch({ control, name: 'salaryType' })
  const monthlySalary = useWatch({ control, name: 'monthlySalary' })
  const hourlySalary = useWatch({ control, name: 'hourlySalary' })

  // Calculate annual equivalent for monthly type (monthly × 12)
  const annualEquivalent = useMemo(() => {
    if (salaryType !== 'yearlyMonthly' || !monthlySalary || monthlySalary <= 0) {
      return null
    }
    return monthlySalary * 12
  }, [salaryType, monthlySalary])

  // Calculate expected monthly wage for hourly type (hourlyWage × weeklyHours × 4)
  // Using exactly 4 weeks per month
  const expectedMonthlyWage = useMemo(() => {
    if (salaryType !== 'hourly' || !hourlySalary || hourlySalary <= 0 || !weeklyHours || weeklyHours <= 0) {
      return null
    }
    return hourlySalary * weeklyHours * 4
  }, [salaryType, hourlySalary, weeklyHours])

  // Monthly salary input
  if (salaryType === 'yearlyMonthly') {
    return (
      <div className="gba:space-y-3">
        <FormField
          control={control}
          name={'monthlySalary' as Path<AdjustEmployeeSalaryFormValues>}
          rules={{
            required: t('assign-salary-monthly-salary-required'),
            validate: value => {
              if (value === null || value === undefined) return true
              const numValue = typeof value === 'string' ? Number.parseFloat(value) : value
              if (numValue <= 0) return t('assign-salary-monthly-salary-positive')
              return true
            }
          }}
          render={({ field }) => (
            <SalaryInputField
              field={field}
              maxValue={MONTHLY_SALARY_MAX_VALUE}
              label={t('assign-salary-monthly-salary')}
              placeholder={placeholderEnter}
              testId="assign-employee-salary-monthly"
            />
          )}
        />

        {/* Annual Equivalent Display (Monthly × 12) */}
        {annualEquivalent && annualEquivalent > 0 && (
          <Card className="gba:p-3 gba:bg-muted" data-testid="assign-employee-salary-annual-equivalent">
            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:text-muted-foreground">{t('assign-salary-annual-equivalent')}</span>
              <span className="gba:text-base gba:font-semibold gba:text-foreground">
                {formatCurrencyString(annualEquivalent, {
                  currency: currencyCode,
                  locale: locale,
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })}
              </span>
            </div>
          </Card>
        )}
      </div>
    )
  }

  // Hourly salary input
  if (salaryType === 'hourly') {
    return (
      <div className="gba:space-y-3">
        <FormField
          control={control}
          name={'hourlySalary' as Path<AdjustEmployeeSalaryFormValues>}
          rules={{
            required: t('assign-salary-hourly-salary-required'),
            validate: value => {
              if (value === null || value === undefined) return true
              const numValue = typeof value === 'string' ? Number.parseFloat(value) : value
              if (numValue <= 0) return t('assign-salary-hourly-salary-positive')
              return true
            }
          }}
          render={({ field }) => (
            <SalaryInputField
              field={field}
              maxValue={HOURLY_SALARY_MAX_VALUE}
              label={t('assign-salary-hourly-salary')}
              placeholder={placeholderEnter}
              testId="assign-employee-salary-hourly"
            />
          )}
        />

        {/* Expected Monthly Wage Display (based on employee working hours) */}
        {expectedMonthlyWage && expectedMonthlyWage > 0 && (
          <Card className="gba:p-3 gba:bg-muted" data-testid="assign-employee-salary-expected-monthly">
            <div className="gba:flex gba:flex-col gba:gap-1">
              <div className="gba:flex gba:justify-between gba:items-center">
                <span className="gba:text-sm gba:text-muted-foreground">
                  {t('assign-salary-expected-monthly-wage')}
                </span>
                <span className="gba:text-base gba:font-semibold gba:text-foreground">
                  {formatCurrencyString(expectedMonthlyWage, {
                    currency: currencyCode,
                    locale: locale,
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  })}
                </span>
              </div>
              <span className="gba:text-xs gba:text-muted-foreground">
                {t('assign-salary-expected-monthly-wage-description')}
              </span>
            </div>
          </Card>
        )}
      </div>
    )
  }

  // No salary type selected yet
  return null
}

export default DirectSalaryInputs

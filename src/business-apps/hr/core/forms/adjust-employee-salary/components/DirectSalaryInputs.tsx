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
import type { Control, Path } from 'react-hook-form'
import type { AdjustEmployeeSalaryFormValues } from '../types'
import { formatCurrencyString } from '@/common/utils/numberFormatter'
import translations from '../../_i18n'

interface DirectSalaryInputsProps {
  control: Control<AdjustEmployeeSalaryFormValues>
  currencyCode: string
  locale: string
  /** Employee's weekly working hours - used to calculate expected monthly wage for hourly workers */
  weeklyHours?: number | null
}

const DirectSalaryInputs: React.FC<DirectSalaryInputsProps> = ({
  control,
  currencyCode,
  locale,
  weeklyHours = null
}) => {
  const { t } = useTranslation(translations)
  const placeholderEnter = t('action-enter-placeholder', { defaultValue: 'Please Enter' })

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
            <FormItem>
              <FormLabel data-testid="assign-employee-salary-monthly-label">
                {t('assign-salary-monthly-salary')}
                <span className="gba:text-destructive"> *</span>
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="gba:w-full"
                  value={field.value ?? ''}
                  onChange={e => handleInputChange(e, field.onChange)}
                  placeholder={placeholderEnter}
                  data-testid="assign-employee-salary-monthly-input"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
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
            <FormItem>
              <FormLabel data-testid="assign-employee-salary-hourly-label">
                {t('assign-salary-hourly-salary')}
                <span className="gba:text-destructive"> *</span>
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="gba:w-full"
                  value={field.value ?? ''}
                  onChange={e => handleInputChange(e, field.onChange)}
                  placeholder={placeholderEnter}
                  data-testid="assign-employee-salary-hourly-input"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
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

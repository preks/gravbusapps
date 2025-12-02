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
import type { AdjustEmployeeSalaryFormValues, SalaryType } from '../types'
import { formatCurrencyString } from '@/common/utils/numberFormatter'
import translations from '../../_i18n'

interface DirectSalaryInputsProps {
  control: Control<AdjustEmployeeSalaryFormValues>
  currencyCode: string
  locale: string
}

const DirectSalaryInputs: React.FC<DirectSalaryInputsProps> = ({ control, currencyCode, locale }) => {
  const { t } = useTranslation(translations)
  const placeholderEnter = t('action-enter-placeholder', { defaultValue: 'Please Enter' })

  const salaryType = useWatch({ control, name: 'salaryType' }) as SalaryType
  const annualSalary = useWatch({ control, name: 'annualSalary' })

  // Calculate monthly equivalent for yearly/monthly type
  const monthlyEquivalent = useMemo(() => {
    if (salaryType !== 'yearlyMonthly' || !annualSalary || annualSalary <= 0) {
      return null
    }
    return annualSalary / 12
  }, [salaryType, annualSalary])

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

  // Yearly/Monthly salary input
  if (salaryType === 'yearlyMonthly') {
    return (
      <div className="gba:space-y-3">
        <FormField
          control={control}
          name={'annualSalary' as Path<AdjustEmployeeSalaryFormValues>}
          rules={{
            required: t('assign-salary-annual-salary-required'),
            validate: value => {
              if (value === null || value === undefined) return true
              const numValue = typeof value === 'string' ? Number.parseFloat(value) : value
              if (numValue <= 0) return t('assign-salary-annual-salary-positive')
              return true
            }
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel data-testid="assign-employee-salary-annual-label">
                {t('assign-salary-annual-salary')}
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
                  data-testid="assign-employee-salary-annual-input"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Monthly Equivalent Display */}
        {monthlyEquivalent && monthlyEquivalent > 0 && (
          <Card className="gba:p-3 gba:bg-muted" data-testid="assign-employee-salary-monthly-equivalent">
            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:text-muted-foreground">{t('assign-salary-monthly-equivalent')}</span>
              <span className="gba:text-base gba:font-semibold gba:text-foreground">
                {formatCurrencyString(monthlyEquivalent, {
                  currency: currencyCode,
                  locale: locale,
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
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
    )
  }

  // No salary type selected yet
  return null
}

export default DirectSalaryInputs

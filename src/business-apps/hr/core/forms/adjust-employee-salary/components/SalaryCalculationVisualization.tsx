import React, { useMemo } from 'react'
import { Card, useTranslation } from '@newwork/nw-design-system'
import { formatCurrencyString } from '@/common/utils/numberFormatter'
import type { CatalogEntry } from '../types'
import {
  calculateAdjustmentInAnnual,
  isHourlyFrequency,
  calculateAmountFromPercentage
} from '../utils/salaryCalculator'
import { calculateMonthlyFromYearly } from '../../../apps/employee-record/components/tabs/compensation/utils/salaryCalculations'
import translations from '../../_i18n'

interface SalaryCalculationVisualizationProps {
  currentSalaryAnnual: number
  currentSalaryMonthly: number | null
  currentSalaryHourly: number | null
  amountIncrease: number | null
  percentageIncrease: number | null
  adjustmentFrequency: 'annually' | 'monthly' | 'hourly'
  currentCurrency: CatalogEntry | null
  locale: string
}

const SalaryCalculationVisualization: React.FC<SalaryCalculationVisualizationProps> = ({
  currentSalaryAnnual,
  currentSalaryMonthly,
  currentSalaryHourly,
  amountIncrease,
  percentageIncrease,
  adjustmentFrequency,
  currentCurrency,
  locale
}) => {
  const { t } = useTranslation(translations)
  const currencyCode = (currentCurrency as any)?.code || 'EUR'

  const frequencyLabels: Record<'annually' | 'monthly' | 'hourly', string> = useMemo(
    () => ({
      annually: t('adjust-salary-frequency-annually'),
      monthly: t('adjust-salary-frequency-monthly'),
      hourly: t('adjust-salary-frequency-hourly')
    }),
    [t]
  )

  // Get current salary in selected frequency
  const currentSalaryInFrequency = useMemo(() => {
    if (adjustmentFrequency === 'hourly') {
      return currentSalaryHourly
    }
    if (adjustmentFrequency === 'monthly') {
      return currentSalaryMonthly ?? calculateMonthlyFromYearly(currentSalaryAnnual)
    }
    return currentSalaryAnnual
  }, [adjustmentFrequency, currentSalaryAnnual, currentSalaryMonthly, currentSalaryHourly])

  // Calculate adjustment amount
  const adjustmentAmount = useMemo(() => {
    if (amountIncrease && amountIncrease > 0) {
      return amountIncrease
    }
    if (percentageIncrease && percentageIncrease > 0 && currentSalaryInFrequency) {
      return calculateAmountFromPercentage(currentSalaryInFrequency, percentageIncrease)
    }
    return null
  }, [amountIncrease, percentageIncrease, currentSalaryInFrequency])

  // Calculate new salary in selected frequency
  const newSalaryInFrequency = useMemo(() => {
    // If there's an amount increase but no current salary, the new salary is just the increase
    if (amountIncrease && amountIncrease > 0 && !currentSalaryInFrequency) {
      return amountIncrease
    }
    if (!currentSalaryInFrequency || !adjustmentAmount) return null
    return currentSalaryInFrequency + adjustmentAmount
  }, [currentSalaryInFrequency, adjustmentAmount, amountIncrease])

  // ✅ ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // For annually/monthly: Calculate annual adjustments (always calculate, even if hourly)
  const adjustmentAnnual = useMemo(() => {
    if (!adjustmentAmount) return null
    return calculateAdjustmentInAnnual(adjustmentAmount, adjustmentFrequency)
  }, [adjustmentAmount, adjustmentFrequency])

  const newSalaryAnnual = useMemo(() => {
    if (!adjustmentAnnual) return currentSalaryAnnual
    return currentSalaryAnnual + adjustmentAnnual
  }, [currentSalaryAnnual, adjustmentAnnual])

  const newSalaryMonthly = useMemo(() => {
    return calculateMonthlyFromYearly(newSalaryAnnual)
  }, [newSalaryAnnual])

  // Calculate percentage for display
  const adjustmentPercentage = useMemo(() => {
    if (percentageIncrease && percentageIncrease > 0) {
      return percentageIncrease
    }
    if (amountIncrease && amountIncrease > 0 && currentSalaryInFrequency && currentSalaryInFrequency > 0) {
      return (amountIncrease / currentSalaryInFrequency) * 100
    }
    return null
  }, [amountIncrease, percentageIncrease, currentSalaryInFrequency])

  // ✅ NOW DO CONDITIONAL RETURNS AFTER ALL HOOKS
  // Early return AFTER all hooks - show if there's an adjustment amount OR if there's an amount increase (even without current salary)
  if ((!adjustmentAmount || adjustmentAmount <= 0) && (!amountIncrease || amountIncrease <= 0)) return null
  if (!newSalaryInFrequency && (!amountIncrease || amountIncrease <= 0)) return null

  // For hourly: Simplified vertical layout
  if (isHourlyFrequency(adjustmentFrequency)) {
    return (
      <Card
        className="gba:p-3 gba:border-2 gba:border-primary"
        data-testid="adjust-employee-salary-calculation-visualization"
      >
        <div className="gba:space-y-2">
          {/* Current Salary */}
          <div className="gba:flex gba:justify-between gba:items-center gba:py-1">
            <div className="gba:text-sm gba:text-muted-foreground">{t('adjust-salary-current-salary')}</div>
            <div className="gba:text-base gba:font-semibold gba:text-foreground">
              {currentSalaryInFrequency
                ? formatCurrencyString(currentSalaryInFrequency, {
                    currency: currencyCode,
                    locale: locale,
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })
                : '-'}
            </div>
          </div>

          {/* Adjustment */}
          <div className="gba:flex gba:justify-between gba:items-center gba:py-1">
            <div className="gba:text-sm gba:text-muted-foreground">
              {amountIncrease ? t('adjust-salary-increase-amount') : t('adjust-salary-increase-percentage')}
            </div>
            <div className="gba:text-base gba:font-semibold gba:text-success">
              +
              {amountIncrease
                ? formatCurrencyString(amountIncrease, {
                    currency: currencyCode,
                    locale: locale,
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })
                : `${percentageIncrease?.toFixed(2)}%`}
              {adjustmentPercentage && amountIncrease && (
                <span className="gba:text-xs gba:text-muted-foreground gba:ml-1">
                  ({adjustmentPercentage.toFixed(2)}%)
                </span>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="gba:border-t gba:border-border gba:my-2" />

          {/* New Salary */}
          <div className="gba:flex gba:justify-between gba:items-center gba:py-1">
            <div className="gba:text-sm gba:font-medium gba:text-foreground">{t('adjust-salary-new-salary')}</div>
            <div className="gba:text-xl gba:font-bold gba:text-primary">
              {formatCurrencyString(newSalaryInFrequency, {
                currency: currencyCode,
                locale: locale,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </div>
          </div>
        </div>
      </Card>
    )
  }

  // For annually/monthly: Simplified vertical layout with conversions
  return (
    <Card
      className="gba:p-3 gba:border-2 gba:border-primary"
      data-testid="adjust-employee-salary-calculation-visualization"
    >
      <div className="gba:space-y-2">
        {/* Current Salary */}
        <div className="gba:flex gba:justify-between gba:items-center gba:py-1">
          <div className="gba:text-sm gba:text-muted-foreground">
            {t('adjust-salary-current-salary')} ({frequencyLabels[adjustmentFrequency]})
          </div>
          <div className="gba:text-base gba:font-semibold gba:text-foreground">
            {currentSalaryInFrequency
              ? formatCurrencyString(currentSalaryInFrequency, {
                  currency: currencyCode,
                  locale: locale,
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })
              : '-'}
          </div>
        </div>

        {/* Adjustment */}
        <div className="gba:flex gba:justify-between gba:items-center gba:py-1">
          <div className="gba:text-sm gba:text-muted-foreground">
            {amountIncrease ? t('adjust-salary-increase-amount') : t('adjust-salary-increase-percentage')}
          </div>
          <div className="gba:text-base gba:font-semibold gba:text-success">
            +
            {amountIncrease
              ? formatCurrencyString(amountIncrease, {
                  currency: currencyCode,
                  locale: locale,
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })
              : `${percentageIncrease?.toFixed(2)}%`}
            {adjustmentPercentage && amountIncrease && (
              <span className="gba:text-xs gba:text-muted-foreground gba:ml-1">
                ({adjustmentPercentage.toFixed(2)}%)
              </span>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="gba:border-t gba:border-border gba:my-1" />

        {/* New Salary */}
        <div className="gba:flex gba:justify-between gba:items-center gba:py-1">
          <div className="gba:text-sm gba:font-medium gba:text-foreground">
            {t('adjust-salary-new-salary')} ({frequencyLabels[adjustmentFrequency]})
          </div>
          <div className="gba:text-xl gba:font-bold gba:text-primary">
            {formatCurrencyString(newSalaryInFrequency, {
              currency: currencyCode,
              locale: locale,
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            })}
          </div>
        </div>

        {/* Conversion: Show monthly if annually selected, or annual if monthly selected */}
        {adjustmentFrequency === 'annually' && (
          <div className="gba:flex gba:justify-between gba:items-center">
            <div className="gba:text-xs gba:text-muted-foreground">
              {t('adjust-salary-new-salary')} ({frequencyLabels.monthly})
            </div>
            <div className="gba:text-sm gba:text-muted-foreground">
              {formatCurrencyString(newSalaryMonthly, {
                currency: currencyCode,
                locale: locale,
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              })}
            </div>
          </div>
        )}
        {adjustmentFrequency === 'monthly' && (
          <div className="gba:flex gba:justify-between gba:items-center gba:py-1">
            <div className="gba:text-xs gba:text-muted-foreground">
              {t('adjust-salary-new-salary')} ({frequencyLabels.annually})
            </div>
            <div className="gba:text-sm gba:text-muted-foreground">
              {formatCurrencyString(newSalaryAnnual, {
                currency: currencyCode,
                locale: locale,
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

export default SalaryCalculationVisualization

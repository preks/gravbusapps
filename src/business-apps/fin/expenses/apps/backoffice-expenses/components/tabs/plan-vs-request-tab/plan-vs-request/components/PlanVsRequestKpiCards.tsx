import { useMemo } from 'react'
import { KpiCardData, useTranslation } from '@newwork/nw-design-system'
import translations from '../../../../../_i18n'

interface PlanVsRequestKpiCardsProps {
  totalExpensePlan: number
  totalExpenseRequest: number
  overduePlansCount: number
  overBudgetCount: number
  loadingOverduePlans: boolean
  loadingCategoryStats: boolean
  selectedPeriod: 'month' | 'quarter' | 'year'
  currentYear: string
  currentQuarter: string
  currentMonth: string
  selectedCurrencyCode: string
  formatCurrency: (amount: number) => string
}

export const usePlanVsRequestKpiCards = ({
  totalExpensePlan,
  totalExpenseRequest,
  overduePlansCount,
  overBudgetCount,
  loadingOverduePlans,
  loadingCategoryStats,
  selectedPeriod,
  currentYear,
  currentQuarter,
  currentMonth,
  selectedCurrencyCode,
  formatCurrency
}: PlanVsRequestKpiCardsProps): KpiCardData[] => {
  const { t } = useTranslation(translations)

  const getPeriodDisplay = (): string => {
    if (selectedPeriod === 'year') {
      return currentYear
    }
    if (selectedPeriod === 'quarter') {
      return currentQuarter
    }
    return `${currentMonth} ${currentYear}`
  }
  const periodDisplay = getPeriodDisplay()
  const percentVariance =
    totalExpensePlan === 0 ? null : ((totalExpenseRequest - totalExpensePlan) / totalExpensePlan) * 100
  const hasVariance = percentVariance !== null
  const isOverBudget = totalExpenseRequest > totalExpensePlan

  const varianceTrend = hasVariance
    ? {
        value: `${Math.abs(percentVariance).toFixed(1)}%`,
        description: isOverBudget ? t('kpi-over-budget') : t('kpi-within-budget'),
        trendIcon: isOverBudget ? 'up' : 'down',
        badgeVariant: isOverBudget ? 'destructive' : 'success'
      }
    : undefined

  return useMemo(
    () => [
      {
        id: 'actual-vs-planned',
        title: `${t('kpi-actual-vs-planned')} ${periodDisplay} (${selectedCurrencyCode})`,
        value: hasVariance ? Math.abs(percentVariance) : t('common-not-available'),
        suffix: hasVariance ? '%' : undefined,
        decimalPlaces: hasVariance ? 1 : undefined,
        footer: `${t('pvr-expense-plan-label')}: ${formatCurrency(totalExpensePlan)} | ${t('pvr-expense-request-label')}: ${formatCurrency(totalExpenseRequest)}`,
        trend: varianceTrend
      },
      {
        id: 'overdue-plans',
        title: t('pvr-overdue-plans'),
        value: loadingOverduePlans ? '-' : overduePlansCount,
        footer: t('pvr-plans-past-end-date')
      },
      {
        id: 'over-budget',
        title: t('kpi-over-budget'),
        value: loadingCategoryStats ? '-' : overBudgetCount,
        footer: t('pvr-items-exceeding-plan')
      },
      {
        id: 'potential-savings',
        title: t('pvr-potential-savings'),
        value: '-',
        footer: t('pvr-identified-opportunities')
      }
    ],
    [
      t,
      formatCurrency,
      loadingCategoryStats,
      loadingOverduePlans,
      overBudgetCount,
      overduePlansCount,
      periodDisplay,
      percentVariance,
      selectedCurrencyCode,
      totalExpensePlan,
      totalExpenseRequest
    ]
  )
}

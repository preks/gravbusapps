import { useMemo } from 'react'
import { KpiCardData } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

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
  // Helper: Get period display text (reduces nested ternary complexity)
  const getPeriodDisplay = (): string => {
    if (selectedPeriod === 'year') {
      return currentYear
    }
    if (selectedPeriod === 'quarter') {
      return currentQuarter
    }
    return `${currentMonth} ${currentYear}`
  }

  return useMemo(
    () => [
      {
        id: 'actual-vs-planned',
        title: `${getTranslationFromI18nKeyAndLabel('lowcoder:cards.actual_vs_planned', 'Actual vs Planned')} ${getPeriodDisplay()} (${selectedCurrencyCode})`,
        value: (() => {
          const planned = totalExpensePlan
          const actual = totalExpenseRequest

          if (planned === 0) return 'N/A'
          const percentVariance = ((actual - planned) / planned) * 100
          return Math.abs(percentVariance)
        })(),
        suffix: totalExpensePlan === 0 ? undefined : '%',
        decimalPlaces: totalExpensePlan === 0 ? undefined : 1,
        footer: `${getTranslationFromI18nKeyAndLabel('expense.plannedExpenses', 'Expense Plan')}: ${formatCurrency(totalExpensePlan)} | ${getTranslationFromI18nKeyAndLabel(
          'expense.actualExpenses',
          'Expense Request'
        )}: ${formatCurrency(totalExpenseRequest)}`,
        trend:
          totalExpensePlan > 0
            ? {
                value:
                  (() => {
                    const planned = totalExpensePlan
                    const actual = totalExpenseRequest
                    const percentVariance = ((actual - planned) / planned) * 100
                    return Math.abs(percentVariance).toFixed(1)
                  })() + '%',
                description:
                  totalExpenseRequest <= totalExpensePlan
                    ? getTranslationFromI18nKeyAndLabel('lowcoder:cards.within_budget', 'Within Budget')
                    : getTranslationFromI18nKeyAndLabel('lowcoder:cards.over_budget', 'Over Budget'),
                trendIcon: totalExpenseRequest > totalExpensePlan ? 'up' : 'down',
                badgeVariant: totalExpenseRequest > totalExpensePlan ? 'destructive' : 'success' // Red for over budget (bad), green for within budget (good)
              }
            : undefined
      },
      {
        id: 'overdue-plans',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:cards.overdue_plans', 'Overdue Plans'),
        value: loadingOverduePlans ? '-' : overduePlansCount,
        footer: getTranslationFromI18nKeyAndLabel('lowcoder:cards.plans_past_end_date', 'Plans past end date')
      },
      {
        id: 'over-budget',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:cards.over_budget', 'Over Budget'),
        value: loadingCategoryStats ? '-' : overBudgetCount,
        footer: getTranslationFromI18nKeyAndLabel('lowcoder:cards.items_exceeding_plan', 'Items exceeding plan')
      },
      {
        id: 'potential-savings',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:cards.potential_savings', 'Potential Savings'),
        value: '-',
        footer: getTranslationFromI18nKeyAndLabel('lowcoder:cards.identified_opportunities', 'Identified opportunities')
      }
    ],
    [
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
    ]
  )
}

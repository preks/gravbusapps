import React from 'react'
import { SectionKpiCards, KpiCardData, Spinner, Alert } from '@newwork/nw-design-system'
import { getExpenseIconColor } from '../../utils/colorConstants'
import { MonthlySpendComparison } from '../../types'
import { formatCurrency } from '../../utils/currencyUtils'

export interface MonthlySpendComparisonCardProps {
  loading: boolean
  error: Error | null
  monthlySpendComparison: MonthlySpendComparison
}

/**
 * Card component that displays the comparison between current month and previous month expense spend
 */
const MonthlySpendComparisonCard: React.FC<MonthlySpendComparisonCardProps> = ({
  loading,
  error,
  monthlySpendComparison
}) => {
  const { currentMonthTotal, previousMonthTotal, percentChange, isIncrease, currentMonthCount, previousMonthCount } =
    monthlySpendComparison

  const getCurrentMonthName = () => new Date().toLocaleString('default', { month: 'long' })

  const getPreviousMonthName = () => {
    const date = new Date()
    date.setMonth(date.getMonth() - 1)
    return date.toLocaleString('default', { month: 'long' })
  }

  if (loading) {
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center gba:min-h-32"
        data-testid="monthly-spend-comparison-loading"
      >
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-4" data-testid="monthly-spend-comparison-error">
        <Alert variant="destructive">
          <div>
            <h4 className="gba:font-semibold">Monthly Spend Comparison</h4>
            <p className="gba:text-sm gba:mt-1">Error: {error.message}</p>
          </div>
        </Alert>
      </div>
    )
  }

  // Create KPI card data
  const kpiCardData: KpiCardData = {
    id: 'monthly-spend-comparison',
    title: 'Monthly Spend Comparison',
    value: Math.abs(percentChange).toFixed(1) + ' %',
    decimalPlaces: 1,
    footer: `${getCurrentMonthName()}: ${formatCurrency(currentMonthTotal)} (${currentMonthCount} expenses) | ${getPreviousMonthName()}: ${formatCurrency(previousMonthTotal)} (${previousMonthCount} expenses)`,
    trend: {
      value: Math.abs(percentChange).toFixed(1),
      positive: !isIncrease,
      description: isIncrease ? 'increase vs last month' : 'decrease vs last month'
    },
    icon: 'calendar',
    iconColor: getExpenseIconColor.monthlyComparison(isIncrease)
  }

  return (
    <div data-testid="monthly-spend-comparison-card">
      <SectionKpiCards cards={[kpiCardData]} data-testid="monthly-spend-comparison-kpi-cards" />
    </div>
  )
}

export default MonthlySpendComparisonCard

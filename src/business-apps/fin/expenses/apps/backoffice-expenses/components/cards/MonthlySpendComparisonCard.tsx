import React from 'react'
import { type KpiCardData } from '@newwork/nw-design-system'
import { getExpenseIconColor } from '../../utils/colorConstants'
import { MonthlySpendComparison } from '../../types'
import { formatCurrency } from '../../utils/currencyUtils'
import KpiStateCard from './KpiStateCard'

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
    <KpiStateCard
      loading={loading}
      error={error}
      errorTitle="Monthly Spend Comparison"
      loadingTestId="monthly-spend-comparison-loading"
      errorTestId="monthly-spend-comparison-error"
      cardTestId="monthly-spend-comparison-card"
      kpiTestId="monthly-spend-comparison-kpi-cards"
      kpiCardData={kpiCardData}
    />
  )
}

export default MonthlySpendComparisonCard

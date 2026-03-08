/**
 * Actual vs Planned Expense Card Component
 * Displays actual vs planned expense comparison with period-based data
 */

import React from 'react'
import { type KpiCardData } from '@newwork/nw-design-system'
import { getExpenseIconColor } from '../../utils/colorConstants'
import { ActualVsPlannedData } from '../../types'
import { formatCurrency } from '../../utils/currencyUtils'
import KpiStateCard from './KpiStateCard'

export interface ActualVsPlannedCardProps {
  loading: boolean
  error: Error | null
  actualVsPlanned: ActualVsPlannedData
  period: 'monthly' | 'quarterly' | 'yearly'
}

const ActualVsPlannedCard: React.FC<ActualVsPlannedCardProps> = ({ loading, error, actualVsPlanned, period }) => {
  const getPeriodDisplay = () => {
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().toLocaleString('default', { month: 'long' })
    const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3)

    switch (period) {
      case 'monthly':
        return `${currentMonth} ${currentYear}`
      case 'quarterly':
        return `Q${currentQuarter} ${currentYear}`
      case 'yearly':
        return currentYear.toString()
      default:
        return currentYear.toString()
    }
  }

  const calculateDifference = () => {
    const actualAmount = actualVsPlanned.actualExpenses.totalAmount
    const plannedAmount = actualVsPlanned.plannedExpenses.totalAmount
    const difference = actualAmount - plannedAmount

    let percentDifference = 0
    if (plannedAmount > 0) {
      percentDifference = (difference / plannedAmount) * 100
    } else if (actualAmount > 0) {
      percentDifference = 100
    }

    return { difference, percentDifference, isOverBudget: difference > 0 }
  }

  const { percentDifference, isOverBudget } = calculateDifference()
  const actualAmount = Number(actualVsPlanned.actualExpenses.totalAmount) || 0
  const plannedAmount = Number(actualVsPlanned.plannedExpenses.totalAmount) || 0
  const actualCount = actualVsPlanned.actualExpenses.count
  const plannedCount = actualVsPlanned.plannedExpenses.count

  // Create KPI card data
  const kpiCardData: KpiCardData = {
    id: 'actual-vs-planned',
    title: `Actual vs Planned ${getPeriodDisplay()}`,
    value: Math.abs(percentDifference).toFixed(1),
    suffix: '%',
    decimalPlaces: 1,
    footer: `Planned: ${formatCurrency(plannedAmount)} (${plannedCount} plans) | Actual: ${formatCurrency(actualAmount)} (${actualCount} expenses)`,
    trend: {
      value: Math.abs(percentDifference).toFixed(1),
      positive: !isOverBudget,
      description: isOverBudget ? 'over budget' : 'under budget'
    },
    icon: 'target',
    iconColor: getExpenseIconColor.actualVsPlanned(isOverBudget)
  }

  return (
    <KpiStateCard
      loading={loading}
      error={error}
      errorTitle="Actual vs Planned"
      loadingTestId="actual-vs-planned-loading"
      errorTestId="actual-vs-planned-error"
      cardTestId="actual-vs-planned-card"
      kpiTestId="actual-vs-planned-kpi-cards"
      kpiCardData={kpiCardData}
    />
  )
}

export default ActualVsPlannedCard

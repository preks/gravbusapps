import React from 'react'
import { type KpiCardData } from '@newwork/nw-design-system'
import { getExpenseIconColor } from '../../utils/colorConstants'
import KpiStateCard from './KpiStateCard'
import type { KpiCardBaseProps } from './types'

export interface AverageSpendPerTripCardProps extends KpiCardBaseProps {
  avgSpendPerTrip: number
  travelExpensesCount: number
}

const AverageSpendPerTripCard: React.FC<AverageSpendPerTripCardProps> = ({
  loading,
  error,
  avgSpendPerTrip,
  travelExpensesCount
}) => {
  const kpiCardData: KpiCardData = {
    id: 'average-spend-per-trip',
    title: 'Average Spend per Trip',
    value: avgSpendPerTrip.toString(),
    suffix: 'USD',
    decimalPlaces: 2,
    footer: `Based on ${travelExpensesCount} travel expenses`,
    icon: 'plane',
    iconColor: getExpenseIconColor.averageSpend()
  }

  return (
    <KpiStateCard
      loading={loading}
      error={error}
      errorTitle="Average Spend per Trip"
      loadingTestId="average-spend-per-trip-loading"
      errorTestId="average-spend-per-trip-error"
      cardTestId="average-spend-per-trip-card"
      kpiTestId="average-spend-per-trip-kpi-cards"
      kpiCardData={kpiCardData}
    />
  )
}

export default AverageSpendPerTripCard

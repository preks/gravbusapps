import React from 'react'
import { SectionKpiCards, KpiCardData, Spinner, Alert } from '@newwork/nw-design-system'
import { getExpenseIconColor } from '../../utils/colorConstants'

export interface AverageSpendPerTripCardProps {
  loading: boolean
  error: Error | null
  avgSpendPerTrip: number
  travelExpensesCount: number
}

const AverageSpendPerTripCard: React.FC<AverageSpendPerTripCardProps> = ({
  loading,
  error,
  avgSpendPerTrip,
  travelExpensesCount
}) => {
  if (loading) {
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center gba:min-h-32"
        data-testid="average-spend-per-trip-loading"
      >
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-4" data-testid="average-spend-per-trip-error">
        <Alert variant="destructive">
          <div>
            <h4 className="gba:font-semibold">Average Spend per Trip</h4>
            <p className="gba:text-sm gba:mt-1">Error: {error.message}</p>
          </div>
        </Alert>
      </div>
    )
  }

  // Create KPI card data
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
    <div data-testid="average-spend-per-trip-card">
      <SectionKpiCards cards={[kpiCardData]} data-testid="average-spend-per-trip-kpi-cards" />
    </div>
  )
}

export default AverageSpendPerTripCard

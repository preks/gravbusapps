import React from 'react'
import { SectionKpiCards, KpiCardData, Spinner, Alert } from '@newwork/nw-design-system'
import { getExpenseIconColor } from '../../utils/colorConstants'
import { YTDStats } from '../../types'

export interface TotalSpendYTDCardProps {
  loading: boolean
  error: Error | null
  ytdStats: YTDStats
}

const TotalSpendYTDCard: React.FC<TotalSpendYTDCardProps> = ({ loading, error, ytdStats }) => {
  const { totalAmount, count, previousTotalAmount, previousCount } = ytdStats

  const calculateYTDComparison = () => {
    let percentChange = 0
    if (previousTotalAmount > 0) {
      percentChange = ((totalAmount - previousTotalAmount) / previousTotalAmount) * 100
    } else if (totalAmount > 0) {
      percentChange = 100
    }
    const isIncrease = totalAmount > previousTotalAmount
    return { percentChange, isIncrease }
  }

  if (loading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:min-h-32" data-testid="total-spend-ytd-loading">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-4" data-testid="total-spend-ytd-error">
        <Alert variant="destructive">
          <div>
            <h4 className="gba:font-semibold">Total Company Spend YTD</h4>
            <p className="gba:text-sm gba:mt-1">Error: {error.message}</p>
          </div>
        </Alert>
      </div>
    )
  }

  const { percentChange, isIncrease } = calculateYTDComparison()

  // Create KPI card data
  const kpiCardData: KpiCardData = {
    id: 'total-spend-ytd',
    title: 'Total Company Spend YTD (EUR, Paid Status)',
    value: totalAmount.toString(),
    suffix: 'EUR',
    decimalPlaces: 2,
    footer: `Based on ${count} expense requests this year vs ${previousCount} last year`,
    trend: {
      value: Math.abs(percentChange).toFixed(1),
      positive: !isIncrease,
      description: 'vs last year'
    },
    icon: 'euro',
    iconColor: getExpenseIconColor.totalSpend()
  }

  return (
    <div data-testid="total-spend-ytd-card">
      <SectionKpiCards cards={[kpiCardData]} data-testid="total-spend-ytd-kpi-cards" />
    </div>
  )
}

export default TotalSpendYTDCard

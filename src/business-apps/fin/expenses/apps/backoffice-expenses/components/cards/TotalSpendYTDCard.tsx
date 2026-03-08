import React from 'react'
import { type KpiCardData } from '@newwork/nw-design-system'
import { getExpenseIconColor } from '../../utils/colorConstants'
import { YTDStats } from '../../types'
import KpiStateCard from './KpiStateCard'

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

  const { percentChange, isIncrease } = calculateYTDComparison()
  const trendValue = Math.abs(percentChange).toFixed(1)

  // Create KPI card data
  const kpiCardData: KpiCardData = {
    id: 'total-spend-ytd',
    title: 'Total Company Spend YTD (EUR, Paid Status)',
    value: totalAmount.toString(),
    suffix: 'EUR',
    decimalPlaces: 2,
    footer: `Based on ${count} expense requests this year vs ${previousCount} last year`,
    trend: {
      value: trendValue,
      positive: !isIncrease,
      description: 'vs last year'
    },
    icon: 'euro',
    iconColor: getExpenseIconColor.totalSpend()
  }

  return (
    <KpiStateCard
      loading={loading}
      error={error}
      errorTitle="Total Company Spend YTD"
      loadingTestId="total-spend-ytd-loading"
      errorTestId="total-spend-ytd-error"
      cardTestId="total-spend-ytd-card"
      kpiTestId="total-spend-ytd-kpi-cards"
      kpiCardData={kpiCardData}
    />
  )
}

export default TotalSpendYTDCard

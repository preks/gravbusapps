'use client'

import React, { useMemo } from 'react'
import { PiTrendUp, PiChartLineUp, PiTarget } from 'react-icons/pi'
import { GrowthData } from '../../types/compensationTypes'
import { formatCurrencyString } from '@/common/utils/numberFormatter'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'

interface GrowthStatisticsProps {
  t: (key: string, params?: any) => string
  growthData: GrowthData
  loading: boolean
  locale: string
  currencyCode?: string
}

/**
 * Growth Statistics Component
 * Displays KPI cards for compensation growth metrics using WidgetGroup pattern
 */
const GrowthStatistics: React.FC<GrowthStatisticsProps> = ({
  t,
  growthData,
  loading,
  locale,
  currencyCode = 'EUR'
}) => {
  const { totalGrowth, averageAnnualIncrease, totalMilestonesCount } = growthData

  // Format percentage for display
  const formatPercentage = (value: number): string => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  // Format growth range for description
  const formatGrowthRange = (startAmount: number, currentAmount: number): string => {
    const start = formatCurrencyString(startAmount, {
      currency: currencyCode,
      locale: locale,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
    const current = formatCurrencyString(currentAmount, {
      currency: currencyCode,
      locale: locale,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
    return `${start} → ${current}`
  }

  // Transform statistics data into widgets format
  const widgets: WidgetItem[] = useMemo(
    () => [
      {
        key: 'total-growth',
        title: t('growth-total-growth'),
        value: formatPercentage(totalGrowth.changePercentage),
        prefix: <PiTrendUp />,
        color: '#52c41a',
        description: formatGrowthRange(totalGrowth.startAmount, totalGrowth.currentAmount),
        valueIsString: true
      },
      {
        key: 'average-annual-increase',
        title: t('growth-avg-annual-increase'),
        value: formatPercentage(averageAnnualIncrease),
        prefix: <PiChartLineUp />,
        color: '#1890ff',
        description: t('growth-per-year-over', { years: 3 }),
        valueIsString: true
      },
      {
        key: 'career-milestones',
        title: t('growth-career-milestones'),
        value: totalMilestonesCount,
        prefix: <PiTarget />,
        color: '#722ed1',
        description: t('growth-significant-events'),
        valueIsString: false
      }
    ],
    [t, totalGrowth, averageAnnualIncrease, totalMilestonesCount, currencyCode, locale]
  )

  return (
    <div data-testid="growth-statistics">
      <WidgetGroup widgets={widgets} isLoading={loading} skeletonCount={3} />
    </div>
  )
}

export default GrowthStatistics

import React, { useMemo } from 'react'
import { DollarOutlined, TrophyOutlined, FireOutlined, RiseOutlined } from '@ant-design/icons'
import { WidgetGroup, type WidgetItem } from '@/components/widget-group'
import { type SalesPerformanceKpis, type KpiTrendData } from '../types'

interface SalesKpisProps {
  kpis: SalesPerformanceKpis | null
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
}

const DATA_TEST_ID_PREFIX = 'sales-performance-kpis'

/**
 * Calculate trend from current and previous values
 * Returns trend object with value, positive flag, and description
 */
const calculateTrend = (
  trendData: KpiTrendData,
  formatValue?: (value: number) => string
): { value: string; positive: boolean; description: string } => {
  const { current, previous } = trendData

  if (previous === 0) {
    return {
      value: current > 0 ? '+100%' : '0%',
      positive: current >= 0,
      description: 'vs previous 30 days'
    }
  }

  const change = ((current - previous) / previous) * 100
  const formattedCurrent = formatValue ? formatValue(current) : current.toFixed(0)
  const formattedPrevious = formatValue ? formatValue(previous) : previous.toFixed(0)

  return {
    value: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
    positive: change >= 0,
    description: `${formattedCurrent} vs ${formattedPrevious} (30d)`
  }
}

/**
 * Sales Performance KPIs component displaying:
 * - Total Revenue
 * - Opportunities Won
 * - Average Deal Size
 * - Win Rate
 *
 * Each KPI includes a trend indicator comparing current 30 days to previous 30 days
 */
export const SalesKpis: React.FC<SalesKpisProps> = ({ kpis, isLoading = false, error = null, onRetry }) => {
  const formatCurrency = (amount: number, currencyCode: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount)
  }

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(num)
  }

  const widgets: WidgetItem[] = useMemo(() => {
    if (!kpis) return []

    const currencyFormatter = (value: number) => formatCurrency(value, kpis.currencyCode)
    const percentFormatter = (value: number) => `${value.toFixed(1)}%`

    return [
      {
        key: 'total-revenue',
        title: 'Total Revenue',
        value: formatCurrency(kpis.totalRevenue, kpis.currencyCode),
        prefix: <DollarOutlined />,
        valueIsString: true,
        description: 'Sum of all won opportunities',
        trend: calculateTrend(kpis.trends.totalRevenue, currencyFormatter)
      },
      {
        key: 'opportunities-won',
        title: 'Opportunities Won',
        value: kpis.opportunitiesWon,
        prefix: <TrophyOutlined />,
        description: 'Total number of closed-won deals',
        trend: calculateTrend(kpis.trends.opportunitiesWon, formatNumber)
      },
      {
        key: 'average-deal-size',
        title: 'Average Deal Size',
        value: formatCurrency(kpis.averageDealSize, kpis.currencyCode),
        prefix: <FireOutlined />,
        valueIsString: true,
        description: 'Average opportunity value',
        trend: calculateTrend(kpis.trends.averageDealSize, currencyFormatter)
      },
      {
        key: 'win-rate',
        title: 'Win Rate',
        value: kpis.winRate.toFixed(1),
        suffix: '%',
        prefix: <RiseOutlined />,
        description: 'Won vs total closed opportunities',
        trend: calculateTrend(kpis.trends.winRate, percentFormatter)
      }
    ]
  }, [kpis])

  return (
    <div data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        skeletonCount={4}
        emptyText="No KPI data available."
        data-testid={DATA_TEST_ID_PREFIX}
      />
    </div>
  )
}

export default SalesKpis

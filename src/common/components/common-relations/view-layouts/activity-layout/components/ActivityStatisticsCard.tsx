import React, { useMemo } from 'react'
import { CalendarIcon, ClockIcon, CheckCircleIcon, TrendUpIcon } from '@phosphor-icons/react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'

export interface ActivityStatisticItem {
  value: number
  trend: number
  description: string
}

export interface ActivityStatisticsData {
  total: ActivityStatisticItem
  thisWeek: ActivityStatisticItem
  thisMonth: ActivityStatisticItem
  thisQuarter: ActivityStatisticItem
}

export interface ActivityStatisticsCardProps {
  statistics: ActivityStatisticsData
  isLoading?: boolean
  error?: Error | null
  onRetry?: () => void
}

/**
 * Activity Statistics Card Component
 * Displays 4 activity KPIs using WidgetGroup following the EXACT pattern as TaskStatisticsCard
 * Consistent with the rest of the Investment and Customer Relations KPI displays
 */
export const ActivityStatisticsCard: React.FC<ActivityStatisticsCardProps> = ({
  statistics,
  isLoading = false,
  error = null,
  onRetry
}) => {
  // Helper function to format trend percentage with proper sign
  const formatTrendPercent = (trend: number): string => {
    const sign = trend >= 0 ? '+' : ''
    return `${sign}${trend.toFixed(1)}%`
  }

  // Transform statistics into WidgetItems
  const widgets: WidgetItem[] = useMemo(
    () => [
      {
        key: 'total-activities',
        title: 'Total Activities',
        value: statistics.total.value,
        prefix: <TrendUpIcon size={16} />,
        color: '#1677ff',
        span: { xs: 24, sm: 12, md: 8, lg: 6, xl: 6 },
        description: 'All-time activities',
        trend: {
          value: formatTrendPercent(statistics.total.trend),
          positive: statistics.total.trend >= 0,
          description: statistics.total.description
        }
      },
      {
        key: 'this-week',
        title: 'This Week',
        value: statistics.thisWeek.value,
        prefix: <ClockIcon size={16} />,
        color: '#52c41a',
        span: { xs: 24, sm: 12, md: 8, lg: 6, xl: 6 },
        description: 'Recent activity',
        trend: {
          value: formatTrendPercent(statistics.thisWeek.trend),
          positive: statistics.thisWeek.trend >= 0,
          description: statistics.thisWeek.description
        }
      },
      {
        key: 'this-month',
        title: 'This Month',
        value: statistics.thisMonth.value,
        prefix: <CalendarIcon size={16} />,
        color: '#faad14',
        span: { xs: 24, sm: 12, md: 8, lg: 6, xl: 6 },
        description: 'Monthly progress',
        trend: {
          value: formatTrendPercent(statistics.thisMonth.trend),
          positive: statistics.thisMonth.trend >= 0,
          description: statistics.thisMonth.description
        }
      },
      {
        key: 'this-quarter',
        title: 'This Quarter',
        value: statistics.thisQuarter.value,
        prefix: <CheckCircleIcon size={16} />,
        color: '#722ed1',
        span: { xs: 24, sm: 12, md: 8, lg: 6, xl: 6 },
        description: 'Quarterly trend',
        trend: {
          value: formatTrendPercent(statistics.thisQuarter.trend),
          positive: statistics.thisQuarter.trend >= 0,
          description: statistics.thisQuarter.description
        }
      }
    ],
    [statistics]
  )

  return (
    <WidgetGroup
      widgets={widgets}
      loading={isLoading}
      error={error}
      onRetry={onRetry}
      dataTestId="activity-statistics-card"
    />
  )
}

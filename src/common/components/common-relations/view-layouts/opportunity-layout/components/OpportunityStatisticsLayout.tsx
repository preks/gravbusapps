import React, { useMemo } from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { CurrencyDollarIcon, TrophyIcon, TrendUpIcon, ClockIcon } from '@phosphor-icons/react'

interface TrendData {
  current: number
  previous: number
  change: number
  changePercent: number
  isPositive: boolean
}

export interface OpportunityStatisticsData {
  recentOpportunities: TrendData
  totalOpportunities: TrendData
  opportunitiesThisQuarter: TrendData
  opportunitiesThisYear: TrendData
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

interface OpportunityStatisticsLayoutProps {
  statistics: OpportunityStatisticsData
  'data-testid'?: string
}

export const OpportunityStatisticsLayout: React.FC<OpportunityStatisticsLayoutProps> = ({
  statistics,
  'data-testid': dataTestId = 'opportunity-statistics'
}) => {
  const {
    recentOpportunities,
    totalOpportunities,
    opportunitiesThisQuarter,
    opportunitiesThisYear,
    isLoading,
    error,
    refetch
  } = statistics

  const formatTrendPercent = (changePercent: number): string => {
    const sign = changePercent >= 0 ? '+' : ''
    return `${sign}${changePercent.toFixed(1)}%`
  }

  const widgets: WidgetItem[] = useMemo(
    () => [
      {
        key: 'recent-opportunities',
        title: 'Recent Opportunities',
        value: recentOpportunities.current,
        prefix: <ClockIcon size={16} />,
        color: '#1890ff',
        span: { xs: 24, sm: 12, lg: 6 },
        description: 'Past 2 weeks',
        trend: {
          value: formatTrendPercent(recentOpportunities.changePercent),
          positive: recentOpportunities.isPositive,
          description: 'vs previous 2 weeks'
        }
      },
      {
        key: 'total-opportunities',
        title: 'Total Opportunities',
        value: totalOpportunities.current,
        prefix: <CurrencyDollarIcon size={16} />,
        color: '#52c41a',
        span: { xs: 24, sm: 12, lg: 6 },
        description: 'All opportunities',
        trend: {
          value: formatTrendPercent(totalOpportunities.changePercent),
          positive: totalOpportunities.isPositive,
          description: 'vs last quarter'
        }
      },
      {
        key: 'this-quarter',
        title: 'This Quarter',
        value: opportunitiesThisQuarter.current,
        prefix: <TrophyOutlined />,
        color: '#fa8c16',
        span: { xs: 24, sm: 12, lg: 6 },
        description: 'New opportunities',
        trend: {
          value: formatTrendPercent(opportunitiesThisQuarter.changePercent),
          positive: opportunitiesThisQuarter.isPositive,
          description: 'vs same period last year'
        }
      },
      {
        key: 'this-year',
        title: 'This Year',
        value: opportunitiesThisYear.current,
        prefix: <TrendUpIcon size={16} />,
        color: '#eb2f96',
        span: { xs: 24, sm: 12, lg: 6 },
        description: 'New opportunities',
        trend: {
          value: formatTrendPercent(opportunitiesThisYear.changePercent),
          positive: opportunitiesThisYear.isPositive,
          description: 'vs same period last year'
        }
      }
    ],
    [recentOpportunities, totalOpportunities, opportunitiesThisQuarter, opportunitiesThisYear]
  )

  return (
    <div data-testid={`${dataTestId}-container`}>
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        skeletonCount={4}
        emptyText="No opportunity statistics available."
        data-testid={dataTestId}
      />
    </div>
  )
}

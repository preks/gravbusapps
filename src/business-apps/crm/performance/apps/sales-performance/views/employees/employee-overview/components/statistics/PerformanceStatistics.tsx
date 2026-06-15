import React from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { CurrencyDollarIcon, TrophyIcon, TargetIcon, TrendUpIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatCurrency } from '@/common/utils/numberFormatter'
import { usePerformanceStatisticsData } from '../../hooks/usePerformanceStatisticsData'

const DATA_TEST_ID_PREFIX = 'PerformanceStatistics'

interface PerformanceStatisticsProps extends BusinessAppContextProps {
  employeeId: string
  currencyCode?: string
  onRetry?: () => void
  teamContext?: {
    teamId: string
    teamName: string
  }
  showComparisons?: boolean
}

export const PerformanceStatistics: React.FC<PerformanceStatisticsProps> = ({
  employeeId,
  currencyCode,
  accessToken,
  onRetry,
  ...context
}) => {
  const { statistics, isLoading, error, refetch } = usePerformanceStatisticsData(
    { accessToken, ...context },
    employeeId,
    currencyCode
  )

  const handleRetry = () => {
    void refetch()
    onRetry?.()
  }

  const widgets: WidgetItem[] = [
    {
      key: 'total-revenue',
      title: 'Total Revenue',
      value: formatCurrency(statistics.totalRevenue, statistics.currencyId),
      prefix: <CurrencyDollarIcon />,
      description: 'Closed-won opportunity revenue',
      valueIsString: true,
      trend: {
        value: `${Math.abs(statistics.trends.revenueChange).toFixed(1)}%`,
        positive: statistics.trends.revenueChange >= 0,
        description: 'vs. 30 days ago'
      }
    },
    {
      key: 'won-opportunities',
      title: 'Won Opportunities',
      value: statistics.wonOpportunities,
      prefix: <TrophyIcon />,
      description: 'Closed-won opportunities',
      precision: 0,
      trend: {
        value: `${Math.abs(statistics.trends.wonOpportunitiesChange).toFixed(1)}%`,
        positive: statistics.trends.wonOpportunitiesChange >= 0,
        description: 'vs. 30 days ago'
      }
    },
    {
      key: 'win-rate',
      title: 'Win Rate',
      value: statistics.winRate,
      prefix: <TargetIcon />,
      description: `${statistics.wonOpportunities} of ${statistics.totalOpportunities} opportunities won`,
      suffix: '%',
      precision: 0,
      trend: {
        value: `${Math.abs(statistics.trends.winRateChange).toFixed(1)}%`,
        positive: statistics.trends.winRateChange >= 0,
        description: 'vs. 30 days ago'
      }
    },
    {
      key: 'pipeline-value',
      title: 'Pipeline Value',
      value: formatCurrency(statistics.pipelineValue, statistics.currencyId),
      prefix: <TrendUpIcon />,
      description: 'Open pipeline opportunities',
      valueIsString: true,
      trend: {
        value: `${Math.abs(statistics.trends.pipelineChange).toFixed(1)}%`,
        positive: statistics.trends.pipelineChange >= 0,
        description: 'vs. 30 days ago'
      }
    }
  ]

  return (
    <div className="gba:w-full gba:mb-8" data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error ? new Error(error) : null}
        onRetry={handleRetry}
        skeletonCount={4}
        emptyText="No performance statistics available."
        data-testid={DATA_TEST_ID_PREFIX}
      />
    </div>
  )
}

export default PerformanceStatistics

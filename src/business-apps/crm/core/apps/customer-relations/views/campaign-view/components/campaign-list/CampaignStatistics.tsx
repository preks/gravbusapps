import React from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { ChartBar, Play, CheckCircle, Clock } from '@phosphor-icons/react'
import { SalesCampaignStatistics } from './types/SalesCampaignTypes'

interface CampaignStatisticsProps {
  statistics: SalesCampaignStatistics
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
}

const CampaignStatistics: React.FC<CampaignStatisticsProps> = ({
  statistics,
  isLoading = false,
  error = null,
  onRetry
}) => {
  // Helper function to format duration
  const formatDuration = (days: number): string => {
    if (days === 0) return '0 days'
    if (days === 1) return '1 day'
    return `${days} days`
  }

  // Helper function to format trend percentage with proper sign
  const formatTrendPercent = (changePercent: number): string => {
    const sign = changePercent >= 0 ? '+' : ''
    return `${sign}${changePercent.toFixed(1)}%`
  }

  // Transform stats data into widgets format
  const widgets: WidgetItem[] = [
    {
      key: 'total-campaigns',
      title: 'Total Campaigns',
      value: statistics.totalCampaigns.current,
      prefix: <ChartBar />,
      color: '#1890ff',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Created this year',
      trend: {
        value: formatTrendPercent(statistics.totalCampaigns.changePercent),
        positive: statistics.totalCampaigns.isPositive,
        description: 'vs last year'
      }
    },
    {
      key: 'active-campaigns',
      title: 'Active Campaigns',
      value: statistics.activeCampaigns.current,
      prefix: <Play />,
      color: '#52c41a',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Currently running campaigns',
      trend: {
        value: formatTrendPercent(statistics.activeCampaigns.changePercent),
        positive: statistics.activeCampaigns.isPositive,
        description: 'vs same time last year'
      }
    },
    {
      key: 'completed-campaigns',
      title: 'Completed Campaigns',
      value: statistics.completedCampaigns.current,
      prefix: <CheckCircle />,
      color: '#722ed1',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Finished this year',
      trend: {
        value: formatTrendPercent(statistics.completedCampaigns.changePercent),
        positive: statistics.completedCampaigns.isPositive,
        description: 'vs last year'
      }
    },
    {
      key: 'average-duration',
      title: 'Average Duration',
      value: formatDuration(statistics.averageDuration.current),
      valueIsString: true,
      prefix: <Clock />,
      color: '#fa8c16',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Average campaign duration',
      trend: {
        value: formatTrendPercent(statistics.averageDuration.changePercent),
        positive: statistics.averageDuration.isPositive,
        description: 'vs last year'
      }
    }
  ]

  return (
    <div data-testid="campaign-statistics-container">
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        skeletonCount={4}
        emptyText="No campaign statistics available."
        data-testid="campaign-statistics"
      />
    </div>
  )
}

export default CampaignStatistics

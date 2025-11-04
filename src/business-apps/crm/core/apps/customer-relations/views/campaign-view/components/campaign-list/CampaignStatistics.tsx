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

  // Note: Trends removed for simplicity - can be added back when historical data is available

  // Transform stats data into widgets format
  const widgets: WidgetItem[] = [
    {
      key: 'total-campaigns',
      title: 'Total Campaigns',
      value: statistics.totalCampaigns,
      prefix: <ChartBar />,
      color: '#1890ff',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'All campaigns in the system'
    },
    {
      key: 'active-campaigns',
      title: 'Active Campaigns',
      value: statistics.activeCampaigns,
      prefix: <Play />,
      color: '#52c41a',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Currently running campaigns'
    },
    {
      key: 'completed-campaigns',
      title: 'Completed Campaigns',
      value: statistics.completedCampaigns,
      prefix: <CheckCircle />,
      color: '#722ed1',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Successfully finished campaigns'
    },
    {
      key: 'average-duration',
      title: 'Average Duration',
      value: formatDuration(statistics.averageDuration),
      valueIsString: true,
      prefix: <Clock />,
      color: '#fa8c16',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Average campaign duration'
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

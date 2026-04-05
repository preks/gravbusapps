import React from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { ChartBarIcon, PlayIcon, CheckCircleIcon, ClockIcon } from '@phosphor-icons/react'
import { SalesCampaignStatistics } from './types/SalesCampaignTypes'
import { NW_CHART_COLOR_VARS } from '@/business-apps/crm/campaigns/utils/campaignChartTokens'

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

  // Calculate real trend data based on previous period
  const calculateTrend = (currentValue: number, previousValue: number) => {
    if (previousValue === 0) {
      return currentValue > 0
        ? { value: '+100%', positive: true, description: 'vs previous period (30 days ago)' }
        : { value: '0%', positive: false, description: 'vs previous period (30 days ago)' }
    }

    const change = currentValue - previousValue
    const changePercent = (change / previousValue) * 100

    return {
      value: `${change > 0 ? '+' : ''}${changePercent.toFixed(1)}%`,
      positive: change >= 0,
      description: 'vs previous period (30 days ago)'
    }
  }

  // Transform stats data into widgets format
  const widgets: WidgetItem[] = [
    {
      key: 'total-campaigns',
      title: 'Total Campaigns',
      value: statistics.totalCampaigns,
      prefix: <ChartBarIcon />,
      color: NW_CHART_COLOR_VARS[0],
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'All campaigns in the system',
      trend: statistics.previousPeriod
        ? calculateTrend(statistics.totalCampaigns, statistics.previousPeriod.totalCampaigns)
        : undefined
    },
    {
      key: 'active-campaigns',
      title: 'Active Campaigns',
      value: statistics.activeCampaigns,
      prefix: <PlayIcon />,
      color: NW_CHART_COLOR_VARS[1],
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Currently running campaigns',
      trend: statistics.previousPeriod
        ? calculateTrend(statistics.activeCampaigns, statistics.previousPeriod.activeCampaigns)
        : undefined
    },
    {
      key: 'completed-campaigns',
      title: 'Completed Campaigns',
      value: statistics.completedCampaigns,
      prefix: <CheckCircleIcon />,
      color: NW_CHART_COLOR_VARS[2],
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Successfully finished campaigns',
      trend: statistics.previousPeriod
        ? calculateTrend(statistics.completedCampaigns, statistics.previousPeriod.completedCampaigns)
        : undefined
    },
    {
      key: 'average-duration',
      title: 'Average Duration',
      value: formatDuration(statistics.averageDuration),
      valueIsString: true,
      prefix: <ClockIcon />,
      color: NW_CHART_COLOR_VARS[3],
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Average campaign duration in days',
      trend: statistics.previousPeriod
        ? calculateTrend(statistics.averageDuration, statistics.previousPeriod.averageDuration)
        : undefined
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

import React from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { ChartBarIcon, PlayIcon, CheckCircleIcon, ClockIcon } from '@phosphor-icons/react'
import { SalesCampaignStatistics } from './types/SalesCampaignTypes'
import { NW_CHART_COLOR_VARS } from '@/business-apps/crm/campaigns/utils/campaignChartTokens'
import { calculateTrend } from '@/common/utils/trendUtils'

interface CampaignStatisticsProps {
  statistics?: SalesCampaignStatistics
  widgets?: WidgetItem[]
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  emptyText?: string
  dataTestId?: string
  cardsClassName?: string
}

const CampaignStatistics: React.FC<CampaignStatisticsProps> = ({
  statistics,
  widgets: providedWidgets,
  isLoading = false,
  error = null,
  onRetry,
  emptyText = 'No campaign statistics available.',
  dataTestId = 'campaign-statistics',
  cardsClassName
}) => {
  // Helper function to format duration
  const formatDuration = (days: number): string => {
    if (days === 0) return '0 days'
    if (days === 1) return '1 day'
    return `${days} days`
  }

  // Transform stats data into widgets format
  const widgets: WidgetItem[] =
    providedWidgets ??
    (statistics
      ? [
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
      : [])

  return (
    <div data-testid={`${dataTestId}-container`}>
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        cardsClassName={cardsClassName}
        skeletonCount={4}
        emptyText={emptyText}
        data-testid={dataTestId}
      />
    </div>
  )
}

export default CampaignStatistics

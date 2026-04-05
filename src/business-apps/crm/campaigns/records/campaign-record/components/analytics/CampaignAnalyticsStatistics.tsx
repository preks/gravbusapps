import React from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { UserIcon, CurrencyDollarIcon, TrophyIcon, BankIcon } from '@phosphor-icons/react'
import { CampaignAnalyticsMetrics } from '../../queries/CampaignAnalyticsQueries'
import { formatCurrencyCompact, formatPercentage } from '@/common/utils/numberFormatter'
import { NW_CHART_COLOR_VARS } from '@/business-apps/crm/campaigns/utils/campaignChartTokens'

interface CampaignAnalyticsStatisticsProps {
  metrics: CampaignAnalyticsMetrics | null
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
}

const CampaignAnalyticsStatistics: React.FC<CampaignAnalyticsStatisticsProps> = ({
  metrics,
  isLoading = false,
  error = null,
  onRetry
}) => {
  // Helper function to create combined descriptions
  const createCombinedDescription = (mainDesc: string, additionalInfo: string) => {
    return (
      <div>
        <div>{mainDesc}</div>
        <div className="gba:font-bold gba:mt-1">{additionalInfo}</div>
      </div>
    )
  }

  // Calculate derived metrics
  const totalLeads = metrics?.totalEntities.leads || 0
  const convertedLeads = metrics?.conversionMetrics.leadsConverted || 0
  const conversionRate = metrics?.conversionMetrics.conversionRate || 0

  const totalOpportunities = metrics?.totalEntities.opportunities || 0
  const winRate = metrics?.revenueMetrics.winRate || 0
  const wonRevenue = metrics?.revenueMetrics.wonRevenue || 0
  const totalPipeline = metrics?.revenueMetrics.totalPipeline || 0

  const totalAccounts = metrics?.totalEntities.accounts || 0
  const totalContacts = metrics?.totalEntities.contacts || 0

  const averageDealSize = metrics?.revenueMetrics.averageDealSize || 0

  // Transform metrics data into combined widgets format
  const widgets: WidgetItem[] = [
    // Lead Performance
    {
      key: 'leads-performance',
      title: 'Total Leads',
      value: totalLeads,
      prefix: <UserIcon />,
      color: NW_CHART_COLOR_VARS[0],
      description: createCombinedDescription(
        'Leads generated from campaign',
        `${convertedLeads}/${totalLeads} converted (${formatPercentage(conversionRate)})`
      )
    },

    // Opportunities Performance
    {
      key: 'opportunities-performance',
      title: 'Total Opportunities',
      value: totalOpportunities,
      prefix: <TrophyIcon />,
      color: NW_CHART_COLOR_VARS[1],
      description: createCombinedDescription(
        'Opportunities created from campaign',
        `Win rate: ${formatPercentage(winRate)}`
      )
    },

    // Revenue Performance
    {
      key: 'revenue-performance',
      title: 'Won Revenue',
      value: formatCurrencyCompact(wonRevenue),
      prefix: <CurrencyDollarIcon />,
      color: NW_CHART_COLOR_VARS[2],
      valueIsString: true,
      description: createCombinedDescription(
        'Revenue from won opportunities',
        `Pipeline: ${formatCurrencyCompact(totalPipeline)} • Avg: ${formatCurrencyCompact(averageDealSize)}`
      )
    },

    // Accounts & Contacts
    {
      key: 'accounts-contacts',
      title: 'Total Accounts',
      value: totalAccounts,
      prefix: <BankIcon />,
      color: NW_CHART_COLOR_VARS[3],
      description: createCombinedDescription('Accounts associated with campaign', `${totalContacts} contacts linked`)
    }
  ]

  return (
    <>
      <div className="gba:mb-4">
        <h3 className="gba:text-lg gba:font-semibold gba:mb-2 gba:text-foreground">Campaign Performance Metrics</h3>
        <p className="gba:text-sm gba:text-muted-foreground">
          Key metrics and performance indicators for this campaign
        </p>
      </div>

      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        skeletonCount={4}
        emptyText="No analytics data available."
        data-testid="campaign-analytics-statistics"
      />
    </>
  )
}

export default CampaignAnalyticsStatistics

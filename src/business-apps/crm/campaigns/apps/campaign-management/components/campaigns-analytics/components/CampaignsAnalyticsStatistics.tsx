import React, { useMemo } from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { UserOutlined, ContactsOutlined, DollarOutlined, TeamOutlined } from '@ant-design/icons'
import { CampaignsAnalyticsComponentProps, CampaignsAnalyticsMetrics } from '../types/CampaignsAnalyticsTypes'
import { formatCurrencyCompact, formatPercentage } from '@/common/utils/numberFormatter'

// Widget configuration factory functions
interface WidgetConfig {
  key: string
  title: string
  icon: React.ReactElement
  color: string
}

const WIDGET_CONFIGS: WidgetConfig[] = [
  { key: 'total-leads', title: 'Total Leads', icon: <UserOutlined />, color: 'var(--chart-1)' },
  { key: 'total-accounts', title: 'Total Accounts', icon: <ContactsOutlined />, color: 'var(--chart-2)' },
  { key: 'total-contacts', title: 'Total Contacts', icon: <TeamOutlined />, color: 'var(--chart-3)' },
  { key: 'total-opportunities', title: 'Total Opportunities', icon: <DollarOutlined />, color: 'var(--chart-4)' }
]

// Description generators
const getLeadsDescription = (metrics: CampaignsAnalyticsMetrics): string => {
  return metrics.averageConversionRate > 0
    ? `${formatPercentage(metrics.averageConversionRate)} converted`
    : 'Generated across all campaigns'
}

const getOpportunitiesDescription = (metrics: CampaignsAnalyticsMetrics): string => {
  if (metrics.totalRevenue > 0) {
    return `${formatCurrencyCompact(metrics.totalRevenue, 'USD')} revenue, ${formatPercentage(metrics.averageWinRate)} win rate`
  }
  if (metrics.averageWinRate > 0) {
    return `${formatPercentage(metrics.averageWinRate)} win rate`
  }
  return 'Generated from campaigns'
}

const CampaignsAnalyticsStatistics: React.FC<CampaignsAnalyticsComponentProps> = ({
  metrics,
  isLoading = false,
  error = null,
  onRetry
}) => {
  const widgets: WidgetItem[] = useMemo(() => {
    if (!metrics) return []

    const descriptions = [
      getLeadsDescription(metrics),
      'Created from campaign leads',
      'Added through campaigns',
      getOpportunitiesDescription(metrics)
    ]

    const values = [metrics.totalLeads, metrics.totalAccounts, metrics.totalContacts, metrics.totalOpportunities]

    return WIDGET_CONFIGS.map((config, index) => ({
      key: config.key,
      title: config.title,
      value: values[index],
      prefix: config.icon,
      color: config.color,
      description: descriptions[index],
      valueIsString: false
    }))
  }, [metrics])

  if (!metrics) {
    return null
  }

  return (
    <div data-testid="campaigns-analytics-statistics-container">
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        skeletonCount={4}
        emptyText="No analytics data available."
        data-testid="campaigns-analytics-statistics"
      />
    </div>
  )
}

export default CampaignsAnalyticsStatistics

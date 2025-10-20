import React from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { BankOutlined, TrophyOutlined, DollarOutlined, TeamOutlined } from '@ant-design/icons'

interface TrendData {
  current: number
  previous: number
  change: number
  changePercent: number
  isPositive: boolean
}

interface AccountStatisticsWithTrendProps {
  trendData: {
    recentAccounts: TrendData
    activeAccounts: TrendData
    revenue: TrendData
    accountsThisYear: TrendData
  }
  isLoading?: boolean
  error?: Error | null
  onRetry?: () => void
}

/**
 * Enhanced AccountStatistics component with trend data
 */
export const AccountStatisticsWithTrend: React.FC<AccountStatisticsWithTrendProps> = ({
  trendData,
  isLoading = false,
  error = null,
  onRetry
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount)
  }

  // Helper function to format trend percentage with proper sign
  const formatTrendPercent = (changePercent: number): string => {
    const sign = changePercent >= 0 ? '+' : ''
    return `${sign}${changePercent.toFixed(1)}%`
  }

  // Transform the trend data into widgets format with trend information
  const widgets: WidgetItem[] = [
    {
      key: 'recent-accounts',
      title: 'Recent Accounts',
      value: trendData.recentAccounts.current,
      prefix: <TeamOutlined />,
      color: '#1890ff',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Past 2 weeks',
      trend: {
        value: formatTrendPercent(trendData.recentAccounts.changePercent),
        positive: trendData.recentAccounts.isPositive,
        description: 'vs previous 2 weeks'
      }
    },
    {
      key: 'active-accounts',
      title: 'Active Accounts',
      value: trendData.activeAccounts.current,
      prefix: <BankOutlined />,
      color: '#52c41a',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Currently active',
      trend: {
        value: formatTrendPercent(trendData.activeAccounts.changePercent),
        positive: trendData.activeAccounts.isPositive,
        description: 'vs last month'
      }
    },
    {
      key: 'total-revenue',
      title: 'Total Revenue',
      value: formatCurrency(trendData.revenue.current),
      prefix: <DollarOutlined />,
      color: '#fa8c16',
      valueIsString: true,
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Estimated total',
      trend: {
        value: formatTrendPercent(trendData.revenue.changePercent),
        positive: trendData.revenue.isPositive,
        description: 'vs last quarter'
      }
    },
    {
      key: 'this-year',
      title: 'This Year',
      value: trendData.accountsThisYear.current,
      prefix: <TrophyOutlined />,
      color: '#eb2f96',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'New accounts',
      trend: {
        value: formatTrendPercent(trendData.accountsThisYear.changePercent),
        positive: trendData.accountsThisYear.isPositive,
        description: 'vs same period last year'
      }
    }
  ]

  return (
    <div data-testid="account-statistics-with-trend-container">
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        skeletonCount={4}
        emptyText="No account statistics available."
        data-testid="account-statistics-with-trend"
      />
    </div>
  )
}

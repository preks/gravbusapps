import React, { useMemo } from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import {
  BankOutlined,
  TrophyOutlined,
  DollarOutlined,
  TeamOutlined,
  BuildOutlined,
  RiseOutlined
} from '@ant-design/icons'

interface TrendData {
  current: number
  previous: number
  change: number
  changePercent: number
  isPositive: boolean
}

export interface AccountStatisticsData {
  // Customer Relations format
  recentAccounts?: TrendData
  activeAccounts?: TrendData
  revenue?: TrendData
  accountsThisYear?: TrendData
  // Investment Relations format
  totalAccounts?: TrendData
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

interface AccountStatisticsLayoutProps {
  statistics: AccountStatisticsData
  variant?: 'customer' | 'investment'
  'data-testid'?: string
}

export const AccountStatisticsLayout: React.FC<AccountStatisticsLayoutProps> = ({
  statistics,
  variant = 'customer',
  'data-testid': dataTestId = 'account-statistics'
}) => {
  const { recentAccounts, activeAccounts, revenue, accountsThisYear, totalAccounts, isLoading, error, refetch } =
    statistics

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount)
  }

  const formatTrendPercent = (changePercent: number): string => {
    const sign = changePercent >= 0 ? '+' : ''
    return `${sign}${changePercent.toFixed(1)}%`
  }

  const widgets: WidgetItem[] = useMemo(() => {
    if (variant === 'investment') {
      // Investment Relations format
      return [
        {
          key: 'recent-accounts',
          title: 'Recent Accounts',
          value: recentAccounts?.current || 0,
          prefix: <BuildOutlined />,
          color: '#1890ff',
          span: { xs: 24, sm: 12, lg: 6 },
          description: 'Past 2 weeks',
          trend: recentAccounts
            ? {
                value: formatTrendPercent(recentAccounts.changePercent),
                positive: recentAccounts.isPositive,
                description: 'vs previous 2 weeks'
              }
            : undefined
        },
        {
          key: 'active-accounts',
          title: 'Active Accounts',
          value: activeAccounts?.current || 0,
          prefix: <RiseOutlined />,
          color: '#52c41a',
          span: { xs: 24, sm: 12, lg: 6 },
          description: 'With opportunities',
          trend: activeAccounts
            ? {
                value: formatTrendPercent(activeAccounts.changePercent),
                positive: activeAccounts.isPositive,
                description: 'vs last month'
              }
            : undefined
        },
        {
          key: 'accounts-this-year',
          title: 'Accounts This Year',
          value: accountsThisYear?.current || 0,
          prefix: <TrophyOutlined />,
          color: '#fa8c16',
          span: { xs: 24, sm: 12, lg: 6 },
          description: 'New accounts',
          trend: accountsThisYear
            ? {
                value: formatTrendPercent(accountsThisYear.changePercent),
                positive: accountsThisYear.isPositive,
                description: 'vs same period last year'
              }
            : undefined
        },
        {
          key: 'total-accounts',
          title: 'Total Accounts',
          value: totalAccounts?.current || 0,
          prefix: <TeamOutlined />,
          color: '#722ed1',
          span: { xs: 24, sm: 12, lg: 6 },
          description: 'All accounts',
          trend: totalAccounts
            ? {
                value: formatTrendPercent(totalAccounts.changePercent),
                positive: totalAccounts.isPositive,
                description: 'vs previous 30 days'
              }
            : undefined
        }
      ]
    } else {
      // Customer Relations format
      return [
        {
          key: 'recent-accounts',
          title: 'Recent Accounts',
          value: recentAccounts?.current || 0,
          prefix: <TeamOutlined />,
          color: '#1890ff',
          span: { xs: 24, sm: 12, lg: 6 },
          description: 'Past 2 weeks',
          trend: recentAccounts
            ? {
                value: formatTrendPercent(recentAccounts.changePercent),
                positive: recentAccounts.isPositive,
                description: 'vs previous 2 weeks'
              }
            : undefined
        },
        {
          key: 'active-accounts',
          title: 'Active Accounts',
          value: activeAccounts?.current || 0,
          prefix: <BankOutlined />,
          color: '#52c41a',
          span: { xs: 24, sm: 12, lg: 6 },
          description: 'Currently active',
          trend: activeAccounts
            ? {
                value: formatTrendPercent(activeAccounts.changePercent),
                positive: activeAccounts.isPositive,
                description: 'vs last month'
              }
            : undefined
        },
        {
          key: 'total-revenue',
          title: 'Total Revenue',
          value: revenue ? formatCurrency(revenue.current) : '0',
          prefix: <DollarOutlined />,
          color: '#fa8c16',
          valueIsString: true,
          span: { xs: 24, sm: 12, lg: 6 },
          description: 'Estimated total',
          trend: revenue
            ? {
                value: formatTrendPercent(revenue.changePercent),
                positive: revenue.isPositive,
                description: 'vs last quarter'
              }
            : undefined
        },
        {
          key: 'this-year',
          title: 'This Year',
          value: accountsThisYear?.current || 0,
          prefix: <TrophyOutlined />,
          color: '#eb2f96',
          span: { xs: 24, sm: 12, lg: 6 },
          description: 'New accounts',
          trend: accountsThisYear
            ? {
                value: formatTrendPercent(accountsThisYear.changePercent),
                positive: accountsThisYear.isPositive,
                description: 'vs same period last year'
              }
            : undefined
        }
      ]
    }
  }, [variant, recentAccounts, activeAccounts, revenue, accountsThisYear, totalAccounts])

  return (
    <div data-testid={`${dataTestId}-container`}>
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        skeletonCount={4}
        emptyText="No account statistics available."
        data-testid={dataTestId}
      />
    </div>
  )
}

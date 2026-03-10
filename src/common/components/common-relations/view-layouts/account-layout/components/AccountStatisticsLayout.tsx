import React, { useMemo } from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import {
  BankIcon,
  TrophyIcon,
  CurrencyDollarIcon,
  UsersIcon,
  BuildingsIcon,
  TrendUpIcon
} from '@phosphor-icons/react'

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
  const { recentAccounts, activeAccounts, accountsThisYear, totalAccounts, isLoading, error, refetch } = statistics

  const formatTrendPercent = (changePercent: number): string => {
    const sign = changePercent >= 0 ? '+' : ''
    return `${sign}${changePercent.toFixed(1)}%`
  }

  // Helper function to create trend object
  const createTrend = (data: AccountStatTrend | undefined, description: string) => {
    if (!data) return undefined
    return {
      value: formatTrendPercent(data.changePercent),
      positive: data.isPositive,
      description
    }
  }

  // Helper function to create investment widgets
  const createInvestmentWidgets = (): WidgetItem[] => [
    {
      key: 'recent-accounts',
      title: 'Recent Accounts',
      value: recentAccounts?.current || 0,
      prefix: <BuildingsIcon size={16} />,
      color: '#1890ff',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Past 2 weeks',
      trend: createTrend(recentAccounts, 'vs previous 2 weeks')
    },
    {
      key: 'active-accounts',
      title: 'Active Accounts',
      value: activeAccounts?.current || 0,
      prefix: <TrendUpIcon size={16} />,
      color: '#52c41a',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'With active opportunities',
      trend: createTrend(activeAccounts, 'vs last month')
    },
    {
      key: 'accounts-this-year',
      title: 'Accounts This Year',
      value: accountsThisYear?.current || 0,
      prefix: <TrophyIcon size={16} />,
      color: '#fa8c16',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'New accounts',
      trend: createTrend(accountsThisYear, 'vs same period last year')
    },
    {
      key: 'total-accounts',
      title: 'Total Accounts',
      value: totalAccounts?.current || 0,
      prefix: <UsersIcon size={16} />,
      color: '#722ed1',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'All accounts',
      trend: createTrend(totalAccounts, 'vs previous 30 days')
    }
  ]

  // Helper function to create customer widgets
  const createCustomerWidgets = (): WidgetItem[] => [
    {
      key: 'recent-accounts',
      title: 'Recent Accounts',
      value: recentAccounts?.current || 0,
      prefix: <UsersIcon size={16} />,
      color: '#1890ff',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Past 2 weeks',
      trend: createTrend(recentAccounts, 'vs previous 2 weeks')
    },
    {
      key: 'active-accounts',
      title: 'Active Accounts',
      value: activeAccounts?.current || 0,
      prefix: <BankIcon size={16} />,
      color: '#52c41a',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'With active opportunities',
      trend: createTrend(activeAccounts, 'vs last month')
    },
    {
      key: 'this-year',
      title: 'This Year',
      value: accountsThisYear?.current || 0,
      prefix: <TrophyIcon size={16} />,
      color: '#fa8c16',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'New accounts',
      trend: createTrend(accountsThisYear, 'vs same period last year')
    },
    {
      key: 'total-accounts',
      title: 'Total Accounts',
      value: totalAccounts?.current || 0,
      prefix: <CurrencyDollarIcon size={16} />,
      color: '#722ed1',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'All accounts',
      trend: createTrend(totalAccounts, 'vs previous 30 days')
    }
  ]

  const widgets: WidgetItem[] = useMemo(() => {
    return variant === 'investment' ? createInvestmentWidgets() : createCustomerWidgets()
  }, [variant, recentAccounts, activeAccounts, accountsThisYear, totalAccounts])

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

import React, { useEffect, useState } from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { BuildOutlined, TeamOutlined, TrophyOutlined, RiseOutlined } from '@ant-design/icons'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useAccountStatisticsQueries } from '../queries/AccountStatisticsQueries'

type AccountStatisticsProps = BusinessAppContextProps

export const AccountStatistics: React.FC<AccountStatisticsProps> = ({ ...context }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const {
    fetchRecentAccountsWithTrend,
    fetchActiveAccountsWithTrend,
    fetchAccountsThisYearWithTrend,
    fetchTotalAccountsWithTrend
  } = useAccountStatisticsQueries(context)

  const [recent, setRecent] = useState<{ current: number; changePercent: number; isPositive: boolean }>({
    current: 0,
    changePercent: 0,
    isPositive: true
  })
  const [active, setActive] = useState<{ current: number; changePercent: number; isPositive: boolean }>({
    current: 0,
    changePercent: 0,
    isPositive: true
  })
  const [thisYear, setThisYear] = useState<{ current: number; changePercent: number; isPositive: boolean }>({
    current: 0,
    changePercent: 0,
    isPositive: true
  })
  const [totalAccounts, setTotalAccounts] = useState<{
    current: number
    changePercent: number
    isPositive: boolean
  }>({ current: 0, changePercent: 0, isPositive: true })

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const [r, a, y, total] = await Promise.all([
          fetchRecentAccountsWithTrend(),
          fetchActiveAccountsWithTrend(),
          fetchAccountsThisYearWithTrend(),
          fetchTotalAccountsWithTrend()
        ])
        const calc = (t: { current: number; previous: number }) => ({
          current: t.current,
          changePercent: t.previous > 0 ? ((t.current - t.previous) / t.previous) * 100 : t.current > 0 ? 100 : 0,
          isPositive: t.current - t.previous >= 0
        })
        setRecent(calc(r))
        setActive(calc(a))
        setThisYear(calc(y))
        setTotalAccounts(calc(total))
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to load account statistics'))
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [
    fetchRecentAccountsWithTrend,
    fetchActiveAccountsWithTrend,
    fetchAccountsThisYearWithTrend,
    fetchTotalAccountsWithTrend
  ])

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
      value: recent.current,
      prefix: <BuildOutlined />,
      color: '#1890ff',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Past 2 weeks',
      trend: {
        value: formatTrendPercent(recent.changePercent),
        positive: recent.isPositive,
        description: 'vs previous 2 weeks'
      }
    },
    {
      key: 'active-accounts',
      title: 'Active Accounts',
      value: active.current,
      prefix: <RiseOutlined />,
      color: '#52c41a',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'With opportunities',
      trend: {
        value: formatTrendPercent(active.changePercent),
        positive: active.isPositive,
        description: 'vs last month'
      }
    },
    {
      key: 'accounts-this-year',
      title: 'Accounts This Year',
      value: thisYear.current,
      prefix: <TrophyOutlined />,
      color: '#fa8c16',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'New accounts',
      trend: {
        value: formatTrendPercent(thisYear.changePercent),
        positive: thisYear.isPositive,
        description: 'vs same period last year'
      }
    },
    {
      key: 'total-accounts',
      title: 'Total Accounts',
      value: totalAccounts.current,
      prefix: <TeamOutlined />,
      color: '#722ed1',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'All accounts',
      trend: {
        value: formatTrendPercent(totalAccounts.changePercent),
        positive: totalAccounts.isPositive,
        description: 'vs previous 30 days'
      }
    }
  ]

  return (
    <div data-testid="account-statistics-with-trend-container">
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={() => window.location.reload()}
        skeletonCount={4}
        emptyText="No account statistics available."
        data-testid="account-statistics-with-trend"
      />
    </div>
  )
}

import React, { useMemo, useState } from 'react'
import { WidgetGroup } from '@/components/widget-group'
import { BankOutlined, DollarCircleOutlined, TeamOutlined, RiseOutlined } from '@ant-design/icons'
import { AccountLifecycleChart, TimeFilter as AccountsTimeFilter } from './widgets/AccountLifecycleChart'
import { AccountGrowthAnalysis } from './widgets/AccountGrowthAnalysis'
import { AccountHealthMatrix } from './widgets/AccountHealthMatrix'
import { AccountRelationshipInsights } from './widgets/AccountRelationshipInsights'
// no direct Card usage in this layout; widgets handle their own cards
import { TopAccountsByRevenue } from './widgets/TopAccountsByRevenue'

export interface AccountsTrendData {
  currentMonthAccounts: number
  previousMonthAccounts: number
  currentMonthOpportunities: number
  previousMonthOpportunities: number
  currentMonthAccountsWithOpportunities?: number
  previousMonthAccountsWithOpportunities?: number
}

export interface AccountsTabLayoutProps {
  title?: string
  totalAccounts: number
  accountsWithOpportunities: number
  avgOpportunitiesPerAccount: number
  trendData?: AccountsTrendData | null
  trendLoading?: boolean
  accountsOverTime: Array<{
    date: string
    count: number
    accountsCreated: number
    accountsWithOpportunities: number
    accountsActive: number
  }>

  // Relationship data
  accountsByIndustry: Array<{ industry: string; count: number; percentage: number }>
  accountsBySize: Array<{ sizeRange: string; count: number; percentage: number }>
  topAccounts: Array<{
    id: string
    name: string
    industry: string
    opportunityCount?: number
    wonOpportunities?: number
    totalValue: number
  }>
  moduleColor?: string

  // Currency filter props
  selectedCurrency?: string
  onCurrencyChange?: (currency: string) => void
  availableCurrencies?: string[]
}

const calculateTrend = (
  current: number,
  previous: number
): { value: string; positive: boolean; description: string } => {
  if (previous === 0) {
    return {
      value: current > 0 ? '100%' : '0%',
      positive: current >= 0,
      description: `${current.toFixed(1)} this period vs ${previous.toFixed(1)} last period`
    }
  }
  const change = ((current - previous) / previous) * 100
  return {
    value: `${Math.abs(change).toFixed(1)}%`,
    positive: change >= 0,
    description: `${current.toFixed(1)} this period vs ${previous.toFixed(1)} last period`
  }
}

export const AccountsTabLayout: React.FC<AccountsTabLayoutProps> = ({
  title = 'Accounts Analytics',
  totalAccounts,
  accountsWithOpportunities,
  avgOpportunitiesPerAccount,
  trendData,
  trendLoading = false,
  accountsOverTime,
  accountsByIndustry,
  accountsBySize,
  topAccounts,
  moduleColor = 'default',
  selectedCurrency = 'EUR',
  onCurrencyChange,
  availableCurrencies = ['EUR', 'USD']
}) => {
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<AccountsTimeFilter>('quarter')
  const [visibleLines, setVisibleLines] = useState({
    accountsCreated: true,
    accountsWithOpportunities: true,
    accountsActive: true
  })

  const toggleLineVisibility = (key: 'accountsCreated' | 'accountsWithOpportunities' | 'accountsActive') => {
    setVisibleLines(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const formatTooltip = (value: any, name: string) => {
    const labelMap: Record<string, string> = {
      accountsCreated: 'Accounts Created',
      accountsWithOpportunities: 'Accounts with Opportunities',
      accountsActive: 'Active Accounts'
    }
    return [value, labelMap[name] || name]
  }

  const formatXAxisLabel = (value: string) => {
    const date = new Date(value)
    if (selectedTimeFilter === 'month') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  const accountsOverTimeFiltered = useMemo(() => {
    if (!accountsOverTime) return [] as any[]
    const endDate = new Date()
    const startDate = new Date()
    switch (selectedTimeFilter) {
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1)
        break
      case 'quarter':
        startDate.setMonth(endDate.getMonth() - 3)
        break
      case 'sixMonths':
        startDate.setMonth(endDate.getMonth() - 6)
        break
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
      case 'historical':
        startDate.setFullYear(endDate.getFullYear() - 3)
        break
      default:
        startDate.setMonth(endDate.getMonth() - 3)
    }
    if (selectedTimeFilter === 'month') {
      const startDateStr = startDate.toISOString().split('T')[0]
      return accountsOverTime.filter(i => i.date >= startDateStr)
    }
    const monthly = new Map<
      string,
      {
        date: string
        count: number
        accountsCreated: number
        accountsWithOpportunities: number
        accountsActive: number
      }
    >()
    const pad2 = (n: number) => String(n).padStart(2, '0')
    const current = new Date(startDate)
    while (current <= endDate) {
      const key = `${current.getFullYear()}-${pad2(current.getMonth() + 1)}-01`
      monthly.set(key, { date: key, count: 0, accountsCreated: 0, accountsWithOpportunities: 0, accountsActive: 0 })
      current.setMonth(current.getMonth() + 1)
    }
    const startDateStr = startDate.toISOString().split('T')[0]
    accountsOverTime
      .filter(i => i.date >= startDateStr)
      .forEach(d => {
        const dDate = new Date(d.date)
        const key = `${dDate.getFullYear()}-${pad2(dDate.getMonth() + 1)}-01`
        const acc = monthly.get(key)
        if (acc) {
          acc.count += d.count
          acc.accountsCreated += d.accountsCreated
          acc.accountsWithOpportunities += d.accountsWithOpportunities
          acc.accountsActive += d.accountsActive
        }
      })
    return Array.from(monthly.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [accountsOverTime, selectedTimeFilter])

  const kpis = [
    {
      key: 'total-accounts',
      title: 'Total Accounts',
      value: totalAccounts || 0,
      prefix: <BankOutlined />,
      description: 'All accounts in the system',
      ...(trendData && !trendLoading
        ? { trend: calculateTrend(totalAccounts || 0, (totalAccounts || 0) - (trendData.currentMonthAccounts || 0)) }
        : {})
    },
    {
      key: 'accounts-with-opportunities',
      title: 'Accounts with Opportunities',
      value: accountsWithOpportunities || 0,
      prefix: <DollarCircleOutlined />,
      description: 'Accounts that have opportunities',
      ...(trendData &&
      !trendLoading &&
      trendData.currentMonthAccountsWithOpportunities !== undefined &&
      trendData.previousMonthAccountsWithOpportunities !== undefined
        ? {
            trend: calculateTrend(
              trendData.currentMonthAccountsWithOpportunities,
              trendData.previousMonthAccountsWithOpportunities
            )
          }
        : {})
    },
    {
      key: 'avg-opportunities-per-account',
      title: 'Avg. Opportunities',
      value: avgOpportunitiesPerAccount || 0,
      precision: 1,
      prefix: <TeamOutlined />,
      description: 'Average opportunities per account',
      ...(trendData && !trendLoading
        ? {
            trend: calculateTrend(
              (trendData.currentMonthOpportunities || 0) / Math.max(trendData.currentMonthAccounts || 0, 1),
              (trendData.previousMonthOpportunities || 0) / Math.max(trendData.previousMonthAccounts || 0, 1)
            )
          }
        : {})
    },
    {
      key: 'accounts-this-period',
      title: `New This Month`,
      value: trendData?.currentMonthAccounts || accountsOverTimeFiltered.reduce((sum, i) => sum + i.accountsCreated, 0),
      prefix: <RiseOutlined />,
      description: `Accounts created this month`,
      ...(trendData && !trendLoading
        ? { trend: calculateTrend(trendData.currentMonthAccounts, trendData.previousMonthAccounts) }
        : {})
    }
  ]

  return (
    <div className="gba:space-y-6" data-testid="accounts-analytics-tab">
      <div>
        <h2 className="gba:text-2xl gba:font-bold gba:mb-4">{title}</h2>
        <WidgetGroup widgets={kpis} data-testid="accounts-key-metrics" />
      </div>

      <AccountLifecycleChart
        data={accountsOverTimeFiltered}
        selectedTimeFilter={selectedTimeFilter}
        onTimeFilterChange={setSelectedTimeFilter}
        visibleLines={visibleLines}
        onToggleLineVisibility={toggleLineVisibility}
        formatXAxisLabel={formatXAxisLabel}
        formatTooltip={formatTooltip}
        moduleColor={moduleColor}
      />

      <div className="gba:grid gba:grid-cols-1 xl:gba:grid-cols-2 gba:gap-6">
        <AccountGrowthAnalysis
          data={{ totalAccounts, accountsWithOpportunities, topAccounts, accountsOverTime }}
          moduleColor={moduleColor}
        />
        <AccountHealthMatrix
          data={{
            totalAccounts,
            accountsWithOpportunities,
            avgOpportunitiesPerAccount,
            topAccounts,
            accountsByIndustry,
            accountsBySize
          }}
          moduleColor={moduleColor}
        />
      </div>

      <AccountRelationshipInsights
        data={{ accountsByIndustry, accountsBySize, totalAccounts, accountsWithOpportunities, accountsOverTime }}
        moduleColor={moduleColor}
      />

      <TopAccountsByRevenue
        topAccounts={topAccounts}
        moduleColor={moduleColor}
        selectedCurrency={selectedCurrency}
        onCurrencyChange={onCurrencyChange}
        availableCurrencies={availableCurrencies}
      />
    </div>
  )
}

export default AccountsTabLayout

import React, { useState } from 'react'
import { WidgetGroup } from '@/components/widget-group'
import { BankOutlined, DollarCircleOutlined, TeamOutlined, RiseOutlined } from '@ant-design/icons'
import { AccountLifecycleChart } from './widgets/AccountLifecycleChart'
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
  avgRevenuePerAccount?: number // Average revenue per account with won opportunities (aggregate calculation)
  trendData?: AccountsTrendData | null
  trendLoading?: boolean
  accountsOverTime: Array<{
    date: string
    count: number
    accountsCreated: number
    accountsWithOpportunities: number
    accountsActive: number
  }>
  accountsOverTimeLoading?: boolean
  selectedTimeFilter?: 'month' | 'quarter' | 'sixMonths' | 'year' | 'historical'
  onTimeFilterChange?: (filter: 'month' | 'quarter' | 'sixMonths' | 'year' | 'historical') => void

  // Relationship data
  accountsByIndustry: Array<{ industry: string; count: number; percentage: number }>
  accountsBySize: Array<{ sizeRange: string; count: number; percentage: number }>
  topAccounts?: Array<{
    id: string
    name: string
    industry: string
    opportunityCount?: number
    wonOpportunities?: number
    totalValue: number
  }>
  topAccountsLoading?: boolean
  monthlyGrowthTrend?: Array<{
    month: string
    date: string
    accountsCreated: number
    accountsWithOpportunities: number
    accountsActive: number
  }>
  growthLoading?: boolean
  healthLoading?: boolean
  moduleColor?: string

  // Currency filter props (only used with topAccounts)
  selectedCurrency?: string
  onCurrencyChange?: (currency: string) => void
  availableCurrencies?: string[]

  // Optional sections
  showTopAccounts?: boolean // Control visibility of Top Accounts by Revenue section
}

const calculateTrend = (
  current: number,
  previous: number
): { value: string; positive: boolean; description: string } => {
  if (previous === 0) {
    return {
      value: current > 0 ? '+100%' : '0%',
      positive: current >= 0,
      description: 'vs previous period (30 days ago)'
    }
  }
  const change = ((current - previous) / previous) * 100
  return {
    value: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
    positive: change >= 0,
    description: 'vs previous period (30 days ago)'
  }
}

export const AccountsTabLayout: React.FC<AccountsTabLayoutProps> = ({
  title = 'Accounts Analytics',
  totalAccounts,
  accountsWithOpportunities,
  avgOpportunitiesPerAccount,
  avgRevenuePerAccount,
  trendData,
  trendLoading = false,
  accountsOverTime,
  accountsOverTimeLoading = false,
  selectedTimeFilter = 'quarter',
  onTimeFilterChange,
  accountsByIndustry,
  accountsBySize,
  topAccounts = [],
  topAccountsLoading = false,
  monthlyGrowthTrend = [],
  growthLoading = false,
  healthLoading = false,
  moduleColor = 'default',
  selectedCurrency = 'EUR',
  onCurrencyChange,
  availableCurrencies = ['EUR', 'USD'],
  showTopAccounts = true
}) => {
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
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) // "Nov 1", "Nov 2"
    }
    if (selectedTimeFilter === 'historical') {
      return date.getFullYear().toString() // "2024"
    }
    // For quarter, sixMonths, and year: show month + year (monthly aggregation)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) // "Nov 2025"
  }

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
      value: trendData?.currentMonthAccounts || accountsOverTime.reduce((sum, i) => sum + i.accountsCreated, 0),
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
        data={accountsOverTime}
        isLoading={accountsOverTimeLoading}
        selectedTimeFilter={selectedTimeFilter}
        onTimeFilterChange={onTimeFilterChange || (() => {})}
        visibleLines={visibleLines}
        onToggleLineVisibility={toggleLineVisibility}
        formatXAxisLabel={formatXAxisLabel}
        formatTooltip={formatTooltip}
        moduleColor={moduleColor}
      />

      <div className="gba:grid gba:grid-cols-1 xl:gba:grid-cols-2 gba:gap-6">
        <AccountGrowthAnalysis
          data={{
            totalAccounts,
            accountsWithOpportunities,
            avgRevenuePerAccount, // Pass aggregate calculation if available
            topAccounts, // Legacy fallback
            monthlyGrowthTrend
          }}
          isLoading={growthLoading}
          topAccountsLoading={topAccountsLoading}
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
          isLoading={healthLoading}
          moduleColor={moduleColor}
        />
      </div>

      <AccountRelationshipInsights
        data={{ accountsByIndustry, accountsBySize, totalAccounts, accountsWithOpportunities, accountsOverTime }}
        moduleColor={moduleColor}
      />

      {showTopAccounts && (
        <TopAccountsByRevenue
          topAccounts={topAccounts}
          isLoading={topAccountsLoading}
          moduleColor={moduleColor}
          selectedCurrency={selectedCurrency}
          onCurrencyChange={onCurrencyChange}
          availableCurrencies={availableCurrencies}
        />
      )}
    </div>
  )
}

export default AccountsTabLayout

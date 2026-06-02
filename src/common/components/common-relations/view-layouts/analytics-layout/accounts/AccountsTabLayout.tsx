import React from 'react'
import { WidgetGroup } from '@/components/widget-group'
import { BankIcon, CurrencyCircleDollarIcon, UsersIcon, TrendUpIcon } from '@phosphor-icons/react'
import { AccountLifecycleChart } from './widgets/AccountLifecycleChart'
import { AccountGrowthAnalysis } from './widgets/AccountGrowthAnalysis'
import type { GrowthBarSelection, GrowthMetric } from '../hooks/useAccountGrowthDrillDownState'
import type { LifecyclePointSelection, LifecycleMetric } from '../hooks/useAccountLifecycleDrillDownState'
import { mergeTabKpiLabels, type PartialTabKpiLabels, type TabKpiLabel } from '../types/tabKpiLabels'
// no direct Card usage in this layout; widgets handle their own cards

export type AccountsTabKpiLabels = {
  totalAccounts: TabKpiLabel
  accountsWithOpportunities: TabKpiLabel
  avgOpportunitiesPerAccount: TabKpiLabel
  newThisMonth: TabKpiLabel
}

const DEFAULT_ACCOUNTS_TAB_KPI_LABELS: AccountsTabKpiLabels = {
  totalAccounts: { title: 'Total Accounts', description: 'All accounts in the system' },
  accountsWithOpportunities: { title: 'Accounts with Opportunities', description: 'Accounts that have opportunities' },
  avgOpportunitiesPerAccount: { title: 'Avg. Opportunities', description: 'Average opportunities per account' },
  newThisMonth: { title: 'New This Month', description: 'Accounts created this month' }
}

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
    endDate: string
    count: number
    accountsCreated: number
    accountsWithOpportunities: number
  }>
  accountsOverTimeLoading?: boolean
  selectedTimeFilter?: 'month' | 'quarter' | 'sixMonths' | 'year' | 'historical'
  onTimeFilterChange?: (filter: 'month' | 'quarter' | 'sixMonths' | 'year' | 'historical') => void

  monthlyGrowthTrend?: Array<{
    month: string
    date: string
    accountsCreated: number
    accountsWithOpportunities: number
  }>
  growthLoading?: boolean
  moduleColor?: string

  // Currency filter props (only used with topAccounts)
  selectedCurrency?: string
  onCurrencyChange?: (currency: string) => void
  availableCurrencies?: string[]

  // Optional sections
  showTopAccounts?: boolean // Control visibility of Top Accounts by Revenue section

  // Account growth chart drill-down
  selectedGrowthBar?: GrowthBarSelection | null
  onGrowthBarClick?: (month: string, date: string, metric: GrowthMetric) => void
  renderAccountGrowthDrillDown?: (selection: GrowthBarSelection) => React.ReactNode

  // Account lifecycle chart drill-down
  onLifecyclePointClick?: (label: string, date: string, endDate: string, metric: LifecycleMetric) => void
  selectedLifecyclePoint?: LifecyclePointSelection | null
  renderLifecycleDrillDown?: (selection: LifecyclePointSelection) => React.ReactNode

  /** Optional KPI title/description overrides (e.g. IRM investment terminology) */
  kpiLabels?: PartialTabKpiLabels<AccountsTabKpiLabels>
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
  totalAccounts,
  accountsWithOpportunities,
  avgOpportunitiesPerAccount,
  trendData,
  trendLoading = false,
  accountsOverTime,
  accountsOverTimeLoading = false,
  selectedTimeFilter = 'quarter',
  onTimeFilterChange,
  monthlyGrowthTrend = [],
  growthLoading = false,
  moduleColor = 'default',
  selectedGrowthBar,
  onGrowthBarClick,
  renderAccountGrowthDrillDown,
  onLifecyclePointClick,
  selectedLifecyclePoint,
  renderLifecycleDrillDown,
  kpiLabels = {}
}) => {
  const labels = mergeTabKpiLabels(DEFAULT_ACCOUNTS_TAB_KPI_LABELS, kpiLabels)

  const kpis = [
    {
      key: 'total-accounts',
      title: labels.totalAccounts.title,
      value: totalAccounts || 0,
      prefix: <BankIcon size={16} />,
      description: labels.totalAccounts.description,
      ...(trendData && !trendLoading
        ? { trend: calculateTrend(totalAccounts || 0, (totalAccounts || 0) - (trendData.currentMonthAccounts || 0)) }
        : {})
    },
    {
      key: 'accounts-with-opportunities',
      title: labels.accountsWithOpportunities.title,
      value: accountsWithOpportunities || 0,
      prefix: <CurrencyCircleDollarIcon size={16} />,
      description: labels.accountsWithOpportunities.description,
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
      title: labels.avgOpportunitiesPerAccount.title,
      value: avgOpportunitiesPerAccount || 0,
      precision: 1,
      prefix: <UsersIcon />,
      description: labels.avgOpportunitiesPerAccount.description,
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
      title: labels.newThisMonth.title,
      value: trendData?.currentMonthAccounts || 0,
      prefix: <TrendUpIcon size={16} />,
      description: labels.newThisMonth.description,
      ...(trendData && !trendLoading
        ? { trend: calculateTrend(trendData.currentMonthAccounts, trendData.previousMonthAccounts) }
        : {})
    }
  ]

  return (
    <div className="gba:space-y-6" data-testid="accounts-analytics-tab">
      <div>
        <WidgetGroup widgets={kpis} isLoading={trendLoading} data-testid="accounts-key-metrics" />
      </div>

      <AccountLifecycleChart
        key={`account-lifecycle-${selectedTimeFilter}`}
        data={accountsOverTime}
        isLoading={accountsOverTimeLoading || growthLoading}
        selectedTimeFilter={selectedTimeFilter}
        onTimeFilterChange={onTimeFilterChange || (() => {})}
        moduleColor={moduleColor}
        onPointClick={onLifecyclePointClick}
      />

      {selectedLifecyclePoint && renderLifecycleDrillDown?.(selectedLifecyclePoint)}

      <AccountGrowthAnalysis
        data={{ monthlyGrowthTrend }}
        isLoading={growthLoading}
        moduleColor={moduleColor}
        onBarClick={onGrowthBarClick}
      />

      {selectedGrowthBar && renderAccountGrowthDrillDown?.(selectedGrowthBar)}
    </div>
  )
}

export default AccountsTabLayout

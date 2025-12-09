import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  IconAvatar,
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  Spinner
} from '@newwork/nw-design-system'
import { BarChart, Bar, XAxis, YAxis } from 'recharts'
import { TrendUpIcon } from '@phosphor-icons/react'

export interface MonthlyGrowthPoint {
  month: string
  date: string
  accountsCreated: number
  accountsWithOpportunities: number
  accountsActive: number
}

export interface TopAccountData {
  id: string
  name: string
  industry: string
  totalValue: number
  wonOpportunities?: number
}

export interface AccountGrowthAnalysisProps {
  data: {
    totalAccounts: number
    accountsWithOpportunities: number
    avgRevenuePerAccount?: number // Average revenue per account with won opportunities
    topAccounts?: TopAccountData[] // Legacy: only used if avgRevenuePerAccount is not provided
    monthlyGrowthTrend: MonthlyGrowthPoint[]
  }
  isLoading?: boolean
  moduleColor?: string
}

export const AccountGrowthAnalysis: React.FC<AccountGrowthAnalysisProps> = ({
  data,
  isLoading = false,
  moduleColor = 'default'
}) => {
  const expansionRate =
    data?.totalAccounts > 0 ? Math.round((data.accountsWithOpportunities / data.totalAccounts) * 100) : 0

  // Use avgRevenuePerAccount from data if provided (aggregate calculation from backend)
  // Otherwise fallback to calculating from topAccounts (legacy approach for backward compatibility)
  const calculateFallbackRevenue = (): number => {
    if (data?.topAccounts && data.topAccounts.length > 0) {
      const totalValue = data.topAccounts.reduce((sum, account) => sum + account.totalValue, 0)
      return Math.round(totalValue / data.topAccounts.length)
    }
    return 0
  }

  const avgRevenuePerAccount = data?.avgRevenuePerAccount ?? calculateFallbackRevenue()

  const accountsCount =
    data?.avgRevenuePerAccount !== null && data?.avgRevenuePerAccount !== undefined
      ? 'all accounts with won opportunities'
      : `top ${data?.topAccounts?.length || 0} performing accounts`

  // Use pre-aggregated monthly growth trend data directly (no more frontend aggregation!)
  const growthTrendData = data?.monthlyGrowthTrend || []

  const totalRecentAccounts = growthTrendData.reduce((sum, item) => sum + item.accountsCreated, 0)
  const totalActiveAccounts = growthTrendData.reduce((sum, item) => sum + item.accountsActive, 0)
  const activityRate = totalRecentAccounts > 0 ? Math.round((totalActiveAccounts / totalRecentAccounts) * 100) : 0

  const chartConfig = useMemo(
    () =>
      ({
        accountsCreated: {
          label: 'New Accounts'
        },
        accountsWithOpportunities: {
          label: 'Accounts with Opportunities'
        },
        accountsActive: {
          label: 'Active Accounts'
        }
      }) satisfies ChartConfig,
    []
  )

  return (
    <Card data-testid="account-growth-analysis">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={TrendUpIcon} variant={moduleColor as any} size="md" iconWeight="regular" decorative={true} />
        <div>
          <CardTitle>Account Growth Analysis</CardTitle>
          <CardDescription>Account performance and growth metrics</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div
            className="gba:flex gba:justify-center gba:items-center gba:h-[300px]"
            data-testid="account-growth-analysis-loading"
          >
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="gba:space-y-4">
            <div className="gba:grid gba:grid-cols-2 gba:gap-4 gba:text-center">
              <div className="gba:p-3 gba:bg-green-50 gba:rounded-lg">
                <div className="gba:text-2xl gba:font-bold gba:text-green-600">{expansionRate}%</div>
                <div className="gba:text-sm gba:text-gray-600">Accounts with Opportunities</div>
                <div className="gba:text-xs gba:text-gray-500">
                  {data?.accountsWithOpportunities} of {data?.totalAccounts} accounts
                </div>
              </div>
              <div className="gba:p-3 gba:bg-blue-50 gba:rounded-lg">
                <div className="gba:text-2xl gba:font-bold gba:text-blue-600">
                  ${avgRevenuePerAccount.toLocaleString()}
                </div>
                <div className="gba:text-sm gba:text-gray-600">Avg Revenue per Account</div>
                <div className="gba:text-xs gba:text-gray-500">From {accountsCount}</div>
              </div>
            </div>

            <div className="gba:p-3 gba:bg-orange-50 gba:rounded-lg gba:text-center">
              <div className="gba:text-xl gba:font-bold gba:text-orange-600">{activityRate}%</div>
              <div className="gba:text-sm gba:text-gray-600">Account Activity Rate</div>
              <div className="gba:text-xs gba:text-gray-500">Active accounts vs new accounts (last 6 months)</div>
            </div>

            {growthTrendData.length > 0 ? (
              <div className="gba:h-56">
                <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">
                  Recent Growth Trend (Monthly)
                </h4>
                <ChartContainer config={chartConfig} className="gba:w-full gba:h-full">
                  <BarChart
                    data={growthTrendData}
                    maxBarSize={30}
                    barCategoryGap="25%"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} height={40} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name) => {
                            const labelMap: Record<string, string> = {
                              accountsCreated: 'New Accounts',
                              accountsWithOpportunities: 'Accounts with Opportunities',
                              accountsActive: 'Active Accounts'
                            }
                            return [value, labelMap[name] || name]
                          }}
                          labelFormatter={label => `Month: ${label}`}
                        />
                      }
                    />
                    <Bar dataKey="accountsCreated" fill="var(--color-accountsCreated)" />
                    <Bar dataKey="accountsWithOpportunities" fill="var(--color-accountsWithOpportunities)" />
                    <Bar dataKey="accountsActive" fill="var(--color-accountsActive)" />
                    <ChartLegend content={<ChartLegendContent />} />
                  </BarChart>
                </ChartContainer>
              </div>
            ) : (
              <div className="gba:text-center gba:text-gray-500 gba:py-4">
                <p className="gba:text-sm">No growth trend data available</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default AccountGrowthAnalysis

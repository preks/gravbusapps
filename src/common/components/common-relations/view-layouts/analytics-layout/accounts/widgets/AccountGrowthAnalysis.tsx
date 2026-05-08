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
  // Use pre-aggregated monthly growth trend data directly (no more frontend aggregation!)
  const growthTrendData = data?.monthlyGrowthTrend || []

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
          <div>
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

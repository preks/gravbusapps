import React, { useMemo } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  IconAvatar,
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent
} from '@newwork/nw-design-system'
import { ComposedChart, ScatterChart, Scatter, Bar, Line, XAxis, YAxis } from 'recharts'
import { ChartScatterIcon, ChartBarIcon } from '@phosphor-icons/react'
import { formatCurrencyCompact } from '../../../../utils/currencyUtils'
import { CurrencyFilter } from '../../shared/components'
import { useCurrencySync } from '../../shared/hooks'
import { useEquityPerformanceData } from '../hooks'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface EquityAnalyticsChartsProps extends BusinessAppContextProps {
  masterCurrency: string
  availableCurrencies: string[]
}

export const EquityAnalyticsCharts: React.FC<EquityAnalyticsChartsProps> = props => {
  const { masterCurrency, availableCurrencies } = props

  // Use single master currency for all performance charts
  const [performanceCurrency, setPerformanceCurrency] = useCurrencySync(masterCurrency)

  // Fetch optimized performance data from server
  const {
    stakeVsAmountData: stakeVsInvestmentAmountData,
    roleVsAmountData: roleInvestmentAmountData,
    concentrationData: concentrationByRoleData,
    isLoading: performanceLoading,
    error: performanceError
  } = useEquityPerformanceData(props, performanceCurrency)

  // Chart configs - must be at top level
  const stakeVsAmountChartConfig = useMemo(
    () => ({
      stakevsinvestment: { label: 'Stake vs Investment' }
    }),
    []
  )

  const roleVsAmountChartConfig = useMemo(
    () => ({
      rolevsinvestment: { label: 'Role vs Investment' }
    }),
    []
  )

  const concentrationChartConfig = useMemo(
    () => ({
      investmentcount: { label: 'Investment Count' },
      totalvaluation: { label: 'Total Valuation' },
      averagevaluation: { label: 'Average Valuation' }
    }),
    []
  )
  return (
    <>
      {/* Stake vs Investment Amount Correlation - Scatter Plot (Full Width) */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3">
              <IconAvatar icon={ChartScatterIcon} variant="default" size="md" decorative />
              <div>
                <CardTitle>Stake vs Amount Correlation ({performanceCurrency})</CardTitle>
                <CardDescription>Relationship between stake percentage and total investment amount</CardDescription>
              </div>
            </div>
            <CurrencyFilter
              value={performanceCurrency}
              onChange={setPerformanceCurrency}
              currencies={availableCurrencies}
              showLabel={false}
              dataTestId="performance-currency-filter"
            />
          </div>
        </CardHeader>
        <CardContent>
          {performanceLoading ? (
            <div className="gba:h-[350px] gba:w-full gba:flex gba:items-center gba:justify-center">
              <div className="gba:text-gray-500 gba:text-lg">Loading performance data...</div>
            </div>
          ) : performanceError ? (
            <div className="gba:h-[350px] gba:w-full gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2">
              <div className="gba:text-destructive gba:text-lg gba:font-semibold">Error loading data</div>
              <div className="gba:text-destructive gba:text-sm gba:max-w-xl gba:text-center">{performanceError}</div>
            </div>
          ) : stakeVsInvestmentAmountData.length === 0 ? (
            <div className="gba:h-[350px] gba:w-full gba:flex gba:items-center gba:justify-center">
              <div className="gba:text-gray-500 gba:text-lg">
                No stake vs amount data available for {performanceCurrency}
              </div>
            </div>
          ) : (
            <ChartContainer config={stakeVsAmountChartConfig} className="gba:h-[350px] gba:w-full">
              <ScatterChart data={stakeVsInvestmentAmountData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <XAxis
                  type="number"
                  dataKey="stake"
                  name="Stake %"
                  tick={{ fontSize: 12 }}
                  tickFormatter={value => `${value}%`}
                />
                <YAxis
                  type="number"
                  dataKey="investmentAmount"
                  name="Investment Amount"
                  tick={{ fontSize: 12 }}
                  tickFormatter={value => formatCurrencyCompact(value, performanceCurrency)}
                />
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload // Get the actual data point

                      return (
                        <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
                          <div className="gba:mb-2 gba:font-medium gba:text-gray-700">
                            Company: {data.company || data.name || 'Unknown'}
                          </div>
                          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                            <div
                              className="gba:w-3 gba:h-3 gba:rounded-full"
                              style={{ backgroundColor: 'var(--color-stakevsinvestment)' }}
                            />
                            <span className="gba:font-medium">Stake Percentage:</span>
                            <span className="gba:font-semibold">{data.stake}%</span>
                          </div>
                          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                            <div
                              className="gba:w-3 gba:h-3 gba:rounded-full"
                              style={{ backgroundColor: 'var(--color-stakevsinvestment)' }}
                            />
                            <span className="gba:font-medium">Investment Amount:</span>
                            <span className="gba:font-semibold">
                              {formatCurrencyCompact(data.investmentAmount, performanceCurrency)}
                            </span>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Scatter
                  name="stakevsinvestment"
                  data={stakeVsInvestmentAmountData}
                  fill="var(--color-stakevsinvestment)"
                />
              </ScatterChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Investment Role vs Investment Amount - Scatter Plot */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3">
              <IconAvatar icon={ChartScatterIcon} variant="secondary" size="md" decorative />
              <div>
                <CardTitle>Role vs Amount ({performanceCurrency})</CardTitle>
                <CardDescription>Comparison of investment amounts across different investment roles</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {performanceLoading ? (
            <div className="gba:h-[350px] gba:w-full gba:flex gba:items-center gba:justify-center">
              <div className="gba:text-gray-500 gba:text-lg">Loading performance data...</div>
            </div>
          ) : performanceError ? (
            <div className="gba:h-[350px] gba:w-full gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2">
              <div className="gba:text-destructive gba:text-lg gba:font-semibold">Error loading data</div>
              <div className="gba:text-destructive gba:text-sm gba:max-w-xl gba:text-center">{performanceError}</div>
            </div>
          ) : roleInvestmentAmountData.length === 0 ? (
            <div className="gba:h-[350px] gba:w-full gba:flex gba:items-center gba:justify-center">
              <div className="gba:text-gray-500 gba:text-lg">
                No role vs amount data available for {performanceCurrency}
              </div>
            </div>
          ) : (
            <ChartContainer config={roleVsAmountChartConfig} className="gba:h-[350px] gba:w-full">
              <ScatterChart data={roleInvestmentAmountData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <XAxis
                  type="number"
                  dataKey="role"
                  name="Investment Role"
                  domain={[0, 4]}
                  ticks={[1, 2, 3]}
                  tick={{ fontSize: 12 }}
                  tickFormatter={value => (value === 1 ? 'Follow-on' : value === 2 ? 'Co-Investor' : 'Lead')}
                />
                <YAxis
                  type="number"
                  dataKey="investmentAmount"
                  name="Investment Amount"
                  tick={{ fontSize: 12 }}
                  tickFormatter={value => formatCurrencyCompact(value, performanceCurrency)}
                />
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload // Get the actual data point
                      const roleValue = data.role
                      const roleLabel = roleValue === 1 ? 'Follow-on' : roleValue === 2 ? 'Co-Investor' : 'Lead'

                      return (
                        <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
                          <div className="gba:mb-2 gba:font-medium gba:text-gray-700">
                            Company: {data.company || data.name || 'Unknown'}
                          </div>
                          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                            <div
                              className="gba:w-3 gba:h-3 gba:rounded-full"
                              style={{ backgroundColor: 'var(--color-rolevsinvestment)' }}
                            />
                            <span className="gba:font-medium">Investment Role:</span>
                            <span className="gba:font-semibold">{roleLabel}</span>
                          </div>
                          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                            <div
                              className="gba:w-3 gba:h-3 gba:rounded-full"
                              style={{ backgroundColor: 'var(--color-rolevsinvestment)' }}
                            />
                            <span className="gba:font-medium">Investment Amount:</span>
                            <span className="gba:font-semibold">
                              {formatCurrencyCompact(data.investmentAmount, performanceCurrency)}
                            </span>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Scatter name="rolevsinvestment" data={roleInvestmentAmountData} fill="var(--color-rolevsinvestment)" />
              </ScatterChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Portfolio Concentration by Role - Bar Chart */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3">
              <IconAvatar icon={ChartBarIcon} variant="success" size="md" decorative />
              <div>
                <CardTitle>Portfolio Concentration by Role ({performanceCurrency})</CardTitle>
                <CardDescription>Investment distribution and valuation metrics by role</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {performanceLoading ? (
            <div className="gba:h-[300px] gba:w-full gba:flex gba:items-center gba:justify-center">
              <div className="gba:text-gray-500 gba:text-lg">Loading performance data...</div>
            </div>
          ) : performanceError ? (
            <div className="gba:h-[300px] gba:w-full gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2">
              <div className="gba:text-destructive gba:text-lg gba:font-semibold">Error loading data</div>
              <div className="gba:text-destructive gba:text-sm gba:max-w-xl gba:text-center">{performanceError}</div>
            </div>
          ) : concentrationByRoleData.length === 0 ? (
            <div className="gba:h-[300px] gba:w-full gba:flex gba:items-center gba:justify-center">
              <div className="gba:text-gray-500 gba:text-lg">
                No concentration data available for {performanceCurrency}
              </div>
            </div>
          ) : (
            <ChartContainer config={concentrationChartConfig} className="gba:h-[300px] gba:w-full">
              <ComposedChart data={concentrationByRoleData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis dataKey="role" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <ChartTooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
                          <div className="gba:mb-2 gba:font-medium gba:text-gray-700">{label}</div>
                          {payload.map((entry, index) => {
                            let formattedValue = ''
                            let properLabel = ''
                            let dotColor = ''

                            if (entry.dataKey === 'count') {
                              formattedValue = `${entry.value}`
                              properLabel = 'Investment Count'
                              dotColor = 'var(--color-investmentcount)'
                            } else if (entry.dataKey === 'totalValuation') {
                              formattedValue = formatCurrencyCompact(entry.value as number, performanceCurrency)
                              properLabel = 'Total Valuation'
                              dotColor = 'var(--color-totalvaluation)'
                            } else if (entry.dataKey === 'averageValuation') {
                              formattedValue = formatCurrencyCompact(entry.value as number, performanceCurrency)
                              properLabel = 'Average Valuation'
                              dotColor = 'var(--color-averagevaluation)'
                            }

                            return (
                              <div key={index} className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                                <div
                                  className="gba:w-3 gba:h-3 gba:rounded-full"
                                  style={{ backgroundColor: dotColor }}
                                />
                                <span className="gba:font-medium">{properLabel}:</span>
                                <span className="gba:font-semibold">{formattedValue}</span>
                              </div>
                            )
                          })}
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  yAxisId="left"
                  dataKey="count"
                  name="investmentcount"
                  fill="var(--color-investmentcount)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={60}
                />
                <Bar
                  yAxisId="right"
                  dataKey="totalValuation"
                  name="totalvaluation"
                  fill="var(--color-totalvaluation)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={60}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="averageValuation"
                  name="averagevaluation"
                  stroke="var(--color-averagevaluation)"
                  strokeWidth={3}
                  dot={{ r: 6 }}
                />
              </ComposedChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </>
  )
}

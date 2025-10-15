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
import { formatCurrency } from '@/common/data/investment'
import { ChartScatterIcon, ChartBarIcon } from '@phosphor-icons/react'

// Design system chart colors using CSS variables
const CHART_COLORS = [
  'var(--nw-color-primary-500)', // Blue
  'var(--nw-color-success-500)', // Green
  'var(--nw-color-warning-500)', // Yellow/Orange
  'var(--nw-color-danger-500)', // Red
  'var(--nw-color-info-500)' // Light Blue
]

interface EquityAnalyticsChartsProps {
  stakeVsInvestmentAmountData: any[]
  roleInvestmentAmountData: any[]
  concentrationByRoleData: any[]
}

export const EquityAnalyticsCharts: React.FC<EquityAnalyticsChartsProps> = ({
  stakeVsInvestmentAmountData,
  roleInvestmentAmountData,
  concentrationByRoleData
}) => {
  return (
    <>
      {/* Stake vs Investment Amount Correlation - Scatter Plot (Full Width) */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-3">
            <IconAvatar icon={ChartScatterIcon} variant="default" size="md" decorative />
            <div>
              <CardTitle>Stake vs Amount Correlation</CardTitle>
              <CardDescription>Relationship between stake percentage and total investment amount</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={useMemo(
              () => ({
                stakevsinvestment: { label: 'Stake vs Investment' }
              }),
              []
            )}
            className="gba:h-[350px] gba:w-full"
          >
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
                tickFormatter={value => formatCurrency(value)}
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
                          <span className="gba:font-semibold">{formatCurrency(data.investmentAmount)}</span>
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
        </CardContent>
      </Card>

      {/* Investment Role vs Investment Amount - Scatter Plot */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-3">
            <IconAvatar icon={ChartScatterIcon} variant="secondary" size="md" decorative />
            <div>
              <CardTitle>Role vs Amount</CardTitle>
              <CardDescription>Comparison of investment amounts across different investment roles</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={useMemo(
              () => ({
                rolevsinvestment: { label: 'Role vs Investment' }
              }),
              []
            )}
            className="gba:h-[350px] gba:w-full"
          >
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
                tickFormatter={value => formatCurrency(value)}
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
                          <span className="gba:font-semibold">{formatCurrency(data.investmentAmount)}</span>
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
        </CardContent>
      </Card>

      {/* Portfolio Concentration by Role - Bar Chart */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-3">
            <IconAvatar icon={ChartBarIcon} variant="success" size="md" decorative />
            <div>
              <CardTitle>Portfolio Concentration by Role</CardTitle>
              <CardDescription>Investment distribution and valuation metrics by role</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={useMemo(
              () => ({
                investmentcount: { label: 'Investment Count' },
                totalvaluation: { label: 'Total Valuation' },
                averagevaluation: { label: 'Average Valuation' }
              }),
              []
            )}
            className="gba:h-[300px] gba:w-full"
          >
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
                            formattedValue = formatCurrency(entry.value as number)
                            properLabel = 'Total Valuation'
                            dotColor = 'var(--color-totalvaluation)'
                          } else if (entry.dataKey === 'averageValuation') {
                            formattedValue = formatCurrency(entry.value as number)
                            properLabel = 'Average Valuation'
                            dotColor = 'var(--color-averagevaluation)'
                          }

                          return (
                            <div key={index} className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                              <div className="gba:w-3 gba:h-3 gba:rounded-full" style={{ backgroundColor: dotColor }} />
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
        </CardContent>
      </Card>
    </>
  )
}

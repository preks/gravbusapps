import React, { useState, useEffect, useMemo } from 'react'
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
  ChartLegendContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { ComposedChart, ScatterChart, Scatter, Bar, Line, XAxis, YAxis } from 'recharts'
import { formatCompactNumber } from '@/common/utils/numberFormatter'
import { ChartScatterIcon, ChartBarIcon } from '@phosphor-icons/react'
import type { EquityInvestmentSummary } from '../../../shared/types'

interface EquityAnalyticsChartsProps {
  rawInvestments: EquityInvestmentSummary[]
  masterCurrency: string
  availableCurrencies: string[]
}

export const EquityAnalyticsCharts: React.FC<EquityAnalyticsChartsProps> = ({
  rawInvestments,
  masterCurrency,
  availableCurrencies
}) => {
  // Independent currency state for each chart
  const [stakeVsAmountCurrency, setStakeVsAmountCurrency] = useState(masterCurrency)
  const [roleVsAmountCurrency, setRoleVsAmountCurrency] = useState(masterCurrency)
  const [concentrationCurrency, setConcentrationCurrency] = useState(masterCurrency)

  // Reset all chart currencies when master currency changes
  useEffect(() => {
    setStakeVsAmountCurrency(masterCurrency)
    setRoleVsAmountCurrency(masterCurrency)
    setConcentrationCurrency(masterCurrency)
  }, [masterCurrency])

  // Helper function for consistent currency formatting
  const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      notation: 'compact',
      compactDisplay: 'short',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    }).format(amount)
  }

  // Filter and compute Stake vs Amount data
  const stakeVsInvestmentAmountData = useMemo(() => {
    return rawInvestments
      .filter(equity => equity.currencyCode === stakeVsAmountCurrency)
      .filter(equity => {
        const hasStake = equity.investment.stakePercentage
        const hasAmount = equity.investment.totalInvestmentAmount
        return hasStake && hasAmount
      })
      .map(equity => ({
        stake: equity.investment.stakePercentage,
        investmentAmount: equity.investment.totalInvestmentAmount,
        company: equity.displayName || 'Unknown',
        name: equity.displayName || 'Unknown'
      }))
  }, [rawInvestments, stakeVsAmountCurrency])

  // Filter and compute Role vs Amount data
  const roleInvestmentAmountData = useMemo(() => {
    return rawInvestments
      .filter(equity => equity.currencyCode === roleVsAmountCurrency)
      .filter(equity => {
        const hasAmount = equity.investment.totalInvestmentAmount
        return hasAmount
      })
      .map(equity => {
        const roleScore = 3 // Default to Lead Investor score
        return {
          role: roleScore,
          investmentAmount: equity.investment.totalInvestmentAmount,
          company: equity.displayName || 'Unknown',
          name: equity.displayName || 'Unknown'
        }
      })
  }, [rawInvestments, roleVsAmountCurrency])

  // Filter and compute Concentration by Role data
  const concentrationByRoleData = useMemo(() => {
    const filteredInvestments = rawInvestments.filter(equity => equity.currencyCode === concentrationCurrency)

    // Group by role and calculate metrics
    const roleGroups = filteredInvestments.reduce((acc: any, equity) => {
      const roles = equity.investment.investmentRole || []
      const role = roles.length > 0 && roles[0]?.investmentRole?.value ? roles[0].investmentRole.value : 'Unknown'

      if (!acc[role]) {
        acc[role] = {
          role,
          count: 0,
          totalValuation: 0,
          valuations: []
        }
      }

      acc[role].count += 1
      acc[role].totalValuation += equity.investment.investmentMarketValue || 0
      acc[role].valuations.push(equity.investment.investmentMarketValue || 0)

      return acc
    }, {})

    // Convert to array and calculate averages
    return Object.values(roleGroups).map((group: any) => ({
      role: group.role,
      count: group.count,
      totalValuation: group.totalValuation,
      averageValuation: group.totalValuation / group.count
    }))
  }, [rawInvestments, concentrationCurrency])
  return (
    <>
      {/* Stake vs Investment Amount Correlation - Scatter Plot (Full Width) */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3">
              <IconAvatar icon={ChartScatterIcon} variant="default" size="md" decorative />
              <div>
                <CardTitle>Stake vs Amount Correlation ({stakeVsAmountCurrency})</CardTitle>
                <CardDescription>Relationship between stake percentage and total investment amount</CardDescription>
              </div>
            </div>
            <Select value={stakeVsAmountCurrency} onValueChange={setStakeVsAmountCurrency}>
              <SelectTrigger className="gba:w-24 gba:h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableCurrencies.map(currency => (
                  <SelectItem key={currency} value={currency}>
                    {currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                tickFormatter={value => formatCurrency(value, stakeVsAmountCurrency)}
              />
              <ChartTooltip
                content={({ active, payload }) => {
                  if (active && payload?.length) {
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
                            {formatCurrency(data.investmentAmount, stakeVsAmountCurrency)}
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
        </CardContent>
      </Card>

      {/* Investment Role vs Investment Amount - Scatter Plot */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3">
              <IconAvatar icon={ChartScatterIcon} variant="secondary" size="md" decorative />
              <div>
                <CardTitle>Role vs Amount ({roleVsAmountCurrency})</CardTitle>
                <CardDescription>Comparison of investment amounts across different investment roles</CardDescription>
              </div>
            </div>
            <Select value={roleVsAmountCurrency} onValueChange={setRoleVsAmountCurrency}>
              <SelectTrigger className="gba:w-24 gba:h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableCurrencies.map(currency => (
                  <SelectItem key={currency} value={currency}>
                    {currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                tickFormatter={value => {
                  if (value === 1) return 'Follow-on'
                  if (value === 2) return 'Co-Investor'
                  return 'Lead'
                }}
              />
              <YAxis
                type="number"
                dataKey="investmentAmount"
                name="Investment Amount"
                tick={{ fontSize: 12 }}
                tickFormatter={value => formatCurrency(value, roleVsAmountCurrency)}
              />
              <ChartTooltip
                content={({ active, payload }) => {
                  if (active && payload?.length) {
                    const data = payload[0].payload // Get the actual data point
                    const roleValue = data.role
                    let roleLabel = 'Lead'
                    if (roleValue === 1) {
                      roleLabel = 'Follow-on'
                    } else if (roleValue === 2) {
                      roleLabel = 'Co-Investor'
                    }

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
                            {formatCurrency(data.investmentAmount, roleVsAmountCurrency)}
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
        </CardContent>
      </Card>

      {/* Portfolio Concentration by Role - Bar Chart */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3">
              <IconAvatar icon={ChartBarIcon} variant="success" size="md" decorative />
              <div>
                <CardTitle>Portfolio Concentration by Role ({concentrationCurrency})</CardTitle>
                <CardDescription>Investment distribution and valuation metrics by role</CardDescription>
              </div>
            </div>
            <Select value={concentrationCurrency} onValueChange={setConcentrationCurrency}>
              <SelectTrigger className="gba:w-24 gba:h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableCurrencies.map(currency => (
                  <SelectItem key={currency} value={currency}>
                    {currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }}
                tickFormatter={value => formatCompactNumber(value, 1)}
              />
              <ChartTooltip
                content={({ active, payload, label }) => {
                  if (active && payload?.length) {
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
                            formattedValue = formatCurrency(entry.value as number, concentrationCurrency)
                            properLabel = 'Total Valuation'
                            dotColor = 'var(--color-totalvaluation)'
                          } else if (entry.dataKey === 'averageValuation') {
                            formattedValue = formatCurrency(entry.value as number, concentrationCurrency)
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

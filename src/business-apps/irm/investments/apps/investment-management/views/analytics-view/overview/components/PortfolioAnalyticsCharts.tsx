import React, { useState, useMemo, useEffect } from 'react'
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
import { ComposedChart, Bar, Line, BarChart, XAxis, YAxis } from 'recharts'
import { formatCurrency } from '@/common/data/investment'
import { ChartBarIcon, TrendUpIcon } from '@phosphor-icons/react'

// Empty state component for charts
const ChartEmptyState: React.FC<{ message?: string; height?: string }> = ({
  message = 'No data available for the selected currency',
  height = 'gba:h-[400px]'
}) => (
  <div className={`gba:flex gba:flex-col gba:items-center gba:justify-center ${height} gba:text-gray-500`}>
    <svg className="gba:w-16 gba:h-16 gba:mb-4 gba:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
    <p className="gba:text-sm gba:font-medium">{message}</p>
    <p className="gba:text-xs gba:mt-1">Try selecting a different currency</p>
  </div>
)

interface PortfolioAnalyticsChartsProps {
  rawInvestments: any[]
  masterCurrency: string
  availableCurrencies: string[]
}

export const PortfolioAnalyticsCharts: React.FC<PortfolioAnalyticsChartsProps> = ({
  rawInvestments,
  masterCurrency,
  availableCurrencies
}) => {
  // Independent currency state for each chart
  const [accountValueCurrency, setAccountValueCurrency] = useState(masterCurrency)
  const [concentrationCurrency, setConcentrationCurrency] = useState(masterCurrency)

  // Reset chart currencies when master currency changes
  useEffect(() => {
    setAccountValueCurrency(masterCurrency)
    setConcentrationCurrency(masterCurrency)
  }, [masterCurrency])

  // Filter and regenerate Top Accounts by Value data
  const filteredAccountData = useMemo(() => {
    return rawInvestments
      .filter(inv => (inv.currencyCode || 'EUR') === accountValueCurrency)
      .reduce((acc, investment) => {
        const accountName = investment.accountName || 'Unknown Account'
        const existing = acc.find((item: any) => item.account === accountName)
        const totalValue = investment.marketValue || investment.totalInvestmentAmount || 0

        if (existing) {
          existing.totalValue += totalValue
        } else {
          acc.push({ account: accountName, totalValue })
        }
        return acc
      }, [] as any[])
      .sort((a: any, b: any) => b.totalValue - a.totalValue)
      .slice(0, 10) // Top 10 accounts
  }, [rawInvestments, accountValueCurrency])

  // Filter and regenerate Portfolio Concentration by Group data
  const filteredConcentrationData = useMemo(() => {
    return rawInvestments
      .filter(inv => (inv.currencyCode || 'EUR') === concentrationCurrency)
      .reduce((acc, investment) => {
        const group = investment.investmentGroup || 'Unknown'
        const existing = acc.find((item: any) => item.group === group)
        const totalValue = investment.marketValue || investment.totalInvestmentAmount || 0

        if (existing) {
          existing.count += 1
          existing.totalValue += totalValue
          existing.values.push(totalValue)
        } else {
          acc.push({ group, count: 1, totalValue, values: [totalValue] })
        }
        return acc
      }, [] as any[])
      .map((item: any) => ({
        ...item,
        averageValue: item.totalValue / item.count
      }))
  }, [rawInvestments, concentrationCurrency])

  // Pre-compute chart configs (must be outside conditional rendering)
  const accountValueChartConfig = useMemo(
    () => ({
      totalValue: { label: 'Total Value' }
    }),
    []
  )

  const concentrationChartConfig = useMemo(
    () => ({
      count: { label: 'Investment Count' },
      totalValue: { label: 'Total Value' },
      averageValue: { label: 'Average Value' }
    }),
    []
  )

  // Check if data is empty or all values are zero
  const accountDataIsEmpty = filteredAccountData.length === 0 || !filteredAccountData.some(item => item.totalValue > 0)
  const concentrationDataIsEmpty =
    filteredConcentrationData.length === 0 || !filteredConcentrationData.some(item => item.totalValue > 0)

  return (
    <>
      <div style={{ gridColumn: '1 / -1', marginBottom: '24px' }}>
        <Card>
          <CardHeader>
            <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
              <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
                <IconAvatar icon={ChartBarIcon} variant="default" size="md" decorative />
                <div>
                  <CardTitle>Top Accounts by Value ({accountValueCurrency})</CardTitle>
                  <CardDescription>Investment accounts ranked by total portfolio value</CardDescription>
                </div>
              </div>
              <div className="gba:flex gba:items-center gba:gap-2 gba:ml-4">
                <span className="gba:text-xs gba:text-gray-500">Currency:</span>
                <Select value={accountValueCurrency} onValueChange={setAccountValueCurrency}>
                  <SelectTrigger className="gba:w-20 gba:h-8 gba:text-xs">
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
            </div>
          </CardHeader>
          <CardContent>
            {accountDataIsEmpty ? (
              <ChartEmptyState message="No investment amounts recorded for this currency" />
            ) : (
              <ChartContainer config={accountValueChartConfig} className="gba:h-[400px] gba:w-full">
                <BarChart
                  data={filteredAccountData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  maxBarSize={60}
                >
                  <XAxis
                    dataKey="account"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                    tick={{ fontSize: 12 }}
                    tickFormatter={value => {
                      if (value.length > 15) {
                        return value.substring(0, 12) + '...'
                      }
                      return value
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={value => formatCurrency(value, accountValueCurrency).replace(/[€$£¥]/g, '')}
                  />
                  <ChartTooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0]
                        return (
                          <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
                            <div className="gba:mb-2">
                              <span className="gba:font-medium">{label}</span>
                            </div>
                            <div className="gba:flex gba:items-center gba:gap-2">
                              <div
                                className="gba:w-3 gba:h-3 gba:rounded-full"
                                style={{ backgroundColor: 'var(--color-totalValue)' }}
                              />
                              <span className="gba:font-medium">Total Value:</span>
                            </div>
                            <div className="gba:mt-1 gba:text-lg gba:font-semibold">
                              {formatCurrency(data.value as number, accountValueCurrency)}
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="totalValue" fill="var(--color-totalValue)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
              <IconAvatar icon={TrendUpIcon} variant="success" size="md" decorative />
              <div>
                <CardTitle>Portfolio Concentration by Group ({concentrationCurrency})</CardTitle>
                <CardDescription>Investment distribution and performance across different groups</CardDescription>
              </div>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:ml-4">
              <span className="gba:text-xs gba:text-gray-500">Currency:</span>
              <Select value={concentrationCurrency} onValueChange={setConcentrationCurrency}>
                <SelectTrigger className="gba:w-20 gba:h-8 gba:text-xs">
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
          </div>
        </CardHeader>
        <CardContent>
          {concentrationDataIsEmpty ? (
            <ChartEmptyState message="No investment amounts recorded for this currency" />
          ) : (
            <ChartContainer config={concentrationChartConfig} className="gba:h-[400px] gba:w-full">
              <ComposedChart data={filteredConcentrationData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <XAxis dataKey="group" angle={-45} textAnchor="end" height={80} interval={0} tick={{ fontSize: 12 }} />
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
                              dotColor = 'var(--color-count)'
                            } else if (entry.dataKey === 'totalValue') {
                              formattedValue = formatCurrency(entry.value as number, concentrationCurrency)
                              properLabel = 'Total Value'
                              dotColor = 'var(--color-totalValue)'
                            } else if (entry.dataKey === 'averageValue') {
                              formattedValue = formatCurrency(entry.value as number, concentrationCurrency)
                              properLabel = 'Average Value'
                              dotColor = 'var(--color-averageValue)'
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
                <Bar yAxisId="left" dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="totalValue" fill="var(--color-totalValue)" radius={[4, 4, 0, 0]} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="averageValue"
                  stroke="var(--color-averageValue)"
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

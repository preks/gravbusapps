import React, { useState, useMemo, useEffect } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  IconAvatar,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent
} from '@newwork/nw-design-system'
import { AreaChart, Area, ComposedChart, Bar, Line, XAxis, YAxis } from 'recharts'
import { formatCurrency } from '@/common/data/investment'
import { ChartLineUpIcon, TrendUpIcon } from '@phosphor-icons/react'
import dayjs from 'dayjs'

// Empty state component for charts
const ChartEmptyState: React.FC<{ message?: string }> = ({
  message = 'No data available for the selected currency'
}) => (
  <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-[350px] gba:text-gray-500">
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

interface PortfolioTimelineChartsProps {
  rawInvestments: any[] // Raw investment data for filtering
  masterCurrency: string
  availableCurrencies: string[]
}

export const PortfolioTimelineCharts: React.FC<PortfolioTimelineChartsProps> = ({
  rawInvestments,
  masterCurrency,
  availableCurrencies
}) => {
  const [performanceCurrencyFilter, setPerformanceCurrencyFilter] = useState<string>(masterCurrency)
  const [valueCurrencyFilter, setValueCurrencyFilter] = useState<string>(masterCurrency)

  // Reset chart currencies when master currency changes
  useEffect(() => {
    setPerformanceCurrencyFilter(masterCurrency)
    setValueCurrencyFilter(masterCurrency)
  }, [masterCurrency])

  // Filter and regenerate performance timeline data
  const filteredPerformanceData = useMemo(() => {
    const filteredInvestments = rawInvestments.filter(inv => (inv.currencyCode || 'EUR') === performanceCurrencyFilter)

    return filteredInvestments
      .filter(investment => investment.acquisitionDate)
      .sort((a, b) => dayjs(a.acquisitionDate).unix() - dayjs(b.acquisitionDate).unix())
      .reduce((acc, investment) => {
        const date = dayjs(investment.acquisitionDate).format('YYYY-MM')
        const existing = acc.find((item: any) => item.month === date)
        const totalInvestmentAmount = investment.totalInvestmentAmount || 0
        const marketValue = investment.marketValue || investment.bookValue || 0

        if (existing) {
          existing.investmentCount += 1
          existing.totalInvestmentAmount += totalInvestmentAmount
          existing.totalMarketValue += marketValue
        } else {
          acc.push({
            month: date,
            investmentCount: 1,
            totalInvestmentAmount: totalInvestmentAmount,
            totalMarketValue: marketValue
          })
        }
        return acc
      }, [] as any[])
      .sort((a: any, b: any) => a.month.localeCompare(b.month))
      .map((item: any, index: number, array: any[]) => {
        let cumulativeCount = 0
        let cumulativeTotalInvested = 0
        for (let i = 0; i <= index; i++) {
          cumulativeCount += array[i].investmentCount
          cumulativeTotalInvested += array[i].totalInvestmentAmount
        }
        return {
          ...item,
          cumulativeInvestments: cumulativeCount,
          cumulativeTotalInvested: cumulativeTotalInvested
        }
      })
  }, [rawInvestments, performanceCurrencyFilter])

  // Filter and regenerate value over time data with both invested amount and market value
  const filteredValueData = useMemo(() => {
    const filteredInvestments = rawInvestments.filter(inv => (inv.currencyCode || 'EUR') === valueCurrencyFilter)

    const dataMap = new Map()

    filteredInvestments
      .filter(investment => investment.acquisitionDate)
      .forEach(investment => {
        const date = dayjs(investment.acquisitionDate).format('YYYY-MM')
        const totalInvestmentAmount = investment.totalInvestmentAmount || 0
        const marketValue = investment.marketValue || 0

        if (dataMap.has(date)) {
          const existing = dataMap.get(date)
          existing.totalInvestmentAmount += totalInvestmentAmount
          existing.totalMarketValue += marketValue
        } else {
          dataMap.set(date, {
            date,
            totalInvestmentAmount: totalInvestmentAmount,
            totalMarketValue: marketValue
          })
        }
      })

    return Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [rawInvestments, valueCurrencyFilter])

  // Pre-compute chart configs (must be outside conditional rendering)
  const performanceChartConfig = useMemo(
    () => ({
      investmentcount: { label: 'New Investments' },
      totalinvestmentamount: { label: 'Total Invested Amount' }
    }),
    []
  )

  const valueChartConfig = useMemo(
    () => ({
      totalinvestmentamount: { label: 'Total Invested Amount' },
      totalmarketvalue: { label: 'Total Market Value' }
    }),
    []
  )

  // Check if data is empty or all values are zero
  const performanceDataIsEmpty =
    filteredPerformanceData.length === 0 || !filteredPerformanceData.some(item => item.totalInvestmentAmount > 0)
  const valueDataIsEmpty =
    filteredValueData.length === 0 ||
    !filteredValueData.some(item => item.totalInvestmentAmount > 0 || item.totalMarketValue > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
              <IconAvatar icon={ChartLineUpIcon} variant="default" size="md" decorative />
              <div>
                <CardTitle>Investment Performance Timeline ({performanceCurrencyFilter})</CardTitle>
                <CardDescription>Investment count and cumulative amounts over time</CardDescription>
              </div>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:ml-4">
              <span className="gba:text-xs gba:text-gray-500">Currency:</span>
              <Select value={performanceCurrencyFilter} onValueChange={setPerformanceCurrencyFilter}>
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
          {performanceDataIsEmpty ? (
            <ChartEmptyState message="No investment amounts recorded for this currency" />
          ) : (
            <ChartContainer config={performanceChartConfig} className="gba:h-[350px] gba:w-full">
              <ComposedChart data={filteredPerformanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <ChartTooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
                          <div className="gba:mb-2 gba:font-medium gba:text-gray-700">{label}</div>
                          {payload
                            .filter(entry => {
                              // Only show items that have actual visual chart elements
                              return entry.dataKey === 'investmentCount' || entry.dataKey === 'totalInvestmentAmount'
                            })
                            .map((entry, index) => {
                              let formattedValue = ''
                              let properLabel = ''
                              let dotColor = ''

                              if (entry.dataKey === 'investmentCount') {
                                formattedValue = `${entry.value}`
                                properLabel = 'New Investments'
                                dotColor = 'var(--color-investmentcount)'
                              } else if (entry.dataKey === 'totalInvestmentAmount') {
                                formattedValue = formatCurrency(entry.value as number, performanceCurrencyFilter)
                                properLabel = 'Total Invested Amount'
                                dotColor = 'var(--color-totalinvestmentamount)'
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
                  dataKey="investmentCount"
                  name="investmentcount"
                  fill="var(--color-investmentcount)"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="totalInvestmentAmount"
                  name="totalinvestmentamount"
                  stroke="var(--color-totalinvestmentamount)"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </ComposedChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
              <IconAvatar icon={TrendUpIcon} variant="success" size="md" decorative />
              <div>
                <CardTitle>Investment Value Trends Over Time ({valueCurrencyFilter})</CardTitle>
                <CardDescription>Comparison of invested amount vs market value over time</CardDescription>
              </div>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:ml-4">
              <span className="gba:text-xs gba:text-gray-500">Currency:</span>
              <Select value={valueCurrencyFilter} onValueChange={setValueCurrencyFilter}>
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
          {valueDataIsEmpty ? (
            <ChartEmptyState message="No investment amounts recorded for this currency" />
          ) : (
            <ChartContainer config={valueChartConfig} className="gba:h-[300px] gba:w-full">
              <AreaChart data={filteredValueData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={value => formatCurrency(value, valueCurrencyFilter).replace(/[€$£¥]/g, '')}
                />
                <ChartTooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
                          <div className="gba:mb-2 gba:font-medium gba:text-gray-700">{label}</div>
                          {payload.map((entry, index) => {
                            let properLabel = ''
                            let dotColor = ''

                            if (entry.dataKey === 'totalInvestmentAmount') {
                              properLabel = 'Total Invested Amount'
                              dotColor = 'var(--color-totalinvestmentamount)'
                            } else if (entry.dataKey === 'totalMarketValue') {
                              properLabel = 'Total Market Value'
                              dotColor = 'var(--color-totalmarketvalue)'
                            }

                            return (
                              <div key={index} className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                                <div
                                  className="gba:w-3 gba:h-3 gba:rounded-full"
                                  style={{ backgroundColor: dotColor }}
                                />
                                <span className="gba:font-medium">{properLabel}:</span>
                                <span className="gba:font-semibold">
                                  {formatCurrency(entry.value as number, valueCurrencyFilter)}
                                </span>
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
                <Area
                  type="monotone"
                  dataKey="totalInvestmentAmount"
                  name="totalinvestmentamount"
                  stackId="1"
                  stroke="var(--color-totalinvestmentamount)"
                  fill="var(--color-totalinvestmentamount)"
                  fillOpacity={0.8}
                />
                <Area
                  type="monotone"
                  dataKey="totalMarketValue"
                  name="totalmarketvalue"
                  stackId="2"
                  stroke="var(--color-totalmarketvalue)"
                  fill="var(--color-totalmarketvalue)"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

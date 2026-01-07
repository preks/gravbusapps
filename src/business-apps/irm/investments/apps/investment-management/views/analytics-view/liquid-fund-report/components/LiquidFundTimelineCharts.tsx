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
import { Line, XAxis, YAxis, Bar, ComposedChart } from 'recharts'
import { formatCurrency } from '@/common/data/investment/utils/formatters'
import { formatCompactNumber } from '@/common/utils/numberFormatter'
import { ChartLineUpIcon, TrendUpIcon } from '@phosphor-icons/react'
import { LiquidFundInvestmentSummary } from '../../shared/types'
import dayjs from 'dayjs'

interface LiquidFundTimelineChartsProps {
  chartData: any
  rawLiquidFunds: LiquidFundInvestmentSummary[]
}

export const LiquidFundTimelineCharts: React.FC<LiquidFundTimelineChartsProps> = ({ rawLiquidFunds }) => {
  // Get available currencies
  const availableCurrencies = useMemo(() => {
    const currencies = [...new Set(rawLiquidFunds.map(fund => fund.currencyCode || 'EUR'))]
    return currencies.filter(currency => currency).sort((a, b) => a.localeCompare(b))
  }, [rawLiquidFunds])

  // Currency filters
  const [performanceCurrencyFilter, setPerformanceCurrencyFilter] = useState('EUR')
  const [valueCurrencyFilter, setValueCurrencyFilter] = useState('EUR')

  // Update currency filters when currencies become available
  useEffect(() => {
    if (availableCurrencies.length > 0) {
      const defaultCurrency = availableCurrencies[0]
      setPerformanceCurrencyFilter(defaultCurrency)
      setValueCurrencyFilter(defaultCurrency)
    }
  }, [availableCurrencies])

  // Investment Performance Timeline (matching Overview pattern)
  const investmentPerformanceData = useMemo(() => {
    const filteredFunds = rawLiquidFunds.filter(
      fund => fund.currencyCode === performanceCurrencyFilter && fund.investment.acquisitionDate
    )

    return filteredFunds
      .sort((a, b) => dayjs(a.investment.acquisitionDate).unix() - dayjs(b.investment.acquisitionDate).unix())
      .reduce((acc, fund) => {
        const date = dayjs(fund.investment.acquisitionDate).format('YYYY-MM')
        const existing = acc.find((item: any) => item.month === date)
        const totalInvestmentAmount = fund.investment.totalInvestmentAmount || 0
        const marketValue = fund.investment.investmentMarketValue || 0

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
  }, [rawLiquidFunds, performanceCurrencyFilter])

  // Value Trends Over Time (matching Overview pattern)
  const valueTrendsData = useMemo(() => {
    const filteredFunds = rawLiquidFunds.filter(
      fund => fund.currencyCode === valueCurrencyFilter && fund.investment.acquisitionDate
    )

    const dataMap = new Map()

    for (const fund of filteredFunds) {
      const date = dayjs(fund.investment.acquisitionDate).format('YYYY-MM')
      const totalInvestmentAmount = fund.investment.totalInvestmentAmount || 0
      const marketValue = fund.investment.investmentMarketValue || 0

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
    }

    return Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [rawLiquidFunds, valueCurrencyFilter])

  return (
    <div className="gba:space-y-6">
      {/* Investment Performance Timeline */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
              <IconAvatar icon={ChartLineUpIcon} variant="default" size="md" decorative />
              <div>
                <CardTitle>Performance Timeline ({performanceCurrencyFilter})</CardTitle>
                <CardDescription>
                  Investment count, total invested amount, and cumulative investments over time
                </CardDescription>
              </div>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              <Select value={performanceCurrencyFilter} onValueChange={setPerformanceCurrencyFilter}>
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
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={useMemo(() => {
              const config = {
                investmentCount: { label: 'New Investments' },
                totalInvestmentAmount: { label: 'Total Invested Amount' },
                cumulativeInvestments: { label: 'Cumulative Investments' }
              }
              return config
            }, [])}
            className="gba:h-[350px] gba:w-full"
          >
            <ComposedChart data={investmentPerformanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
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

                          if (entry.dataKey === 'investmentCount') {
                            formattedValue = `${entry.value}`
                            properLabel = 'Investment Count'
                            dotColor = 'var(--color-investmentcount)'
                          } else if (entry.dataKey === 'totalInvestmentAmount') {
                            formattedValue = formatCurrency(entry.value as number, performanceCurrencyFilter)
                            properLabel = 'Total Invested Amount'
                            dotColor = 'var(--color-totalinvestmentamount)'
                          } else if (entry.dataKey === 'cumulativeInvestments') {
                            formattedValue = `${entry.value}`
                            properLabel = 'Cumulative Investments'
                            dotColor = 'var(--color-cumulativeinvestments)'
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
              <Bar yAxisId="left" dataKey="investmentCount" fill="var(--color-investmentCount)" radius={[4, 4, 0, 0]} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="totalInvestmentAmount"
                stroke="var(--color-totalInvestmentAmount)"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="cumulativeInvestments"
                stroke="var(--color-cumulativeInvestments)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Investment Value Trends Over Time */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
              <IconAvatar icon={TrendUpIcon} variant="success" size="md" decorative />
              <div>
                <CardTitle>Value Trends Over Time ({valueCurrencyFilter})</CardTitle>
                <CardDescription>Comparison of total invested amount vs. market value over time</CardDescription>
              </div>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              <Select value={valueCurrencyFilter} onValueChange={setValueCurrencyFilter}>
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
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={useMemo(() => {
              const config = {
                totalInvestmentAmount: { label: 'Total Invested Amount' },
                totalMarketValue: { label: 'Total Market Value' }
              }
              return config
            }, [])}
            className="gba:h-[350px] gba:w-full"
          >
            <ComposedChart data={valueTrendsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={value => dayjs(value).format('MMM YY')} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={value => formatCompactNumber(value, 1)} />
              <ChartTooltip
                content={({ active, payload, label }) => {
                  if (active && payload?.length) {
                    return (
                      <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
                        <div className="gba:mb-2 gba:font-medium gba:text-gray-700">
                          {dayjs(label).format('MMMM YYYY')}
                        </div>
                        {payload.map((entry, index) => {
                          let properLabel = ''
                          let dotColor = ''

                          if (entry.dataKey === 'totalInvestmentAmount') {
                            properLabel = 'Total Invested Amount'
                            dotColor = 'var(--color-totalInvestmentAmount)'
                          } else if (entry.dataKey === 'totalMarketValue') {
                            properLabel = 'Total Market Value'
                            dotColor = 'var(--color-totalMarketValue)'
                          }

                          return (
                            <div key={index} className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                              <div className="gba:w-3 gba:h-3 gba:rounded-full" style={{ backgroundColor: dotColor }} />
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
              <Line
                type="monotone"
                dataKey="totalInvestmentAmount"
                stroke="var(--color-totalInvestmentAmount)"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="totalMarketValue"
                stroke="var(--color-totalMarketValue)"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}

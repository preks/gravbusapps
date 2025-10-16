import React, { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@newwork/nw-design-system'
import { ChartContainer, ChartTooltip, ChartLegend, ChartLegendContent, IconAvatar } from '@newwork/nw-design-system'
import { ComposedChart, Bar, Line, XAxis, YAxis } from 'recharts'
import { ChartLineUpIcon, TrendUpIcon, CalendarIcon } from '@phosphor-icons/react'
import { formatCurrencyCompact } from '../../../../utils/currencyUtils'
import { CurrencyFilter } from '../../shared/components'
import { useCurrencySync } from '../../shared/hooks'

interface RealEstateTimelineChartsProps {
  rawInvestments: any[]
  masterCurrency: string
  availableCurrencies: string[]
}

export const RealEstateTimelineCharts: React.FC<RealEstateTimelineChartsProps> = ({
  rawInvestments,
  masterCurrency,
  availableCurrencies
}) => {
  // Currency sync hooks - initialize with master currency from parent
  const [timelineCurrencyFilter, setTimelineCurrencyFilter] = useCurrencySync(masterCurrency)
  const [performanceCurrencyFilter, setPerformanceCurrencyFilter] = useCurrencySync(masterCurrency)
  const [buildingYearCurrencyFilter, setBuildingYearCurrencyFilter] = useCurrencySync(masterCurrency)

  // Filter timeline data by selected currency
  const filteredTimelineData = useMemo(() => {
    const filtered = rawInvestments.filter(inv => inv.currencyCode === timelineCurrencyFilter)
    // Group by period (acquisition date)
    const periodMap = new Map()
    filtered.forEach(inv => {
      const date = inv.investment?.acquisitionDate
      if (!date) return
      const period = date.substring(0, 7) // YYYY-MM format
      if (!periodMap.has(period)) {
        periodMap.set(period, { period, investmentCount: 0, totalInvestmentAmount: 0, cumulativeInvestments: 0 })
      }
      const entry = periodMap.get(period)
      entry.investmentCount += 1
      entry.totalInvestmentAmount += inv.investment?.totalInvestmentAmount || 0
    })
    // Calculate cumulative
    const sorted = Array.from(periodMap.values()).sort((a, b) => a.period.localeCompare(b.period))
    let cumulative = 0
    sorted.forEach(entry => {
      cumulative += entry.investmentCount
      entry.cumulativeInvestments = cumulative
    })
    return sorted
  }, [rawInvestments, timelineCurrencyFilter])

  // Filter performance data by selected currency
  const filteredPerformanceData = useMemo(() => {
    const filtered = rawInvestments.filter(inv => inv.currencyCode === performanceCurrencyFilter)
    // Group by period
    const periodMap = new Map()
    filtered.forEach(inv => {
      const date = inv.investment?.acquisitionDate
      if (!date) return
      const period = date.substring(0, 7) // YYYY-MM format
      if (!periodMap.has(period)) {
        periodMap.set(period, { period, totalOccupancyRate: 0, count: 0, totalPropertyValue: 0 })
      }
      const entry = periodMap.get(period)
      entry.totalOccupancyRate += inv.realEstateInvestment?.occupancyRate || 0
      entry.count += 1
      entry.totalPropertyValue += inv.realEstateInvestment?.propertyValue || 0
    })
    return Array.from(periodMap.values())
      .map(entry => ({
        period: entry.period,
        averageOccupancyRate: entry.count > 0 ? entry.totalOccupancyRate / entry.count : 0,
        totalPropertyValue: entry.totalPropertyValue
      }))
      .sort((a, b) => a.period.localeCompare(b.period))
  }, [rawInvestments, performanceCurrencyFilter])

  // Filter building year data by selected currency
  const filteredBuildingYearData = useMemo(() => {
    const filtered = rawInvestments.filter(inv => inv.currencyCode === buildingYearCurrencyFilter)
    // Group by building year ranges
    const yearRangeMap = new Map()
    filtered.forEach(inv => {
      const year = inv.realEstateInvestment?.buildingYear
      if (!year) return
      const rangeStart = Math.floor(year / 10) * 10
      const rangeLabel = `${rangeStart}-${rangeStart + 9}`
      if (!yearRangeMap.has(rangeLabel)) {
        yearRangeMap.set(rangeLabel, { yearRange: rangeLabel, totalValue: 0, count: 0, rangeStart })
      }
      const entry = yearRangeMap.get(rangeLabel)
      entry.totalValue += inv.realEstateInvestment?.propertyValue || 0
      entry.count += 1
    })
    return Array.from(yearRangeMap.values())
      .map(entry => ({
        yearRange: entry.yearRange,
        averageValue: entry.count > 0 ? entry.totalValue / entry.count : 0,
        propertyCount: entry.count,
        rangeStart: entry.rangeStart
      }))
      .sort((a, b) => (a.rangeStart || 0) - (b.rangeStart || 0))
  }, [rawInvestments, buildingYearCurrencyFilter])

  // Timeline Config
  const timelineConfig = useMemo(
    () => ({
      investmentcount: { label: 'Investment Count' },
      totalinvestmentamount: { label: 'Total Investment Amount' },
      cumulativeinvestments: { label: 'Cumulative Investments' }
    }),
    []
  )

  // Performance Config
  const performanceConfig = useMemo(
    () => ({
      averageoccupancyrate: { label: 'Average Occupancy Rate' },
      totalpropertyvalue: { label: 'Total Property Value' }
    }),
    []
  )

  // Building Year Config
  const buildingYearConfig = useMemo(
    () => ({
      averagevalue: { label: 'Average Value' },
      propertycount: { label: 'Property Count' }
    }),
    []
  )

  return (
    <div className="gba:space-y-6">
      {/* Investment Timeline */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
              <IconAvatar icon={ChartLineUpIcon} variant="default" size="md" decorative />
              <div>
                <CardTitle>Real Estate Timeline</CardTitle>
                <CardDescription>Investment count and amounts over time</CardDescription>
              </div>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:ml-4">
              <CurrencyFilter
                currencies={availableCurrencies}
                value={timelineCurrencyFilter}
                onChange={setTimelineCurrencyFilter}
                dataTestId="timeline-currency-filter"
                showLabel={false}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={timelineConfig} className="gba:h-[400px] gba:w-full">
            <ComposedChart data={filteredTimelineData}>
              <XAxis dataKey="period" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
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

                          if (entry.dataKey === 'investmentCount') {
                            formattedValue = `${entry.value}`
                            properLabel = 'Investment Count'
                            dotColor = 'var(--color-investmentcount)'
                          } else if (entry.dataKey === 'totalInvestmentAmount') {
                            formattedValue = formatCurrencyCompact(entry.value as number)
                            properLabel = 'Total Investment Amount'
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
              <Bar
                yAxisId="left"
                dataKey="investmentCount"
                fill="var(--color-investmentcount)"
                name="Investment Count"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="totalInvestmentAmount"
                stroke="var(--color-totalinvestmentamount)"
                strokeWidth={3}
                name="Total Investment Amount"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="cumulativeInvestments"
                stroke="var(--color-cumulativeinvestments)"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Cumulative Investments"
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Performance Over Time */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
              <IconAvatar icon={TrendUpIcon} variant="success" size="md" decorative />
              <div>
                <CardTitle>Property Performance Over Time</CardTitle>
                <CardDescription>Occupancy rates and property values over time</CardDescription>
              </div>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:ml-4">
              <CurrencyFilter
                currencies={availableCurrencies}
                value={performanceCurrencyFilter}
                onChange={setPerformanceCurrencyFilter}
                dataTestId="performance-currency-filter"
                showLabel={false}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={performanceConfig} className="gba:h-[400px] gba:w-full">
            <ComposedChart data={filteredPerformanceData}>
              <XAxis dataKey="period" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <ChartTooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
                        <div className="gba:mb-2 gba:font-medium gba:text-gray-700">{label}</div>
                        {payload.map((entry, index) => {
                          let properLabel = ''
                          let formattedValue = ''
                          let dotColor = ''

                          if (entry.dataKey === 'averageOccupancyRate') {
                            properLabel = 'Average Occupancy Rate'
                            formattedValue = `${entry.value}%`
                            dotColor = 'var(--color-averageoccupancyrate)'
                          } else if (entry.dataKey === 'totalPropertyValue') {
                            properLabel = 'Total Property Value'
                            formattedValue = formatCurrencyCompact(entry.value as number)
                            dotColor = 'var(--color-totalpropertyvalue)'
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
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="averageOccupancyRate"
                stroke="var(--color-averageoccupancyrate)"
                strokeWidth={3}
                name="Average Occupancy Rate"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="totalPropertyValue"
                stroke="var(--color-totalpropertyvalue)"
                strokeWidth={3}
                name="Total Property Value"
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Building Year Analysis */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
              <IconAvatar icon={CalendarIcon} variant="secondary" size="md" decorative />
              <div>
                <CardTitle>Building Year Analysis</CardTitle>
                <CardDescription>Property values by construction year</CardDescription>
              </div>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:ml-4">
              <CurrencyFilter
                currencies={availableCurrencies}
                value={buildingYearCurrencyFilter}
                onChange={setBuildingYearCurrencyFilter}
                dataTestId="building-year-currency-filter"
                showLabel={false}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={buildingYearConfig} className="gba:h-[400px] gba:w-full">
            <ComposedChart data={filteredBuildingYearData}>
              <XAxis dataKey="yearRange" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <ChartTooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
                        <div className="gba:mb-2 gba:font-medium gba:text-gray-700">{label}</div>
                        {payload.map((entry, index) => {
                          let properLabel = ''
                          let formattedValue = ''
                          let dotColor = ''

                          if (entry.dataKey === 'propertyCount') {
                            properLabel = 'Property Count'
                            formattedValue = `${entry.value}`
                            dotColor = 'var(--color-propertycount)'
                          } else if (entry.dataKey === 'averageValue') {
                            properLabel = 'Average Value'
                            formattedValue = formatCurrencyCompact(entry.value as number)
                            dotColor = 'var(--color-averagevalue)'
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
              <Bar yAxisId="left" dataKey="propertyCount" fill="var(--color-propertycount)" name="Property Count" />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="averageValue"
                stroke="var(--color-averagevalue)"
                strokeWidth={3}
                name="Average Value"
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}

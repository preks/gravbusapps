import React, { useMemo, useCallback } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent,
  IconAvatar,
  Spinner,
  Alert
} from '@newwork/nw-design-system'
import { ComposedChart, Bar, Line, XAxis, YAxis } from 'recharts'
import { ChartLineUpIcon, TrendUpIcon, CalendarIcon } from '@phosphor-icons/react'
import { formatCurrencyCompact, extractCurrencyCode, formatAmount } from '@/common/utils/numberFormatter'
import { CurrencyFilter } from '../../shared/components'
import { useCurrencySync } from '../../shared/hooks'
import { useRealEstateTimelineAggregate } from '../hooks/useRealEstateTimelineAggregate'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

// Timeline chart tooltip component
interface TimelineTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
  formatCurrency: (amount: number, currency: string) => string
  currency: string
}

const TimelineTooltip: React.FC<TimelineTooltipProps> = ({ active, payload, label, formatCurrency, currency }) => {
  if (active && payload?.length) {
    return (
      <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
        <div className="gba:mb-2 gba:font-medium gba:text-gray-700">Year: {label}</div>
        {payload.map(entry => {
          let formattedValue = ''
          let properLabel = ''
          let dotColor = ''

          if (entry.dataKey === 'investmentCount') {
            formattedValue = `${entry.value}`
            properLabel = 'Investment Count'
            dotColor = 'var(--color-investmentCount)'
          } else if (entry.dataKey === 'totalInvestmentAmount') {
            formattedValue = formatCurrency(entry.value as number, currency)
            properLabel = 'Total Investment Amount'
            dotColor = 'var(--color-totalInvestmentAmount)'
          } else if (entry.dataKey === 'cumulativeInvestments') {
            formattedValue = `${entry.value}`
            properLabel = 'Cumulative Investments'
            dotColor = 'var(--color-cumulativeInvestments)'
          }

          return (
            <div key={entry.dataKey} className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
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
}

// Performance metrics tooltip component
interface PerformanceTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
  formatCurrency: (amount: number, currency: string) => string
  currency: string
}

const PerformanceTooltip: React.FC<PerformanceTooltipProps> = ({
  active,
  payload,
  label,
  formatCurrency,
  currency
}) => {
  if (active && payload?.length) {
    return (
      <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
        <div className="gba:mb-2 gba:font-medium gba:text-gray-700">Year: {label}</div>
        {payload.map(entry => {
          let properLabel = ''
          let formattedValue = ''
          let dotColor = ''

          if (entry.dataKey === 'averageOccupancyRate') {
            properLabel = 'Average Occupancy Rate'
            formattedValue = `${(entry.value as number).toFixed(1)}%`
            dotColor = 'var(--color-averageOccupancyRate)'
          } else if (entry.dataKey === 'totalPropertyValue') {
            properLabel = 'Total Property Value'
            formattedValue = formatCurrency(entry.value as number, currency)
            dotColor = 'var(--color-totalPropertyValue)'
          }

          return (
            <div key={entry.dataKey} className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
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
}

// Property type distribution tooltip component
interface PropertyTypeTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
  formatCurrency: (amount: number) => string
}

const PropertyTypeTooltip: React.FC<PropertyTypeTooltipProps> = ({ active, payload, label, formatCurrency }) => {
  if (active && payload?.length) {
    return (
      <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
        <div className="gba:mb-2 gba:font-medium gba:text-gray-700">{label}</div>
        {payload.map(entry => {
          let properLabel = ''
          let formattedValue = ''
          let dotColor = ''

          if (entry.dataKey === 'propertyCount') {
            properLabel = 'Property Count'
            formattedValue = `${entry.value}`
            dotColor = 'var(--color-propertyCount)'
          } else if (entry.dataKey === 'averageValue') {
            properLabel = 'Average Value'
            formattedValue = formatCurrency(entry.value as number)
            dotColor = 'var(--color-averageValue)'
          }

          return (
            <div key={entry.dataKey} className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
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
}

interface RealEstateTimelineChartsProps extends BusinessAppContextProps {
  rawInvestments: any[]
  masterCurrency: string
  availableCurrencies: string[]
}

export const RealEstateTimelineCharts: React.FC<RealEstateTimelineChartsProps> = props => {
  const { rawInvestments, masterCurrency, availableCurrencies } = props

  // Currency sync hooks - initialize with master currency from parent
  const [timelineCurrencyFilter, setTimelineCurrencyFilter] = useCurrencySync(masterCurrency)
  const [performanceCurrencyFilter, setPerformanceCurrencyFilter] = useCurrencySync(masterCurrency)
  const [buildingYearCurrencyFilter, setBuildingYearCurrencyFilter] = useCurrencySync(masterCurrency)

  // Fetch timeline data using server-side aggregates (query name: GetRealEstateTimeline)
  const {
    timelineData: timelineDataRaw,
    isLoading: timelineLoading,
    error: timelineError
  } = useRealEstateTimelineAggregate(props, timelineCurrencyFilter, 'timeline')

  // Fetch performance data using server-side aggregates (query name: GetRealEstatePerformance)
  const {
    performanceData: performanceDataRaw,
    isLoading: performanceLoading,
    error: performanceError
  } = useRealEstateTimelineAggregate(props, performanceCurrencyFilter, 'performance')

  // Transform data for charts (already calculated on server)
  const filteredTimelineData = timelineDataRaw
  const filteredPerformanceData = performanceDataRaw

  // Filter building year data by selected currency
  const filteredBuildingYearData = useMemo(() => {
    const filtered = rawInvestments.filter(inv => inv.currencyCode === buildingYearCurrencyFilter)
    // Group by building year ranges
    const yearRangeMap = new Map()
    for (const inv of filtered) {
      const year = inv.realEstateInvestment?.buildingYear
      if (!year) continue
      const rangeStart = Math.floor(year / 10) * 10
      const rangeLabel = `${rangeStart}-${rangeStart + 9}`
      if (!yearRangeMap.has(rangeLabel)) {
        yearRangeMap.set(rangeLabel, { yearRange: rangeLabel, totalValue: 0, count: 0, rangeStart })
      }
      const entry = yearRangeMap.get(rangeLabel)
      entry.totalValue += inv.investment?.totalInvestmentAmount || 0
      entry.count += 1
    }
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
      investmentCount: { label: 'Investment Count' },
      totalInvestmentAmount: { label: 'Total Investment Amount' },
      cumulativeInvestments: { label: 'Cumulative Investments' }
    }),
    []
  )

  // Performance Config
  const performanceConfig = useMemo(
    () => ({
      averageOccupancyRate: { label: 'Average Occupancy Rate' },
      totalPropertyValue: { label: 'Total Property Value' }
    }),
    []
  )

  // Building Year Config
  const buildingYearConfig = useMemo(
    () => ({
      averageValue: { label: 'Average Value' },
      propertyCount: { label: 'Property Count' }
    }),
    []
  )

  // Memoized tooltip render functions
  const renderTimelineTooltip = useCallback(
    (props: any) => (
      <TimelineTooltip {...props} formatCurrency={formatCurrencyCompact} currency={timelineCurrencyFilter} />
    ),
    [timelineCurrencyFilter]
  )

  const renderPerformanceTooltip = useCallback(
    (props: any) => (
      <PerformanceTooltip {...props} formatCurrency={formatCurrencyCompact} currency={performanceCurrencyFilter} />
    ),
    [performanceCurrencyFilter]
  )

  const renderPropertyTypeTooltip = useCallback(
    (props: any) => <PropertyTypeTooltip {...props} formatCurrency={formatCurrencyCompact} />,
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
                <CardTitle>Real Estate Timeline ({timelineCurrencyFilter})</CardTitle>
                <CardDescription>Investment count and amounts by year (last 5 years)</CardDescription>
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
          {(() => {
            if (timelineLoading) {
              return (
                <div className="gba:h-[400px] gba:w-full gba:flex gba:items-center gba:justify-center">
                  <Spinner size="lg" />
                </div>
              )
            }
            if (timelineError) {
              return (
                <Alert variant="destructive">
                  <div>Error loading timeline data: {timelineError}</div>
                </Alert>
              )
            }
            return (
              <ChartContainer config={timelineConfig} className="gba:h-[400px] gba:w-full">
                <ComposedChart data={filteredTimelineData}>
                  <XAxis dataKey="year" />
                  <YAxis yAxisId="left" tickFormatter={value => formatAmount(value, 1)} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={value =>
                      formatCurrencyCompact(
                        value,
                        extractCurrencyCode(timelineCurrencyFilter),
                        undefined,
                        1,
                        true
                      ).replace(/[€$£¥]/g, '')
                    }
                  />
                  <ChartTooltip content={renderTimelineTooltip} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar yAxisId="left" dataKey="investmentCount" fill="var(--color-investmentCount)" />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="totalInvestmentAmount"
                    stroke="var(--color-totalInvestmentAmount)"
                    strokeWidth={3}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="cumulativeInvestments"
                    stroke="var(--color-cumulativeInvestments)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                </ComposedChart>
              </ChartContainer>
            )
          })()}
        </CardContent>
      </Card>

      {/* Performance Over Time */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
              <IconAvatar icon={TrendUpIcon} variant="success" size="md" decorative />
              <div>
                <CardTitle>Property Performance Over Time ({performanceCurrencyFilter})</CardTitle>
                <CardDescription>Occupancy rates and property values by year (last 5 years)</CardDescription>
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
          {(() => {
            if (performanceLoading) {
              return (
                <div className="gba:h-[400px] gba:w-full gba:flex gba:items-center gba:justify-center">
                  <Spinner size="lg" />
                </div>
              )
            }
            if (performanceError) {
              return (
                <Alert variant="destructive">
                  <div>Error loading performance data: {performanceError}</div>
                </Alert>
              )
            }
            return (
              <ChartContainer config={performanceConfig} className="gba:h-[400px] gba:w-full">
                <ComposedChart data={filteredPerformanceData}>
                  <XAxis dataKey="year" />
                  <YAxis yAxisId="left" tickFormatter={value => formatAmount(value, 1)} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={value =>
                      formatCurrencyCompact(
                        value,
                        extractCurrencyCode(performanceCurrencyFilter),
                        undefined,
                        1,
                        true
                      ).replace(/[€$£¥]/g, '')
                    }
                  />
                  <ChartTooltip content={renderPerformanceTooltip} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="averageOccupancyRate"
                    stroke="var(--color-averageOccupancyRate)"
                    strokeWidth={3}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="totalPropertyValue"
                    stroke="var(--color-totalPropertyValue)"
                    strokeWidth={3}
                  />
                </ComposedChart>
              </ChartContainer>
            )
          })()}
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
              <YAxis yAxisId="left" tickFormatter={value => formatAmount(value, 1)} />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={value =>
                  formatCurrencyCompact(
                    value,
                    extractCurrencyCode(buildingYearCurrencyFilter),
                    undefined,
                    1,
                    true
                  ).replace(/[€$£¥]/g, '')
                }
              />
              <ChartTooltip content={renderPropertyTypeTooltip} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar yAxisId="left" dataKey="propertyCount" fill="var(--color-propertyCount)" />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="averageValue"
                stroke="var(--color-averageValue)"
                strokeWidth={3}
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}

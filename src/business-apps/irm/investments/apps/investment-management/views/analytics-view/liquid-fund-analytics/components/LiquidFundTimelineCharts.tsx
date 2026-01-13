import React, { useMemo, useCallback } from 'react'
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
import { Line, XAxis, YAxis, Bar, ComposedChart } from 'recharts'
import { formatCurrencyCompact, extractCurrencyCode, formatAmount } from '@/common/utils/numberFormatter'
import { ChartLineUpIcon, TrendUpIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CurrencyFilter } from '../../shared/components'
import { useCurrencySync } from '../../shared/hooks'
import { useLiquidFundTimelineAggregate } from '../hooks'

// Performance timeline tooltip component
interface PerformanceTimelineTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
  formatCurrency: (amount: number, currency: string) => string
  currency: string
}

const PerformanceTimelineTooltip: React.FC<PerformanceTimelineTooltipProps> = ({
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
          let formattedValue = ''
          let properLabel = ''
          let dotColor = ''

          if (entry.dataKey === 'investmentCount') {
            formattedValue = `${entry.value}`
            properLabel = 'Investment Count'
            dotColor = 'var(--color-investmentCount)'
          } else if (entry.dataKey === 'totalInvestmentAmount') {
            formattedValue = formatCurrency(entry.value as number, currency)
            properLabel = 'Total Invested Amount'
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

// Value trends timeline tooltip component
interface ValueTrendsTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
  formatCurrency: (amount: number, currency: string) => string
  currency: string
}

const ValueTrendsTooltip: React.FC<ValueTrendsTooltipProps> = ({
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
          let dotColor = ''

          if (entry.dataKey === 'totalInvestmentAmount') {
            properLabel = 'Total Invested Amount'
            dotColor = 'var(--color-totalInvestmentAmount)'
          } else if (entry.dataKey === 'totalMarketValue') {
            properLabel = 'Total Market Value'
            dotColor = 'var(--color-totalMarketValue)'
          }

          return (
            <div key={entry.dataKey} className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
              <div className="gba:w-3 gba:h-3 gba:rounded-full" style={{ backgroundColor: dotColor }} />
              <span className="gba:font-medium">{properLabel}:</span>
              <span className="gba:font-semibold">{formatCurrency(entry.value as number, currency)}</span>
            </div>
          )
        })}
      </div>
    )
  }
  return null
}

interface LiquidFundTimelineChartsProps extends BusinessAppContextProps {
  masterCurrency: string
  availableCurrencies: string[]
}

export const LiquidFundTimelineCharts: React.FC<LiquidFundTimelineChartsProps> = props => {
  const { masterCurrency, availableCurrencies } = props

  // Currency sync hooks - separate currency filter for each chart
  const [performanceCurrency, setPerformanceCurrency] = useCurrencySync(masterCurrency)
  const [valueTrendsCurrency, setValueTrendsCurrency] = useCurrencySync(masterCurrency)

  // Fetch performance timeline data using server-side aggregates (query name: GetLiquidFundPerformanceTimeline)
  const {
    performanceData: performanceDataRaw,
    isLoading: performanceLoading,
    error: performanceError
  } = useLiquidFundTimelineAggregate(props, performanceCurrency, 'performance')

  // Fetch value trends data using server-side aggregates (query name: GetLiquidFundValueTrends)
  const {
    valueTrendsData: valueTrendsDataRaw,
    isLoading: valueTrendsLoading,
    error: valueTrendsError
  } = useLiquidFundTimelineAggregate(props, valueTrendsCurrency, 'valueTrends')

  // Transform data for charts (already calculated on server)
  const investmentPerformanceData = performanceDataRaw
  const valueTrendsData = valueTrendsDataRaw

  // Chart configs - MUST be at top level (before any conditional rendering)
  const performanceChartConfig = useMemo(() => {
    const config = {
      investmentCount: { label: 'New Investments' },
      totalInvestmentAmount: { label: 'Total Invested Amount' },
      cumulativeInvestments: { label: 'Cumulative Investments' }
    }
    return config
  }, [])

  const valueTrendsChartConfig = useMemo(() => {
    const config = {
      totalInvestmentAmount: { label: 'Total Invested Amount' },
      totalMarketValue: { label: 'Total Market Value' }
    }
    return config
  }, [])

  // Memoized tooltip render functions
  const renderPerformanceTooltip = useCallback(
    (props: any) => (
      <PerformanceTimelineTooltip {...props} formatCurrency={formatCurrencyCompact} currency={performanceCurrency} />
    ),
    [performanceCurrency]
  )

  const renderValueTrendsTooltip = useCallback(
    (props: any) => (
      <ValueTrendsTooltip {...props} formatCurrency={formatCurrencyCompact} currency={valueTrendsCurrency} />
    ),
    [valueTrendsCurrency]
  )

  return (
    <div className="gba:space-y-6">
      {/* Investment Performance Timeline */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
              <IconAvatar icon={ChartLineUpIcon} variant="default" size="md" decorative />
              <div>
                <CardTitle>Performance Timeline ({performanceCurrency})</CardTitle>
                <CardDescription>
                  Investment count, total invested amount, and cumulative investments by year (last 5 years)
                </CardDescription>
              </div>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              <CurrencyFilter
                value={performanceCurrency}
                onChange={setPerformanceCurrency}
                currencies={availableCurrencies}
                showLabel={false}
                dataTestId="performance-currency-filter"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            if (performanceLoading) {
              return (
                <div className="gba:h-[350px] gba:w-full gba:flex gba:items-center gba:justify-center">
                  <div className="gba:text-gray-500 gba:text-lg">Loading performance data...</div>
                </div>
              )
            }
            if (performanceError) {
              return (
                <div className="gba:h-[350px] gba:w-full gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2">
                  <div className="gba:text-destructive gba:text-lg gba:font-semibold">Error loading data</div>
                  <div className="gba:text-destructive gba:text-sm gba:max-w-xl gba:text-center">
                    {performanceError}
                  </div>
                </div>
              )
            }
            if (investmentPerformanceData.length === 0) {
              return (
                <div className="gba:h-[350px] gba:w-full gba:flex gba:items-center gba:justify-center">
                  <div className="gba:text-gray-500 gba:text-lg">
                    No performance data available for {performanceCurrency}
                  </div>
                </div>
              )
            }
            return (
              <ChartContainer config={performanceChartConfig} className="gba:h-[350px] gba:w-full">
                <ComposedChart data={investmentPerformanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={value => formatAmount(value, 1)} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    tickFormatter={value =>
                      formatCurrencyCompact(
                        value,
                        extractCurrencyCode(performanceCurrency),
                        undefined,
                        1,
                        true
                      ).replace(/[€$£¥]/g, '')
                    }
                  />
                  <ChartTooltip content={renderPerformanceTooltip} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    yAxisId="left"
                    dataKey="investmentCount"
                    fill="var(--color-investmentCount)"
                    radius={[4, 4, 0, 0]}
                  />
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
            )
          })()}
        </CardContent>
      </Card>

      {/* Investment Value Trends Over Time */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
              <IconAvatar icon={TrendUpIcon} variant="success" size="md" decorative />
              <div>
                <CardTitle>Value Trends Over Time ({valueTrendsCurrency})</CardTitle>
                <CardDescription>
                  Comparison of total invested amount vs. market value by year (last 5 years)
                </CardDescription>
              </div>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              <CurrencyFilter
                value={valueTrendsCurrency}
                onChange={setValueTrendsCurrency}
                currencies={availableCurrencies}
                showLabel={false}
                dataTestId="value-trends-currency-filter"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            if (valueTrendsLoading) {
              return (
                <div className="gba:h-[350px] gba:w-full gba:flex gba:items-center gba:justify-center">
                  <div className="gba:text-gray-500 gba:text-lg">Loading value trends data...</div>
                </div>
              )
            }
            if (valueTrendsError) {
              return (
                <div className="gba:h-[350px] gba:w-full gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2">
                  <div className="gba:text-destructive gba:text-lg gba:font-semibold">Error loading data</div>
                  <div className="gba:text-destructive gba:text-sm gba:max-w-xl gba:text-center">
                    {valueTrendsError}
                  </div>
                </div>
              )
            }
            if (valueTrendsData.length === 0) {
              return (
                <div className="gba:h-[350px] gba:w-full gba:flex gba:items-center gba:justify-center">
                  <div className="gba:text-gray-500 gba:text-lg">
                    No value trends data available for {valueTrendsCurrency}
                  </div>
                </div>
              )
            }
            return (
              <ChartContainer config={valueTrendsChartConfig} className="gba:h-[350px] gba:w-full">
                <ComposedChart data={valueTrendsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={value =>
                      formatCurrencyCompact(
                        value,
                        extractCurrencyCode(valueTrendsCurrency),
                        undefined,
                        1,
                        true
                      ).replace(/[€$£¥]/g, '')
                    }
                  />
                  <ChartTooltip content={renderValueTrendsTooltip} />
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
            )
          })()}
        </CardContent>
      </Card>
    </div>
  )
}

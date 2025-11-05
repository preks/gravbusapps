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
  ChartLegendContent,
  Spinner,
  Alert,
  Button
} from '@newwork/nw-design-system'
import { Bar, ComposedChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { formatCurrencyCompact, extractCurrencyCode } from '@/common/utils/numberFormatter'
import { ChartLineUpIcon, TrendUpIcon } from '@phosphor-icons/react'
import { CurrencyFilter } from '../../shared/components'
import { useCurrencySync } from '../../shared/hooks'
import { usePortfolioTimelineAggregate } from '../hooks'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface PortfolioTimelineChartsProps extends BusinessAppContextProps {
  masterCurrency: string
  availableCurrencies: string[]
}

interface TimelineTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
  currencyFilter: string
}

const TimelineTooltip: React.FC<TimelineTooltipProps> = ({ active, payload, label, currencyFilter }) => {
  if (active && payload?.length) {
    const totalInvestedEntry = payload.find(p => p.dataKey === 'total')
    const marketValueEntry = payload.find(p => p.dataKey === 'totalMarketValue')

    return (
      <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
        <div className="gba:mb-2 gba:font-medium gba:text-gray-700">Year: {label}</div>
        {totalInvestedEntry && (
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
            <div className="gba:w-3 gba:h-3 gba:rounded-full" style={{ backgroundColor: 'var(--color-total)' }} />
            <span className="gba:font-medium">Total Invested Amount:</span>
            <span className="gba:font-semibold">
              {formatCurrencyCompact(
                totalInvestedEntry.value as number,
                extractCurrencyCode(currencyFilter),
                undefined,
                1,
                true
              )}
            </span>
          </div>
        )}
        {marketValueEntry && (
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
            <div
              className="gba:w-3 gba:h-3 gba:rounded-full"
              style={{ backgroundColor: 'var(--color-totalmarketvalue)' }}
            />
            <span className="gba:font-medium">Total Market Value:</span>
            <span className="gba:font-semibold">
              {formatCurrencyCompact(
                marketValueEntry.value as number,
                extractCurrencyCode(currencyFilter),
                undefined,
                1,
                true
              )}
            </span>
          </div>
        )}
      </div>
    )
  }
  return null
}

export const PortfolioTimelineCharts: React.FC<PortfolioTimelineChartsProps> = props => {
  const { masterCurrency, availableCurrencies } = props

  // Currency sync hooks - automatically sync with master currency
  const [performanceCurrencyFilter, setPerformanceCurrencyFilter] = useCurrencySync(masterCurrency)
  const [valueCurrencyFilter, setValueCurrencyFilter] = useCurrencySync(masterCurrency)

  // Fetch timeline data for performance chart (last 5 years)
  const {
    timelineData: performanceData,
    isLoading: isLoadingPerformance,
    error: performanceError,
    refetch: refetchPerformance
  } = usePortfolioTimelineAggregate(props, 5, performanceCurrencyFilter)

  // Fetch timeline data for value chart (last 5 years)
  const {
    timelineData: valueData,
    isLoading: isLoadingValue,
    error: valueError,
    refetch: refetchValue
  } = usePortfolioTimelineAggregate(props, 5, valueCurrencyFilter)

  // Memoized tooltip renderers to prevent component definition inside render
  const renderValueTooltip = useCallback(
    (tooltipProps: any) => <TimelineTooltip {...tooltipProps} currencyFilter={valueCurrencyFilter} />,
    [valueCurrencyFilter]
  )

  // Pre-compute chart configs
  const performanceChartConfig = useMemo(
    () => ({
      count: { label: 'Investment Count' },
      total: { label: 'Total Investment Amount' }
    }),
    []
  )

  const valueChartConfig = useMemo(
    () => ({
      total: { label: 'Total Invested Amount' },
      totalmarketvalue: { label: 'Total Market Value' }
    }),
    []
  )

  return (
    <div className="gba:flex gba:flex-col gba:gap-6 gba:w-full">
      {/* Performance Timeline Chart */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
              <IconAvatar icon={ChartLineUpIcon} variant="default" size="md" decorative />
              <div>
                <CardTitle>Investment Performance Timeline ({performanceCurrencyFilter})</CardTitle>
                <CardDescription>Investment count and total investment amount over the last 5 years</CardDescription>
              </div>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:ml-4">
              <span className="gba:text-xs gba:text-gray-500">Currency:</span>
              <CurrencyFilter
                value={performanceCurrencyFilter}
                onChange={setPerformanceCurrencyFilter}
                currencies={availableCurrencies}
                showLabel={false}
                dataTestId="performance-currency-filter"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            if (isLoadingPerformance) {
              return (
                <div className="gba:flex gba:justify-center gba:items-center gba:h-[350px]">
                  <Spinner size="lg" />
                </div>
              )
            }
            if (performanceError) {
              return (
                <Alert variant="destructive" className="gba:mb-4">
                  <div className="gba:flex gba:justify-between gba:items-center">
                    <span>Error loading performance timeline: {performanceError}</span>
                    <Button variant="outline" size="sm" onClick={refetchPerformance}>
                      Retry
                    </Button>
                  </div>
                </Alert>
              )
            }
            return (
              <ChartContainer config={performanceChartConfig} className="gba:h-[350px] gba:w-full">
                <ComposedChart data={performanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    tickFormatter={value =>
                      formatCurrencyCompact(
                        value,
                        extractCurrencyCode(performanceCurrencyFilter),
                        undefined,
                        1,
                        true
                      ).replaceAll(/[€$£¥]/g, '')
                    }
                    label={{ value: 'Amount', angle: 90, position: 'insideRight' }}
                  />
                  <ChartTooltip
                    content={({ active, payload, label }) => {
                      if (active && payload?.length) {
                        const countEntry = payload.find(p => p.dataKey === 'count')
                        const totalEntry = payload.find(p => p.dataKey === 'total')

                        return (
                          <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
                            <div className="gba:mb-2 gba:font-medium gba:text-gray-700">Year: {label}</div>
                            {countEntry && (
                              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                                <div
                                  className="gba:w-3 gba:h-3 gba:rounded-full"
                                  style={{ backgroundColor: 'var(--color-count)' }}
                                />
                                <span className="gba:font-medium">Investment Count:</span>
                                <span className="gba:font-semibold">{countEntry.value}</span>
                              </div>
                            )}
                            {totalEntry && (
                              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                                <div
                                  className="gba:w-3 gba:h-3 gba:rounded-full"
                                  style={{ backgroundColor: 'var(--color-total)' }}
                                />
                                <span className="gba:font-medium">Total Investment Amount:</span>
                                <span className="gba:font-semibold">
                                  {formatCurrencyCompact(
                                    totalEntry.value as number,
                                    extractCurrencyCode(performanceCurrencyFilter),
                                    undefined,
                                    1,
                                    true
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar yAxisId="left" dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="total"
                    stroke="var(--color-total)"
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

      {/* Value Trends Chart */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
              <IconAvatar icon={TrendUpIcon} variant="success" size="md" decorative />
              <div>
                <CardTitle>Investment Value Trends Over Time ({valueCurrencyFilter})</CardTitle>
                <CardDescription>Comparison of invested amount vs market value over the last 5 years</CardDescription>
              </div>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:ml-4">
              <span className="gba:text-xs gba:text-gray-500">Currency:</span>
              <CurrencyFilter
                value={valueCurrencyFilter}
                onChange={setValueCurrencyFilter}
                currencies={availableCurrencies}
                showLabel={false}
                dataTestId="value-currency-filter"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            if (isLoadingValue) {
              return (
                <div className="gba:flex gba:justify-center gba:items-center gba:h-[300px]">
                  <Spinner size="lg" />
                </div>
              )
            }
            if (valueError) {
              return (
                <Alert variant="destructive" className="gba:mb-4">
                  <div className="gba:flex gba:justify-between gba:items-center">
                    <span>Error loading value trends: {valueError}</span>
                    <Button variant="outline" size="sm" onClick={refetchValue}>
                      Retry
                    </Button>
                  </div>
                </Alert>
              )
            }
            return (
              <ChartContainer config={valueChartConfig} className="gba:h-[300px] gba:w-full">
                <ComposedChart data={valueData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={value =>
                      formatCurrencyCompact(
                        value,
                        extractCurrencyCode(valueCurrencyFilter),
                        undefined,
                        1,
                        true
                      ).replaceAll(/[€$£¥]/g, '')
                    }
                  />
                  <ChartTooltip content={renderValueTooltip} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="var(--color-total)"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalMarketValue"
                    stroke="var(--color-totalmarketvalue)"
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

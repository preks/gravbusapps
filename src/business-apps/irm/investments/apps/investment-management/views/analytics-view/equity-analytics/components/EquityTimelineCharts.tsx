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
import { ComposedChart, ScatterChart, Scatter, Bar, Line, XAxis, YAxis, LabelList, ZAxis } from 'recharts'
import { ChartLineUpIcon, TrendUpIcon, ChartScatterIcon } from '@phosphor-icons/react'
import { CurrencyFilter } from '../../shared/components'
import { useCurrencySync } from '../../shared/hooks'
import { useEquityTimelineAggregate, useEquityTopCompanies, useEquityPortfolioMatrix } from '../hooks'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

const CHART_COLORS = [
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7c7c',
  '#8dd1e1',
  '#a4de6c',
  '#d0ed57',
  '#83a6ed',
  '#8e4585',
  '#ffa500'
]

interface EquityTimelineChartsProps extends BusinessAppContextProps {
  masterCurrency: string
  availableCurrencies: string[]
}

export const EquityTimelineCharts: React.FC<EquityTimelineChartsProps> = props => {
  const { masterCurrency, availableCurrencies } = props

  // Currency sync hooks - automatically sync with master currency
  const [timelineCurrency, setTimelineCurrency] = useCurrencySync(masterCurrency)
  const [topCompaniesCurrency, setTopCompaniesCurrency] = useCurrencySync(masterCurrency)
  const [portfolioMatrixCurrency, setPortfolioMatrixCurrency] = useCurrencySync(masterCurrency)

  // Use optimized server-side aggregate query for timeline data
  const {
    timelineData: aggregatedTimelineData,
    investmentTypes: aggregatedInvestmentTypes,
    isLoading: timelineLoading,
    error: timelineError
  } = useEquityTimelineAggregate(props, 5, timelineCurrency)

  // Use optimized server-side query for top companies by valuation
  const {
    topCompanies: topCompaniesData,
    isLoading: topCompaniesLoading,
    error: topCompaniesError
  } = useEquityTopCompanies(props, topCompaniesCurrency, 10)

  // Use optimized server-side query for portfolio matrix (bubble chart)
  const {
    portfolioMatrixData,
    isLoading: portfolioMatrixLoading,
    error: portfolioMatrixError
  } = useEquityPortfolioMatrix(props, portfolioMatrixCurrency)

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

  // Timeline chart tooltip component
  const TimelineTooltipContent: React.FC<{
    active?: boolean
    payload?: any[]
    label?: string
    formatCurrency: (amount: number, currency: string) => string
    currency: string
  }> = ({ active, payload, label, formatCurrency, currency }) => {
    if (active && payload?.length) {
      const investmentTypes = payload.filter(entry => entry.dataKey !== 'total' && (entry.value as number) > 0)
      const totalEntry = payload.find(entry => entry.dataKey === 'total')
      const total = (totalEntry?.value as number) || 0

      return (
        <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
          <div className="gba:mb-2 gba:font-semibold gba:text-gray-800">{label}</div>
          {investmentTypes.map(entry => (
            <div key={entry.name as string} className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
              <div className="gba:w-3 gba:h-3 gba:rounded-full" style={{ backgroundColor: entry.fill }} />
              <span className="gba:font-medium gba:text-gray-600">{entry.name}:</span>
              <span className="gba:font-semibold gba:text-gray-800">
                {formatCurrency(entry.value as number, currency)}
              </span>
            </div>
          ))}
          <div className="gba:mt-2 gba:pt-2 gba:border-t gba:border-gray-200">
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:font-semibold gba:text-gray-700">Total:</span>
              <span className="gba:font-bold gba:text-gray-900">{formatCurrency(total, currency)}</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  // Portfolio matrix tooltip component
  const PortfolioMatrixTooltipContent: React.FC<{
    active?: boolean
    payload?: any[]
    formatCurrency: (amount: number, currency: string) => string
    currency: string
  }> = ({ active, payload, formatCurrency, currency }) => {
    if (active && payload?.length) {
      const data = payload[0].payload

      return (
        <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
          <div className="gba:mb-2 gba:font-medium gba:text-gray-700">{data.company}</div>
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
            <div
              className="gba:w-3 gba:h-3 gba:rounded-full"
              style={{ backgroundColor: 'var(--color-portfoliomatrix)' }}
            />
            <span className="gba:font-medium">Investment Amount:</span>
            <span className="gba:font-semibold">{formatCurrency(data.investmentAmount, currency)}</span>
          </div>
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
            <div
              className="gba:w-3 gba:h-3 gba:rounded-full"
              style={{ backgroundColor: 'var(--color-portfoliomatrix)' }}
            />
            <span className="gba:font-medium">Years Invested:</span>
            <span className="gba:font-semibold">{data.duration} years</span>
          </div>
          <div className="gba:flex gba:items-center gba:gap-2">
            <div
              className="gba:w-3 gba:h-3 gba:rounded-full"
              style={{ backgroundColor: 'var(--color-portfoliomatrix)' }}
            />
            <span className="gba:font-medium">MOIC:</span>
            <span className="gba:font-semibold">{data.moic}x</span>
          </div>
        </div>
      )
    }
    return null
  }

  // Top companies tooltip component
  const TopCompaniesTooltipContent: React.FC<{
    active?: boolean
    payload?: any[]
    label?: string
    formatCurrency: (amount: number, currency: string) => string
    currency: string
  }> = ({ active, payload, label, formatCurrency, currency }) => {
    if (active && payload?.length) {
      return (
        <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
          <div className="gba:mb-2 gba:font-medium gba:text-gray-700">{label}</div>
          {payload.map(entry => {
            let formattedValue = ''
            let properLabel = ''
            let dotColor = ''

            if (entry.dataKey === 'valuation') {
              formattedValue = formatCurrency(entry.value as number, currency)
              properLabel = 'Valuation'
              dotColor = 'var(--color-valuation)'
            }

            return (
              <div key={entry.dataKey as string} className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
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

  // All data now fetched server-side with optimized queries!
  // Timeline data: useEquityTimelineAggregate
  // Top companies: useEquityTopCompanies
  // Portfolio matrix: useEquityPortfolioMatrix

  // Create dynamic chart config for all investment types plus trendline
  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string }> = {}
    for (const type of aggregatedInvestmentTypes) {
      config[type] = { label: type }
    }
    config.trend = { label: 'Trend' }
    return config
  }, [aggregatedInvestmentTypes])

  // Top companies chart config - MUST be declared at top level (not inside conditionals)
  const topCompaniesChartConfig = useMemo(
    () => ({
      valuation: { label: 'Valuation' }
    }),
    []
  )

  // Memoized tooltip render functions
  const renderTimelineTooltip = useCallback(
    (props: any) => <TimelineTooltipContent {...props} formatCurrency={formatCurrency} currency={timelineCurrency} />,
    [timelineCurrency]
  )

  const renderPortfolioMatrixTooltip = useCallback(
    (props: any) => (
      <PortfolioMatrixTooltipContent {...props} formatCurrency={formatCurrency} currency={portfolioMatrixCurrency} />
    ),
    [portfolioMatrixCurrency]
  )

  const renderTopCompaniesTooltip = useCallback(
    (props: any) => (
      <TopCompaniesTooltipContent {...props} formatCurrency={formatCurrency} currency={topCompaniesCurrency} />
    ),
    [topCompaniesCurrency]
  )

  // Portfolio matrix chart config - MUST be declared at top level (not inside conditionals)
  const portfolioMatrixChartConfig = useMemo(
    () => ({
      portfoliomatrix: { label: 'Portfolio Matrix' }
    }),
    []
  )

  return (
    <>
      {/* Equity Investment Performance Timeline - Full Width Row */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3">
              <IconAvatar icon={ChartLineUpIcon} variant="default" size="md" decorative />
              <div>
                <CardTitle>Equity Performance Timeline ({timelineCurrency})</CardTitle>
                <CardDescription>Investment amounts by type over the last 5 years with trend analysis</CardDescription>
              </div>
            </div>
            <CurrencyFilter
              value={timelineCurrency}
              onChange={setTimelineCurrency}
              currencies={availableCurrencies}
              showLabel={false}
              dataTestId="timeline-currency-filter"
            />
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            if (timelineLoading) {
              return (
                <div className="gba:h-[400px] gba:w-full gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2">
                  <div className="gba:text-gray-500 gba:text-lg">Loading timeline data...</div>
                  <div className="gba:text-gray-400 gba:text-sm">Check console for debug info</div>
                </div>
              )
            }
            if (timelineError) {
              return (
                <div className="gba:h-[400px] gba:w-full gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2">
                  <div className="gba:text-destructive gba:text-lg gba:font-semibold">Error loading timeline</div>
                  <div className="gba:text-destructive gba:text-sm gba:max-w-xl gba:text-center">{timelineError}</div>
                  <div className="gba:text-gray-400 gba:text-xs">Check console for details</div>
                </div>
              )
            }
            if (aggregatedTimelineData.length === 0) {
              return (
                <div className="gba:h-[400px] gba:w-full gba:flex gba:items-center gba:justify-center">
                  <div className="gba:text-gray-500 gba:text-lg">No timeline data available for {timelineCurrency}</div>
                </div>
              )
            }
            return (
              <ChartContainer config={chartConfig} className="gba:h-[400px] gba:w-full">
                <ComposedChart data={aggregatedTimelineData} margin={{ top: 40, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={value => formatCurrency(value, timelineCurrency).replace(/[€$£¥]/g, '')}
                  />
                  <ChartTooltip content={renderTimelineTooltip} />
                  <ChartLegend content={<ChartLegendContent />} />
                  {aggregatedInvestmentTypes.map((type, index) => {
                    const isLastType = index === aggregatedInvestmentTypes.length - 1
                    return (
                      <Bar
                        key={type}
                        dataKey={type}
                        name={type}
                        stackId="investments"
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                        radius={isLastType ? [4, 4, 0, 0] : undefined}
                      >
                        {isLastType && (
                          <LabelList
                            dataKey="yoyLabel"
                            position="top"
                            offset={15}
                            style={{
                              fontSize: '11px',
                              fontWeight: '600',
                              fill: 'var(--nw-color-foreground)'
                            }}
                            formatter={(value: any) => value || ''}
                          />
                        )}
                      </Bar>
                    )
                  })}
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="trend"
                    stroke="var(--color-trend)"
                    strokeWidth={3}
                    dot={{ fill: 'var(--color-trend)', r: 4 }}
                  />
                </ComposedChart>
              </ChartContainer>
            )
          })()}
        </CardContent>
      </Card>

      {/* Portfolio Matrix: Size | Holding Duration | Multiples - Bubble Chart */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3">
              <IconAvatar icon={ChartScatterIcon} variant="secondary" size="md" decorative />
              <div>
                <CardTitle>Portfolio - Size | Holding Duration | Multiples ({portfolioMatrixCurrency})</CardTitle>
                <CardDescription>Investment size, years invested, and MOIC performance analysis</CardDescription>
              </div>
            </div>
            <CurrencyFilter
              value={portfolioMatrixCurrency}
              onChange={setPortfolioMatrixCurrency}
              currencies={availableCurrencies}
              showLabel={false}
              dataTestId="portfolio-matrix-currency-filter"
            />
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            if (portfolioMatrixLoading) {
              return (
                <div className="gba:flex gba:justify-center gba:items-center gba:h-[450px]">
                  <div className="gba:text-center">
                    <div className="gba:animate-spin gba:rounded-full gba:h-12 gba:w-12 gba:border-b-2 gba:border-primary gba:mx-auto" />
                    <p className="gba:mt-4 gba:text-sm gba:text-muted-foreground">Loading portfolio matrix data...</p>
                  </div>
                </div>
              )
            }
            if (portfolioMatrixError) {
              return (
                <div className="gba:flex gba:justify-center gba:items-center gba:h-[450px]">
                  <div className="gba:text-center gba:text-destructive">
                    <p className="gba:font-medium">Error loading portfolio matrix</p>
                    <p className="gba:text-sm gba:mt-2">{portfolioMatrixError}</p>
                  </div>
                </div>
              )
            }
            if (portfolioMatrixData.length === 0) {
              return (
                <div className="gba:flex gba:justify-center gba:items-center gba:h-[450px]">
                  <p className="gba:text-muted-foreground">
                    No portfolio matrix data available for {portfolioMatrixCurrency}
                  </p>
                </div>
              )
            }
            return (
              <ChartContainer config={portfolioMatrixChartConfig} className="gba:h-[450px] gba:w-full">
                <ScatterChart data={portfolioMatrixData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <XAxis
                    type="number"
                    dataKey="duration"
                    name="Years Invested"
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Years invested', position: 'insideBottom', offset: -10 }}
                    domain={[0, 'auto']}
                  />
                  <YAxis
                    type="number"
                    dataKey="moic"
                    name="MOIC"
                    tick={{ fontSize: 12 }}
                    label={{ value: 'MOIC', angle: -90, position: 'insideLeft' }}
                    domain={[0, 'auto']}
                  />
                  <ZAxis type="number" dataKey="size" range={[100, 2000]} name="Investment Amount" />
                  <ChartTooltip content={renderPortfolioMatrixTooltip} />
                  <Scatter
                    name="portfoliomatrix"
                    data={portfolioMatrixData}
                    fill="var(--color-portfoliomatrix)"
                    opacity={0.6}
                  />
                </ScatterChart>
              </ChartContainer>
            )
          })()}
        </CardContent>
      </Card>

      {/* Top Companies by Valuation - Full Width Row */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3">
              <IconAvatar icon={TrendUpIcon} variant="success" size="md" decorative />
              <div>
                <CardTitle>Top Companies by Valuation ({topCompaniesCurrency})</CardTitle>
                <CardDescription>Highest valued companies in the equity investment portfolio</CardDescription>
              </div>
            </div>
            <CurrencyFilter
              value={topCompaniesCurrency}
              onChange={setTopCompaniesCurrency}
              currencies={availableCurrencies}
              showLabel={false}
              dataTestId="top-companies-currency-filter"
            />
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            if (topCompaniesLoading) {
              return (
                <div className="gba:h-[400px] gba:w-full gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2">
                  <div className="gba:text-gray-500 gba:text-lg">Loading top companies...</div>
                  <div className="gba:text-gray-400 gba:text-sm">Check console for debug info</div>
                </div>
              )
            }
            if (topCompaniesError) {
              return (
                <div className="gba:h-[400px] gba:w-full gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2">
                  <div className="gba:text-destructive gba:text-lg gba:font-semibold">Error loading top companies</div>
                  <div className="gba:text-destructive gba:text-sm gba:max-w-xl gba:text-center">
                    {topCompaniesError}
                  </div>
                  <div className="gba:text-gray-400 gba:text-xs">Check console for details</div>
                </div>
              )
            }
            if (topCompaniesData.length === 0) {
              return (
                <div className="gba:h-[400px] gba:w-full gba:flex gba:items-center gba:justify-center">
                  <div className="gba:text-gray-500 gba:text-lg">
                    No companies with valuations found for {topCompaniesCurrency}
                  </div>
                </div>
              )
            }
            return (
              <ChartContainer config={topCompaniesChartConfig} className="gba:h-[400px] gba:w-full">
                <ComposedChart data={topCompaniesData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                  <XAxis
                    dataKey="company"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                    tick={{ fontSize: 11 }}
                    tickFormatter={value => {
                      // Truncate company names longer than 15 characters
                      return value.length > 15 ? `${value.substring(0, 15)}...` : value
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={value => formatCurrency(value, topCompaniesCurrency).replace(/[€$£¥]/g, '')}
                  />
                  <ChartTooltip content={renderTopCompaniesTooltip} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="valuation" name="valuation" fill="var(--color-valuation)" radius={[4, 4, 0, 0]} />
                </ComposedChart>
              </ChartContainer>
            )
          })()}
        </CardContent>
      </Card>
    </>
  )
}

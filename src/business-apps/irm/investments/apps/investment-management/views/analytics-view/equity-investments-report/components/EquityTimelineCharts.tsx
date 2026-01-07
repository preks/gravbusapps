import React, { useState, useEffect, useMemo, useCallback } from 'react'
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
import { ComposedChart, ScatterChart, Scatter, Bar, Line, XAxis, YAxis, LabelList, ZAxis } from 'recharts'
import { formatCompactNumber } from '@/common/utils/numberFormatter'
import { ChartLineUpIcon, TrendUpIcon, ChartScatterIcon } from '@phosphor-icons/react'
import type { EquityInvestmentSummary } from '../../shared/types'
import dayjs from 'dayjs'

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

// Helper function to calculate YoY change label
function calculateYoyLabel(currentTotal: number, previousTotal: number): string {
  if (previousTotal > 0) {
    const yoyChange = ((currentTotal - previousTotal) / previousTotal) * 100
    return `${yoyChange >= 0 ? '+' : ''}${yoyChange.toFixed(1)}%`
  }
  if (currentTotal > 0) {
    return '+100%'
  }
  return '0%'
}

// Helper function for consistent currency formatting
function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    notation: 'compact',
    compactDisplay: 'short',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  }).format(amount)
}

// Helper function to initialize yearly data structure
function initializeYearlyData(years: string[], investmentTypes: Set<string>) {
  return years.map(year => {
    const entry: any = { year, total: 0 }
    for (const type of investmentTypes) {
      entry[type] = 0
    }
    return entry
  })
}

// Helper function to aggregate investments by year and type
function aggregateInvestmentsByYear(
  investments: EquityInvestmentSummary[],
  yearlyData: any[],
  startYear: number,
  currentYear: number
) {
  const validInvestments = investments.filter(equity => equity.investment.acquisitionDate)

  for (const equity of validInvestments) {
    const year = dayjs(equity.investment.acquisitionDate).format('YYYY')
    const type = equity.investment.investmentType?.value || 'Unknown'
    const amount = equity.investment.totalInvestmentAmount || 0
    const yearNum = Number.parseInt(year)

    if (yearNum >= startYear && yearNum <= currentYear) {
      const yearEntry = yearlyData.find(item => item.year === year)
      if (yearEntry) {
        yearEntry[type] = (yearEntry[type] || 0) + amount
        yearEntry.total = (yearEntry.total || 0) + amount
      }
    }
  }
}

// Helper function to calculate timeline data for equity investments
function calculateTimelineData(investments: EquityInvestmentSummary[]) {
  const currentYear = dayjs().year()
  const startYear = currentYear - 4
  const years = Array.from({ length: 5 }, (_, i) => (startYear + i).toString())

  // Collect all unique investment types
  const investmentTypes = new Set<string>()
  for (const equity of investments) {
    const type = equity.investment.investmentType?.value || 'Unknown'
    investmentTypes.add(type)
  }

  // Initialize data structure with all years
  const yearlyData = initializeYearlyData(years, investmentTypes)

  // Group investments by year and type
  aggregateInvestmentsByYear(investments, yearlyData, startYear, currentYear)

  // Calculate YoY change for each year
  for (const [index, entry] of yearlyData.entries()) {
    if (index === 0) {
      entry.yoyLabel = '0%'
    } else {
      const currentTotal = entry.total || 0
      const previousTotal = yearlyData[index - 1].total || 0
      entry.yoyLabel = calculateYoyLabel(currentTotal, previousTotal)
    }
  }

  return {
    data: yearlyData,
    types: Array.from(investmentTypes)
  }
}

// Timeline chart tooltip component
interface TimelineChartTooltipContentProps {
  active?: boolean
  payload?: any[]
  label?: string
  formatCurrency: (amount: number, currency: string) => string
  currency: string
}

const TimelineChartTooltipContent: React.FC<TimelineChartTooltipContentProps> = ({
  active,
  payload,
  label,
  formatCurrency,
  currency
}) => {
  if (active && payload?.length) {
    // Separate investment types from trend line
    const investmentTypes = payload.filter(entry => entry.dataKey !== 'total' && (entry.value as number) > 0)
    const totalEntry = payload.find(entry => entry.dataKey === 'total')
    const total = (totalEntry?.value as number) || 0

    return (
      <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
        <div className="gba:mb-2 gba:font-semibold gba:text-gray-800">{label}</div>
        {investmentTypes.map(entry => (
          <div key={entry.dataKey as string} className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
            <div className="gba:w-3 gba:h-3 gba:rounded-full" style={{ backgroundColor: entry.fill }} />
            <span className="gba:font-medium gba:text-gray-600">{entry.name}:</span>
            <span className="gba:font-semibold gba:text-gray-900">
              {formatCurrency(entry.value as number, currency)}
            </span>
          </div>
        ))}
        <div className="gba:border-t gba:border-gray-200 gba:my-2" />
        <div className="gba:flex gba:items-center gba:justify-between gba:font-semibold gba:text-gray-900">
          <span>Total:</span>
          <span>{formatCurrency(total, currency)}</span>
        </div>
      </div>
    )
  }
  return null
}

// Portfolio matrix bubble chart tooltip component
interface PortfolioMatrixTooltipContentProps {
  active?: boolean
  payload?: any[]
  formatCurrency: (amount: number, currency: string) => string
  currency: string
}

const PortfolioMatrixTooltipContent: React.FC<PortfolioMatrixTooltipContentProps> = ({
  active,
  payload,
  formatCurrency,
  currency
}) => {
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
          <span className="gba:font-medium">Years Held:</span>
          <span className="gba:font-semibold">{data.duration}y</span>
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

// Top companies bar chart tooltip component
interface TopCompaniesTooltipContentProps {
  active?: boolean
  payload?: any[]
  label?: string
  formatCurrency: (amount: number, currency: string) => string
  currency: string
}

const TopCompaniesTooltipContent: React.FC<TopCompaniesTooltipContentProps> = ({
  active,
  payload,
  label,
  formatCurrency,
  currency
}) => {
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
            <div key={entry.dataKey as string} className="gba:flex gba:items-center gba:gap-2">
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

interface EquityTimelineChartsProps {
  rawInvestments: EquityInvestmentSummary[]
  masterCurrency: string
  availableCurrencies: string[]
}

export const EquityTimelineCharts: React.FC<EquityTimelineChartsProps> = ({
  rawInvestments,
  masterCurrency,
  availableCurrencies
}) => {
  // Independent currency state for each chart
  const [timelineCurrency, setTimelineCurrency] = useState(masterCurrency)
  const [topCompaniesCurrency, setTopCompaniesCurrency] = useState(masterCurrency)
  const [portfolioMatrixCurrency, setPortfolioMatrixCurrency] = useState(masterCurrency)

  // Reset all chart currencies when master currency changes
  useEffect(() => {
    setTimelineCurrency(masterCurrency)
    setTopCompaniesCurrency(masterCurrency)
    setPortfolioMatrixCurrency(masterCurrency)
  }, [masterCurrency])

  // Portfolio Matrix Data: Size (investment amount), Duration (years invested), MOIC (multiple)
  const portfolioMatrixData = useMemo(() => {
    return rawInvestments
      .filter(equity => equity.currencyCode === portfolioMatrixCurrency)
      .filter(equity => {
        const hasAcquisitionDate = equity.investment.acquisitionDate
        const hasTotalInvestment =
          equity.investment.totalInvestmentAmount && equity.investment.totalInvestmentAmount > 0
        const hasMarketValue = equity.investment.investmentMarketValue
        return hasAcquisitionDate && hasTotalInvestment && hasMarketValue
      })
      .map(equity => {
        // Calculate duration in years
        const acquisitionDate = dayjs(equity.investment.acquisitionDate)
        const today = dayjs()
        const durationYears = today.diff(acquisitionDate, 'year', true)

        // Calculate MOIC
        const moic = equity.investment.investmentMarketValue! / equity.investment.totalInvestmentAmount!

        // Investment amount for bubble size
        const investmentAmount = equity.investment.totalInvestmentAmount!

        return {
          company: equity.displayName || 'Unknown',
          duration: Number(durationYears.toFixed(1)),
          moic: Number(moic.toFixed(2)),
          investmentAmount,
          // Size for bubble - normalized (use sqrt for better visual scaling)
          size: Math.sqrt(investmentAmount / 1000000) * 100 // Scale down for visualization
        }
      })
  }, [rawInvestments, portfolioMatrixCurrency])

  // Recalculate timeline data based on selected currency
  const filteredEquityTimelineData = useMemo(() => {
    // Filter investments by selected currency
    const currencyFilteredInvestments = rawInvestments.filter(equity => equity.currencyCode === timelineCurrency)
    return calculateTimelineData(currencyFilteredInvestments)
  }, [rawInvestments, timelineCurrency])

  // Recalculate top companies data based on selected currency
  const filteredTopCompaniesData = useMemo(() => {
    return rawInvestments
      .filter(equity => equity.currencyCode === topCompaniesCurrency)
      .filter(equity => equity.investment.investmentMarketValue && equity.investment.investmentMarketValue > 0)
      .sort((a, b) => (b.investment.investmentMarketValue || 0) - (a.investment.investmentMarketValue || 0))
      .slice(0, 10)
      .map(equity => ({
        company: equity.displayName || 'Unknown',
        valuation: equity.investment.investmentMarketValue || 0
      }))
  }, [rawInvestments, topCompaniesCurrency])

  // Create dynamic chart config for all investment types plus trendline
  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string }> = {}
    for (const type of filteredEquityTimelineData.types) {
      config[type] = { label: type }
    }
    config.trend = { label: 'Trend' }
    return config
  }, [filteredEquityTimelineData.types])

  // Memoized tooltip render functions
  const renderTimelineTooltip = useCallback(
    (props: any) => (
      <TimelineChartTooltipContent {...props} formatCurrency={formatCurrency} currency={timelineCurrency} />
    ),
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
            <Select value={timelineCurrency} onValueChange={setTimelineCurrency}>
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
          <ChartContainer config={chartConfig} className="gba:h-[400px] gba:w-full">
            <ComposedChart data={filteredEquityTimelineData.data} margin={{ top: 40, right: 30, left: 20, bottom: 5 }}>
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={value => formatCompactNumber(value, 1)} />
              <ChartTooltip content={renderTimelineTooltip} />
              <ChartLegend content={<ChartLegendContent />} />
              {filteredEquityTimelineData.types.map((type, index) => {
                const isLastType = index === filteredEquityTimelineData.types.length - 1
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
            <Select value={portfolioMatrixCurrency} onValueChange={setPortfolioMatrixCurrency}>
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
                portfoliomatrix: { label: 'Portfolio Matrix' }
              }),
              []
            )}
            className="gba:h-[450px] gba:w-full"
          >
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
            <Select value={topCompaniesCurrency} onValueChange={setTopCompaniesCurrency}>
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
                valuation: { label: 'Valuation' }
              }),
              []
            )}
            className="gba:h-[400px] gba:w-full"
          >
            <ComposedChart data={filteredTopCompaniesData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
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
              <YAxis tick={{ fontSize: 12 }} tickFormatter={value => formatCompactNumber(value, 1)} />
              <ChartTooltip content={renderTopCompaniesTooltip} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="valuation" name="valuation" fill="var(--color-valuation)" radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </>
  )
}

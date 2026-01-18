import React, { useMemo, useCallback } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  Button
} from '@newwork/nw-design-system'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, Cell } from 'recharts'
import { PencilIcon } from '@phosphor-icons/react'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface RevenueForecastChartProps extends BusinessAppContextProps {
  investment: any
  equityData: any
  hideUpdateButton?: boolean
}

type YearlyForecastData = {
  year: string
  turnover: number
  ebitda: number
  ebitdaMargin: number
  isActual: boolean
}

/**
 * Calculate EBITDA Margin as percentage
 */
const calculateEbitdaMargin = (ebitda: number, turnover: number): number => {
  if (turnover === 0) return 0
  return (ebitda / turnover) * 100
}

/**
 * Parse additional properties from string or return as object
 */
const parseAdditionalProps = (additionalProps: any): any => {
  if (typeof additionalProps === 'string') {
    try {
      return JSON.parse(additionalProps)
    } catch (e) {
      console.error('Failed to parse additionalProperties:', e)
      return {}
    }
  }
  return additionalProps || {}
}

/**
 * Group reports by year and keep the latest report for each year
 */
const groupReportsByYearLatest = (reports: any[]): Record<string, any> => {
  const reportsByYear: Record<string, any> = {}

  for (const report of reports) {
    if (report.date) {
      const reportYear = new Date(report.date).getFullYear().toString()

      // Keep only the latest report for each year
      if (!reportsByYear[reportYear] || new Date(report.date) > new Date(reportsByYear[reportYear].date)) {
        reportsByYear[reportYear] = report
      }
    }
  }

  return reportsByYear
}

/**
 * Get actual turnover and ebitda values for a specific year
 */
const getActualYearValues = (
  year: number,
  currentYear: number,
  currentYearTurnover: number | null | undefined,
  currentYearEbitda: number | null | undefined,
  reportsByYear: Record<string, any>
): { turnover: number; ebitda: number } => {
  const yearStr = year.toString()
  const isCurrentYear = year === currentYear

  if (isCurrentYear) {
    // Current year: use value from main equityInvestment table
    const turnover =
      currentYearTurnover !== null && currentYearTurnover !== undefined && typeof currentYearTurnover === 'number'
        ? currentYearTurnover
        : 0
    const ebitda =
      currentYearEbitda !== null && currentYearEbitda !== undefined && typeof currentYearEbitda === 'number'
        ? currentYearEbitda
        : 0

    return { turnover, ebitda }
  }

  // Previous years: use value from latest report for that year
  const latestReport = reportsByYear[yearStr]
  if (latestReport) {
    const turnover =
      latestReport.turnoverAmount !== null &&
      latestReport.turnoverAmount !== undefined &&
      typeof latestReport.turnoverAmount === 'number'
        ? latestReport.turnoverAmount
        : 0
    const ebitda =
      latestReport.ebitdaAmount !== null &&
      latestReport.ebitdaAmount !== undefined &&
      typeof latestReport.ebitdaAmount === 'number'
        ? latestReport.ebitdaAmount
        : 0

    return { turnover, ebitda }
  }

  return { turnover: 0, ebitda: 0 }
}

/**
 * Generate actual data from equity investment reports
 * Shows a 5-year rolling window that automatically updates as time progresses
 * - Current Year: From main equityInvestment table
 * - Previous Years: From latest report per year
 */
const generateActualData = (equityData: any): YearlyForecastData[] => {
  const currentYear = new Date().getFullYear()

  // 5-year rolling window: dynamically calculated based on current year
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i)

  // Get equity investment base data (current year values)
  const equityInvestment = equityData?.equityInvestment
  const currentYearTurnover = equityInvestment?.turnoverAmount
  const currentYearEbitda = equityInvestment?.ebitdaAmount

  // Get reports from equity investment data (historical values)
  const reports = equityData?.equityInvestment?.equityInvestmentReport || []

  // Group reports by year and find the latest report for each year
  const reportsByYear = groupReportsByYearLatest(reports)

  // Generate data for each year
  return years.map(year => {
    const yearStr = year.toString()
    const { turnover, ebitda } = getActualYearValues(
      year,
      currentYear,
      currentYearTurnover,
      currentYearEbitda,
      reportsByYear
    )

    return {
      year: yearStr,
      turnover,
      ebitda,
      ebitdaMargin: calculateEbitdaMargin(ebitda, turnover),
      isActual: true
    }
  })
}

/**
 * Generate FUTURE forecast data from investment additionalProperties ONLY
 * Only includes forecasts for years AFTER the current year
 * No hardcoded fallback - returns empty array if no forecasts configured
 */
const generateForecastData = (equityData: any): YearlyForecastData[] => {
  const currentYear = new Date().getFullYear()

  const equityInvestment = Array.isArray(equityData?.equityInvestment)
    ? equityData.equityInvestment[0]
    : equityData?.equityInvestment

  // Parse additionalProperties
  const additionalProps = parseAdditionalProps(equityInvestment?.additionalProperties)
  const forecasts = additionalProps?.forecasts || {}

  // Get all forecast years and filter for FUTURE years only (year > currentYear)
  const years = Object.keys(forecasts)
    .filter(yearStr => Number.parseInt(yearStr) > currentYear)
    .sort((a, b) => Number.parseInt(a) - Number.parseInt(b))

  // No hardcoded fallback - if no forecasts, return empty array
  if (years.length === 0) {
    return []
  }

  return years.map(yearStr => {
    const forecast = forecasts[yearStr]

    // Use exact values from database (no transformation)
    const turnoverValue = forecast.turnover ? forecast.turnover : 0
    const ebitdaValue = forecast.ebitda ? forecast.ebitda : 0

    // Calculate margin ONLY if both values exist and turnover > 0
    let margin = 0
    if (forecast.turnover && forecast.ebitda && forecast.turnover > 0) {
      margin = calculateEbitdaMargin(ebitdaValue, turnoverValue)
    }

    return {
      year: `${yearStr}F`,
      turnover: turnoverValue,
      ebitda: ebitdaValue,
      ebitdaMargin: margin,
      isActual: false
    }
  })
}

/**
 * Format values for display (using exact database values)
 */
const formatValue = (value: number): string => {
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

const formatMargin = (value: number): string => {
  return `${value.toFixed(0)}%`
}

/**
 * Custom tooltip component for Revenue Forecast Chart
 */
const RevenueForecastTooltip: React.FC<{
  active?: boolean
  payload?: any[]
  label?: string
  chartConfig: any
  getTurnoverColor: (data: YearlyForecastData) => string
  getEbitdaColor: (data: YearlyForecastData) => string
}> = ({ active, payload, label, chartConfig, getTurnoverColor, getEbitdaColor }) => {
  if (active && payload?.length) {
    const dataPoint = payload[0].payload as YearlyForecastData
    const isActual = dataPoint.isActual
    const sectionLabel = isActual
      ? getTranslationFromI18nKeyAndLabel('crm.investments.analytics.revenueForecast.actual', 'Actual')
      : getTranslationFromI18nKeyAndLabel('crm.investments.analytics.revenueForecast.forecast', 'Forecast')

    return (
      <div className="gba:bg-white gba:p-3 gba:border gba:border-border gba:rounded-lg gba:shadow-lg">
        <div className="gba:mb-2 gba:font-medium gba:text-foreground">
          {label} - {sectionLabel}
        </div>
        {payload.map((entry: any) => {
          let displayValue = ''
          let color = entry.color

          // Get user-friendly label from chartConfig
          const dataKey = entry.dataKey as 'turnover' | 'ebitda' | 'ebitdaMargin'
          const entryLabel = chartConfig[dataKey]?.label || entry.name

          if (entry.dataKey === 'ebitdaMargin') {
            displayValue = formatMargin(entry.value)
          } else {
            displayValue = formatValue(entry.value)
            // Use the actual color based on whether it's forecast or actual
            if (entry.dataKey === 'turnover') {
              color = getTurnoverColor(dataPoint)
            } else if (entry.dataKey === 'ebitda') {
              color = getEbitdaColor(dataPoint)
            }
          }

          return (
            <div key={entry.dataKey} className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
              <div className="gba:w-3 gba:h-3 gba:rounded-full" style={{ backgroundColor: color }} />
              <span className="gba:font-medium gba:text-sm">{entryLabel}:</span>
              <span className="gba:font-semibold gba:text-sm">{displayValue}</span>
            </div>
          )
        })}
      </div>
    )
  }
  return null
}

/**
 * Custom legend component for Revenue Forecast Chart
 */
const RevenueForecastLegend: React.FC<{
  payload?: any[]
  chartConfig: any
  hasForecastData: boolean
}> = ({ payload, chartConfig, hasForecastData }) => {
  if (!payload) return null

  return (
    <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-center gba:gap-4 gba:mt-4">
      {payload.map((entry: any) => {
        // Get user-friendly label from chartConfig
        const dataKey = entry.dataKey || entry.value
        const label = chartConfig[dataKey as keyof typeof chartConfig]?.label || entry.value

        return (
          <div key={dataKey} className="gba:flex gba:items-center gba:gap-2">
            <div className="gba:w-3 gba:h-3 gba:rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="gba:text-sm gba:text-muted-foreground">{label}</span>
          </div>
        )
      })}
      {/* Forecast indicator */}
      {hasForecastData && (
        <div className="gba:flex gba:items-center gba:gap-2 gba:ml-4 gba:border-l gba:border-border gba:pl-4">
          <div className="gba:w-3 gba:h-3 gba:rounded-full gba:opacity-50 gba:bg-primary" />
          <span className="gba:text-xs gba:text-muted-foreground gba:italic">
            {getTranslationFromI18nKeyAndLabel(
              'crm.investments.analytics.revenueForecast.legend.dimmerColorsForecast',
              'Dimmer colors = Forecast'
            )}
          </span>
        </div>
      )}
    </div>
  )
}

export const RevenueForecastChart: React.FC<RevenueForecastChartProps> = ({
  investment,
  equityData,
  accessToken,
  hideUpdateButton = false
}) => {
  // Combine actual and forecast data with chronological sorting
  const chartData = useMemo(() => {
    const actualData = generateActualData(equityData)
    const forecastData = generateForecastData(equityData)

    // Combine and sort chronologically by year
    const combinedData = [...actualData, ...forecastData]
    combinedData.sort((a, b) => {
      const yearA = Number.parseInt(a.year.replace('F', ''))
      const yearB = Number.parseInt(b.year.replace('F', ''))
      return yearA - yearB
    })

    return combinedData
  }, [equityData])

  // Check if we have any forecast data
  const hasForecastData = chartData.some(d => !d.isActual)

  const chartConfig = useMemo(
    () => ({
      turnover: {
        label: getTranslationFromI18nKeyAndLabel('crm.investments.analytics.revenueForecast.turnover', 'Turnover'),
        theme: {
          light: 'hsl(221.2 83.2% 53.3%)',
          dark: 'hsl(217.2 91.2% 59.8%)'
        }
      },
      ebitda: {
        label: getTranslationFromI18nKeyAndLabel('crm.investments.analytics.revenueForecast.ebitda', 'EBITDA'),
        theme: {
          light: 'hsl(142.1 76.2% 36.3%)',
          dark: 'hsl(142.1 70.6% 45.3%)'
        }
      },
      ebitdaMargin: {
        label: getTranslationFromI18nKeyAndLabel(
          'crm.investments.analytics.revenueForecast.ebitdaMargin',
          'EBITDA Margin'
        ),
        theme: {
          light: 'hsl(262.1 83.3% 57.8%)',
          dark: 'hsl(263.4 70% 50.4%)'
        }
      }
    }),
    []
  )

  // Color functions to distinguish actual from forecast
  const getTurnoverColor = (data: YearlyForecastData) => {
    return data.isActual
      ? 'hsl(221.2 83.2% 53.3%)' // Actual: Primary blue
      : 'hsl(221.2 83.2% 73.3%)' // Forecast: Lighter blue
  }

  const getEbitdaColor = (data: YearlyForecastData) => {
    return data.isActual
      ? 'hsl(142.1 76.2% 36.3%)' // Actual: Success green
      : 'hsl(142.1 76.2% 56.3%)' // Forecast: Lighter green
  }

  // Memoized tooltip renderer to avoid inline arrow function
  const renderTooltip = useCallback(
    (props: any) => (
      <RevenueForecastTooltip
        {...props}
        chartConfig={chartConfig}
        getTurnoverColor={getTurnoverColor}
        getEbitdaColor={getEbitdaColor}
      />
    ),
    [chartConfig]
  )

  // Memoized legend renderer to avoid inline arrow function
  const renderLegend = useCallback(
    (props: any) => <RevenueForecastLegend {...props} chartConfig={chartConfig} hasForecastData={hasForecastData} />,
    [chartConfig, hasForecastData]
  )

  // Find the index where forecast starts (for reference line)
  const forecastStartIndex = chartData.findIndex(d => !d.isActual)

  return (
    <Card data-testid="revenue-forecast-chart" className="gba:border gba:shadow-sm">
      <CardHeader>
        <div className="gba:flex gba:justify-between gba:items-start">
          <div>
            <CardTitle className="gba:text-lg gba:font-semibold">
              {getTranslationFromI18nKeyAndLabel(
                'crm.investments.analytics.revenueForecast.title',
                'Revenue | PPM | PPM Margin ACT & FC'
              )}
            </CardTitle>
            <CardDescription>
              {getTranslationFromI18nKeyAndLabel(
                'crm.investments.analytics.revenueForecast.description',
                'Last 5 years of actual performance and future forecasts - rolling window that updates as time progresses'
              )}
            </CardDescription>
          </div>

          {/* Update Forecasts Button - conditionally rendered */}
          {!hideUpdateButton && (
            <AppAction
              contextsArray={[FlowContextName.investmentPpmForecastUpdate]}
              externalContextData={{
                investmentId: investment?.id,
                scope: 'ppmforecast'
              }}
              accessToken={accessToken}
              emptyStateBehavior="hide"
              data-testid="revenue-forecast-manage-action"
            >
              <Button
                size="sm"
                variant="default"
                type="button"
                data-testid="revenue-forecast-update-button"
                style={{ gap: 'var(--nw-spacing-xs)' }}
              >
                <PencilIcon size={16} />
                {getTranslationFromI18nKeyAndLabel(
                  'crm.investments.revenueForecast.updateForecasts',
                  'Update Forecasts'
                )}
              </Button>
            </AppAction>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="gba:h-[400px] gba:w-full"
          data-testid="revenue-forecast-container"
        >
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />

            <XAxis dataKey="year" tick={{ fontSize: 12 }} tickLine={false} axisLine={{ strokeWidth: 1 }} />

            {/* Left Y-Axis for Revenue/EBITDA */}
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ strokeWidth: 1 }}
              tickFormatter={formatValue}
              label={{
                value: getTranslationFromI18nKeyAndLabel('crm.investments.analytics.revenueForecast.amount', 'Amount'),
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 12, fill: 'var(--nw-color-text-muted)', textAnchor: 'middle' }
              }}
            />

            {/* Right Y-Axis for EBITDA Margin % */}
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ strokeWidth: 1 }}
              tickFormatter={formatMargin}
              label={{
                value: getTranslationFromI18nKeyAndLabel(
                  'crm.investments.analytics.revenueForecast.margin',
                  'EBITDA Margin (%)'
                ),
                angle: 90,
                position: 'insideRight',
                style: { fontSize: 12, fill: 'var(--nw-color-text-muted)', textAnchor: 'middle' }
              }}
            />

            <ChartTooltip content={renderTooltip} />

            <ChartLegend content={renderLegend} />

            {/* Vertical line separating actual from forecast */}
            {forecastStartIndex > 0 && (
              <ReferenceLine
                x={chartData[forecastStartIndex - 1].year}
                stroke="var(--nw-color-border)"
                strokeDasharray="5 5"
                strokeWidth={2}
              />
            )}

            {/* Turnover Bars */}
            <Bar
              yAxisId="left"
              dataKey="turnover"
              name="turnover"
              fill="var(--color-turnover)"
              radius={[4, 4, 0, 0]}
              maxBarSize={50}
            >
              {chartData.map(entry => (
                <Cell key={`cell-turnover-${entry.year}`} fill={getTurnoverColor(entry)} />
              ))}
            </Bar>

            {/* EBITDA Bars */}
            <Bar
              yAxisId="left"
              dataKey="ebitda"
              name="ebitda"
              fill="var(--color-ebitda)"
              radius={[4, 4, 0, 0]}
              maxBarSize={50}
            >
              {chartData.map(entry => (
                <Cell key={`cell-ebitda-${entry.year}`} fill={getEbitdaColor(entry)} />
              ))}
            </Bar>

            {/* EBITDA Margin Line */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="ebitdaMargin"
              name="ebitdaMargin"
              stroke="var(--color-ebitdaMargin)"
              strokeWidth={2}
              dot={{ fill: 'var(--color-ebitdaMargin)', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default RevenueForecastChart

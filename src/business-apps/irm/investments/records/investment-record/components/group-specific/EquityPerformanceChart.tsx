import React, { useState, useMemo } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  ToggleGroup,
  ToggleGroupItem,
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent
} from '@newwork/nw-design-system'
import { ComposedChart, Bar, XAxis, YAxis } from 'recharts'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface EquityPerformanceChartProps extends BusinessAppContextProps {
  equityData: any
}

interface YearlyPerformanceData {
  year: string
  actual: number
  planned: number
}

type MetricType = 'turnover' | 'ebitda'

/**
 * Parse additional properties from string or return as object
 */
const parseAdditionalProperties = (additionalProps: any): any => {
  if (typeof additionalProps === 'string') {
    try {
      return JSON.parse(additionalProps)
    } catch {
      return {}
    }
  }
  return additionalProps || {}
}

/**
 * Group reports by year and keep only the latest report for each year
 */
const groupReportsByYear = (reports: any[]): Record<string, any> => {
  const reportsByYear: Record<string, any> = {}

  for (const report of reports) {
    if (report.date) {
      const reportDate = new Date(report.date)
      const reportYear = reportDate.getFullYear().toString()

      // Keep only the latest report for each year
      if (!reportsByYear[reportYear] || new Date(report.date) > new Date(reportsByYear[reportYear].date)) {
        reportsByYear[reportYear] = report
      }
    }
  }

  return reportsByYear
}

/**
 * Helper: Safely extract numeric value from potentially null/undefined
 */
const safeNumericValue = (value: any): number => {
  if (value === null || value === undefined) return 0
  return typeof value === 'number' ? value : 0
}

/**
 * Helper: Get value from report based on metric type
 */
const getReportValue = (report: any, metricType: MetricType): number => {
  const value = metricType === 'turnover' ? report.turnoverAmount : report.ebitdaAmount
  return safeNumericValue(value)
}

/**
 * Get actual value for a specific year
 */
const getActualValue = (
  year: number,
  currentYear: number,
  currentYearValue: number | null | undefined,
  reportsByYear: Record<string, any>,
  metricType: MetricType
): number => {
  const yearStr = year.toString()
  const isCurrentYear = year === currentYear

  if (isCurrentYear) {
    // Current year: use value from main equityInvestment table
    return safeNumericValue(currentYearValue)
  }

  // Previous years: use value from latest report for that year
  const latestReport = reportsByYear[yearStr]
  if (!latestReport) return 0

  return getReportValue(latestReport, metricType)
}

/**
 * Get planned value for a specific year from forecasts
 */
const getPlannedValue = (yearStr: string, forecasts: any, metricType: MetricType): number => {
  const forecastData = forecasts[yearStr] || {}
  return metricType === 'turnover' ? forecastData.turnover || 0 : forecastData.ebitda || 0
}

/**
 * Generate chart data from equity investment reports and PAST/CURRENT forecasts
 * Shows actual values from reports and planned/forecast values for current and previous years only
 *
 * Data Sources:
 * - Actual - Current Year: From main equityInvestment table
 * - Actual - Previous Years: From equityInvestmentReport - latest report per year
 * - Planned - Current & Previous Years: From additionalProperties.forecasts (filtered for year <= currentYear)
 */
const generateChartDataFromReports = (equityData: any, metricType: MetricType): YearlyPerformanceData[] => {
  const currentYear = new Date().getFullYear()

  // Get equity investment base data (current year values)
  const equityInvestment = Array.isArray(equityData?.equityInvestment)
    ? equityData.equityInvestment[0]
    : equityData?.equityInvestment

  const currentYearValue = metricType === 'turnover' ? equityInvestment?.turnoverAmount : equityInvestment?.ebitdaAmount

  // Get reports from equity investment data (historical values)
  const reports = equityInvestment?.equityInvestmentReport || []

  // Get forecast/planned data from additionalProperties
  const additionalProps = parseAdditionalProperties(equityInvestment?.additionalProperties)
  const forecasts = additionalProps?.forecasts || {}

  // 5-year rolling window: dynamically calculated based on current year
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i)

  // Group reports by year and find the latest report for each year
  const reportsByYear = groupReportsByYear(reports)

  // Generate data for each year
  return years.map(year => {
    const yearStr = year.toString()
    const actualValue = getActualValue(year, currentYear, currentYearValue, reportsByYear, metricType)
    const plannedValue = getPlannedValue(yearStr, forecasts, metricType)

    return {
      year: yearStr,
      actual: actualValue,
      planned: plannedValue
    }
  })
}

/**
 * Format values for display in tooltip (using exact database values)
 */
const formatChartValue = (value: number): string => {
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

/**
 * Custom tooltip component for Equity Performance Chart
 */
const EquityPerformanceTooltip: React.FC<{
  active?: boolean
  payload?: any[]
  label?: string
}> = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div
        className="gba:bg-white gba:p-3 gba:border gba:border-border gba:rounded-lg gba:shadow-lg"
        data-testid="performance-chart-tooltip"
      >
        <div className="gba:mb-2 gba:font-medium gba:text-foreground">{label}</div>
        {payload.map((entry: any) => {
          const isActual = entry.dataKey === 'actual'
          const labelText = isActual
            ? getTranslationFromI18nKeyAndLabel('crm.investments.analytics.chart.actual', 'Actual')
            : getTranslationFromI18nKeyAndLabel('crm.investments.analytics.chart.planned', 'Planned')

          return (
            <div key={entry.dataKey} className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
              <div className="gba:w-3 gba:h-3 gba:rounded-full" style={{ backgroundColor: entry.fill }} />
              <span className="gba:font-medium gba:text-sm">{labelText}:</span>
              <span className="gba:font-semibold gba:text-sm">{formatChartValue(entry.value)}</span>
            </div>
          )
        })}
      </div>
    )
  }
  return null
}

export const EquityPerformanceChart: React.FC<EquityPerformanceChartProps> = ({ equityData }) => {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('turnover')

  // Generate chart data from real reports and past/current forecasts from additionalProperties
  const chartData = useMemo(() => {
    return generateChartDataFromReports(equityData, selectedMetric)
  }, [equityData, selectedMetric])

  const metricLabel =
    selectedMetric === 'turnover'
      ? getTranslationFromI18nKeyAndLabel('crm.investments.analytics.chart.turnover', 'Turnover')
      : getTranslationFromI18nKeyAndLabel('crm.investments.analytics.chart.ebitda', 'EBITDA')

  return (
    <Card data-testid="equity-performance-chart" className="gba:border gba:shadow-sm">
      <CardHeader>
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
          <div className="gba:flex-1">
            <CardTitle className="gba:text-lg gba:font-semibold gba:mb-2">
              {getTranslationFromI18nKeyAndLabel('crm.investments.analytics.chart.title', 'Plan vs. Actual PPM')}
            </CardTitle>
            <CardDescription>
              {getTranslationFromI18nKeyAndLabel(
                'crm.investments.analytics.chart.description',
                'Last 5 years comparing actual vs. planned performance - rolling window that updates as time progresses'
              )}
            </CardDescription>
          </div>

          {/* PPM Selection Toggle */}
          <div className="gba:flex gba:flex-col gba:items-end gba:gap-2">
            <div className="gba:text-xs gba:font-medium gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('crm.investments.analytics.chart.ppmSelection', 'PPM Selection')}
            </div>
            <ToggleGroup
              type="single"
              value={selectedMetric}
              onValueChange={value => {
                if (value) setSelectedMetric(value as MetricType)
              }}
              data-testid="ppm-selection-toggle"
              className="gba:border gba:border-border gba:rounded-md"
            >
              <ToggleGroupItem
                value="turnover"
                aria-label="Turnover"
                data-testid="ppm-turnover-toggle"
                className="gba:px-4"
              >
                {getTranslationFromI18nKeyAndLabel('crm.investments.analytics.chart.turnover', 'Turnover')}
              </ToggleGroupItem>
              <ToggleGroupItem value="ebitda" aria-label="EBITDA" data-testid="ppm-ebitda-toggle" className="gba:px-4">
                {getTranslationFromI18nKeyAndLabel('crm.investments.analytics.chart.ebitda', 'EBITDA')}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ChartContainer
          config={useMemo(
            () => ({
              actual: {
                label: getTranslationFromI18nKeyAndLabel('crm.investments.analytics.chart.actual', 'Actual'),
                theme: {
                  light: 'hsl(221.2 83.2% 53.3%)',
                  dark: 'hsl(217.2 91.2% 59.8%)'
                }
              },
              planned: {
                label: getTranslationFromI18nKeyAndLabel('crm.investments.analytics.chart.planned', 'Planned'),
                theme: {
                  light: 'hsl(142.1 76.2% 36.3%)',
                  dark: 'hsl(142.1 70.6% 45.3%)'
                }
              }
            }),
            []
          )}
          className="gba:h-[400px] gba:w-full"
          data-testid="performance-chart-container"
        >
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <XAxis
              dataKey="year"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ strokeWidth: 1 }}
              label={{
                value: getTranslationFromI18nKeyAndLabel('crm.investments.analytics.chart.year', 'Year'),
                position: 'insideBottom',
                offset: -5,
                style: { fontSize: 12, fill: 'var(--nw-color-text-muted)' }
              }}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ strokeWidth: 1 }}
              tickFormatter={value => value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              label={{
                value: metricLabel,
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 12, fill: 'var(--nw-color-text-muted)', textAnchor: 'middle' }
              }}
            />
            <ChartTooltip content={EquityPerformanceTooltip} />
            <ChartLegend content={<ChartLegendContent />} />

            {/* Actual Values Bar */}
            <Bar dataKey="actual" name="actual" fill="var(--color-actual)" radius={[4, 4, 0, 0]} maxBarSize={60} />

            {/* Planned/Target Values Bar */}
            <Bar dataKey="planned" name="planned" fill="var(--color-planned)" radius={[4, 4, 0, 0]} maxBarSize={60} />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default EquityPerformanceChart

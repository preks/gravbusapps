import React, { useMemo, useState, useCallback } from 'react'
import { createChartTooltipFormatter } from '../../shared/lifecycleChartUtils'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
  IconAvatar,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  Spinner
} from '@newwork/nw-design-system'
import { AreaChart, Area, XAxis, YAxis } from 'recharts'
import { ChartLineIcon, CalendarIcon, EyeIcon } from '@phosphor-icons/react'
// SupportedVariant type defined inline

export type TimeFilter = 'month' | 'quarter' | 'sixMonths' | 'year' | 'historical'

export interface RevenueTrendData {
  month: string
  startDate: string
  endDate: string
  pipelineRevenue: number
  wonRevenue: number
}

export interface RevenueTrendChartProps {
  data: RevenueTrendData[]
  isLoading?: boolean
  pipelines: Array<{ id: string; name: string }>
  selectedPipelineId?: string
  onPipelineChange?: (pipelineId: string | undefined) => void
  selectedTimeFilter?: TimeFilter
  onTimeFilterChange?: (timeFilter: TimeFilter) => void
  selectedCurrency?: string
  onCurrencyChange?: (currency: string) => void
  availableCurrencies?: string[]
  moduleColor?: string
  onPointClick?: (
    label: string,
    startDate: string,
    endDate: string,
    metric: 'pipelineRevenue' | 'wonRevenue',
    pipelineId?: string,
    currencyCode?: string
  ) => void
  renderDrillDown?: React.ReactNode
}

export const RevenueTrendChart: React.FC<RevenueTrendChartProps> = ({
  data,
  isLoading,
  pipelines,
  selectedPipelineId,
  onPipelineChange,
  selectedTimeFilter = 'sixMonths',
  onTimeFilterChange,
  selectedCurrency = 'EUR',
  onCurrencyChange,
  availableCurrencies = ['EUR', 'USD'],
  moduleColor = 'default',
  onPointClick,
  renderDrillDown
}) => {
  const [visibleLines, setVisibleLines] = useState({
    pipelineRevenue: true,
    wonRevenue: true
  })

  const chartConfig = useMemo(
    () => ({
      pipelineRevenue: { label: 'Pipeline Revenue' },
      wonRevenue: { label: 'Won Revenue' }
    }),
    []
  )

  const formatCurrencyFull = useCallback(
    (value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value),
    []
  )

  const tooltipFormatter = useMemo(
    () => createChartTooltipFormatter(chartConfig, formatCurrencyFull),
    [chartConfig, formatCurrencyFull]
  )

  const timeFilterOptions = [
    { key: 'month' as TimeFilter, label: 'Last Month' },
    { key: 'quarter' as TimeFilter, label: 'Last Quarter' },
    { key: 'sixMonths' as TimeFilter, label: 'Last 6 Months' },
    { key: 'year' as TimeFilter, label: 'Last Year' },
    { key: 'historical' as TimeFilter, label: 'Historical' }
  ]

  const lineOptions = [
    { key: 'pipelineRevenue' as keyof typeof visibleLines, label: 'Pipeline Revenue' },
    { key: 'wonRevenue' as keyof typeof visibleLines, label: 'Won Revenue' }
  ]

  if (isLoading) {
    return (
      <Card data-testid="revenue-trend-chart-loading">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={ChartLineIcon} variant={moduleColor as any} size="md" decorative />
            Revenue Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:items-center gba:justify-center gba:h-[400px]">
            <Spinner size="lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const toggleLineVisibility = (lineKey: keyof typeof visibleLines) => {
    setVisibleLines(prev => ({
      ...prev,
      [lineKey]: !prev[lineKey]
    }))
  }

  const handlePipelineChange = (value: string) => {
    const pipelineId = value === 'all' ? undefined : value
    onPipelineChange?.(pipelineId)
  }

  const handleTimeFilterChange = (timeFilter: TimeFilter) => {
    onTimeFilterChange?.(timeFilter)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: selectedCurrency,
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value)
  }

  const formatXAxisLabel = (value: string) => {
    const date = new Date(value)

    if (selectedTimeFilter === 'historical') {
      return date.getFullYear().toString() // "2024"
    }

    if (selectedTimeFilter === 'month') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) // "Nov 1"
    }

    // For quarter, sixMonths, and year: show month + year
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) // "Nov 2025"
  }

  const currentFilterLabel =
    timeFilterOptions.find(option => option.key === selectedTimeFilter)?.label || 'Last 6 Months'

  return (
    <>
      <Card data-testid="revenue-trend-chart">
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <IconAvatar icon={ChartLineIcon} variant={moduleColor as any} size="md" decorative />
              Revenue Trends ({currentFilterLabel})
              {selectedPipelineId && (
                <span className="gba:text-sm gba:font-normal gba:text-gray-500">
                  - {pipelines.find(p => p.id === selectedPipelineId)?.name || 'Selected Pipeline'}
                </span>
              )}
            </CardTitle>
            <div className="gba:flex gba:items-center gba:gap-4 gba:ml-auto">
              {/* Time Filters */}
              <div className="gba:flex gba:items-center gba:gap-2">
                <CalendarIcon size={16} className="gba:text-gray-500" />
                <div className="gba:flex gba:gap-1" data-testid="revenue-time-filters">
                  {timeFilterOptions.map(option => (
                    <Button
                      key={option.key}
                      variant={selectedTimeFilter === option.key ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleTimeFilterChange(option.key)}
                      data-testid={`revenue-filter-${option.key}`}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Pipeline Filter */}
              <div className="gba:min-w-48">
                <Select value={selectedPipelineId || 'all'} onValueChange={handlePipelineChange}>
                  <SelectTrigger data-testid="revenue-pipeline-selector">
                    <SelectValue placeholder="Select pipeline" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Pipelines</SelectItem>
                    {pipelines.map(pipeline => (
                      <SelectItem key={pipeline.id} value={pipeline.id}>
                        {pipeline.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Currency Filter */}
              {availableCurrencies && availableCurrencies.length > 1 && onCurrencyChange && (
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Label className="gba:text-sm gba:font-medium gba:whitespace-nowrap">Currency</Label>
                  <Select value={selectedCurrency} onValueChange={onCurrencyChange}>
                    <SelectTrigger data-testid="revenue-currency-selector" className="gba:w-32">
                      <SelectValue placeholder="Select currency" />
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
              )}
            </div>
          </div>
          <div className="gba:mt-4 gba:border-t gba:pt-4">
            <div className="gba:flex gba:items-center gba:gap-6">
              <div className="gba:flex gba:items-center gba:gap-2">
                <EyeIcon size={16} className="gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-700">Show Data:</span>
              </div>
              <div className="gba:flex gba:flex-wrap gba:gap-4" data-testid="revenue-line-filters">
                {lineOptions.map(line => (
                  <label
                    key={line.key}
                    className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer"
                    data-testid={`revenue-line-filter-${line.key}`}
                  >
                    <Checkbox checked={visibleLines[line.key]} onCheckedChange={() => toggleLineVisibility(line.key)} />
                    <div
                      className="gba:w-3 gba:h-3 gba:rounded"
                      style={{ backgroundColor: `var(--color-${line.key})` }}
                    />
                    <span className="gba:text-sm gba:text-gray-700">{line.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="gba:text-center gba:p-8" data-testid="revenue-trend-chart-empty-state">
              <ChartLineIcon className="gba:mx-auto gba:h-12 gba:w-12 gba:text-gray-400" />
              <h3 className="gba:mt-2 gba:text-sm gba:font-medium gba:text-gray-900">No data available</h3>
              <p className="gba:mt-1 gba:text-sm gba:text-gray-500">
                No revenue data found for the selected time period and pipeline.
              </p>
            </div>
          ) : (
            <ChartContainer
              config={chartConfig}
              className={`gba:h-[400px] gba:w-full gba:aspect-auto gba:[&_.recharts-tooltip-cursor]:hidden${onPointClick ? ' gba:cursor-pointer' : ''}`}
            >
              <AreaChart
                data={data}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                onClick={clickData => {
                  if (!onPointClick || clickData?.activeTooltipIndex == null) return
                  const point = data[clickData.activeTooltipIndex as number]
                  if (!point) return
                  const metric = visibleLines.pipelineRevenue ? 'pipelineRevenue' : 'wonRevenue'
                  onPointClick(
                    point.month,
                    point.startDate,
                    point.endDate,
                    metric,
                    selectedPipelineId,
                    selectedCurrency
                  )
                }}
              >
                <XAxis dataKey="month" tickLine={false} tickFormatter={formatXAxisLabel} />
                <YAxis tickFormatter={formatCurrency} tickLine={false} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent labelKey="month" formatter={tooltipFormatter} />}
                />
                <ChartLegend content={<ChartLegendContent />} />
                {visibleLines.pipelineRevenue && (
                  <Area
                    type="monotone"
                    dataKey="pipelineRevenue"
                    name="pipelineRevenue"
                    stroke={`var(--color-pipelineRevenue)`}
                    fill={`var(--color-pipelineRevenue)`}
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                )}
                {visibleLines.wonRevenue && (
                  <Area
                    type="monotone"
                    dataKey="wonRevenue"
                    name="wonRevenue"
                    stroke={`var(--color-wonRevenue)`}
                    fill={`var(--color-wonRevenue)`}
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                )}
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
      {renderDrillDown}
    </>
  )
}

export default RevenueTrendChart

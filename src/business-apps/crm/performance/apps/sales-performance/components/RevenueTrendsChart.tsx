import React, { useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  Spinner,
  Alert,
  AlertDescription,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
  IconAvatar
} from '@newwork/nw-design-system'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ChartLineIcon, CalendarIcon, EyeIcon } from '@phosphor-icons/react'
import { type RevenueTrendData, type TimeFilter } from '../types'
import { type Pipeline } from '../hooks'

interface RevenueTrendsChartProps {
  revenueTrends: RevenueTrendData[]
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  timeFilter: TimeFilter
  onTimeFilterChange: (filter: TimeFilter) => void
  pipelines: Pipeline[]
  selectedPipelineId?: string
  onPipelineChange: (pipelineId: string | undefined) => void
  pipelinesLoading?: boolean
}

const DATA_TEST_ID_PREFIX = 'revenue-trends-chart'

const TIME_FILTER_OPTIONS: Array<{ value: TimeFilter; label: string }> = [
  { value: 'month', label: 'Last Month' },
  { value: 'quarter', label: 'Last Quarter' },
  { value: 'sixMonths', label: 'Last 6 Months' },
  { value: 'year', label: 'Last Year' },
  { value: 'historical', label: 'Historical' }
]

// Colors for the chart
const CHART_COLORS = {
  wonRevenue: '#22c55e', // Green for won revenue
  pipelineRevenue: '#3b82f6' // Blue for pipeline revenue
}

/**
 * Revenue Trends Chart component showing pipeline and won revenue over time
 * Includes pipeline selector and data visibility toggles
 */
export const RevenueTrendsChart: React.FC<RevenueTrendsChartProps> = ({
  revenueTrends,
  isLoading = false,
  error = null,
  onRetry,
  timeFilter,
  onTimeFilterChange,
  pipelines,
  selectedPipelineId,
  onPipelineChange,
  pipelinesLoading = false
}) => {
  const [visibleLines, setVisibleLines] = useState({
    pipelineRevenue: true,
    wonRevenue: true
  })

  // Chart configuration for the design system
  const chartConfig = useMemo(
    () => ({
      wonRevenue: {
        label: 'Won Revenue',
        color: CHART_COLORS.wonRevenue
      },
      pipelineRevenue: {
        label: 'Pipeline Revenue',
        color: CHART_COLORS.pipelineRevenue
      }
    }),
    []
  )

  const lineOptions = [
    {
      key: 'pipelineRevenue' as keyof typeof visibleLines,
      label: 'Pipeline Revenue',
      color: CHART_COLORS.pipelineRevenue
    },
    { key: 'wonRevenue' as keyof typeof visibleLines, label: 'Won Revenue', color: CHART_COLORS.wonRevenue }
  ]

  const toggleLineVisibility = (lineKey: keyof typeof visibleLines) => {
    setVisibleLines(prev => ({
      ...prev,
      [lineKey]: !prev[lineKey]
    }))
  }

  const handlePipelineChange = (value: string) => {
    const pipelineId = value === 'all' ? undefined : value
    onPipelineChange(pipelineId)
  }

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value)
  }

  const currentFilterLabel = TIME_FILTER_OPTIONS.find(option => option.value === timeFilter)?.label || 'Last 6 Months'

  if (isLoading) {
    return (
      <Card data-testid={`${DATA_TEST_ID_PREFIX}-loading`}>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={ChartLineIcon} variant="default" size="md" decorative />
            Revenue Trends
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:flex gba:items-center gba:justify-center gba:h-[400px]">
          <Spinner size="lg" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card data-testid={`${DATA_TEST_ID_PREFIX}-error`}>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={ChartLineIcon} variant="default" size="md" decorative />
            Revenue Trends
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-[400px] gba:gap-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          {onRetry && (
            <Button size="sm" onClick={onRetry}>
              Retry
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid={DATA_TEST_ID_PREFIX}>
      <CardHeader>
        <div className="gba:flex gba:flex-col gba:gap-4">
          {/* Title and filters row */}
          <div className="gba:flex gba:items-center gba:justify-between gba:flex-wrap gba:gap-4">
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <IconAvatar icon={ChartLineIcon} variant="default" size="md" decorative />
              Revenue Trends ({currentFilterLabel})
              {selectedPipelineId && (
                <span className="gba:text-sm gba:font-normal gba:text-muted-foreground">
                  - {pipelines.find(p => p.id === selectedPipelineId)?.name || 'Selected Pipeline'}
                </span>
              )}
            </CardTitle>
            <div className="gba:flex gba:items-center gba:gap-4 gba:flex-wrap">
              {/* Pipeline selector */}
              <div className="gba:min-w-[180px]">
                <Select
                  value={selectedPipelineId || 'all'}
                  onValueChange={handlePipelineChange}
                  disabled={pipelinesLoading}
                >
                  <SelectTrigger data-testid={`${DATA_TEST_ID_PREFIX}-pipeline-selector`}>
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
              {/* Time filter buttons */}
              <div className="gba:flex gba:items-center gba:gap-2">
                <CalendarIcon size={16} className="gba:text-muted-foreground" />
                <div className="gba:flex gba:gap-1" data-testid={`${DATA_TEST_ID_PREFIX}-time-filters`}>
                  {TIME_FILTER_OPTIONS.map(option => (
                    <Button
                      key={option.value}
                      variant={timeFilter === option.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onTimeFilterChange(option.value)}
                      data-testid={`${DATA_TEST_ID_PREFIX}-filter-${option.value}`}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Data visibility toggles */}
          <div className="gba:border-t gba:pt-4">
            <div className="gba:flex gba:items-center gba:gap-6">
              <div className="gba:flex gba:items-center gba:gap-2">
                <EyeIcon size={16} className="gba:text-muted-foreground" />
                <span className="gba:text-sm gba:font-medium">Show Data:</span>
              </div>
              <div className="gba:flex gba:flex-wrap gba:gap-4" data-testid={`${DATA_TEST_ID_PREFIX}-line-filters`}>
                {lineOptions.map(line => (
                  <label
                    key={line.key}
                    className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer"
                    data-testid={`${DATA_TEST_ID_PREFIX}-line-filter-${line.key}`}
                  >
                    <Checkbox checked={visibleLines[line.key]} onCheckedChange={() => toggleLineVisibility(line.key)} />
                    <div className="gba:w-3 gba:h-3 gba:rounded" style={{ backgroundColor: line.color }} />
                    <span className="gba:text-sm">{line.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {revenueTrends.length === 0 ? (
          <div
            className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-[400px] gba:text-muted-foreground"
            data-testid={`${DATA_TEST_ID_PREFIX}-empty-state`}
          >
            <ChartLineIcon className="gba:h-12 gba:w-12 gba:mb-4 gba:text-muted-foreground" />
            <h3 className="gba:text-sm gba:font-medium">No data available</h3>
            <p className="gba:text-sm gba:mt-1">No revenue data found for the selected time period and pipeline.</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="gba:h-[400px] gba:w-full">
            <AreaChart data={revenueTrends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="wonRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.wonRevenue} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={CHART_COLORS.wonRevenue} stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="pipelineRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.pipelineRevenue} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={CHART_COLORS.pipelineRevenue} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                tickFormatter={formatCurrency}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent labelKey="month" valueFormatter={value => formatCurrency(value as number)} />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              {visibleLines.pipelineRevenue && (
                <Area
                  type="monotone"
                  dataKey="pipelineRevenue"
                  name="pipelineRevenue"
                  stroke={CHART_COLORS.pipelineRevenue}
                  fillOpacity={1}
                  fill="url(#pipelineRevenueGradient)"
                  strokeWidth={2}
                />
              )}
              {visibleLines.wonRevenue && (
                <Area
                  type="monotone"
                  dataKey="wonRevenue"
                  name="wonRevenue"
                  stroke={CHART_COLORS.wonRevenue}
                  fillOpacity={1}
                  fill="url(#wonRevenueGradient)"
                  strokeWidth={2}
                />
              )}
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

export default RevenueTrendsChart

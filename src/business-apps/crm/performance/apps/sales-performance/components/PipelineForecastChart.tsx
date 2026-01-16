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
import { TrendUpIcon, EyeIcon } from '@phosphor-icons/react'
import { type PipelineForecastData } from '../types'
import { type Pipeline } from '../hooks'

interface PipelineForecastChartProps {
  forecastData: PipelineForecastData[]
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  pipelines: Pipeline[]
  selectedPipelineId?: string
  onPipelineChange: (pipelineId: string | undefined) => void
  pipelinesLoading?: boolean
}

const DATA_TEST_ID_PREFIX = 'pipeline-forecast-chart'

// Colors for the chart - using a distinctive color for forecast
const CHART_COLORS = {
  forecastedRevenue: '#06b6d4' // Cyan for forecasted revenue (OPEN opportunities)
}

/**
 * Pipeline Forecast Chart component showing forecasted revenue for the next 3 months
 * Only includes OPEN opportunities (not WON - those go to Revenue Trends)
 * Forecasted revenue = sum of estimatedAmount for OPEN opportunities with closeDate in each month
 */
export const PipelineForecastChart: React.FC<PipelineForecastChartProps> = ({
  forecastData,
  isLoading = false,
  error = null,
  onRetry,
  pipelines,
  selectedPipelineId,
  onPipelineChange,
  pipelinesLoading = false
}) => {
  const [visibleLines, setVisibleLines] = useState({
    forecastedRevenue: true
  })

  // Chart configuration for the design system
  const chartConfig = useMemo(
    () => ({
      forecastedRevenue: {
        label: 'Forecasted Revenue',
        color: CHART_COLORS.forecastedRevenue
      }
    }),
    []
  )

  const lineOptions = [
    {
      key: 'forecastedRevenue' as keyof typeof visibleLines,
      label: 'Forecasted Revenue',
      color: CHART_COLORS.forecastedRevenue
    }
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

  // Calculate total forecasted revenue
  const totalForecast = useMemo(() => {
    return forecastData.reduce((sum, item) => sum + item.forecastedRevenue, 0)
  }, [forecastData])

  if (isLoading) {
    return (
      <Card data-testid={`${DATA_TEST_ID_PREFIX}-loading`}>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={TrendUpIcon} variant="default" size="md" decorative />
            Pipeline Forecast
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
            <IconAvatar icon={TrendUpIcon} variant="default" size="md" decorative />
            Pipeline Forecast
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
              <IconAvatar icon={TrendUpIcon} variant="default" size="md" decorative />
              Pipeline Forecast (Next 3 Months)
              {selectedPipelineId && (
                <span className="gba:text-sm gba:font-normal gba:text-muted-foreground">
                  - {pipelines.find(p => p.id === selectedPipelineId)?.name || 'Selected Pipeline'}
                </span>
              )}
              <span className="gba:text-sm gba:font-normal gba:text-success">
                Total: {formatCurrency(totalForecast)}
              </span>
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
        {forecastData.length === 0 ? (
          <div
            className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-[400px] gba:text-muted-foreground"
            data-testid={`${DATA_TEST_ID_PREFIX}-empty-state`}
          >
            <TrendUpIcon className="gba:h-12 gba:w-12 gba:mb-4 gba:text-muted-foreground" />
            <h3 className="gba:text-sm gba:font-medium">No forecast data available</h3>
            <p className="gba:text-sm gba:mt-1">No open opportunities with close dates in the next 3 months.</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="gba:h-[400px] gba:w-full">
            <AreaChart data={forecastData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="forecastedRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.forecastedRevenue} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={CHART_COLORS.forecastedRevenue} stopOpacity={0.1} />
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
              {visibleLines.forecastedRevenue && (
                <Area
                  type="monotone"
                  dataKey="forecastedRevenue"
                  name="forecastedRevenue"
                  stroke={CHART_COLORS.forecastedRevenue}
                  fillOpacity={1}
                  fill="url(#forecastedRevenueGradient)"
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

export default PipelineForecastChart

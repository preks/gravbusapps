import React, { useMemo } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  Spinner,
  Alert,
  AlertDescription,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  IconAvatar
} from '@newwork/nw-design-system'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ChartLineIcon, CalendarIcon, ArrowClockwiseIcon } from '@phosphor-icons/react'
import { type TeamComparisonData, type TeamRevenueTrendPoint, type TimeFilter } from '../types'
import { type Pipeline } from '../hooks'
import { getComparisonChartLabels, type ComparisonChartVariant } from '../utils/comparisonChartLabels'
import { ComparisonChartLegend } from './ComparisonChartLegend'

interface TeamComparisonChartProps {
  teams: TeamComparisonData[]
  revenueTrends: TeamRevenueTrendPoint[]
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  variant?: ComparisonChartVariant
  // Filter props
  timeFilter: TimeFilter
  onTimeFilterChange: (filter: TimeFilter) => void
  pipelines: Pipeline[]
  selectedPipelineId?: string
  onPipelineChange: (pipelineId: string | undefined) => void
  pipelinesLoading?: boolean
}

const DATA_TEST_ID_PREFIX = 'team-comparison-chart'

const TIME_FILTER_OPTIONS: Array<{ value: TimeFilter; label: string }> = [
  { value: 'month', label: 'Last Month' },
  { value: 'quarter', label: 'Last Quarter' },
  { value: 'sixMonths', label: 'Last 6 Months' },
  { value: 'year', label: 'Last Year' },
  { value: 'historical', label: 'Historical' }
]

/**
 * Formats currency value in compact notation
 */
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    notation: 'compact',
    maximumFractionDigits: 0
  }).format(value)
}

/**
 * Team Comparison Chart Component
 * Displays a multi-area chart comparing revenue trends across active teams
 * Includes pipeline selector and time filter controls
 */
export const TeamComparisonChart: React.FC<TeamComparisonChartProps> = ({
  teams,
  revenueTrends,
  isLoading = false,
  error = null,
  onRetry,
  timeFilter,
  onTimeFilterChange,
  pipelines,
  selectedPipelineId,
  onPipelineChange,
  pipelinesLoading = false,
  variant = 'team'
}) => {
  const labels = getComparisonChartLabels(variant)

  // Build chart config from teams
  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {}

    teams.forEach(team => {
      config[team.id] = {
        label: team.name,
        color: team.color
      }
    })

    return config
  }, [teams])

  // Generate gradient definitions for each team
  const gradientDefs = useMemo(() => {
    return teams.map(team => (
      <linearGradient key={`gradient-${team.id}`} id={`gradient-${team.id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor={team.color} stopOpacity={0.8} />
        <stop offset="95%" stopColor={team.color} stopOpacity={0.1} />
      </linearGradient>
    ))
  }, [teams])

  const handlePipelineChange = (value: string) => {
    const pipelineId = value === 'all' ? undefined : value
    onPipelineChange(pipelineId)
  }

  const currentFilterLabel = TIME_FILTER_OPTIONS.find(option => option.value === timeFilter)?.label || 'Last 6 Months'

  // Loading state
  if (isLoading) {
    return (
      <Card data-testid={DATA_TEST_ID_PREFIX}>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={ChartLineIcon} variant="info" size="md" decorative />
            {labels.comparisonTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:flex gba:items-center gba:justify-center gba:h-[400px]">
          <Spinner size="lg" />
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card data-testid={DATA_TEST_ID_PREFIX}>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={ChartLineIcon} variant="info" size="md" decorative />
            {labels.comparisonTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-[400px] gba:gap-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <ArrowClockwiseIcon className="gba:mr-2 gba:h-4 gba:w-4" />
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
              <IconAvatar icon={ChartLineIcon} variant="info" size="md" decorative />
              {labels.comparisonTitle} ({currentFilterLabel})
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
          <p className="gba:text-sm gba:text-muted-foreground">{labels.comparisonDescription}</p>
        </div>
      </CardHeader>
      <CardContent>
        {teams.length === 0 ? (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-[400px] gba:gap-2">
            <p className="gba:text-muted-foreground gba:text-center">{labels.comparisonEmptyMessage}</p>
            <p className="gba:text-sm gba:text-muted-foreground gba:text-center">{labels.comparisonEmptyHint}</p>
          </div>
        ) : (
          <>
            <ChartContainer config={chartConfig} className="gba:h-[400px] gba:w-full">
              <AreaChart data={revenueTrends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>{gradientDefs}</defs>
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
                    <ChartTooltipContent
                      className="gba:min-w-48"
                      labelKey="month"
                      valueFormatter={value => formatCurrency(value as number)}
                    />
                  }
                />
                {teams.map(team => (
                  <Area
                    key={team.id}
                    type="monotone"
                    dataKey={team.id}
                    name={team.name}
                    stroke={team.color}
                    fillOpacity={1}
                    fill={`url(#gradient-${team.id})`}
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            </ChartContainer>
            <ComparisonChartLegend
              items={teams.map(team => ({ id: team.id, name: team.name, color: team.color }))}
              dataTestId={`${DATA_TEST_ID_PREFIX}-legend`}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default TeamComparisonChart

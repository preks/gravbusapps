import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  IconAvatar,
  ChartConfig,
  ChartContainer,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { PieChart, Pie, Cell } from 'recharts'
import { HeartIcon } from '@phosphor-icons/react'

export type PipelineConfidenceMetric = 'winningChance' | 'winRate'

export interface PipelineHealthMetrics {
  healthScore: number
  totalOpportunities: number
  avgOpportunityAge: number // days
  /** Confidence indicator value in [0, 100] - either avg winning chance or realized win rate. */
  confidenceScore: number
  confidenceMetric: PipelineConfidenceMetric
  confidenceUnavailable?: boolean
}

export interface PipelineHealthOverviewProps {
  isLoading?: boolean
  error?: string | null
  data?: PipelineHealthMetrics | null
  moduleColor?: string
  pipelines?: Array<{ id: string; name: string }>
  selectedPipelineId?: string
  onPipelineChange?: (pipelineId: string | undefined) => void
}

export const PipelineHealthOverview: React.FC<PipelineHealthOverviewProps> = ({
  isLoading,
  error,
  data,
  moduleColor = 'default',
  pipelines = [],
  selectedPipelineId,
  onPipelineChange
}) => {
  const handlePipelineChange = (value: string) => {
    const pipelineId = value === 'all' ? undefined : value
    onPipelineChange?.(pipelineId)
  }
  const chartData = useMemo(() => {
    if (!data) return []
    // Pie chart data: progress and remaining portions
    return [
      {
        name: 'progress',
        value: data.healthScore,
        fill: 'var(--color-progress)'
      },
      {
        name: 'remaining',
        value: 100 - data.healthScore,
        fill: 'var(--color-background)'
      }
    ]
  }, [data])

  const chartConfig = useMemo(() => {
    if (!data) return {} as ChartConfig

    // Determine color based on health score
    let healthColor = 'var(--nw-destructive)'
    let remainingColor = 'var(--nw-destructive-secondary)'

    if (data.healthScore >= 71) {
      healthColor = 'var(--nw-success)'
      remainingColor = 'var(--nw-success-secondary)'
    } else if (data.healthScore >= 41) {
      healthColor = 'var(--nw-warning)'
      remainingColor = 'var(--nw-warning-secondary)'
    }

    return {
      background: {
        label: 'Background',
        color: remainingColor
      },
      progress: {
        label: 'Health Score',
        color: healthColor
      }
    } satisfies ChartConfig
  }, [data])

  if (isLoading) {
    return (
      <Card className="gba:h-full">
        <CardHeader className="gba:flex gba:items-center gba:gap-3">
          <IconAvatar icon={HeartIcon} variant={moduleColor as any} size="md" iconWeight="regular" decorative={true} />
          <div>
            <CardTitle>Pipeline Health Overview</CardTitle>
            <CardDescription>Overall pipeline performance</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:items-center gba:justify-center gba:h-32">
            <div className="gba:text-gray-500">Loading pipeline health...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="gba:h-full">
        <CardHeader className="gba:flex gba:items-center gba:gap-3">
          <IconAvatar icon={HeartIcon} variant={moduleColor as any} size="md" iconWeight="regular" decorative={true} />
          <div>
            <CardTitle>Pipeline Health Overview</CardTitle>
            <CardDescription>Overall pipeline performance</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="gba:text-red-500 gba:text-center gba:py-4">{error}</div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className="gba:h-full">
        <CardHeader className="gba:flex gba:items-center gba:gap-3">
          <IconAvatar icon={HeartIcon} variant={moduleColor as any} size="md" iconWeight="regular" decorative={true} />
          <div>
            <CardTitle>Pipeline Health Overview</CardTitle>
            <CardDescription>Overall pipeline performance</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="gba:text-center gba:py-4 gba:text-gray-500">No pipeline health data available</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="gba:h-full gba:flex gba:flex-col">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-3">
            <IconAvatar
              icon={HeartIcon}
              variant={moduleColor as any}
              size="md"
              iconWeight="regular"
              decorative={true}
            />
            <div>
              <CardTitle className="gba:flex gba:items-center gba:gap-2">
                Pipeline Health Overview
                {selectedPipelineId && (
                  <span className="gba:text-sm gba:font-normal gba:text-gray-500">
                    - {pipelines.find(p => p.id === selectedPipelineId)?.name || 'Selected Pipeline'}
                  </span>
                )}
              </CardTitle>
              <CardDescription>Overall pipeline performance</CardDescription>
            </div>
          </div>
          {pipelines.length > 0 && onPipelineChange && (
            <div className="gba:min-w-48">
              <Select value={selectedPipelineId || 'all'} onValueChange={handlePipelineChange}>
                <SelectTrigger data-testid="pipeline-health-pipeline-selector">
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
          )}
        </div>
      </CardHeader>
      <CardContent className="gba:flex gba:flex-1 gba:flex-col gba:gap-4">
        {/* Pie Chart Gauge */}
        <div className="gba:flex-1 gba:relative">
          <ChartContainer config={chartConfig} className="gba:w-full gba:h-40">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="100%"
                startAngle={180}
                endAngle={0}
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>

          {/* Center Label */}
          <div className="gba:absolute gba:inset-0 gba:flex gba:items-end gba:justify-center gba:pb-4">
            <div className="gba:text-center">
              <div className="gba:text-3xl gba:font-bold">{data.healthScore}%</div>
              <div className="gba:text-sm gba:text-muted-foreground">Health Score</div>
            </div>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="gba:grid gba:grid-cols-3 gba:gap-4">
          <div className="gba:text-center">
            <div className="gba:text-lg gba:font-bold gba:text-green-600">{data.totalOpportunities}</div>
            <div className="gba:text-xs gba:text-gray-600">Total Opportunities</div>
          </div>
          <div className="gba:text-center">
            <div className="gba:text-lg gba:font-bold gba:text-orange-600">{data.avgOpportunityAge}d</div>
            <div className="gba:text-xs gba:text-gray-600">Avg Age</div>
          </div>
          <div className="gba:text-center">
            <div className="gba:text-lg gba:font-bold gba:text-purple-600">
              {data.confidenceUnavailable ? 'n/a' : `${data.confidenceScore}%`}
            </div>
            <div className="gba:text-xs gba:text-gray-600">
              {data.confidenceMetric === 'winRate' ? 'Win Rate' : 'Avg Win Chance'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default PipelineHealthOverview

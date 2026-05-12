import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
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
import {
  TIME_FILTER_OPTIONS,
  formatLifecycleXAxisLabel,
  getCurrentFilterLabel,
  createChartTooltipFormatter
} from '../../shared/lifecycleChartUtils'
import type { TimeFilter } from '../../shared/lifecycleChartUtils'

// Re-export TimeFilter for backward compatibility
export type { TimeFilter } from '../../shared/lifecycleChartUtils'

export interface PipelineItem {
  id: string
  name: string
}

export interface OpportunityLifecyclePoint {
  date: string
  startDate: string
  endDate: string
  opportunitiesCreated: number
  opportunitiesWon: number
}

interface OpportunityLifecycleChartProps {
  data: OpportunityLifecyclePoint[]
  isLoading?: boolean
  selectedTimeFilter: TimeFilter
  onTimeFilterChange: (filter: TimeFilter) => void
  pipelines: PipelineItem[]
  selectedPipelineId?: string
  onPipelineChange: (pipelineId: string) => void
  moduleColor?: string
  onPointClick?: (
    date: string,
    startDate: string,
    endDate: string,
    metric: 'opportunitiesCreated' | 'opportunitiesWon',
    pipelineId?: string
  ) => void
  renderDrillDown?: React.ReactNode
}

export const OpportunityLifecycleChart: React.FC<OpportunityLifecycleChartProps> = ({
  data,
  isLoading = false,
  selectedTimeFilter,
  onTimeFilterChange,
  pipelines,
  selectedPipelineId,
  onPipelineChange,
  moduleColor = 'primary',
  onPointClick,
  renderDrillDown
}) => {
  const [visibleLines, setVisibleLines] = React.useState({ opportunitiesCreated: true, opportunitiesWon: true })

  // Chart configuration - must be called before early return
  const chartConfig = useMemo(
    () => ({
      opportunitiesCreated: { label: 'Opportunities Created' },
      opportunitiesWon: { label: 'Opportunities Won' }
    }),
    []
  )

  const tooltipFormatter = useMemo(() => createChartTooltipFormatter(chartConfig), [chartConfig])

  // Non-hook logic
  const currentFilterLabel = getCurrentFilterLabel(selectedTimeFilter)

  // Early return AFTER all hooks
  if (isLoading) {
    return (
      <Card data-testid="opportunity-lifecycle-loading">
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <IconAvatar icon={ChartLineIcon} variant={moduleColor as any} size="md" decorative />
              Opportunity Lifecycle Overview
            </CardTitle>
            <div className="gba:flex gba:items-center gba:gap-4 gba:ml-auto gba:opacity-50 gba:pointer-events-none">
              <div className="gba:flex gba:items-center gba:gap-2">
                <CalendarIcon size={16} className="gba:text-gray-500" />
                <div className="gba:flex gba:gap-1">
                  {TIME_FILTER_OPTIONS.map(option => (
                    <Button
                      key={option.key}
                      variant={selectedTimeFilter === option.key ? 'default' : 'outline'}
                      size="sm"
                      disabled
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="gba:min-w-48">
                <Select disabled>
                  <SelectTrigger>
                    <SelectValue placeholder="Select pipeline" />
                  </SelectTrigger>
                </Select>
              </div>
            </div>
          </div>
          <div className="gba:mt-4 gba:border-t gba:pt-4 gba:opacity-50">
            <div className="gba:flex gba:items-center gba:gap-6">
              <div className="gba:flex gba:items-center gba:gap-2">
                <EyeIcon size={16} className="gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-700">Show Data:</span>
              </div>
              <div className="gba:flex gba:flex-wrap gba:gap-4">
                <label className="gba:flex gba:items-center gba:gap-2">
                  <Checkbox checked disabled />
                  <div className="gba:w-3 gba:h-3 gba:rounded gba:bg-gray-300" />
                  <span className="gba:text-sm gba:text-gray-700">Opportunities Created</span>
                </label>
                <label className="gba:flex gba:items-center gba:gap-2">
                  <Checkbox checked disabled />
                  <div className="gba:w-3 gba:h-3 gba:rounded gba:bg-gray-300" />
                  <span className="gba:text-sm gba:text-gray-700">Opportunities Won</span>
                </label>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:items-center gba:justify-center gba:h-[400px]">
            <Spinner size="lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderChartContent = () => {
    if (data.length === 0) {
      return (
        <div className="gba:text-center gba:p-8" data-testid="opportunity-lifecycle-empty-state">
          <ChartLineIcon className="gba:mx-auto gba:h-12 gba:w-12 gba:text-gray-400" />
          <h3 className="gba:mt-2 gba:text-sm gba:font-medium gba:text-gray-900">No data available</h3>
          <p className="gba:mt-1 gba:text-sm gba:text-gray-500">
            No opportunity lifecycle data found for the selected pipeline and time period.
          </p>
        </div>
      )
    }

    return (
      <ChartContainer
        config={chartConfig}
        className={`gba:h-[400px] gba:w-full gba:aspect-auto${onPointClick ? ' gba:cursor-pointer' : ''}`}
        data-testid="opportunity-lifecycle-chart-container"
      >
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          onClick={clickData => {
            if (!onPointClick || clickData?.activeTooltipIndex == null) return
            const point = data[clickData.activeTooltipIndex as number]
            if (!point) return
            const metric =
              visibleLines.opportunitiesWon && !visibleLines.opportunitiesCreated
                ? 'opportunitiesWon'
                : 'opportunitiesCreated'
            const displayLabel = formatLifecycleXAxisLabel(point.date, selectedTimeFilter)
            onPointClick(displayLabel, point.startDate, point.endDate, metric, selectedPipelineId)
          }}
        >
          <XAxis
            dataKey="date"
            tickLine={false}
            tickFormatter={value => formatLifecycleXAxisLabel(value, selectedTimeFilter)}
          />
          <YAxis tickLine={false} />
          <ChartTooltip content={<ChartTooltipContent labelKey="date" formatter={tooltipFormatter} />} />
          <ChartLegend content={<ChartLegendContent />} />
          {visibleLines.opportunitiesCreated && (
            <Area
              type="monotone"
              dataKey="opportunitiesCreated"
              name="opportunitiesCreated"
              stroke={`var(--color-opportunitiesCreated)`}
              fill={`var(--color-opportunitiesCreated)`}
              fillOpacity={0.2}
              strokeWidth={2}
            />
          )}
          {visibleLines.opportunitiesWon && (
            <Area
              type="monotone"
              dataKey="opportunitiesWon"
              name="opportunitiesWon"
              stroke={`var(--color-opportunitiesWon)`}
              fill={`var(--color-opportunitiesWon)`}
              fillOpacity={0.2}
              strokeWidth={2}
            />
          )}
        </AreaChart>
      </ChartContainer>
    )
  }

  return (
    <>
      <Card data-testid="opportunity-lifecycle-chart">
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <IconAvatar icon={ChartLineIcon} variant={moduleColor as any} size="md" decorative />
              Opportunity Lifecycle Overview ({currentFilterLabel})
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
                <div className="gba:flex gba:gap-1" data-testid="opportunity-time-filters">
                  {TIME_FILTER_OPTIONS.map(option => (
                    <Button
                      key={option.key}
                      variant={selectedTimeFilter === option.key ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onTimeFilterChange(option.key)}
                      data-testid={`opportunity-filter-${option.key}`}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Pipeline Filter */}
              <div className="gba:min-w-48">
                <Select value={selectedPipelineId || 'all'} onValueChange={onPipelineChange}>
                  <SelectTrigger data-testid="opportunity-pipeline-selector">
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
          <div className="gba:mt-4 gba:border-t gba:pt-4">
            <div className="gba:flex gba:items-center gba:gap-6">
              <div className="gba:flex gba:items-center gba:gap-2">
                <EyeIcon size={16} className="gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-700">Show Data:</span>
              </div>
              <div className="gba:flex gba:flex-wrap gba:gap-4" data-testid="opportunity-line-filters">
                {(
                  [
                    { key: 'opportunitiesCreated', label: 'Opportunities Created', dataKey: 'opportunitiesCreated' },
                    { key: 'opportunitiesWon', label: 'Opportunities Won', dataKey: 'opportunitiesWon' }
                  ] as Array<{ key: keyof typeof visibleLines; label: string; dataKey: string }>
                ).map(line => (
                  <label
                    key={line.key}
                    className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer"
                    data-testid={`opportunity-line-filter-${line.key}`}
                  >
                    <Checkbox
                      checked={visibleLines[line.key]}
                      onCheckedChange={() => setVisibleLines(prev => ({ ...prev, [line.key]: !prev[line.key] }))}
                    />
                    <div
                      className="gba:w-3 gba:h-3 gba:rounded"
                      style={{ backgroundColor: `var(--color-${line.dataKey})` }}
                    />
                    <span className="gba:text-sm gba:text-gray-700">{line.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>{renderChartContent()}</CardContent>
      </Card>
      {renderDrillDown}
    </>
  )
}

export default OpportunityLifecycleChart

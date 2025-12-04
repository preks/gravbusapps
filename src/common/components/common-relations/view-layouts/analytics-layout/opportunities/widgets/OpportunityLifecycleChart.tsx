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
  ChartLegendContent
} from '@newwork/nw-design-system'
import { AreaChart, Area, XAxis, YAxis } from 'recharts'
import { ChartLineIcon, CalendarIcon, EyeIcon } from '@phosphor-icons/react'

export type TimeFilter = 'month' | 'quarter' | 'sixMonths' | 'year' | 'historical'

export interface PipelineItem {
  id: string
  name: string
}

export interface OpportunityLifecyclePoint {
  date: string
  opportunitiesCreated: number
  opportunitiesWon: number
}

interface OpportunityLifecycleChartProps {
  data: OpportunityLifecyclePoint[]
  selectedTimeFilter: TimeFilter
  onTimeFilterChange: (filter: TimeFilter) => void
  pipelines: PipelineItem[]
  selectedPipelineId?: string
  onPipelineChange: (pipelineId: string) => void
  moduleColor?: string
}

export const OpportunityLifecycleChart: React.FC<OpportunityLifecycleChartProps> = ({
  data,
  selectedTimeFilter,
  onTimeFilterChange,
  pipelines,
  selectedPipelineId,
  onPipelineChange,
  moduleColor = 'primary'
}) => {
  const [visibleLines, setVisibleLines] = React.useState({ opportunitiesCreated: true, opportunitiesWon: true })
  const timeFilterOptions: { key: TimeFilter; label: string }[] = [
    { key: 'month', label: 'Last Month' },
    { key: 'quarter', label: 'Last Quarter' },
    { key: 'sixMonths', label: 'Last 6 Months' },
    { key: 'year', label: 'Last Year' },
    { key: 'historical', label: 'Historical' }
  ]

  const currentFilterLabel =
    timeFilterOptions.find(option => option.key === selectedTimeFilter)?.label || 'Last 6 Months'

  const formatXAxisLabel = (value: string) => {
    const date = new Date(value)
    if (selectedTimeFilter === 'month') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  const chartConfig = useMemo(
    () => ({
      opportunitiesCreated: { label: 'Opportunities Created' },
      opportunitiesWon: { label: 'Opportunities Won' }
    }),
    []
  )

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
        className="gba:h-[320px] gba:w-full"
        data-testid="opportunity-lifecycle-chart-container"
      >
        <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={formatXAxisLabel} />
          <YAxis tick={{ fontSize: 12 }} />
          <ChartTooltip content={<ChartTooltipContent labelKey="date" />} />
          <ChartLegend content={<ChartLegendContent />} />
          {visibleLines.opportunitiesCreated && (
            <Area
              type="monotone"
              dataKey="opportunitiesCreated"
              name="opportunitiesCreated"
              stroke={`var(--color-opportunitiesCreated)`}
              fill={`var(--color-opportunitiesCreated)`}
              fillOpacity={0.12}
              strokeWidth={2}
              dot={false}
            />
          )}
          {visibleLines.opportunitiesWon && (
            <Area
              type="monotone"
              dataKey="opportunitiesWon"
              name="opportunitiesWon"
              stroke={`var(--color-opportunitiesWon)`}
              fill={`var(--color-opportunitiesWon)`}
              fillOpacity={0.12}
              strokeWidth={2}
              dot={false}
            />
          )}
        </AreaChart>
      </ChartContainer>
    )
  }

  return (
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
                {timeFilterOptions.map(option => (
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
              <span className="gba:text-sm gba:font-medium gba:text-gray-700">Show Lines:</span>
            </div>
            <div className="gba:flex gba:flex-wrap gba:gap-4" data-testid="opportunity-line-filters">
              {[
                { key: 'opportunitiesCreated', label: 'Opportunities Created', dataKey: 'opportunitiesCreated' },
                { key: 'opportunitiesWon', label: 'Opportunities Won', dataKey: 'opportunitiesWon' }
              ].map(line => (
                <label
                  key={line.key}
                  className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer"
                  data-testid={`opportunity-line-filter-${line.key}`}
                >
                  <Checkbox
                    checked={(visibleLines as any)[line.key]}
                    onCheckedChange={() => setVisibleLines(prev => ({ ...prev, [line.key]: !(prev as any)[line.key] }))}
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
  )
}

export default OpportunityLifecycleChart

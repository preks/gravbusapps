import React, { useState, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
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
import { TIME_FILTER_OPTIONS, formatLifecycleXAxisLabel, getCurrentFilterLabel } from '../../shared/lifecycleChartUtils'
import type { TimeFilter } from '../../shared/lifecycleChartUtils'
import { LifecycleChartLoadingState } from '../../shared/LifecycleChartLoadingState'

// Re-export TimeFilter for backward compatibility
export type { TimeFilter } from '../../shared/lifecycleChartUtils'

export interface LeadsOverTimePoint {
  date: string
  count: number
  leadsCreated: number
  leadsConverted: number
  leadsLost: number
}

export interface LeadLifecycleChartProps {
  data: LeadsOverTimePoint[]
  isLoading?: boolean
  selectedTimeFilter: TimeFilter
  onTimeFilterChange: (filter: TimeFilter) => void
  moduleColor?: string
}

export const LeadLifecycleChart: React.FC<LeadLifecycleChartProps> = ({
  data,
  isLoading = false,
  selectedTimeFilter,
  onTimeFilterChange,
  moduleColor
}) => {
  const [visibleLines, setVisibleLines] = useState({
    leadsCreated: true,
    leadsConverted: true,
    leadsLost: true
  })

  // Chart configuration - must be called before early return
  const chartConfig = useMemo(
    () => ({
      leadsCreated: { label: 'Leads Created' },
      leadsConverted: { label: 'Leads Converted' },
      leadsLost: { label: 'Leads Lost' }
    }),
    []
  )

  // Non-hook logic can come after hooks but before early returns
  const lineOptions: Array<{ key: keyof typeof visibleLines; label: string }> = [
    { key: 'leadsCreated', label: 'Leads Created' },
    { key: 'leadsConverted', label: 'Leads Converted' },
    { key: 'leadsLost', label: 'Leads Lost' }
  ]

  const toggleLineVisibility = (lineKey: keyof typeof visibleLines) => {
    setVisibleLines(prev => ({ ...prev, [lineKey]: !prev[lineKey] }))
  }

  const currentFilterLabel = getCurrentFilterLabel(selectedTimeFilter)

  // Early return AFTER all hooks
  if (isLoading) {
    return (
      <LifecycleChartLoadingState
        title="Lead Lifecycle Overview"
        selectedTimeFilter={selectedTimeFilter}
        lineOptions={lineOptions}
        moduleColor={moduleColor}
        dataTestIdPrefix="LeadLifecycleChart"
      />
    )
  }

  // Just display the data passed in - filtering happens at parent level
  const chartData = data

  const renderChartContent = () => {
    if (chartData.length === 0) {
      return (
        <div className="gba:text-center gba:p-8" data-testid="LeadLifecycleChart-empty-state">
          <ChartLineIcon className="gba:mx-auto gba:h-12 gba:w-12 gba:text-gray-400" />
          <h3 className="gba:mt-2 gba:text-sm gba:font-medium gba:text-gray-900">No data available</h3>
          <p className="gba:mt-1 gba:text-sm gba:text-gray-500">
            No lead lifecycle data found for the selected time period.
          </p>
        </div>
      )
    }

    return (
      <ChartContainer
        config={chartConfig}
        className="gba:h-[400px] gba:w-full gba:aspect-auto"
        data-testid="LeadLifecycleChart-chart"
      >
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="date"
            tickLine={false}
            tickFormatter={value => formatLifecycleXAxisLabel(value, selectedTimeFilter)}
          />
          <YAxis tickLine={false} />
          <ChartTooltip content={<ChartTooltipContent labelKey="date" />} />
          <ChartLegend content={<ChartLegendContent />} />
          {visibleLines.leadsCreated && (
            <Area
              type="monotone"
              dataKey="leadsCreated"
              name="leadsCreated"
              stroke={`var(--color-leadsCreated)`}
              fill={`var(--color-leadsCreated)`}
              fillOpacity={0.2}
              strokeWidth={2}
            />
          )}
          {visibleLines.leadsConverted && (
            <Area
              type="monotone"
              dataKey="leadsConverted"
              name="leadsConverted"
              stroke={`var(--color-leadsConverted)`}
              fill={`var(--color-leadsConverted)`}
              fillOpacity={0.2}
              strokeWidth={2}
            />
          )}
          {visibleLines.leadsLost && (
            <Area
              type="monotone"
              dataKey="leadsLost"
              name="leadsLost"
              stroke={`var(--color-leadsLost)`}
              fill={`var(--color-leadsLost)`}
              fillOpacity={0.2}
              strokeWidth={2}
            />
          )}
        </AreaChart>
      </ChartContainer>
    )
  }

  return (
    <Card data-testid="LeadLifecycleChart-container">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={ChartLineIcon} variant={moduleColor as any} size="md" decorative />
            Lead Lifecycle Overview ({currentFilterLabel})
          </CardTitle>
          <div className="gba:flex gba:items-center gba:gap-2">
            <CalendarIcon size={16} className="gba:text-gray-500" />
            <div className="gba:flex gba:gap-1" data-testid="LeadLifecycleChart-time-filters">
              {TIME_FILTER_OPTIONS.map(option => (
                <Button
                  key={option.key}
                  variant={selectedTimeFilter === option.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onTimeFilterChange(option.key)}
                  data-testid={`LeadLifecycleChart-filter-${option.key}`}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <div className="gba:mt-4 gba:border-t gba:pt-4">
          <div className="gba:flex gba:items-center gba:gap-6">
            <div className="gba:flex gba:items-center gba:gap-2">
              <EyeIcon size={16} className="gba:text-gray-500" />
              <span className="gba:text-sm gba:font-medium gba:text-gray-700">Show Data:</span>
            </div>
            <div className="gba:flex gba:flex-wrap gba:gap-4" data-testid="LeadLifecycleChart-line-filters">
              {lineOptions.map(line => (
                <label
                  key={line.key}
                  className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer"
                  data-testid={`LeadLifecycleChart-line-filter-${line.key}`}
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
      <CardContent>{renderChartContent()}</CardContent>
    </Card>
  )
}

export default LeadLifecycleChart

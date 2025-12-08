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
// Remove SupportedVariant import - using string type directly

export type TimeFilter = 'month' | 'quarter' | 'sixMonths' | 'year' | 'historical'

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

const timeFilterOptions = [
  { key: 'month' as TimeFilter, label: 'Last Month' },
  { key: 'quarter' as TimeFilter, label: 'Last Quarter' },
  { key: 'sixMonths' as TimeFilter, label: 'Last 6 Months' },
  { key: 'year' as TimeFilter, label: 'Last Year' },
  { key: 'historical' as TimeFilter, label: 'Historical' }
]

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

  const lineOptions = [
    { key: 'leadsCreated' as keyof typeof visibleLines, label: 'Leads Created' },
    { key: 'leadsConverted' as keyof typeof visibleLines, label: 'Leads Converted' },
    { key: 'leadsLost' as keyof typeof visibleLines, label: 'Leads Lost' }
  ]

  const toggleLineVisibility = (lineKey: keyof typeof visibleLines) => {
    setVisibleLines(prev => ({ ...prev, [lineKey]: !prev[lineKey] }))
  }

  const formatXAxisLabel = (value: string) => {
    const date = new Date(value)
    if (selectedTimeFilter === 'month') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) // "Nov 1", "Nov 2"
    }
    if (selectedTimeFilter === 'historical') {
      return date.getFullYear().toString() // "2024"
    }
    // For quarter, sixMonths, and year: show month + year (monthly aggregation)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) // "Nov 2025"
  }

  // Chart configuration (moved to top level to avoid conditional hook calls)
  const chartConfig = useMemo(
    () => ({
      leadsCreated: { label: 'Leads Created' },
      leadsConverted: { label: 'Leads Converted' },
      leadsLost: { label: 'Leads Lost' }
    }),
    []
  )

  // Just display the data passed in - filtering happens at parent level
  const chartData = data

  const renderChartContent = () => {
    if (isLoading) {
      return (
        <div
          className="gba:flex gba:items-center gba:justify-center gba:h-[400px]"
          data-testid="LeadLifecycleChart-loading"
        >
          <div className="gba:text-center">
            <div className="gba:animate-spin gba:rounded-full gba:h-12 gba:w-12 gba:border-b-2 gba:border-primary gba:mx-auto" />
            <p className="gba:mt-4 gba:text-sm gba:text-muted-foreground">Loading chart data...</p>
          </div>
        </div>
      )
    }

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
      <ChartContainer config={chartConfig} className="gba:h-[320px] gba:w-full" data-testid="LeadLifecycleChart-chart">
        <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={formatXAxisLabel} />
          <YAxis tick={{ fontSize: 12 }} />
          <ChartTooltip content={<ChartTooltipContent labelKey="date" />} />
          <ChartLegend content={<ChartLegendContent />} />
          {visibleLines.leadsCreated && (
            <Area
              type="monotone"
              dataKey="leadsCreated"
              name="leadsCreated"
              stroke={`var(--color-leadsCreated)`}
              fill={`var(--color-leadsCreated)`}
              fillOpacity={0.12}
              strokeWidth={2}
              dot={false}
            />
          )}
          {visibleLines.leadsConverted && (
            <Area
              type="monotone"
              dataKey="leadsConverted"
              name="leadsConverted"
              stroke={`var(--color-leadsConverted)`}
              fill={`var(--color-leadsConverted)`}
              fillOpacity={0.12}
              strokeWidth={2}
              dot={false}
            />
          )}
          {visibleLines.leadsLost && (
            <Area
              type="monotone"
              dataKey="leadsLost"
              name="leadsLost"
              stroke={`var(--color-leadsLost)`}
              fill={`var(--color-leadsLost)`}
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
    <Card data-testid="LeadLifecycleChart-container">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={ChartLineIcon} variant={moduleColor as any} size="md" decorative />
            Lead Lifecycle Overview
          </CardTitle>
          <div className="gba:flex gba:items-center gba:gap-2">
            <CalendarIcon size={16} className="gba:text-gray-500" />
            <div className="gba:flex gba:gap-1" data-testid="LeadLifecycleChart-time-filters">
              {timeFilterOptions.map(option => (
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
              <span className="gba:text-sm gba:font-medium gba:text-gray-700">Show Lines:</span>
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

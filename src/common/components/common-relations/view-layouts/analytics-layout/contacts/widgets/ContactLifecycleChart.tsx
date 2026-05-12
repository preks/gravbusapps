import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  IconAvatar,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  Spinner
} from '@newwork/nw-design-system'
import { AreaChart, Area, XAxis, YAxis } from 'recharts'
import { ChartLineIcon, CalendarIcon } from '@phosphor-icons/react'
import {
  TIME_FILTER_OPTIONS,
  formatLifecycleXAxisLabel,
  getCurrentFilterLabel,
  createChartTooltipFormatter
} from '../../shared/lifecycleChartUtils'
import type { TimeFilter } from '../../shared/lifecycleChartUtils'

// Re-export TimeFilter for backward compatibility
export type { TimeFilter } from '../../shared/lifecycleChartUtils'

export interface ContactsOverTimePoint {
  date: string
  startDate: string
  endDate: string
  contactsCreated: number
}

export interface ContactLifecycleChartProps {
  data: ContactsOverTimePoint[]
  isLoading?: boolean
  selectedTimeFilter: TimeFilter
  onTimeFilterChange: (filter: TimeFilter) => void
  moduleColor?: string
  onPointClick?: (label: string, startDate: string, endDate: string) => void
  renderDrillDown?: React.ReactNode
}

export const ContactLifecycleChart: React.FC<ContactLifecycleChartProps> = ({
  data,
  isLoading = false,
  selectedTimeFilter,
  onTimeFilterChange,
  moduleColor,
  onPointClick,
  renderDrillDown
}) => {
  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  // Chart configuration - must be called before early return
  const chartConfig = useMemo(
    () => ({
      contactsCreated: { label: 'Contacts Created' }
    }),
    []
  )

  const tooltipFormatter = useMemo(() => createChartTooltipFormatter(chartConfig), [chartConfig])

  // Non-hook logic
  const currentFilterLabel = getCurrentFilterLabel(selectedTimeFilter)

  // Early return AFTER all hooks
  if (isLoading) {
    return (
      <Card data-testid="ContactLifecycleChart-loading">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={ChartLineIcon} variant={moduleColor as any} size="md" decorative />
            Contact Lifecycle Overview
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

  const chartData = data || []

  const renderChartContent = () => {
    if (!chartData || chartData.length === 0) {
      return (
        <div className="gba:text-center gba:p-8" data-testid="ContactLifecycleChart-empty-state">
          <ChartLineIcon className="gba:mx-auto gba:h-12 gba:w-12 gba:text-gray-400" />
          <h3 className="gba:mt-2 gba:text-sm gba:font-medium gba:text-gray-900">No data available</h3>
          <p className="gba:mt-1 gba:text-sm gba:text-gray-500">
            No contact lifecycle data found for the selected time period.
          </p>
        </div>
      )
    }

    return (
      <ChartContainer
        config={chartConfig}
        className={`gba:h-[400px] gba:w-full gba:aspect-auto${onPointClick ? ' gba:cursor-pointer' : ''}`}
        data-testid="ContactLifecycleChart-chart"
      >
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          onClick={clickData => {
            if (!onPointClick || clickData?.activeTooltipIndex == null) return
            const point = chartData[clickData.activeTooltipIndex as number]
            if (!point) return
            const displayLabel = formatLifecycleXAxisLabel(point.date, selectedTimeFilter)
            onPointClick(displayLabel, point.startDate, point.endDate)
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
          <Area
            type="monotone"
            dataKey="contactsCreated"
            name="contactsCreated"
            stroke={`var(--color-contactsCreated)`}
            fill={`var(--color-contactsCreated)`}
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>
    )
  }

  return (
    <>
      <Card data-testid="ContactLifecycleChart-container">
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <IconAvatar icon={ChartLineIcon} variant={moduleColor as any} size="md" decorative />
              Contact Lifecycle Overview ({currentFilterLabel})
            </CardTitle>
            <div className="gba:flex gba:items-center gba:gap-2">
              <CalendarIcon size={16} className="gba:text-muted-foreground" />
              <div className="gba:flex gba:gap-1" data-testid="ContactLifecycleChart-time-filters">
                {TIME_FILTER_OPTIONS.map(option => (
                  <Button
                    key={option.key}
                    variant={selectedTimeFilter === option.key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onTimeFilterChange(option.key)}
                    data-testid={`ContactLifecycleChart-filter-${option.key}`}
                  >
                    {option.label}
                  </Button>
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

export default ContactLifecycleChart

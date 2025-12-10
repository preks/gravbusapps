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
  ChartLegendContent
} from '@newwork/nw-design-system'
import { AreaChart, Area, XAxis, YAxis } from 'recharts'
import { ChartLineIcon, CalendarIcon } from '@phosphor-icons/react'

export type TimeFilter = 'month' | 'quarter' | 'sixMonths' | 'year' | 'historical'

export interface ContactsOverTimePoint {
  date: string
  contactsCreated: number
}

export interface ContactLifecycleChartProps {
  data: ContactsOverTimePoint[]
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

export const ContactLifecycleChart: React.FC<ContactLifecycleChartProps> = ({
  data,
  isLoading = false,
  selectedTimeFilter,
  onTimeFilterChange,
  moduleColor
}) => {
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
      contactsCreated: { label: 'Contacts Created' }
    }),
    []
  )

  const chartData = data || []

  const renderChartContent = () => {
    if (isLoading) {
      return (
        <div
          className="gba:flex gba:items-center gba:justify-center gba:h-[320px]"
          data-testid="ContactLifecycleChart-loading"
        >
          <div className="gba:text-center">
            <div className="gba:animate-spin gba:rounded-full gba:h-12 gba:w-12 gba:border-b-2 gba:border-primary gba:mx-auto" />
            <p className="gba:mt-4 gba:text-sm gba:text-muted-foreground">Loading chart data...</p>
          </div>
        </div>
      )
    }

    if (!chartData || chartData.length === 0) {
      return (
        <div className="gba:text-center gba:p-8" data-testid="ContactLifecycleChart-empty-state">
          <ChartLineIcon className="gba:mx-auto gba:h-12 gba:w-12 gba:text-muted-foreground" />
          <h3 className="gba:mt-2 gba:text-sm gba:font-medium gba:text-foreground">No data available</h3>
          <p className="gba:mt-1 gba:text-sm gba:text-muted-foreground">
            No contact lifecycle data found for the selected time period.
          </p>
        </div>
      )
    }

    return (
      <ChartContainer
        config={chartConfig}
        className="gba:h-[320px] gba:w-full"
        data-testid="ContactLifecycleChart-chart"
      >
        <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={formatXAxisLabel} />
          <YAxis tick={{ fontSize: 12 }} />
          <ChartTooltip content={<ChartTooltipContent labelKey="date" />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Area
            type="monotone"
            dataKey="contactsCreated"
            name="contactsCreated"
            stroke={`var(--color-contactsCreated)`}
            fill={`var(--color-contactsCreated)`}
            fillOpacity={0.12}
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ChartContainer>
    )
  }

  return (
    <Card data-testid="ContactLifecycleChart-container">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={ChartLineIcon} variant={moduleColor as any} size="md" decorative />
            Contact Lifecycle Overview
          </CardTitle>
          <div className="gba:flex gba:items-center gba:gap-2">
            <CalendarIcon size={16} className="gba:text-muted-foreground" />
            <div className="gba:flex gba:gap-1" data-testid="ContactLifecycleChart-time-filters">
              {timeFilterOptions.map(option => (
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
  )
}

export default ContactLifecycleChart

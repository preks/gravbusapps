import React, { useState, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  IconAvatar,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from '@newwork/nw-design-system'
import { AreaChart, Area, XAxis, YAxis } from 'recharts'
import { ChartLineIcon, CalendarIcon, EyeIcon } from '@phosphor-icons/react'

export type TimeFilter = 'month' | 'quarter' | 'year' | 'historical'

export interface ContactsOverTimePoint {
  date: string
  count: number
  cumulative: number
}

export interface ContactLifecycleChartProps {
  data: ContactsOverTimePoint[]
  selectedTimeFilter: TimeFilter
  onTimeFilterChange: (filter: TimeFilter) => void
  moduleColor?: string
}

const timeFilterOptions = [
  { key: 'month' as TimeFilter, label: 'Last Month' },
  { key: 'quarter' as TimeFilter, label: 'Last Quarter' },
  { key: 'year' as TimeFilter, label: 'Last Year' },
  { key: 'historical' as TimeFilter, label: 'Historical' }
]

export const ContactLifecycleChart: React.FC<ContactLifecycleChartProps> = ({
  data,
  selectedTimeFilter,
  onTimeFilterChange,
  moduleColor = 'primary'
}) => {
  const [visibleLines, setVisibleLines] = useState({
    totalContacts: true,
    accountLinked: true
  })

  const lineOptions = [
    { key: 'totalContacts' as keyof typeof visibleLines, label: 'Monthly Created', dataKey: 'count' },
    { key: 'accountLinked' as keyof typeof visibleLines, label: 'Cumulative Total', dataKey: 'cumulative' }
  ]

  const toggleLineVisibility = (lineKey: keyof typeof visibleLines) => {
    setVisibleLines(prev => ({ ...prev, [lineKey]: !prev[lineKey] }))
  }

  const formatXAxisLabel = (value: string) => {
    const date = new Date(value)
    if (selectedTimeFilter === 'month') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  const chartData = data

  return (
    <Card data-testid="contact-lifecycle-chart">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={ChartLineIcon} variant={moduleColor as any} size="md" decorative />
            Contact Lifecycle Overview
          </CardTitle>
          <div className="gba:flex gba:items-center gba:gap-4">
            <div className="gba:min-w-48">
              <Select value={selectedTimeFilter} onValueChange={(v: string) => onTimeFilterChange(v as TimeFilter)}>
                <SelectTrigger data-testid="contact-time-filter-selector">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeFilterOptions.map(option => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              <CalendarIcon size={16} className="gba:text-gray-500" />
              <div className="gba:flex gba:gap-1" data-testid="contact-time-filters">
                {timeFilterOptions.map(option => (
                  <Button
                    key={option.key}
                    variant={selectedTimeFilter === option.key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onTimeFilterChange(option.key)}
                    data-testid={`contact-filter-${option.key}`}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="gba:mt-4 gba:border-t gba:pt-4">
          <div className="gba:flex gba:items-center gba:gap-6">
            <div className="gba:flex gba:items-center gba:gap-2">
              <EyeIcon size={16} className="gba:text-gray-500" />
              <span className="gba:text-sm gba:font-medium gba:text-gray-700">Show Lines:</span>
            </div>
            <div className="gba:flex gba:flex-wrap gba:gap-4" data-testid="contact-line-filters">
              {lineOptions.map(line => (
                <label
                  key={line.key}
                  className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer"
                  data-testid={`contact-line-filter-${line.key}`}
                >
                  <Checkbox checked={visibleLines[line.key]} onCheckedChange={() => toggleLineVisibility(line.key)} />
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
      <CardContent>
        {chartData.length === 0 ? (
          <div className="gba:text-center gba:p-8" data-testid="contact-lifecycle-chart-empty-state">
            <ChartLineIcon className="gba:mx-auto gba:h-12 gba:w-12 gba:text-gray-400" />
            <h3 className="gba:mt-2 gba:text-sm gba:font-medium gba:text-gray-900">No data available</h3>
            <p className="gba:mt-1 gba:text-sm gba:text-gray-500">
              No contact lifecycle data found for the selected time period.
            </p>
          </div>
        ) : (
          <ChartContainer
            config={useMemo(
              () => ({
                count: { label: 'Monthly Created' },
                cumulative: { label: 'Cumulative Total' }
              }),
              []
            )}
            className="gba:h-[400px] gba:w-full"
            data-testid="contact-lifecycle-chart-container"
          >
            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={formatXAxisLabel} />
              <YAxis tick={{ fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent labelKey="date" />} />
              <ChartLegend content={<ChartLegendContent />} />
              {visibleLines.totalContacts && (
                <Area
                  type="monotone"
                  dataKey="count"
                  name="count"
                  stroke={`var(--color-count)`}
                  fill={`var(--color-count)`}
                  fillOpacity={0.12}
                  strokeWidth={2}
                  dot={false}
                />
              )}
              {visibleLines.accountLinked && (
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  name="cumulative"
                  stroke={`var(--color-cumulative)`}
                  fill={`var(--color-cumulative)`}
                  fillOpacity={0.12}
                  strokeWidth={2}
                  dot={false}
                />
              )}
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

export default ContactLifecycleChart

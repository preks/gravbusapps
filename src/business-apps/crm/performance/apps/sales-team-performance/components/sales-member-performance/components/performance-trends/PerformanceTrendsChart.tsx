import React, { useState, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis } from 'recharts'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Alert,
  Checkbox,
  IconAvatar,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from '@newwork/nw-design-system'
import { ChartLineIcon, CalendarIcon, EyeIcon } from '@phosphor-icons/react'
import { usePerformanceTrendsData } from './hooks/usePerformanceTrendsData'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

const DATA_TEST_ID_PREFIX = 'performance-trends-chart'

export type TimeFilter = 'month' | 'quarter' | 'sixMonths' | 'year' | 'historical'

interface PerformanceTrendsChartProps extends BusinessAppContextProps {
  employeeId: string
}

export const PerformanceTrendsChart: React.FC<PerformanceTrendsChartProps> = props => {
  const { employeeId } = props
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<TimeFilter>('year')

  // Line visibility state
  const [visibleLines, setVisibleLines] = useState({
    convertedLeads: true,
    contactsWithAccounts: true,
    wonOpportunities: true,
    managedAccounts: true
  })

  const { trendsData, isLoading, error, refetch } = usePerformanceTrendsData(props, selectedTimeFilter, employeeId)

  const timeFilterOptions = useMemo(
    () => [
      { key: 'month' as TimeFilter, label: 'Last Month' },
      { key: 'quarter' as TimeFilter, label: 'Last Quarter' },
      { key: 'sixMonths' as TimeFilter, label: 'Last 6 Months' },
      { key: 'year' as TimeFilter, label: 'Last Year' },
      { key: 'historical' as TimeFilter, label: 'Historical' }
    ],
    []
  )

  const lineOptions = useMemo(
    () => [
      { key: 'convertedLeads' as keyof typeof visibleLines, label: 'Converted Leads' },
      { key: 'contactsWithAccounts' as keyof typeof visibleLines, label: 'Contacts with Accounts' },
      { key: 'wonOpportunities' as keyof typeof visibleLines, label: 'Won Opportunities' },
      { key: 'managedAccounts' as keyof typeof visibleLines, label: 'Managed Accounts' }
    ],
    []
  )

  const chartConfig = useMemo(
    () => ({
      convertedLeads: { label: 'Converted Leads' },
      contactsWithAccounts: { label: 'Contacts with Accounts' },
      wonOpportunities: { label: 'Won Opportunities' },
      managedAccounts: { label: 'Managed Accounts' }
    }),
    []
  )

  const currentFilterLabel = useMemo(
    () => timeFilterOptions.find(option => option.key === selectedTimeFilter)?.label || 'Last Year',
    [timeFilterOptions, selectedTimeFilter]
  )

  // Toggle line visibility
  const toggleLineVisibility = (lineKey: keyof typeof visibleLines) => {
    setVisibleLines(prev => ({
      ...prev,
      [lineKey]: !prev[lineKey]
    }))
  }

  // Custom label formatter for X-axis
  const formatXAxisLabel = (value: string) => {
    const date = new Date(value)
    if (selectedTimeFilter === 'month') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } else if (selectedTimeFilter === 'quarter' || selectedTimeFilter === 'sixMonths') {
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    }
  }

  if (isLoading) {
    return (
      <Card data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={ChartLineIcon} variant="default" size="md" decorative />
            Performance Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:items-center gba:justify-center gba:h-80">
            <div className="gba:animate-pulse gba:text-gray-500">Loading performance trends...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={ChartLineIcon} variant="default" size="md" decorative />
            Performance Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" data-testid={`${DATA_TEST_ID_PREFIX}-error`}>
            <div className="gba:flex gba:items-center gba:justify-between">
              <div>
                <h4 className="gba:text-sm gba:font-medium">Error Loading Performance Data</h4>
                <p className="gba:text-sm gba:text-muted-foreground">
                  {error.message || 'Failed to load performance trends data'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={refetch} data-testid={`${DATA_TEST_ID_PREFIX}-retry-button`}>
                Retry
              </Button>
            </div>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={ChartLineIcon} variant="default" size="md" decorative />
            Performance Trends ({currentFilterLabel})
          </CardTitle>
          <div className="gba:flex gba:items-center gba:gap-2">
            <CalendarIcon size={16} className="gba:text-gray-500" />
            <div className="gba:flex gba:gap-1" data-testid={`${DATA_TEST_ID_PREFIX}-time-filters`}>
              {timeFilterOptions.map(option => (
                <Button
                  key={option.key}
                  variant={selectedTimeFilter === option.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTimeFilter(option.key)}
                  data-testid={`${DATA_TEST_ID_PREFIX}-filter-${option.key}`}
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
            <div className="gba:flex gba:flex-wrap gba:gap-4" data-testid={`${DATA_TEST_ID_PREFIX}-line-filters`}>
              {lineOptions.map(line => (
                <label
                  key={line.key}
                  className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer"
                  data-testid={`${DATA_TEST_ID_PREFIX}-line-filter-${line.key}`}
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
      <CardContent>
        {trendsData.length === 0 ? (
          <div className="gba:text-center gba:p-8" data-testid={`${DATA_TEST_ID_PREFIX}-empty-state`}>
            <ChartLineIcon className="gba:mx-auto gba:h-12 gba:w-12 gba:text-gray-400" />
            <h3 className="gba:mt-2 gba:text-sm gba:font-medium gba:text-gray-900">No data available</h3>
            <p className="gba:mt-1 gba:text-sm gba:text-gray-500">
              No performance data found for the selected time period.
            </p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="gba:h-[400px] gba:w-full gba:aspect-auto">
            <AreaChart data={trendsData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <XAxis dataKey="period" tickLine={false} tickFormatter={formatXAxisLabel} />
              <YAxis tickLine={false} />
              <ChartTooltip content={<ChartTooltipContent labelKey="period" />} />
              <ChartLegend content={<ChartLegendContent />} />
              {visibleLines.convertedLeads && (
                <Area
                  type="monotone"
                  dataKey="convertedLeads"
                  name="convertedLeads"
                  stroke={`var(--color-convertedLeads)`}
                  fill={`var(--color-convertedLeads)`}
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              )}
              {visibleLines.contactsWithAccounts && (
                <Area
                  type="monotone"
                  dataKey="contactsWithAccounts"
                  name="contactsWithAccounts"
                  stroke={`var(--color-contactsWithAccounts)`}
                  fill={`var(--color-contactsWithAccounts)`}
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              )}
              {visibleLines.wonOpportunities && (
                <Area
                  type="monotone"
                  dataKey="wonOpportunities"
                  name="wonOpportunities"
                  stroke={`var(--color-wonOpportunities)`}
                  fill={`var(--color-wonOpportunities)`}
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              )}
              {visibleLines.managedAccounts && (
                <Area
                  type="monotone"
                  dataKey="managedAccounts"
                  name="managedAccounts"
                  stroke={`var(--color-managedAccounts)`}
                  fill={`var(--color-managedAccounts)`}
                  fillOpacity={0.2}
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

export default PerformanceTrendsChart

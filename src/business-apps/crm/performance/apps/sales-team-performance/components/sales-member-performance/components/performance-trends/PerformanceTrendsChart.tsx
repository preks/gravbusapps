import React, { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, Button, Alert, Spinner, Checkbox } from '@newwork/nw-design-system'
import { PiChartLine, PiCalendar, PiEye } from 'react-icons/pi'
import { usePerformanceTrendsData } from './hooks/usePerformanceTrendsData'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

const DATA_TEST_ID_PREFIX = 'PerformanceTrendsChart'

export type TimeFilter = 'month' | 'quarter' | 'sixMonths' | 'year' | 'historical'

interface PerformanceTrendsChartProps extends BusinessAppContextProps {
  employeeId: string
}

export const PerformanceTrendsChart: React.FC<PerformanceTrendsChartProps> = props => {
  const { employeeId } = props
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<TimeFilter>('quarter')

  // Line visibility state
  const [visibleLines, setVisibleLines] = useState({
    convertedLeads: true,
    contactsWithAccounts: true,
    wonOpportunities: true,
    managedAccounts: true,
    totalSales: true
  })

  const { trendsData, isLoading, error, refetch } = usePerformanceTrendsData(props, selectedTimeFilter, employeeId)

  const timeFilterOptions = [
    { key: 'month' as TimeFilter, label: 'Last Month' },
    { key: 'quarter' as TimeFilter, label: 'Last Quarter' },
    { key: 'sixMonths' as TimeFilter, label: 'Last 6 Months' },
    { key: 'year' as TimeFilter, label: 'Last Year' },
    { key: 'historical' as TimeFilter, label: 'Historical' }
  ]

  const lineOptions = [
    { key: 'convertedLeads' as keyof typeof visibleLines, label: 'Converted Leads', color: '#3B82F6' },
    { key: 'contactsWithAccounts' as keyof typeof visibleLines, label: 'Contacts with Accounts', color: '#8B5CF6' },
    { key: 'wonOpportunities' as keyof typeof visibleLines, label: 'Won Opportunities', color: '#F59E0B' },
    { key: 'managedAccounts' as keyof typeof visibleLines, label: 'Managed Accounts', color: '#06B6D4' },
    { key: 'totalSales' as keyof typeof visibleLines, label: 'Total Sales (EUR)', color: '#10B981' }
  ]

  // Toggle line visibility
  const toggleLineVisibility = (lineKey: keyof typeof visibleLines) => {
    setVisibleLines(prev => ({
      ...prev,
      [lineKey]: !prev[lineKey]
    }))
  }

  // Custom tooltip formatter
  const formatTooltip = (value: any, name: string) => {
    const labelMap: Record<string, string> = {
      convertedLeads: 'Converted Leads',
      contactsWithAccounts: 'Contacts with Accounts',
      wonOpportunities: 'Won Opportunities',
      managedAccounts: 'Managed Accounts',
      totalSales: 'Total Sales'
    }

    // Format currency for sales
    if (name === 'totalSales') {
      const formattedValue = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value)
      return [formattedValue, labelMap[name] || name]
    }

    return [value, labelMap[name] || name]
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
            <PiChartLine size={20} />
            Performance Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:justify-center gba:p-8" data-testid={`${DATA_TEST_ID_PREFIX}-loading`}>
            <Spinner size="lg" />
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
            <PiChartLine size={20} />
            Performance Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" data-testid={`${DATA_TEST_ID_PREFIX}-error`}>
            <div className="gba:flex gba:items-center gba:justify-between">
              <div>
                <h4 className="gba:text-sm gba:font-medium">Error Loading Trends</h4>
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
            <PiChartLine size={20} />
            Performance Trends
          </CardTitle>
          <div className="gba:flex gba:items-center gba:gap-2">
            <PiCalendar size={16} className="gba:text-gray-500" />
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

        {/* Line Visibility Filters */}
        <div className="gba:mt-4 gba:border-t gba:pt-4">
          <div className="gba:flex gba:items-center gba:gap-6">
            <div className="gba:flex gba:items-center gba:gap-2">
              <PiEye size={16} className="gba:text-gray-500" />
              <span className="gba:text-sm gba:font-medium gba:text-gray-700">Show Lines:</span>
            </div>
            <div className="gba:flex gba:flex-wrap gba:gap-4" data-testid={`${DATA_TEST_ID_PREFIX}-line-filters`}>
              {lineOptions.map(line => (
                <label
                  key={line.key}
                  className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer"
                  data-testid={`${DATA_TEST_ID_PREFIX}-line-filter-${line.key}`}
                >
                  <Checkbox checked={visibleLines[line.key]} onCheckedChange={() => toggleLineVisibility(line.key)} />
                  <div className="gba:w-3 gba:h-3 gba:rounded" style={{ backgroundColor: line.color }} />
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
            <PiChartLine className="gba:mx-auto gba:h-12 gba:w-12 gba:text-gray-400" />
            <h3 className="gba:mt-2 gba:text-sm gba:font-medium gba:text-gray-900">No data available</h3>
            <p className="gba:mt-1 gba:text-sm gba:text-gray-500">
              No performance data found for the selected time period.
            </p>
          </div>
        ) : (
          <div className="gba:h-80" data-testid={`${DATA_TEST_ID_PREFIX}-chart`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trendsData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 20
                }}
              >
                <XAxis dataKey="period" tick={{ fontSize: 12 }} tickFormatter={formatXAxisLabel} stroke="#666" />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} stroke="#666" />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  stroke="#666"
                  tickFormatter={value =>
                    new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'EUR',
                      notation: 'compact',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 1
                    }).format(value)
                  }
                />
                <Tooltip
                  formatter={formatTooltip}
                  labelFormatter={label => `Period: ${formatXAxisLabel(label)}`}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />

                {/* Converted Leads - Blue */}
                {visibleLines.convertedLeads && (
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="convertedLeads"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.1}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                    name="Converted Leads"
                  />
                )}

                {/* Contacts with Accounts - Purple */}
                {visibleLines.contactsWithAccounts && (
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="contactsWithAccounts"
                    stroke="#8B5CF6"
                    fill="#8B5CF6"
                    fillOpacity={0.1}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, stroke: '#8B5CF6', strokeWidth: 2 }}
                    name="Contacts with Accounts"
                  />
                )}

                {/* Won Opportunities - Orange */}
                {visibleLines.wonOpportunities && (
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="wonOpportunities"
                    stroke="#F59E0B"
                    fill="#F59E0B"
                    fillOpacity={0.1}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, stroke: '#F59E0B', strokeWidth: 2 }}
                    name="Won Opportunities"
                  />
                )}

                {/* Managed Accounts - Teal */}
                {visibleLines.managedAccounts && (
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="managedAccounts"
                    stroke="#06B6D4"
                    fill="#06B6D4"
                    fillOpacity={0.1}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, stroke: '#06B6D4', strokeWidth: 2 }}
                    name="Managed Accounts"
                  />
                )}

                {/* Total Sales - Green */}
                {visibleLines.totalSales && (
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="totalSales"
                    stroke="#10B981"
                    fill="#10B981"
                    fillOpacity={0.1}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
                    name="Total Sales (EUR)"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default PerformanceTrendsChart

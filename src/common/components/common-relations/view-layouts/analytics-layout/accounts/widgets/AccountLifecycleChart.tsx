import React, { useMemo } from 'react'
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

export type TimeFilter = 'month' | 'quarter' | 'sixMonths' | 'year' | 'historical'

interface AccountLifecycleChartProps {
  data: Array<{
    date: string
    count: number
    accountsCreated: number
    accountsWithOpportunities: number
    accountsActive: number
  }>
  isLoading?: boolean
  selectedTimeFilter: TimeFilter
  onTimeFilterChange: (filter: TimeFilter) => void
  visibleLines: { accountsCreated: boolean; accountsWithOpportunities: boolean; accountsActive: boolean }
  onToggleLineVisibility: (key: 'accountsCreated' | 'accountsWithOpportunities' | 'accountsActive') => void
  formatXAxisLabel: (value: string) => string
  formatTooltip: (value: any, name: string, props: any) => any[]
  moduleColor?: string
}

const DATA_TEST_ID_PREFIX = 'account-lifecycle-overview'

export const AccountLifecycleChart: React.FC<AccountLifecycleChartProps> = ({
  data,
  isLoading = false,
  selectedTimeFilter,
  onTimeFilterChange,
  visibleLines,
  onToggleLineVisibility,
  formatXAxisLabel,
  moduleColor = 'primary'
}) => {
  const timeFilterOptions = [
    { key: 'month' as TimeFilter, label: 'Last Month' },
    { key: 'quarter' as TimeFilter, label: 'Last Quarter' },
    { key: 'sixMonths' as TimeFilter, label: 'Last 6 Months' },
    { key: 'year' as TimeFilter, label: 'Last Year' },
    { key: 'historical' as TimeFilter, label: 'Historical' }
  ]

  const lineOptions = [
    { key: 'accountsCreated' as const, label: 'Accounts Created', dataKey: 'accountsCreated' },
    {
      key: 'accountsWithOpportunities' as const,
      label: 'Accounts with Opportunities',
      dataKey: 'accountsWithOpportunities'
    },
    { key: 'accountsActive' as const, label: 'Active Accounts', dataKey: 'accountsActive' }
  ]

  const chartConfig = useMemo(
    () => ({
      accountsCreated: { label: 'Accounts Created' },
      accountsWithOpportunities: { label: 'Accounts with Opportunities' },
      accountsActive: { label: 'Active Accounts' }
    }),
    []
  )

  const chartData = data

  const renderChartContent = () => {
    if (isLoading) {
      return (
        <div
          className="gba:flex gba:justify-center gba:items-center gba:h-[320px]"
          data-testid={`${DATA_TEST_ID_PREFIX}-loading`}
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
        <div className="gba:text-center gba:p-8" data-testid={`${DATA_TEST_ID_PREFIX}-empty-state`}>
          <ChartLineIcon className="gba:mx-auto gba:h-12 gba:w-12 gba:text-gray-400" />
          <h3 className="gba:mt-2 gba:text-sm gba:font-medium gba:text-gray-900">No data available</h3>
          <p className="gba:mt-1 gba:text-sm gba:text-gray-500">
            No account lifecycle data found for the selected time period.
          </p>
        </div>
      )
    }

    return (
      <ChartContainer
        config={chartConfig}
        className="gba:h-[320px] gba:w-full"
        data-testid={`${DATA_TEST_ID_PREFIX}-chart`}
      >
        <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={formatXAxisLabel} />
          <YAxis tick={{ fontSize: 12 }} />
          <ChartTooltip content={<ChartTooltipContent labelKey="date" />} />
          <ChartLegend content={<ChartLegendContent />} />
          {visibleLines.accountsCreated && (
            <Area
              type="monotone"
              dataKey="accountsCreated"
              name="accountsCreated"
              stroke={`var(--color-accountsCreated)`}
              fill={`var(--color-accountsCreated)`}
              fillOpacity={0.12}
              strokeWidth={2}
              dot={false}
            />
          )}
          {visibleLines.accountsWithOpportunities && (
            <Area
              type="monotone"
              dataKey="accountsWithOpportunities"
              name="accountsWithOpportunities"
              stroke={`var(--color-accountsWithOpportunities)`}
              fill={`var(--color-accountsWithOpportunities)`}
              fillOpacity={0.12}
              strokeWidth={2}
              dot={false}
            />
          )}
          {visibleLines.accountsActive && (
            <Area
              type="monotone"
              dataKey="accountsActive"
              name="accountsActive"
              stroke={`var(--color-accountsActive)`}
              fill={`var(--color-accountsActive)`}
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
    <Card data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={ChartLineIcon} variant={moduleColor as any} size="md" decorative />
            Account Lifecycle Overview
          </CardTitle>
          <div className="gba:flex gba:items-center gba:gap-2">
            <CalendarIcon size={16} className="gba:text-gray-500" />
            <div className="gba:flex gba:gap-1" data-testid={`${DATA_TEST_ID_PREFIX}-time-filters`}>
              {timeFilterOptions.map(option => (
                <Button
                  key={option.key}
                  variant={selectedTimeFilter === option.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onTimeFilterChange(option.key)}
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
              <span className="gba:text-sm gba:font-medium gba:text-gray-700">Show Lines:</span>
            </div>
            <div className="gba:flex gba:flex-wrap gba:gap-4" data-testid={`${DATA_TEST_ID_PREFIX}-line-filters`}>
              {lineOptions.map(line => (
                <label
                  key={line.key}
                  className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer"
                  data-testid={`${DATA_TEST_ID_PREFIX}-line-filter-${line.key}`}
                >
                  <Checkbox checked={visibleLines[line.key]} onCheckedChange={() => onToggleLineVisibility(line.key)} />
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

export default AccountLifecycleChart

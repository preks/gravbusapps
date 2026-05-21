import React, { useMemo, useState } from 'react'
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
import {
  TIME_FILTER_OPTIONS,
  formatLifecycleXAxisLabel,
  getCurrentFilterLabel,
  createChartTooltipFormatter
} from '../../shared/lifecycleChartUtils'
import type { TimeFilter } from '../../shared/lifecycleChartUtils'
import { LifecycleChartLoadingState } from '../../shared/LifecycleChartLoadingState'

// Re-export TimeFilter for backward compatibility
export type { TimeFilter } from '../../shared/lifecycleChartUtils'

interface AccountLifecycleChartProps {
  data: Array<{
    date: string
    endDate: string
    count: number
    accountsCreated: number
    accountsWithOpportunities: number
  }>
  isLoading?: boolean
  selectedTimeFilter: TimeFilter
  onTimeFilterChange: (filter: TimeFilter) => void
  moduleColor?: string
  onPointClick?: (
    label: string,
    date: string,
    endDate: string,
    metric: 'accountsCreated' | 'accountsWithOpportunities'
  ) => void
}

const DATA_TEST_ID_PREFIX = 'account-lifecycle-overview'

export const AccountLifecycleChart: React.FC<AccountLifecycleChartProps> = ({
  data,
  isLoading = false,
  selectedTimeFilter,
  onTimeFilterChange,
  moduleColor = 'primary',
  onPointClick
}) => {
  const [visibleLines, setVisibleLines] = useState({
    accountsCreated: true,
    accountsWithOpportunities: true
  })

  // Chart configuration - must be called before early return
  const chartConfig = useMemo(
    () => ({
      accountsCreated: { label: 'Accounts Created' },
      accountsWithOpportunities: { label: 'Accounts with Opportunities' }
    }),
    []
  )

  const tooltipFormatter = useMemo(() => createChartTooltipFormatter(chartConfig), [chartConfig])

  // Non-hook logic can come after hooks but before early returns
  const lineOptions: Array<{ key: keyof typeof visibleLines; label: string }> = [
    { key: 'accountsCreated', label: 'Accounts Created' },
    { key: 'accountsWithOpportunities', label: 'Accounts with Opportunities' }
  ]

  const toggleLineVisibility = (lineKey: keyof typeof visibleLines) => {
    setVisibleLines(prev => ({
      ...prev,
      [lineKey]: !prev[lineKey]
    }))
  }

  const currentFilterLabel = getCurrentFilterLabel(selectedTimeFilter)

  // Early return AFTER all hooks
  if (isLoading) {
    return (
      <LifecycleChartLoadingState
        title="Account Lifecycle Overview"
        selectedTimeFilter={selectedTimeFilter}
        lineOptions={lineOptions}
        moduleColor={moduleColor}
        dataTestIdPrefix={DATA_TEST_ID_PREFIX}
      />
    )
  }

  const chartData = data

  const renderChartContent = () => {
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
        className={`gba:h-[400px] gba:w-full gba:aspect-auto gba:[&_.recharts-tooltip-cursor]:hidden${onPointClick ? ' gba:cursor-pointer' : ''}`}
        data-testid={`${DATA_TEST_ID_PREFIX}-chart`}
      >
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          onClick={clickData => {
            if (!onPointClick || clickData?.activeTooltipIndex == null) return
            const point = chartData[clickData.activeTooltipIndex as number]
            if (!point) return
            const label = formatLifecycleXAxisLabel(point.date, selectedTimeFilter)
            const metric = visibleLines.accountsCreated ? 'accountsCreated' : 'accountsWithOpportunities'
            onPointClick(label, point.date, point.endDate, metric)
          }}
        >
          <XAxis
            dataKey="date"
            tickLine={false}
            tickFormatter={value => formatLifecycleXAxisLabel(value, selectedTimeFilter)}
          />
          <YAxis tickLine={false} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent labelKey="date" formatter={tooltipFormatter} />} />
          <ChartLegend content={<ChartLegendContent />} />
          {visibleLines.accountsCreated && (
            <Area
              type="monotone"
              dataKey="accountsCreated"
              name="accountsCreated"
              stroke={`var(--color-accountsCreated)`}
              fill={`var(--color-accountsCreated)`}
              fillOpacity={0.2}
              strokeWidth={2}
              activeDot={{ r: 6 }}
            />
          )}
          {visibleLines.accountsWithOpportunities && (
            <Area
              type="monotone"
              dataKey="accountsWithOpportunities"
              name="accountsWithOpportunities"
              stroke={`var(--color-accountsWithOpportunities)`}
              fill={`var(--color-accountsWithOpportunities)`}
              fillOpacity={0.2}
              strokeWidth={2}
              activeDot={{ r: 6 }}
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
            Account Lifecycle Overview ({currentFilterLabel})
          </CardTitle>
          <div className="gba:flex gba:items-center gba:gap-2">
            <CalendarIcon size={16} className="gba:text-gray-500" />
            <div className="gba:flex gba:gap-1" data-testid={`${DATA_TEST_ID_PREFIX}-time-filters`}>
              {TIME_FILTER_OPTIONS.map(option => (
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
      <CardContent>{renderChartContent()}</CardContent>
    </Card>
  )
}

export default AccountLifecycleChart

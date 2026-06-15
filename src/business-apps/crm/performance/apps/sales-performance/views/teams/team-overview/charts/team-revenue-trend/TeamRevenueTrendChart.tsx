import React, { useCallback, useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  Spinner,
  Alert,
  Button
} from '@newwork/nw-design-system'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ChartLineIcon, ArrowClockwiseIcon } from '@phosphor-icons/react'
import type { TimeFilter } from '../../../../../types'
import { ChartEmptyOverlay } from '../shared/ChartEmptyOverlay'
import { ChartCardHeader } from '../shared/ChartCardHeader'
import { TimeFilterControls } from '../shared/TimeFilterControls'
import { formatAxisCurrency, formatTooltipCurrency } from '../shared/chartFormatters'
import { CHART_HEIGHT_CLASS, CHART_MARGIN, Y_AXIS_WIDTH, getYAxisDomain } from '../shared/chartLayoutConstants'
import { useTeamRevenueTrend } from './hooks/useTeamRevenueTrend'
import type { TeamRevenueTrendChartProps } from './types'

const DATA_TEST_ID_PREFIX = 'TeamRevenueTrendChart'

export const TeamRevenueTrendChart: React.FC<TeamRevenueTrendChartProps> = ({
  accessToken,
  teamMemberIds,
  currencyCode
}) => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('sixMonths')
  const { revenueTrend, isLoading, error, refetch } = useTeamRevenueTrend({
    accessToken,
    teamMemberIds,
    currencyCode,
    timeFilter
  })

  const revenueTrendChartConfig = useMemo(
    () => ({
      revenue: { label: 'Won Revenue', color: 'var(--nw-chart-1)' }
    }),
    []
  )

  const formatTrendXAxisLabel = useCallback(
    (value: string) => {
      if (timeFilter === 'historical') {
        return value
      }

      const point = revenueTrend.find(item => item.periodLabel === value)
      if (!point) {
        return value
      }

      const date = new Date(point.startDate)

      if (timeFilter === 'month') {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }

      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    },
    [revenueTrend, timeFilter]
  )

  const trendYAxisDomain = useMemo(() => getYAxisDomain(revenueTrend.map(point => point.revenue)), [revenueTrend])
  const hasTrendValues = revenueTrend.some(point => point.revenue > 0)
  const showChart = !isLoading || revenueTrend.length > 0

  return (
    <Card data-testid={DATA_TEST_ID_PREFIX}>
      <CardHeader>
        <ChartCardHeader
          icon={ChartLineIcon}
          title="Team Revenue Trend"
          controls={
            <TimeFilterControls
              selectedTimeFilter={timeFilter}
              onTimeFilterChange={setTimeFilter}
              testIdPrefix={DATA_TEST_ID_PREFIX}
            />
          }
        />
      </CardHeader>
      <CardContent>
        {isLoading && revenueTrend.length === 0 ? (
          <div className={`gba:flex gba:items-center gba:justify-center ${CHART_HEIGHT_CLASS}`}>
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {error && (
              <div className="gba:mb-4 gba:flex gba:items-center gba:justify-between gba:gap-4">
                <Alert variant="destructive" title="Error loading revenue trend" description={error} />
                <Button variant="outline" size="sm" onClick={refetch} data-testid={`${DATA_TEST_ID_PREFIX}-retry`}>
                  <ArrowClockwiseIcon className="gba:mr-2 gba:h-4 gba:w-4" />
                  Retry
                </Button>
              </div>
            )}
            {showChart && (
              <div className="gba:relative">
                <ChartContainer config={revenueTrendChartConfig} className={CHART_HEIGHT_CLASS}>
                  <AreaChart data={revenueTrend} margin={CHART_MARGIN}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="periodLabel"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={formatTrendXAxisLabel}
                    />
                    <YAxis
                      width={Y_AXIS_WIDTH}
                      tickLine={false}
                      axisLine={false}
                      domain={trendYAxisDomain}
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={value => formatAxisCurrency(Number(value), currencyCode)}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent formatter={value => formatTooltipCurrency(Number(value), currencyCode)} />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      fill="var(--color-revenue)"
                      fillOpacity={hasTrendValues ? 0.2 : 0}
                      stroke="var(--color-revenue)"
                      strokeWidth={2}
                      name="Won Revenue"
                      dot={hasTrendValues ? { r: 3 } : false}
                      activeDot={hasTrendValues ? { r: 5 } : false}
                    />
                  </AreaChart>
                </ChartContainer>
                {!hasTrendValues && revenueTrend.length > 0 && (
                  <ChartEmptyOverlay
                    icon={ChartLineIcon}
                    title="No data available"
                    description="No won revenue found for the selected time period."
                    testId={`${DATA_TEST_ID_PREFIX}-empty-overlay`}
                  />
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default TeamRevenueTrendChart

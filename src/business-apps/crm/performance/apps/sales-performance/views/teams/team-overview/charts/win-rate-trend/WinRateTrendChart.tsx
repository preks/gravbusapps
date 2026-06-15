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
import { TargetIcon, ArrowClockwiseIcon } from '@phosphor-icons/react'
import type { TimeFilter } from '../../../../../types'
import { ChartEmptyOverlay } from '../shared/ChartEmptyOverlay'
import { ChartCardHeader } from '../shared/ChartCardHeader'
import { TimeFilterControls } from '../shared/TimeFilterControls'
import { CHART_HEIGHT_CLASS, CHART_MARGIN, Y_AXIS_WIDTH, getYAxisDomain } from '../shared/chartLayoutConstants'
import { useWinRateTrend } from './hooks/useWinRateTrend'
import type { WinRateTrendChartProps } from './types'

const DATA_TEST_ID_PREFIX = 'WinRateTrendChart'

const formatWinRateAxis = (value: number): string => `${Math.round(Number(value))}%`

const formatWinRateTooltip = (value: number, closedCount: number, wonCount: number): string => {
  return `${Number(value).toFixed(1)}% (${wonCount} won / ${closedCount} closed)`
}

export const WinRateTrendChart: React.FC<WinRateTrendChartProps> = ({ accessToken, teamMemberIds, currencyCode }) => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('sixMonths')
  const { winRateTrend, isLoading, error, refetch } = useWinRateTrend({
    accessToken,
    teamMemberIds,
    currencyCode,
    timeFilter
  })

  const chartConfig = useMemo(
    () => ({
      winRate: { label: 'Win Rate', color: 'var(--nw-chart-4)' }
    }),
    []
  )

  const formatTrendXAxisLabel = useCallback(
    (value: string) => {
      if (timeFilter === 'historical') {
        return value
      }

      const point = winRateTrend.find(item => item.periodLabel === value)
      if (!point) {
        return value
      }

      const date = new Date(point.startDate)

      if (timeFilter === 'month') {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }

      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    },
    [winRateTrend, timeFilter]
  )

  const winRateYAxisDomain = useMemo(() => getYAxisDomain(winRateTrend.map(point => point.winRate)), [winRateTrend])
  const hasValues = winRateTrend.some(point => point.closedCount > 0)
  const showChart = !isLoading || winRateTrend.length > 0

  return (
    <Card data-testid={DATA_TEST_ID_PREFIX}>
      <CardHeader>
        <ChartCardHeader
          icon={TargetIcon}
          title="Win Rate Trend"
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
        {isLoading && winRateTrend.length === 0 ? (
          <div className={`gba:flex gba:items-center gba:justify-center ${CHART_HEIGHT_CLASS}`}>
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {error && (
              <div className="gba:mb-4 gba:flex gba:items-center gba:justify-between gba:gap-4">
                <Alert variant="destructive" title="Error loading win rate trend" description={error} />
                <Button variant="outline" size="sm" onClick={refetch} data-testid={`${DATA_TEST_ID_PREFIX}-retry`}>
                  <ArrowClockwiseIcon className="gba:mr-2 gba:h-4 gba:w-4" />
                  Retry
                </Button>
              </div>
            )}
            {showChart && (
              <div className="gba:relative">
                <ChartContainer config={chartConfig} className={CHART_HEIGHT_CLASS}>
                  <AreaChart data={winRateTrend} margin={CHART_MARGIN}>
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
                      domain={winRateYAxisDomain}
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={formatWinRateAxis}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, _name, item) =>
                            formatWinRateTooltip(
                              Number(value),
                              item?.payload?.closedCount ?? 0,
                              item?.payload?.wonCount ?? 0
                            )
                          }
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="winRate"
                      fill="var(--color-winRate)"
                      fillOpacity={hasValues ? 0.2 : 0}
                      stroke="var(--color-winRate)"
                      strokeWidth={2}
                      name="Win Rate"
                      dot={hasValues ? { r: 3 } : false}
                      activeDot={hasValues ? { r: 5 } : false}
                    />
                  </AreaChart>
                </ChartContainer>
                {!hasValues && winRateTrend.length > 0 && (
                  <ChartEmptyOverlay
                    icon={TargetIcon}
                    title="No data available"
                    description="No closed opportunities found for the selected time period."
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

export default WinRateTrendChart

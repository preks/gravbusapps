import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  IconAvatar,
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent
} from '@newwork/nw-design-system'
import { TrendUpIcon } from '@phosphor-icons/react'
import { ComposedChart, Area, XAxis, YAxis } from 'recharts'
import { ActivityTimelineTooltip } from '../../shared/tooltips/ActivityTimelineTooltip'
import type { ActivityHeatmapData } from '../../hooks'

export interface ActivityHeatmapChartProps {
  data: ActivityHeatmapData[]
  isLoading?: boolean
  moduleColor?: string
  onDateClick?: (date: string, fullDate: string) => void
}

export const ActivityHeatmapChart: React.FC<ActivityHeatmapChartProps> = ({
  data,
  isLoading,
  moduleColor = 'default',
  onDateClick
}) => {
  // Chart config for timeline
  const timelineChartConfig = useMemo(
    () => ({
      activities: { label: 'Total Activities' }
    }),
    []
  )

  const totalActivities = useMemo(() => {
    return data.reduce((sum, d) => sum + d.activities, 0)
  }, [data])

  const avgActivitiesPerDay = useMemo(() => {
    return data.length > 0 ? (totalActivities / data.length).toFixed(1) : '0'
  }, [totalActivities, data.length])

  const peakActivity = useMemo(() => {
    return data.length > 0 ? Math.max(...data.map(d => d.activities)) : 0
  }, [data])

  if (isLoading) {
    return (
      <Card data-testid="activity-timeline-loading">
        <CardHeader className="gba:flex gba:items-center gba:gap-3">
          <IconAvatar
            icon={TrendUpIcon}
            variant={moduleColor as any}
            size="md"
            iconWeight="regular"
            decorative={true}
          />
          <div>
            <CardTitle>Activity Timeline (Last 30 Days)</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:items-center gba:justify-center gba:h-64">
            <div className="gba:animate-pulse gba:text-gray-500">Loading activity data...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0 || totalActivities === 0) {
    return (
      <Card data-testid="activity-timeline-empty">
        <CardHeader className="gba:flex gba:items-center gba:gap-3">
          <IconAvatar
            icon={TrendUpIcon}
            variant={moduleColor as any}
            size="md"
            iconWeight="regular"
            decorative={true}
          />
          <div>
            <CardTitle>Activity Timeline (Last 30 Days)</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="gba:text-center gba:py-8 gba:text-gray-500">
            No activity data available for the last 30 days
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid="activity-timeline-chart">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={TrendUpIcon} variant={moduleColor as any} size="md" iconWeight="regular" decorative={true} />
        <div>
          <CardTitle>Activity Timeline (Last 30 Days)</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="gba:space-y-6">
          {/* Statistics Summary */}
          <div className="gba:grid gba:grid-cols-3 gba:gap-4 gba:text-sm gba:bg-gray-50 gba:p-4 gba:rounded-lg">
            <div className="gba:text-center">
              <div className="gba:font-bold gba:text-lg gba:text-gray-900">{totalActivities}</div>
              <div className="gba:text-gray-600">Total Activities</div>
            </div>
            <div className="gba:text-center">
              <div className="gba:font-bold gba:text-lg gba:text-gray-900">{avgActivitiesPerDay}</div>
              <div className="gba:text-gray-600">Avg per Day</div>
            </div>
            <div className="gba:text-center">
              <div className="gba:font-bold gba:text-lg gba:text-gray-900">{peakActivity}</div>
              <div className="gba:text-gray-600">Peak Activity</div>
            </div>
          </div>

          {/* Timeline Chart */}
          <ChartContainer
            config={timelineChartConfig}
            className={`gba:h-[300px] gba:w-full ${onDateClick ? 'gba:cursor-pointer' : ''}`}
          >
            <ComposedChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              onClick={
                onDateClick
                  ? (chartData: any) => {
                      // activePayload is set when hovering before click
                      const payload = chartData?.activePayload?.[0]?.payload as ActivityHeatmapData | undefined
                      if (payload?.fullDate) {
                        onDateClick(payload.date, payload.fullDate)
                        return
                      }
                      // Fallback: match by activeLabel (the date tick label)
                      const activeLabel = chartData?.activeLabel as string | undefined
                      if (activeLabel) {
                        const found = data.find(d => d.date === activeLabel)
                        if (found) onDateClick(found.date, found.fullDate)
                      }
                    }
                  : undefined
              }
            >
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={80}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 12 }} />
              <ChartTooltip content={ActivityTimelineTooltip} />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                type="monotone"
                dataKey="activities"
                fill="var(--color-activities)"
                fillOpacity={0.2}
                stroke="var(--color-activities)"
                strokeWidth={2}
                name="Total Activities"
                dot={onDateClick ? { r: 4, style: { cursor: 'pointer' } } : { r: 3 }}
                activeDot={
                  onDateClick
                    ? {
                        r: 6,
                        style: { cursor: 'pointer' },
                        onClick: (_event: any, dotPayload: any) => {
                          const point = dotPayload?.payload as ActivityHeatmapData | undefined
                          if (point?.fullDate) onDateClick(point.date, point.fullDate)
                        }
                      }
                    : { r: 5 }
                }
              />
            </ComposedChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export default ActivityHeatmapChart

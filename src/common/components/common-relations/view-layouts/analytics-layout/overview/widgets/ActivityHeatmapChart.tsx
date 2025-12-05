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
import { TrendUp } from '@phosphor-icons/react'
import { ComposedChart, Area, XAxis, YAxis } from 'recharts'

export interface ActivityHeatmapData {
  date: string
  fullDate: string
  activities: number
}

export interface ActivityHeatmapChartProps {
  data: ActivityHeatmapData[]
  isLoading?: boolean
  moduleColor?: string
}

interface TimelineTooltipProps {
  active?: boolean
  payload?: readonly any[]
}

const TimelineTooltip: React.FC<TimelineTooltipProps> = ({ active, payload }) => {
  if (active && payload?.length) {
    const data = payload[0].payload
    return (
      <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
        <div className="gba:mb-2 gba:font-medium gba:text-gray-700">{data.fullDate}</div>
        <div className="gba:flex gba:items-center gba:gap-2">
          <div className="gba:w-3 gba:h-3 gba:rounded-full" style={{ backgroundColor: 'var(--color-activities)' }} />
          <span className="gba:font-medium">Activities:</span>
          <span className="gba:font-semibold">{data.activities}</span>
        </div>
      </div>
    )
  }
  return null
}

export const ActivityHeatmapChart: React.FC<ActivityHeatmapChartProps> = ({
  data,
  isLoading,
  moduleColor = 'default'
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
          <IconAvatar icon={TrendUp} variant={moduleColor as any} size="md" iconWeight="regular" decorative={true} />
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
          <IconAvatar icon={TrendUp} variant={moduleColor as any} size="md" iconWeight="regular" decorative={true} />
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
        <IconAvatar icon={TrendUp} variant={moduleColor as any} size="md" iconWeight="regular" decorative={true} />
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
          <ChartContainer config={timelineChartConfig} className="gba:h-[300px] gba:w-full">
            <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={80}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 12 }} />
              <ChartTooltip content={TimelineTooltip} />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                type="monotone"
                dataKey="activities"
                fill="var(--color-activities)"
                fillOpacity={0.2}
                stroke="var(--color-activities)"
                strokeWidth={2}
                name="Total Activities"
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export default ActivityHeatmapChart

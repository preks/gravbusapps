import React, { useMemo } from 'react'
import { ChartContainer, ChartTooltip } from '@newwork/nw-design-system'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { OfficeAttendanceRecord, SiteLocationCapacity, Granularity } from '../../types'
import { formatDate, getWeekIdentifier, getDatesInRange, getWeeksInRange } from '../../utils/dateUtils'

interface CapacityUsageChartProps {
  attendance: OfficeAttendanceRecord[]
  locations: SiteLocationCapacity[]
  granularity: Granularity
  dateFrom: string
  dateTo: string
  prefixDataTestId?: string
}

export const CapacityUsageChart: React.FC<CapacityUsageChartProps> = ({
  attendance,
  locations,
  granularity,
  dateFrom,
  dateTo,
  prefixDataTestId = 'capacity-usage-chart'
}) => {
  // Calculate chart data based on granularity
  const chartData = useMemo(() => {
    if (locations.length === 0) return []

    const totalCapacity = locations.reduce((sum, loc) => sum + loc.capacity, 0)

    // Group attendance by date or week
    const groupedData = new Map<string, Set<string>>()

    attendance.forEach(record => {
      const key = granularity === 'day' ? record.attendanceDate : getWeekIdentifier(record.attendanceDate)

      if (!groupedData.has(key)) {
        groupedData.set(key, new Set())
      }
      groupedData.get(key)!.add(record.employeeId)
    })

    // Ensure every day/week in range is present (fill zeros)
    const keysInRange = granularity === 'day' ? getDatesInRange(dateFrom, dateTo) : getWeeksInRange(dateFrom, dateTo)

    const data = keysInRange.map(dateKey => {
      const employees = groupedData.get(dateKey)
      const occupiedCount = employees ? employees.size : 0
      const occupancyPercentage = totalCapacity > 0 ? (occupiedCount / totalCapacity) * 100 : 0

      return {
        date: granularity === 'day' ? formatDate(dateKey) : dateKey,
        occupancy: Math.round(occupancyPercentage),
        capacity: 100
      }
    })

    // Compute a simple moving average to provide a smoother trend line
    const windowSize = granularity === 'day' ? 7 : 3
    const withAverage = data.map((entry, index, arr) => {
      const start = Math.max(0, index - windowSize + 1)
      const window = arr.slice(start, index + 1)
      const avg =
        window.reduce((sum, item) => {
          return sum + item.occupancy
        }, 0) / window.length

      return {
        ...entry,
        occupancyAvg: Math.round(avg)
      }
    })

    return withAverage
  }, [attendance, locations, granularity, dateFrom, dateTo])

  const chartConfig = {
    // Keys here define CSS variables like --color-occupancy, --color-capacity, --color-occupancyavg
    occupancy: { label: 'Office Usage' },
    capacity: { label: '100% Capacity' },
    occupancyavg: { label: 'Trend' }
  }

  // Custom tooltip that hides the capacity baseline and shows clear labels
  const UsageTooltip = (props: any) => {
    const { active, label, payload } = props || {}
    if (!active || !payload || payload.length === 0) return null

    const items = (payload as any[]).filter(p => p.dataKey !== 'capacity')
    if (items.length === 0) return null

    const getLabelForKey = (key: string) => {
      if (key === 'occupancy') return 'Office Usage'
      if (key === 'occupancyAvg') return 'Trend'
      return key
    }

    return (
      <div className="gba:bg-popover gba:text-popover-foreground gba:border gba:border-border gba:rounded-md gba:shadow-sm gba:px-3 gba:py-2 gba:text-sm">
        <div className="gba:font-semibold gba:mb-1">Date: {label}</div>
        {items.map(item => {
          const value = typeof item.value === 'number' ? Math.round(item.value) : item.value
          return (
            <div key={item.dataKey} className="gba:flex gba:items-center gba:gap-2">
              <span>{value}%</span>
              <span>{getLabelForKey(item.dataKey)}</span>
            </div>
          )
        })}
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div
        className="gba:h-64 gba:flex gba:items-center gba:justify-center gba:bg-muted/20 gba:rounded"
        data-testid={`${prefixDataTestId}-empty`}
      >
        <p className="gba:text-sm gba:text-muted-foreground">No attendance data available for chart visualization</p>
      </div>
    )
  }

  return (
    <div data-testid={prefixDataTestId}>
      <ChartContainer config={chartConfig} className="gba:w-full gba:max-w-none gba:h-64 md:gba:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="gba:stroke-muted" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--foreground))', strokeWidth: 1 }}
              tickMargin={8}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--foreground))', strokeWidth: 1 }}
              tickMargin={8}
              domain={[0, 100]}
              tickFormatter={value => `${value}%`}
            />
            <ChartTooltip content={<UsageTooltip />} />
            <Line
              type="monotone"
              dataKey="capacity"
              stroke="var(--color-capacity)"
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
              name="100% Capacity"
            />
            <Line
              type="monotone"
              dataKey="occupancy"
              stroke="var(--color-occupancy)"
              strokeWidth={2}
              connectNulls
              dot={{ r: 3, fill: 'var(--color-occupancy)' }}
              activeDot={{ r: 6 }}
              name="Office Usage"
            />
            <Line
              type="monotone"
              dataKey="occupancyAvg"
              stroke="var(--color-occupancyavg)"
              strokeWidth={2}
              strokeDasharray="4 2"
              connectNulls
              dot={false}
              name="Trend"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Mini legend under the graph (outside to ensure full-width centering; black line samples) */}
      <div className="gba:mt-3 gba:w-full gba:flex gba:justify-center gba:items-center gba:gap-6 gba:text-xs gba:text-foreground">
        <div className="gba:flex gba:items-center gba:gap-2">
          <svg width="44" height="8" viewBox="0 0 44 8" aria-hidden="true">
            <line
              x1="1"
              y1="4"
              x2="43"
              y2="4"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              color="var(--nw-chart-3)"
            />
          </svg>
          <span>Value</span>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2">
          <svg width="44" height="8" viewBox="0 0 44 8" aria-hidden="true">
            <line
              x1="1"
              y1="4"
              x2="43"
              y2="4"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="butt"
              strokeDasharray="2 2"
              color="var(--nw-chart-1)"
            />
          </svg>
          <span>Trend</span>
        </div>
      </div>
    </div>
  )
}

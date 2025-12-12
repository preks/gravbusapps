import React, { useMemo } from 'react'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@newwork/nw-design-system'
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

    return data
  }, [attendance, locations, granularity, dateFrom, dateTo])

  const chartConfig = {
    occupancy: {
      label: 'Office Usage',
      color: 'hsl(var(--primary))'
    },
    capacity: {
      label: '100% Capacity',
      color: 'hsl(var(--muted-foreground))'
    }
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
            <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              domain={[0, 100]}
              tickFormatter={value => `${value}%`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={value => `Date: ${value}`}
                  formatter={(value, name) => [`${value}%`, name === 'occupancy' ? 'Office Usage' : '100% Capacity']}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="capacity"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
              name="100% Capacity"
            />
            <Line
              type="monotone"
              dataKey="occupancy"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              dot={{ r: 4, fill: 'hsl(var(--primary))' }}
              activeDot={{ r: 6 }}
              name="Office Usage"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  )
}

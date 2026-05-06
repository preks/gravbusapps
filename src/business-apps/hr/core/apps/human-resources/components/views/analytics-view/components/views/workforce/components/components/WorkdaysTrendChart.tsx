import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Spinner } from '@newwork/nw-design-system'
import { WorkdaysTrendData } from '../../../../../hooks/usePerformanceData'

interface WorkdaysTrendChartProps {
  data: WorkdaysTrendData[]
  isLoading: boolean
  dataTestId: string
}

const WorkdaysTrendChart: React.FC<WorkdaysTrendChartProps> = ({ data, isLoading, dataTestId }) => {
  if (isLoading) {
    return (
      <div data-testid={`${dataTestId}-loading`} className="gba:flex gba:justify-center gba:items-center gba:h-full">
        <Spinner className="gba:w-8 gba:h-8" />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div data-testid={`${dataTestId}-empty`} className="gba:flex gba:justify-center gba:items-center gba:h-full">
        <div className="gba:text-center gba:text-muted-foreground">
          <p>No trend data available</p>
          <p className="gba:text-sm gba:mt-1">Workdays trend will appear when data is available</p>
        </div>
      </div>
    )
  }

  // Transform data for chart display
  const chartData = data.map(item => ({
    month: item.month,
    displayMonth: new Date(item.month + '-01').toLocaleDateString('en-US', {
      month: 'short',
      year: '2-digit'
    }),
    workdays: item.workdays,
    employees: item.employees
  }))

  const formatWorkdays = (value: number): string => {
    return value.toFixed(1)
  }

  const formatMonth = (tickItem: string): string => {
    try {
      return new Date(tickItem + '-01').toLocaleDateString('en-US', {
        month: 'short',
        year: '2-digit'
      })
    } catch {
      return tickItem
    }
  }

  return (
    <div data-testid={dataTestId} className="gba:w-full gba:h-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }} accessibilityLayer={false}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--nw-muted)" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12 }}
            stroke="var(--nw-muted-foreground)"
            tickFormatter={formatMonth}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="var(--nw-muted-foreground)"
            label={{
              value: 'Workdays',
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle' }
            }}
            domain={['dataMin - 0.5', 'dataMax + 0.5']}
          />
          <Tooltip
            labelFormatter={value => {
              try {
                return `Month: ${new Date(value + '-01').toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric'
                })}`
              } catch {
                return `Month: ${value}`
              }
            }}
            formatter={(value: number, name: string) => {
              if (name === 'workdays') {
                return [`${formatWorkdays(value)} days`, 'Avg Workdays']
              }
              if (name === 'employees') {
                return [`${value} people`, 'Employees']
              }
              return [value, name]
            }}
            contentStyle={{
              backgroundColor: 'var(--nw-primary-foreground)',
              border: '1px solid var(--nw-border)',
              borderRadius: '6px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Line
            type="monotone"
            dataKey="workdays"
            stroke="var(--nw-chart-4)"
            strokeWidth={3}
            dot={{
              fill: 'var(--nw-chart-4)',
              strokeWidth: 2,
              r: 4
            }}
            activeDot={{
              r: 6,
              stroke: 'var(--nw-chart-4)',
              strokeWidth: 2,
              fill: 'var(--nw-primary-foreground)'
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default WorkdaysTrendChart

import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Spinner } from '@newwork/nw-design-system'

interface HeadcountTrendsChartProps {
  data: Array<{
    category: string
    dateCategory: string
    value: number
  }>
  isLoading: boolean
  dataTestId: string
}

const HeadcountTrendsChart: React.FC<HeadcountTrendsChartProps> = ({ data, isLoading, dataTestId }) => {
  // Transform data for recharts format
  const chartData = data.map(item => ({
    date: new Date(item.dateCategory).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    }),
    headcount: item.value,
    fullDate: item.dateCategory
  }))

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
        <p className="gba:text-muted-foreground">No headcount data available</p>
      </div>
    )
  }

  return (
    <div data-testid={dataTestId} className="gba:w-full gba:h-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }} accessibilityLayer={false}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--nw-muted)" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="var(--nw-muted-foreground)" />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="var(--nw-muted-foreground)"
            label={{ value: 'Headcount', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            labelFormatter={value => `Month: ${value}`}
            formatter={(value: number) => [value, 'Total Headcount']}
            contentStyle={{
              backgroundColor: 'var(--nw-primary-foreground)',
              border: '1px solid var(--nw-border)',
              borderRadius: '6px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Line
            type="monotone"
            dataKey="headcount"
            stroke="var(--nw-chart-2)"
            strokeWidth={3}
            dot={{ fill: 'var(--nw-chart-2)', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: 'var(--nw-chart-2)' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default HeadcountTrendsChart

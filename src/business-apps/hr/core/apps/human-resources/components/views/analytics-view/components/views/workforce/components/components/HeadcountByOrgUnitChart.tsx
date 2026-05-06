import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Spinner } from '@newwork/nw-design-system'

interface HeadcountByOrgUnitChartProps {
  data: Array<{
    category: string
    value: number
  }>
  isLoading: boolean
  dataTestId: string
}

const HeadcountByOrgUnitChart: React.FC<HeadcountByOrgUnitChartProps> = ({ data, isLoading, dataTestId }) => {
  // Transform data for recharts format
  const chartData = data
    .map(item => ({
      orgUnit: item.category,
      headcount: item.value
    }))
    .sort((a, b) => b.headcount - a.headcount) // Sort by headcount descending

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
        <p className="gba:text-muted-foreground">No organizational unit data available</p>
      </div>
    )
  }

  return (
    <div data-testid={dataTestId} className="gba:w-full gba:h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }} accessibilityLayer={false}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--nw-muted)" />
          <XAxis
            dataKey="orgUnit"
            tick={{ fontSize: 11 }}
            stroke="var(--nw-muted-foreground)"
            angle={-45}
            textAnchor="end"
            interval={0}
            height={80}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="var(--nw-muted-foreground)"
            label={{ value: 'Headcount', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            labelFormatter={value => `Department: ${value}`}
            formatter={(value: number) => [value, 'Headcount']}
            contentStyle={{
              backgroundColor: 'var(--nw-card)',
              border: '1px solid var(--nw-border)',
              borderRadius: '6px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Bar dataKey="headcount" fill="var(--nw-chart-2)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default HeadcountByOrgUnitChart

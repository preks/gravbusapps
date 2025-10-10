import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Spinner } from '@newwork/nw-design-system'

interface TurnoverRateChartProps {
  data: Array<{
    category: string
    dateCategory: string
    value: number
  }>
  isLoading: boolean
  dataTestId: string
}

const TurnoverRateChart: React.FC<TurnoverRateChartProps> = ({ data, isLoading, dataTestId }) => {
  // Transform data for recharts format
  const chartData = data.map(item => ({
    date: new Date(item.dateCategory).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    }),
    turnoverRate: item.value,
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
        <p className="gba:text-gray-500">No turnover rate data available</p>
      </div>
    )
  }

  return (
    <div data-testid={dataTestId} className="gba:h-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#666" />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="#666"
            label={{ value: 'Turnover Rate (%)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            labelFormatter={value => `Month: ${value}`}
            formatter={(value: number) => [`${value.toFixed(1)}%`, 'Turnover Rate']}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Line
            type="monotone"
            dataKey="turnoverRate"
            stroke="#ff4d4f"
            strokeWidth={3}
            dot={{ fill: '#ff4d4f', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: '#ff4d4f' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default TurnoverRateChart

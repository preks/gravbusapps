import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Spinner, useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

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
  const { t } = useTranslation(hrTranslations)
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
        <p className="gba:text-muted-foreground">{t('hr-analytics-no-turnover-rate-data')}</p>
      </div>
    )
  }

  return (
    <div data-testid={dataTestId} className="gba:h-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--nw-muted)" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="var(--nw-muted-foreground)" />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="var(--nw-muted-foreground)"
            label={{ value: t('hr-analytics-turnover-rate-percent'), angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            labelFormatter={value => `${t('hr-analytics-month')}: ${value}`}
            formatter={(value: number) => [`${value.toFixed(1)}%`, t('hr-analytics-turnover-rate')]}
            contentStyle={{
              backgroundColor: 'var(--nw-card)',
              border: '1px solid var(--nw-border)',
              borderRadius: '6px',
              boxShadow: 'var(--nw-shadow-sm)'
            }}
          />
          <Line
            type="monotone"
            dataKey="turnoverRate"
            stroke="var(--nw-chart-6)"
            strokeWidth={3}
            dot={{ fill: 'var(--nw-chart-6)', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: 'var(--nw-chart-6)' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default TurnoverRateChart

import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Spinner, useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

interface TenureDistributionChartProps {
  data: Array<{
    category: string
    value: number
  }>
  isLoading: boolean
  dataTestId: string
}

const TenureDistributionChart: React.FC<TenureDistributionChartProps> = ({ data, isLoading, dataTestId }) => {
  const { t } = useTranslation(hrTranslations)
  // Transform data for recharts format with proper ordering
  const chartData = data
    .map(item => ({
      tenureRange: item.category,
      employees: item.value
    }))
    .sort((a, b) => {
      // Sort by tenure range order
      const order = ['< 1 year', '1-2 years', '3-5 years', '6-10 years', '11-15 years', '16-20 years', '21+ years']
      return order.indexOf(a.tenureRange) - order.indexOf(b.tenureRange)
    })

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
        <p className="gba:text-muted-foreground">{t('hr-analytics-no-tenure-distribution')}</p>
      </div>
    )
  }

  return (
    <div data-testid={dataTestId} className="gba:w-full gba:h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--nw-muted)" />
          <XAxis
            dataKey="tenureRange"
            tick={{ fontSize: 10 }}
            stroke="var(--nw-muted-foreground)"
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="var(--nw-muted-foreground)"
            label={{ value: t('hr-analytics-employees'), angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            labelFormatter={value => `${t('hr-analytics-tenure-label')}: ${value}`}
            formatter={(value: number) => [value, t('hr-analytics-employees')]}
            contentStyle={{
              backgroundColor: 'var(--nw-primary-foreground)',
              border: '1px solid var(--nw-border)',
              borderRadius: '6px',
              boxShadow: 'var(--nw-shadow-sm)'
            }}
          />
          <Bar dataKey="employees" fill="var(--nw-chart-5)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default TenureDistributionChart

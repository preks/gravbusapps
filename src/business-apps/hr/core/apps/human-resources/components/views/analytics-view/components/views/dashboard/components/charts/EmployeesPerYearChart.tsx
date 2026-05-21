import React, { useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { Spin, Empty, Result } from 'antd'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { YearlyEmployeeData } from '../../../../../hooks/useEmployeesPerYear'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

interface EmployeesPerYearChartProps {
  data: YearlyEmployeeData[]
  loading: boolean
  error?: Error | null
}

/**
 * Chart component displaying total employees per year as a bar chart with trend line
 */
const EmployeesPerYearChart: React.FC<EmployeesPerYearChartProps> = ({ data, loading, error }) => {
  const { t } = useTranslation(hrTranslations)
  // Get chart colors that automatically update with theme changes
  const chartColors = [
    'var(--nw-chart-1)',
    'var(--nw-chart-2)',
    'var(--nw-chart-3)',
    'var(--nw-chart-4)',
    'var(--nw-chart-5)',
    'var(--nw-chart-6)',
    'var(--nw-chart-7)',
    'var(--nw-chart-8)'
  ]

  // Ensure data is properly formatted and not empty
  const chartData = useMemo(() => {
    return (
      data?.map(item => ({
        year: String(item.year),
        employees: item.count
      })) || []
    )
  }, [data])

  // Prepare data for trend line
  const chartDataWithTrend = useMemo(() => {
    if (!chartData.length) return []

    // Simple moving average to smooth the trend line
    return chartData.map((item, index, array) => {
      // For first point, use itself
      if (index === 0) {
        return { ...item, trend: item.employees }
      }

      // For last point, use itself
      if (index === array.length - 1) {
        return { ...item, trend: item.employees }
      }

      // For middle points, calculate weighted average
      const prevWeight = 0.25
      const currWeight = 0.5
      const nextWeight = 0.25

      const weightedAvg =
        array[index - 1].employees * prevWeight + item.employees * currWeight + array[index + 1].employees * nextWeight

      return { ...item, trend: weightedAvg }
    })
  }, [chartData])

  let chartBody: React.ReactNode
  if (loading) {
    chartBody = (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:h-full"
        data-testid="employees-per-year-chart-loading"
      >
        <Spin size="large" />
      </div>
    )
  } else if (error) {
    const errorSubTitle = error.toString().includes('CORS') ? 'API access blocked by CORS policy' : error.toString()
    chartBody = (
      <div
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full"
        data-testid="employees-per-year-chart-error"
      >
        <Result status="warning" title={t('hr-analytics-data-error')} subTitle={errorSubTitle} />
      </div>
    )
  } else if (chartData.length === 0) {
    chartBody = (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:h-full"
        data-testid="employees-per-year-chart-empty"
      >
        <Empty description={t('hr-analytics-no-data')} />
      </div>
    )
  } else {
    chartBody = (
      <div className="gba:h-full" data-testid="employees-chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartDataWithTrend}
            margin={{ top: 15, right: 30, left: 20, bottom: 25 }}
            barSize={24}
            accessibilityLayer={false}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--nw-border)" />
            <XAxis
              dataKey="year"
              axisLine={{ stroke: 'var(--nw-border)' }}
              tickLine={false}
              tick={{ fill: 'var(--nw-muted-foreground)', fontSize: 12 }}
              dy={10}
              label={{
                value: t('hr-analytics-chart-year'),
                position: 'insideBottom',
                offset: -15,
                fill: 'var(--nw-muted-foreground)',
                fontSize: 12
              }}
            />
            <YAxis
              axisLine={{ stroke: 'var(--nw-border)' }}
              tickLine={false}
              tick={{ fill: 'var(--nw-muted-foreground)', fontSize: 12 }}
              width={60}
              label={{
                value: t('hr-analytics-chart-employees'),
                angle: -90,
                position: 'insideLeft',
                dy: 50,
                fill: 'var(--nw-muted-foreground)',
                fontSize: 12
              }}
            />
            <Tooltip
              cursor={{ fill: 'var(--nw-muted)' }}
              contentStyle={{
                borderRadius: 4,
                border: '1px solid var(--nw-border)',
                boxShadow: 'var(--nw-shadow-md)',
                padding: '8px 12px',
                backgroundColor: 'var(--nw-card)',
                color: 'var(--nw-card-foreground)'
              }}
              formatter={(value, name) => {
                const label = name === 'trend' ? t('hr-analytics-trend') : t('hr-analytics-employees')
                return [`${typeof value === 'number' ? value.toFixed(0) : value}`, label]
              }}
              labelStyle={{ fontWeight: 'bold', marginBottom: 5 }}
            />
            <Legend
              wrapperStyle={{
                paddingTop: 20,
                fontSize: 12,
                color: 'var(--nw-muted-foreground)'
              }}
              verticalAlign="bottom"
              height={36}
            />
            <Bar
              dataKey="employees"
              name={t('hr-analytics-chart-employees')}
              fill={chartColors[0]}
              radius={[4, 4, 0, 0]}
              animationDuration={1500}
              animationEasing="ease"
            />
            <Line
              type="monotone"
              dataKey="trend"
              name={t('hr-analytics-trend')}
              stroke="var(--nw-foreground)"
              strokeWidth={2}
              dot={{ fill: 'var(--nw-foreground)', r: 4 }}
              activeDot={{ fill: 'var(--nw-foreground)', r: 6, stroke: 'var(--nw-card)', strokeWidth: 2 }}
              animationDuration={2000}
              animationEasing="ease"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div className="gba:w-full gba:h-full" data-testid="employees-per-year-chart">
      {chartBody}
    </div>
  )
}

export default EmployeesPerYearChart

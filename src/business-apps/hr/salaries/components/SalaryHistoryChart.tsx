import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { SalaryHistory } from '../types/salaryTypes'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import dayjs from 'dayjs'

interface SalaryHistoryChartProps {
  historyData: SalaryHistory[]
  loading?: boolean
}

/**
 * SalaryHistoryChart component for visualizing salary history over time
 * Uses recharts library for chart visualization
 */
const SalaryHistoryChart: React.FC<SalaryHistoryChartProps> = ({ historyData, loading = false }) => {
  const locale = getCurrentActiveUserLocale()

  // Format data for the chart
  const chartData = historyData
    .sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime())
    .map(item => ({
      date: dayjs(item.effectiveDate).format('MMM YYYY'),
      amount: item.newAmount,
      previousAmount: item.previousAmount || 0,
      timestamp: new Date(item.effectiveDate).getTime() // For sorting
    }))

  // Format currency for tooltip
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: historyData[0]?.currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="gba:bg-primary-foreground gba:p-3 gba:border gba:rounded gba:shadow-sm">
          <p className="gba:font-medium">{label}</p>
          <p className="gba:text-info">
            {getTranslationFromI18nKeyAndLabel('salary.chart.newAmount', 'New Amount')}:{' '}
            {formatCurrency(payload[0].value)}
          </p>
          {payload[1]?.value > 0 && (
            <p className="gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('salary.chart.previousAmount', 'Previous Amount')}:{' '}
              {formatCurrency(payload[1].value)}
            </p>
          )}
          {payload[0].value > 0 && payload[1].value > 0 && (
            <p className="gba:text-success">
              {getTranslationFromI18nKeyAndLabel('salary.chart.change', 'Change')}:{' '}
              {formatCurrency(payload[0].value - payload[1].value)} (
              {((payload[0].value / payload[1].value - 1) * 100).toFixed(1)}%)
            </p>
          )}
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div
        data-testid="salary-history-chart-loading"
        className="gba:h-64 gba:flex gba:items-center gba:justify-center gba:bg-muted gba:rounded-md"
      >
        <p className="gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel('salary.chart.loading', 'Loading chart data...')}
        </p>
      </div>
    )
  }

  if (!historyData.length) {
    return (
      <div
        data-testid="salary-history-chart-empty"
        className="gba:h-64 gba:flex gba:items-center gba:justify-center gba:bg-muted gba:rounded-md"
      >
        <p className="gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel('salary.chart.noData', 'No salary history data available')}
        </p>
      </div>
    )
  }

  return (
    <div data-testid="salary-history-chart-container" className="gba:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={value => formatCurrency(value)} width={80} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="amount"
            name={getTranslationFromI18nKeyAndLabel('salary.chart.salary', 'Salary')}
            stroke="var(--nw-chart-4)"
            activeDot={{ r: 8 }}
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="previousAmount"
            name={getTranslationFromI18nKeyAndLabel('salary.chart.previousSalary', 'Previous Salary')}
            stroke="var(--nw-chart-2)"
            strokeDasharray="5 5"
            strokeWidth={1}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default SalaryHistoryChart

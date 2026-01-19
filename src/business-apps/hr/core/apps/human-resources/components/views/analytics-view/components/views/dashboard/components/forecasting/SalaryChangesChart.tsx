import React from 'react'
import { Card } from 'antd'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getCurrentActiveUserLocale, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useDepartmentMonthlySalaryStack } from '../../../../../hooks/useDepartmentMonthlySalaryStack'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

const SalaryChangesChart: React.FC<BusinessAppContextProps> = props => {
  const year = new Date().getFullYear()
  const { data } = useDepartmentMonthlySalaryStack(props, year)

  // Prepare chart data for two bars: one for positive, one for negative (both start from 0)
  const chartData = data.map(item => ({
    month: item.month,
    positive: item.change > 0 ? item.change : 0,
    negative: item.change < 0 ? Math.abs(item.change) : 0,
    rawChange: item.change
  }))

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload
      const value = d.rawChange
      return (
        <div className="gba:bg-primary-foreground gba:shadow-lg gba:rounded gba:p-4" data-testid="salary-tooltip">
          <div className="gba:font-semibold gba:text-base gba:mb-1">
            {d.month &&
              new Date(d.month + '-01').toLocaleString(getCurrentActiveUserLocale() ?? 'en-US', {
                month: 'short',
                year: 'numeric'
              })}
          </div>
          <div className={value > 0 ? 'gba:text-success gba:text-sm' : 'gba:text-destructive gba:text-sm'}>
            <span className="gba:font-medium">
              {getTranslationFromI18nKeyAndLabel('salary_change', 'Salary Change')}:
            </span>{' '}
            {value > 0 ? '+' : ''}
            {value.toLocaleString()}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Card
      title={getTranslationFromI18nKeyAndLabel('salary_changes', 'Salary Changes')}
      className="gba:rounded gba:shadow-sm gba:border gba:border-border gba:mb-4"
      data-testid="salary-changes-card"
    >
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            tickFormatter={m =>
              new Date(m + '-01').toLocaleString(getCurrentActiveUserLocale() ?? 'en-US', {
                month: 'short',
                year: '2-digit'
              })
            }
            className="gba:text-xs"
            data-testid="salary-xaxis"
          />
          <YAxis
            className="gba:text-xs"
            data-testid="salary-yaxis"
            tickFormatter={v => v.toLocaleString()}
            domain={[0, 'dataMax']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="positive"
            fill="var(--nw-chart-1)"
            data-testid="salary-bar-positive"
            isAnimationActive={false}
            name={getTranslationFromI18nKeyAndLabel('salary_positive_change', 'Positive Change')}
          />
          <Bar
            dataKey="negative"
            fill="var(--nw-chart-2)"
            data-testid="salary-bar-negative"
            isAnimationActive={false}
            name={getTranslationFromI18nKeyAndLabel('salary_negative_change', 'Negative Change')}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

export default SalaryChangesChart
export { SalaryChangesChart }

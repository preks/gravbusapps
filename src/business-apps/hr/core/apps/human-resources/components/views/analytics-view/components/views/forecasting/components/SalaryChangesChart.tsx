import React from 'react'
import { Card, Typography } from 'antd'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useDepartmentMonthlySalaryStack } from '../../../../hooks/useDepartmentMonthlySalaryStack'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

const { Title, Text } = Typography

const SalaryChangesChart: React.FC<BusinessAppContextProps> = props => {
  const { t } = useTranslation(hrTranslations)
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
            <span className="gba:font-medium">{t('hr-analytics-salary-change')}:</span> {value > 0 ? '+' : ''}
            {value.toLocaleString()}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="gba:w-full gba:mb-6 gba:shadow-sm" data-testid="salary-changes-chart">
      {/* Header */}
      <div className="gba:mb-4">
        <Title level={4} className="gba:m-0 gba:text-foreground">
          {t('hr-analytics-monthly-salary-changes')}
        </Title>
        <Text className="gba:text-muted-foreground gba:text-sm gba:mt-1">
          {t('hr-analytics-salary-changes-description')}
        </Text>
      </div>

      {/* Chart Content */}
      <div className="gba:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" className="gba:text-xs" />
            <YAxis className="gba:text-xs" />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="positive"
              fill="var(--nw-color-success)"
              name={t('hr-analytics-salary-increase')}
              data-testid="bar-salary-increase"
            />
            <Bar
              dataKey="negative"
              fill="var(--nw-color-destructive)"
              name={t('hr-analytics-salary-decrease')}
              data-testid="bar-salary-decrease"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

export default SalaryChangesChart
export { SalaryChangesChart }

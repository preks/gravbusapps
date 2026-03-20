import React from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Card, Typography } from 'antd'
import { useTranslation } from '@newwork/nw-design-system'
import translations from './_i18n'
import { MonthlySalaryForecastData } from '../../../../hooks/useMonthlySalaryForecastEmployee'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

const { Title, Text } = Typography

interface SalaryForecastChartProps {
  data: MonthlySalaryForecastData[]
}

const CustomTooltip = ({ active, payload, t }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload
    return (
      <div
        className="gba:bg-primary-foreground gba:shadow-lg gba:rounded gba:p-4"
        data-testid="salary-forecast-tooltip"
      >
        <div className="gba:font-semibold gba:text-base gba:mb-1">
          {d.month &&
            new Date(d.month + '-01').toLocaleString(getCurrentActiveUserLocale() ?? 'en-US', {
              month: 'short',
              year: 'numeric'
            })}
        </div>
        <div className="gba:text-foreground gba:text-sm">
          <div>
            <span className="gba:font-medium">{t('salary-forecast-total-salary')}:</span>{' '}
            {d.totalSalary >= 1_000_000
              ? `${(d.totalSalary / 1_000_000).toLocaleString(getCurrentActiveUserLocale() ?? 'en-US', { maximumFractionDigits: 2 })}M`
              : d.totalSalary.toLocaleString(getCurrentActiveUserLocale() ?? 'en-US', { maximumFractionDigits: 0 })}
          </div>
          <div>
            <span className="gba:font-medium">{t('salary-forecast-headcount')}:</span> {d.headcount}
          </div>
          <div className="gba:text-success">
            <span className="gba:font-medium">{t('salary-forecast-new-hires')}:</span> +{d.newHires}
          </div>
        </div>
      </div>
    )
  }
  return null
}

const SalaryForecastChart: React.FC<SalaryForecastChartProps> = ({ data }) => {
  const { t } = useTranslation(translations)

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toLocaleString(getCurrentActiveUserLocale() ?? 'en-US', { maximumFractionDigits: 2 })}M`
    }
    return `${value.toLocaleString(getCurrentActiveUserLocale() ?? 'en-US', { maximumFractionDigits: 0 })}`
  }

  return (
    <Card className="gba:w-full gba:mb-6 gba:shadow-sm" data-testid="salary-forecast-chart-container">
      {/* Header */}
      <div className="gba:mb-4">
        <Title level={4} className="gba:m-0 gba:text-foreground">
          {t('salary-forecast-title')}
        </Title>
        <Text className="gba:text-muted-foreground gba:text-sm gba:mt-1">{t('salary-forecast-description')}</Text>
      </div>

      {/* Chart Content */}
      <div className="gba:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tickFormatter={month =>
                new Date(month + '-01').toLocaleString(getCurrentActiveUserLocale() ?? 'en-US', {
                  month: 'short',
                  year: 'numeric'
                })
              }
              className="gba:text-xs"
            />
            <YAxis tickFormatter={val => formatCurrency(val)} className="gba:text-xs" domain={[0, 'dataMax']} />
            <Tooltip content={<CustomTooltip t={t} />} />
            <Line
              type="monotone"
              dataKey="totalSalary"
              stroke="var(--nw-chart-3)"
              strokeWidth={3}
              dot={{ r: 5 }}
              activeDot={{ r: 8 }}
              name={t('salary-forecast-total-salary')}
              data-testid="salary-forecast-line"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

export default SalaryForecastChart
export { SalaryForecastChart }

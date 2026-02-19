import React from 'react'
import { Typography, Spin, Empty } from 'antd'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { useHealthInsuranceTypeDistribution } from '../../../../../hooks/useHealthInsuranceTypeDistribution'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

const { Title, Text } = Typography

/**
 * Pie chart component for displaying health insurance type distribution.
 * Same layout as Health Insurer Distribution for consistency.
 */
export const HealthInsuranceTypeDistributionChart: React.FC<BusinessAppContextProps> = ({ accessToken }) => {
  const { distribution: data, loading, error } = useHealthInsuranceTypeDistribution(accessToken)
  const { t } = useTranslation(hrTranslations)

  const COLORS = [
    'var(--nw-chart-1)',
    'var(--nw-chart-2)',
    'var(--nw-chart-3)',
    'var(--nw-chart-4)',
    'var(--nw-chart-5)',
    'var(--nw-chart-6)',
    'var(--nw-chart-7)',
    'var(--nw-chart-8)'
  ]

  // Format data for the pie chart (percentage rounded to 2 decimals)
  const chartData = data.map((item: { name: string; count: number; percentage: number }, index: number) => ({
    name: item.name,
    value: item.count,
    percentage: Number((item.percentage ?? 0).toFixed(2)),
    color: COLORS[index % COLORS.length]
  }))

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      return (
        <div className="gba:bg-white gba:p-3 gba:rounded gba:shadow-lg gba:border">
          <p className="gba:font-semibold gba:mb-1">{data.payload.name}</p>
          <p className="gba:text-sm">
            <span className="gba:font-medium">Employees:</span> {data.value.toLocaleString()}
          </p>
          <p className="gba:text-sm">
            <span className="gba:font-medium">Percentage:</span> {Number(data.payload.percentage).toFixed(2)}%
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div
      className="gba:w-full gba:h-full gba:bg-card gba:rounded-lg gba:p-6 gba:shadow-sm gba:border gba:border-border"
      data-testid="health-insurance-type-distribution-chart"
    >
      <div className="gba:mb-4">
        <Title level={4} className="gba:m-0 gba:text-foreground">
          {t('hr-analytics-health-insurance-type-distribution')}
        </Title>
        <Text className="gba:text-muted-foreground gba:text-sm gba:mt-1">
          {t('hr-analytics-health-insurance-type-distribution-description')}
        </Text>
      </div>

      {loading ? (
        <div className="gba:flex gba:justify-center gba:items-center gba:h-96">
          <Spin size="large" data-testid="health-insurance-type-distribution-loading" />
        </div>
      ) : error ? (
        <div className="gba:flex gba:justify-center gba:items-center gba:h-96">
          <Text type="danger">{t('hr-analytics-error-loading')}</Text>
        </div>
      ) : !data || data.length === 0 ? (
        <div className="gba:flex gba:justify-center gba:items-center gba:h-96">
          <Empty description={t('hr-analytics-no-data')} data-testid="health-insurance-type-distribution-empty" />
        </div>
      ) : (
        <div className="gba:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="var(--nw-chart-1)"
                dataKey="value"
                label={({ name, percentage }) => `${name} (${Number(percentage).toFixed(2)}%)`}
              >
                {chartData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value: any, entry: any) => <span style={{ color: entry.color }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export default HealthInsuranceTypeDistributionChart

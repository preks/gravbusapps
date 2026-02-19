import React from 'react'
import { Typography, Spin, Empty } from 'antd'
import { PieChart, Pie, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { useHealthInsuranceDistribution } from '../../../../../hooks/useHealthInsuranceDistribution'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

const { Title, Text } = Typography

const DistributionTooltip: React.FC<{ active?: boolean; payload?: Array<{ payload: any; value: number }> }> = ({
  active,
  payload
}) => {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0]
  return (
    <div className="gba:bg-white gba:p-3 gba:rounded gba:shadow-lg gba:border">
      <p className="gba:font-semibold gba:mb-1">{point.payload.name}</p>
      <p className="gba:text-sm">
        <span className="gba:font-medium">Employees:</span> {point.value.toLocaleString()}
      </p>
      <p className="gba:text-sm">
        <span className="gba:font-medium">Percentage:</span> {Number(point.payload.percentage).toFixed(2)}%
      </p>
    </div>
  )
}

/**
 * Pie chart component for displaying health insurer distribution
 */
export const HealthInsurerDistributionChart: React.FC<BusinessAppContextProps> = ({ accessToken }) => {
  const { distribution: data, loading, error } = useHealthInsuranceDistribution(accessToken)
  const { t } = useTranslation(hrTranslations)

  // Chart color palette using design system tokens - cycle through 8 colors
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
  const chartData = data.map((item: any, index: number) => ({
    name: item.name,
    value: item.count,
    percentage: Number((item.percentage ?? 0).toFixed(2)),
    fill: COLORS[index % COLORS.length]
  }))
  let content: React.ReactNode
  if (loading) {
    content = (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-96">
        <Spin size="large" />
      </div>
    )
  } else if (error) {
    content = (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-96">
        <Text type="danger">{t('hr-analytics-error-loading')}</Text>
      </div>
    )
  } else if (!data || data.length === 0) {
    content = (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-96">
        <Empty description={t('hr-analytics-no-data')} />
      </div>
    )
  } else {
    content = (
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
              label={(props: { payload?: { name: string; percentage?: number } }) => {
                const p = props.payload
                return p ? `${p.name} (${Number(p.percentage ?? 0).toFixed(2)}%)` : ''
              }}
            />
            <Tooltip content={<DistributionTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value: any, entry: any) => <span style={{ color: entry.color }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div
      className="gba:w-full gba:h-full gba:bg-card gba:rounded-lg gba:p-6 gba:shadow-sm gba:border gba:border-border"
      data-testid="health-insurer-distribution-chart"
    >
      {/* Header */}
      <div className="gba:mb-4">
        <Title level={4} className="gba:m-0 gba:text-foreground">
          {t('hr-analytics-health-insurer-distribution')}
        </Title>
        <Text className="gba:text-muted-foreground gba:text-sm gba:mt-1">
          {t('hr-analytics-health-insurer-distribution-description')}
        </Text>
      </div>

      {/* Chart Content */}
      {content}
    </div>
  )
}

export default HealthInsurerDistributionChart

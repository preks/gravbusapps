import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, useTranslation } from '@newwork/nw-design-system'
import { Spin, Empty, Typography } from 'antd'
import { useEmployeesByOrgUnit } from '../../../../../hooks/useEmployeesByOrgUnit'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

const { Title, Text } = Typography

interface EmployeesByOrgUnitChartProps {
  accessToken: string
}

/**
 * Bar chart component for displaying employee distribution across organizational units
 */
const EmployeesByOrgUnitChart: React.FC<EmployeesByOrgUnitChartProps> = ({ accessToken }) => {
  const { data, loading, error } = useEmployeesByOrgUnit(accessToken)
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

  // Limit to top 10 organizational units for better visualization
  const chartData = React.useMemo(() => {
    return data.slice(0, 10).map(item => ({
      name: item.name,
      value: item.count,
      percentage: item.percentage
    }))
  }, [data])

  // Custom tooltip component that shows employee count and percentage
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="gba:custom-tooltip gba:bg-card gba:p-4 gba:rounded-md gba:shadow-lg gba:border-border gba:text-card-foreground">
          <p className="gba:font-bold gba:text-lg gba:mb-2 gba:pb-2 gba:border-b gba:border-border gba:text-foreground">
            {label}
          </p>
          <div className="gba:flex gba:justify-between gba:items-center gba:mb-1">
            <span className="gba:text-muted-foreground">{t('hr-analytics-employees')}:</span>
            <span className="gba:font-semibold gba:ml-4 gba:text-foreground">{payload[0].value.toLocaleString()}</span>
          </div>
          <div className="gba:flex gba:justify-between gba:items-center">
            <span className="gba:text-muted-foreground">{t('hr-analytics-percentage')}:</span>
            <span className="gba:font-semibold gba:ml-4 gba:text-foreground">{payload[0].payload.percentage}%</span>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="gba:w-full gba:mb-6 gba:shadow-sm" data-testid="employees-by-org-unit-chart">
      {/* Header */}
      <div className="gba:mb-4 gba:ml-4">
        <Title level={4} className="gba:m-0 gba:text-foreground ">
          {t('hr-analytics-employees-by-org-unit')}
        </Title>
        <Text className="gba:text-muted-foreground gba:text-sm gba:mt-1">
          {t('hr-analytics-employees-by-org-unit-description')}
        </Text>
      </div>

      {/* Chart Content */}
      <div className="gba:h-96" data-testid="employees-by-org-unit-chart-container">
        {loading ? (
          <div className="gba:h-full gba:flex gba:items-center gba:justify-center">
            <Spin size="large" data-testid="employees-by-org-unit-chart-loading" />
          </div>
        ) : error ? (
          <div className="gba:h-full gba:flex gba:items-center gba:justify-center gba:text-destructive">
            <div data-testid="employees-by-org-unit-chart-error">{t('hr-analytics-error-message')}</div>
          </div>
        ) : data.length === 0 ? (
          <div className="gba:h-full gba:flex gba:items-center gba:justify-center">
            <Empty description={t('hr-analytics-no-data')} data-testid="employees-by-org-unit-chart-empty" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" data-testid="employees-by-org-unit-chart-rendered">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--nw-border)" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={70}
                tick={{ fontSize: 12, fill: 'var(--nw-muted-foreground)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--nw-border)' }}
              />
              <YAxis
                tickFormatter={value => value.toLocaleString()}
                tick={{ fontSize: 12, fill: 'var(--nw-muted-foreground)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--nw-border)' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name={t('hr-analytics-employees')} fill={chartColors[2]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Chart footnote */}
      {!loading && !error && data.length > 0 && data.length > 10 && (
        <div
          className="gba:mt-4 gba:text-center gba:text-sm gba:text-muted-foreground"
          data-testid="org-unit-chart-footnote"
        >
          {t('hr-analytics-top-org-units-note', { total: data.length })}
        </div>
      )}
    </Card>
  )
}

export default EmployeesByOrgUnitChart

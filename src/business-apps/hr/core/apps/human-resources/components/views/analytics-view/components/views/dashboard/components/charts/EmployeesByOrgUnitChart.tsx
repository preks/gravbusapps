import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'
import { Card } from '@newwork/nw-design-system'
import { Spin, Empty, Typography } from 'antd'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useEmployeesByOrgUnit } from '../../../../../hooks/useEmployeesByOrgUnit'

const { Title, Text } = Typography

interface EmployeesByOrgUnitChartProps {
  accessToken: string
}

/**
 * Bar chart component for displaying employee distribution across organizational units
 */
const EmployeesByOrgUnitChart: React.FC<EmployeesByOrgUnitChartProps> = ({ accessToken }) => {
  const { data, loading, error } = useEmployeesByOrgUnit(accessToken)

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
            <span className="gba:text-muted-foreground">Employees:</span>
            <span className="gba:font-semibold gba:ml-4 gba:text-foreground">{payload[0].value.toLocaleString()}</span>
          </div>
          <div className="gba:flex gba:justify-between gba:items-center">
            <span className="gba:text-muted-foreground">Percentage:</span>
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
          {getTranslationFromI18nKeyAndLabel('hr_analytics_employees_by_org_unit', 'Employees by Org Unit')}
        </Title>
        <Text className="gba:text-muted-foreground gba:text-sm gba:mt-1">
          {getTranslationFromI18nKeyAndLabel(
            'hr_analytics_employees_by_org_unit_description',
            'Employee distribution across organizational units showing workforce concentration and department sizes'
          )}
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
            <div data-testid="employees-by-org-unit-chart-error">
              {getTranslationFromI18nKeyAndLabel('hr_analytics_error_message', 'Error loading data')}
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="gba:h-full gba:flex gba:items-center gba:justify-center">
            <Empty
              description={getTranslationFromI18nKeyAndLabel('hr_analytics_no_data', 'No data available')}
              data-testid="employees-by-org-unit-chart-empty"
            />
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
              <Bar dataKey="value" name="Employees" fill={chartColors[2]} radius={[4, 4, 0, 0]} />
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
          {getTranslationFromI18nKeyAndLabel(
            'hr_analytics_top_org_units_note',
            `Showing top 10 org units out of ${data.length} total`
          )}
        </div>
      )}
    </Card>
  )
}

export default EmployeesByOrgUnitChart

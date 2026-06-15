import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'
import { Spinner, useTranslation } from '@newwork/nw-design-system'
import type { OrgUnitEmployeeData } from '../../../../../hooks/useEmployeesByOrgUnit'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

interface EmployeesByOrgUnitChartProps {
  data: OrgUnitEmployeeData[]
  loading: boolean
  error: Error | null
}

/**
 * Bar chart component for displaying employee distribution across organizational units
 */
const EmployeesByOrgUnitChart: React.FC<EmployeesByOrgUnitChartProps> = ({ data, loading, error }) => {
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

  let chartBody: React.ReactNode
  if (loading) {
    chartBody = (
      <div className="gba:h-full gba:flex gba:items-center gba:justify-center">
        <Spinner data-testid="employees-by-org-unit-chart-loading" />
      </div>
    )
  } else if (error) {
    chartBody = (
      <div className="gba:h-full gba:flex gba:items-center gba:justify-center gba:text-destructive">
        <div data-testid="employees-by-org-unit-chart-error">{t('hr-analytics-error-message')}</div>
      </div>
    )
  } else if (data.length === 0) {
    chartBody = (
      <div className="gba:h-full gba:flex gba:items-center gba:justify-center">
        <span className="gba:text-sm gba:text-muted-foreground" data-testid="employees-by-org-unit-chart-empty">
          {t('hr-analytics-no-data')}
        </span>
      </div>
    )
  } else {
    chartBody = (
      <ResponsiveContainer width="100%" height="100%" data-testid="employees-by-org-unit-chart-rendered">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          barSize={40}
          accessibilityLayer={false}
        >
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
    )
  }

  return (
    <div className="gba:w-full gba:h-full" data-testid="employees-by-org-unit-chart">
      <div className="gba:h-full" data-testid="employees-by-org-unit-chart-container">
        {chartBody}
      </div>

      {/* Chart footnote */}
    </div>
  )
}

export default EmployeesByOrgUnitChart

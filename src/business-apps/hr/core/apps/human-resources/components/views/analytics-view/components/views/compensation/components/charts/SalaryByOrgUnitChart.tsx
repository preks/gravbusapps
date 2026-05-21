import React, { useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { Typography, Spin, Empty } from 'antd'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { OrganizationalUnitSalary } from '../../../../../hooks/useSalaryByOrgUnit'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

const { Text } = Typography

interface SalaryByOrgUnitChartProps {
  data: OrganizationalUnitSalary[]
  loading?: boolean
  error?: Error | null
}

/**
 * Bar chart component to display average salary by organizational unit
 */
const SalaryByOrgUnitChart: React.FC<SalaryByOrgUnitChartProps> = ({ data, loading = false, error = null }) => {
  const { t } = useTranslation(hrTranslations)
  // Transform and sort data for the chart
  const chartData = useMemo(() => {
    const validData = data.filter(
      item => typeof item.name === 'string' && typeof item.averageSalary === 'number' && !isNaN(item.averageSalary)
    )

    // Sort by average salary in descending order and limit to top 10
    const sortedData = [...validData].sort((a, b) => b.averageSalary - a.averageSalary).slice(0, 10)

    return sortedData.map(item => ({
      orgUnit: item.name.length > 15 ? `${item.name.substring(0, 12)}...` : item.name,
      fullName: item.name,
      averageSalary: Math.round(item.averageSalary),
      employeeCount: item.employeeCount || 0
    }))
  }, [data])

  // Format currency for display
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value)
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="gba:bg-card gba:p-3 gba:rounded gba:shadow-lg gba:border-border">
          <p className="gba:font-semibold gba:mb-2 gba:text-foreground">{data.fullName}</p>
          <p className="gba:text-sm gba:text-muted-foreground">
            <span className="gba:font-medium">{t('hr-analytics-average-salary')}:</span>{' '}
            {formatCurrency(data.averageSalary)}
          </p>
          <p className="gba:text-sm gba:text-muted-foreground">
            <span className="gba:font-medium">{t('hr-analytics-employees')}:</span> {data.employeeCount}
          </p>
        </div>
      )
    }
    return null
  }

  let chartBody: React.ReactNode
  if (loading) {
    chartBody = (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-full">
        <Spin size="large" />
      </div>
    )
  } else if (error) {
    chartBody = (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-full">
        <Text type="danger">{error.message}</Text>
      </div>
    )
  } else if (!chartData || chartData.length === 0) {
    chartBody = (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-full">
        <Empty description={t('hr-analytics-no-data')} />
      </div>
    )
  } else {
    chartBody = (
      <div className="gba:h-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
            accessibilityLayer={false}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis type="number" tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
            <YAxis dataKey="orgUnit" type="category" width={90} tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="averageSalary" fill="var(--nw-chart-3)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div className="gba:w-full gba:h-full" data-testid="salary-by-org-unit-chart">
      {chartBody}
    </div>
  )
}

export default SalaryByOrgUnitChart

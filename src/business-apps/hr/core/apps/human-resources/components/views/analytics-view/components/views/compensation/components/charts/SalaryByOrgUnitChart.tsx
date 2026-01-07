import React, { useMemo } from 'react'
import { Card, useTranslation } from '@newwork/nw-design-system'
import { Typography, Spin, Empty } from 'antd'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { OrganizationalUnitSalary } from '../../../../../hooks/useSalaryByOrgUnit'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

const { Title, Text } = Typography

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
            <span className="gba:font-medium">{t('hr-analytics-average-salary')}:</span> {formatCurrency(data.averageSalary)}
          </p>
          <p className="gba:text-sm gba:text-muted-foreground">
            <span className="gba:font-medium">{t('hr-analytics-employees')}:</span> {data.employeeCount}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="gba:w-full gba:mb-6 gba:shadow-sm" data-testid="salary-by-org-unit-chart">
      {/* Header */}
      <div className="gba:mb-4 gba:ml-4">
        <Title level={4} className="gba:m-0 gba:text-foreground">
          {t('hr-analytics-salary-by-org-unit')}
        </Title>
        <Text className="gba:text-muted-foreground gba:text-sm gba:mt-1">
          {t('hr-analytics-salary-by-org-unit-description')}
        </Text>
      </div>

      {/* Chart Content */}
      {loading ? (
        <div className="gba:flex gba:justify-center gba:items-center gba:h-96">
          <Spin size="large" />
        </div>
      ) : error ? (
        <div className="gba:flex gba:justify-center gba:items-center gba:h-96">
          <Text type="danger">{error.message}</Text>
        </div>
      ) : !chartData || chartData.length === 0 ? (
        <div className="gba:flex gba:justify-center gba:items-center gba:h-96">
          <Empty description={t('hr-analytics-no-data')} />
        </div>
      ) : (
        <div className="gba:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 20, right: 30, left: 100, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
              <YAxis dataKey="orgUnit" type="category" width={90} tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="averageSalary" fill="var(--nw-chart-3)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Chart footnote */}
      {!loading && !error && chartData && chartData.length > 0 && data.length > 10 && (
        <div className="gba:mt-4 gba:text-center gba:text-sm gba:text-muted-foreground">
          {t('hr-analytics-top-org-units-note', { total: data.length })}
        </div>
      )}
    </Card>
  )
}

export default SalaryByOrgUnitChart

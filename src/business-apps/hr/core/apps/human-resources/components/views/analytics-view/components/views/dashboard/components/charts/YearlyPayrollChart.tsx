import React from 'react'
import { Spin, Typography, Empty } from 'antd'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, useTranslation } from '@newwork/nw-design-system'
import { useYearlyPayroll } from '../../../../../hooks/useYearlyPayroll'
import { BusinessAppContextProps } from '@/business-apps/types'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

const { Text } = Typography

/**
 * A bar chart component that displays the yearly payroll data for the last 5 years
 */
const YearlyPayrollChart: React.FC<BusinessAppContextProps> = ({ accessToken }) => {
  // Fetch yearly payroll data
  const { data, loading, error } = useYearlyPayroll(accessToken)
  const { t } = useTranslation(hrTranslations)

  console.log('[YearlyPayrollChart] Rendering chart with data:', data)

  // Format currency values for tooltip display
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value)
  }

  // Custom tooltip formatter
  const tooltipFormatter = (value: number) => {
    return formatCurrency(value)
  }

  // Render loading state
  if (loading) {
    return (
      <Card className="gba:w-full gba:mb-6" data-testid="hr-analytics-yearly-payroll-chart-loading">
        <div className="gba:flex gba:items-center gba:justify-center gba:h-64">
          <Spin size="large" />
        </div>
      </Card>
    )
  }

  // Render error state
  if (error) {
    return (
      <Card className="gba:w-full gba:mb-6" data-testid="hr-analytics-yearly-payroll-chart-error">
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-64">
          <Text className="gba:text-destructive">{t('hr-analytics-yearly-payroll-error')}</Text>
        </div>
      </Card>
    )
  }

  // Render empty state if no data
  if (!data || data.length === 0) {
    return (
      <Card className="gba:w-full gba:mb-6" data-testid="hr-analytics-yearly-payroll-chart-empty">
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-64">
          <Empty description={t('hr-analytics-yearly-payroll-no-data')} />
        </div>
      </Card>
    )
  }

  return (
    <Card className="gba:w-full gba:mb-6" data-testid="hr-analytics-yearly-payroll-chart">
      {/* Header */}
      <div className="gba:mb-4">
        <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:m-0">
          {t('hr-analytics-yearly-payroll-chart-title')}
        </h3>
        <p className="gba:text-muted-foreground gba:text-sm gba:mt-1">
          {t('hr-analytics-yearly-payroll-description')}
        </p>
      </div>

      <div className="gba:w-full gba:min-h-[400px]">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={data}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 30
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" name={t('hr-analytics-chart-year')} />
            <YAxis name={t('hr-analytics-total-payroll')} tickFormatter={tooltipFormatter} />
            <Tooltip formatter={tooltipFormatter} labelFormatter={label => `${t('hr-analytics-chart-year')}: ${label}`} />
            <Legend />
            <Bar
              name={t('hr-analytics-total-payroll')}
              dataKey="totalPayroll"
              fill="var(--nw-chart-3)"
              barSize={38}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

export default YearlyPayrollChart

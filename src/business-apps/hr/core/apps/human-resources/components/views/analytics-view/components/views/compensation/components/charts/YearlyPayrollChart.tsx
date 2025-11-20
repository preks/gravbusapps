import React from 'react'
import { Spin, Typography, Empty } from 'antd'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, useTranslation } from '@newwork/nw-design-system'
import { useYearlyPayroll } from '../../../../../hooks/useYearlyPayroll'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

const { Title, Text } = Typography

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

  return (
    <Card className="gba:w-full gba:mb-6" data-testid="hr-analytics-yearly-payroll-chart">
      {/* Header */}
      <div className="gba:mb-4 gba:ml-4">
        <Title level={4} className="gba:m-0 gba:text-foreground">
          {t('hr-analytics-yearly-payroll-chart-title')}
        </Title>
        <Text className="gba:text-muted-foreground gba:text-sm gba:mt-1">
          {t('hr-analytics-yearly-payroll-description')}
        </Text>
      </div>

      {/* Chart Content */}
      {loading ? (
        <div className="gba:flex gba:items-center gba:justify-center gba:h-96">
          <Spin size="large" />
        </div>
      ) : error ? (
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-96">
          <Text className="gba:text-destructive">{t('hr-analytics-yearly-payroll-error')}</Text>
        </div>
      ) : !data || data.length === 0 ? (
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-96">
          <Empty description={t('hr-analytics-yearly-payroll-no-data')} />
        </div>
      ) : (
        <div className="gba:h-96">
          <ResponsiveContainer width="100%" height="100%">
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
      )}
    </Card>
  )
}

export default YearlyPayrollChart

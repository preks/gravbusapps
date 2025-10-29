import React from 'react'
import { Spin, Typography, Empty } from 'antd'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card } from '@newwork/nw-design-system'
import { useYearlyPayroll } from '../../../../../hooks/useYearlyPayroll'
import { BusinessAppContextProps } from '@/business-apps/types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

const { Text } = Typography

/**
 * A bar chart component that displays the yearly payroll data for the last 5 years
 */
const YearlyPayrollChart: React.FC<BusinessAppContextProps> = ({ accessToken }) => {
  // Fetch yearly payroll data
  const { data, loading, error } = useYearlyPayroll(accessToken)

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
          <Text className="gba:text-destructive">
            {getTranslationFromI18nKeyAndLabel(
              'hr_analytics_yearly_payroll_error',
              'Error loading yearly payroll data'
            )}
          </Text>
        </div>
      </Card>
    )
  }

  // Render empty state if no data
  if (!data || data.length === 0) {
    return (
      <Card className="gba:w-full gba:mb-6" data-testid="hr-analytics-yearly-payroll-chart-empty">
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-64">
          <Empty
            description={getTranslationFromI18nKeyAndLabel(
              'hr_analytics_yearly_payroll_no_data',
              'No yearly payroll data available'
            )}
          />
        </div>
      </Card>
    )
  }

  return (
    <Card className="gba:w-full gba:mb-6" data-testid="hr-analytics-yearly-payroll-chart">
      {/* Header */}
      <div className="gba:mb-4">
        <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:m-0">
          {getTranslationFromI18nKeyAndLabel('hr_analytics_yearly_payroll_chart_title', 'Total Payroll by Year')}
        </h3>
        <p className="gba:text-muted-foreground gba:text-sm gba:mt-1">
          {getTranslationFromI18nKeyAndLabel(
            'hr_analytics_yearly_payroll_description',
            'Annual payroll expenditure trends showing total compensation costs across the organization'
          )}
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
            <XAxis dataKey="year" name="Year" />
            <YAxis name="Total Payroll" tickFormatter={tooltipFormatter} />
            <Tooltip formatter={tooltipFormatter} labelFormatter={label => `Year: ${label}`} />
            <Legend />
            <Bar
              name={getTranslationFromI18nKeyAndLabel('hr_analytics_total_payroll', 'Total Payroll')}
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

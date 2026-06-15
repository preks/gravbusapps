import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Spinner } from '@newwork/nw-design-system'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useTranslation } from '@newwork/nw-design-system'
import translations from './_i18n'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { WorkingConditionKpiResult } from '../../../../../hooks/useWorkingConditionForecast'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

interface CompanySalaryForecastChartProps extends BusinessAppContextProps {
  kpiData: WorkingConditionKpiResult
}

// Helper: Generate mock forecast trend for the next 12 months
function getSalaryForecastTrend(data: any[]): { month: string; salary: number }[] {
  // For now, use current total salary and project a 2% increase per month
  const now = new Date()
  const totalSalary = data.reduce((sum, wc) => sum + (wc.salary || 0), 0)
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const label = date.toLocaleString(getCurrentActiveUserLocale() ?? 'en-US', { month: 'short', year: '2-digit' })
    return {
      month: label,
      salary: Math.round(totalSalary * Math.pow(1.02, i))
    }
  })
  return months
}

const CompanySalaryForecastChart: React.FC<CompanySalaryForecastChartProps> = ({ kpiData }) => {
  const { data, loading } = kpiData
  const chartData = getSalaryForecastTrend(data)
  const { t } = useTranslation(translations)

  return (
    <Card
      className="gba:shadow gba:rounded gba:mb-6 gba:border gba:border-border"
      data-testid="company-salary-forecast-chart"
    >
      <CardHeader>
        <CardTitle>{t('company-salary-forecast-title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="gba:flex gba:h-72 gba:items-center gba:justify-center">
            <Spinner />
          </div>
        ) : (
          <div className="gba:w-full gba:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" className="gba:text-xs" />
                <YAxis className="gba:text-xs" tickFormatter={v => `${v.toLocaleString()}`} />
                <Tooltip formatter={(v: any) => `${(Number(v) || 0).toLocaleString()}`} />
                <Line type="monotone" dataKey="salary" stroke="var(--nw-chart-1)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default CompanySalaryForecastChart
export { CompanySalaryForecastChart }

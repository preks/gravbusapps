import React, { useMemo } from 'react'
import { Typography } from 'antd'
import { SectionKpiCards, KpiCardData } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { WorkingConditionKpi } from '../../../../../hooks/useWorkingConditionForecast'
import { useWorkingConditionForecast } from '../../../../../hooks/useWorkingConditionForecast'
import { useMonthlySalaryForecast } from '../../../../../hooks/useMonthlySalaryForecast'
import { useTotalPayroll } from '../../../../../hooks/useTotalPayroll'
import SalaryForecastChart from '../SalaryForecastChart'
import SalaryChangesChart from '../SalaryChangesChart'
import DepartmentSalaryStackedBarChart from '../DepartmentSalaryStackedBarChart'
import DepartmentContributionAnalysis from '../DepartmentContributionAnalysis'

const { Title, Text } = Typography

interface SalaryForecastingProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const SalaryForecasting: React.FC<SalaryForecastingProps> = props => {
  const { prefixDataTestId = 'SalaryForecasting' } = props
  const kpiData = useWorkingConditionForecast(props)
  const { loading: payrollLoading } = useTotalPayroll(props.accessToken)
  const year = new Date().getFullYear()
  const { data: monthlyData } = useMonthlySalaryForecast(props, year)

  // Calculate Salary-related KPI metrics
  const salaryKpiCards: KpiCardData[] = useMemo(() => {
    const { loading, data } = kpiData
    const employees: WorkingConditionKpi[] = data as WorkingConditionKpi[]

    if (loading || payrollLoading) {
      return [
        {
          id: 'total-annual-payroll',
          title: getTranslationFromI18nKeyAndLabel('forecasting_kpi_total_annual_payroll', 'Total Annual Payroll'),
          value: 'Loading...',
          icon: 'users',
          iconColor: 'var(--nw-chart-1)'
        },
        {
          id: 'total-monthly-salary',
          title: getTranslationFromI18nKeyAndLabel('forecasting_kpi_total_salary', 'Total Monthly Salary'),
          value: 'Loading...',
          icon: 'users',
          iconColor: 'var(--nw-chart-2)'
        },
        {
          id: 'next-month-forecast',
          title: getTranslationFromI18nKeyAndLabel('forecasting_kpi_next_month_forecast', 'Next Month Forecast'),
          value: 'Loading...',
          icon: 'calendar',
          iconColor: 'var(--nw-chart-3)'
        },
        {
          id: 'six-month-forecast',
          title: getTranslationFromI18nKeyAndLabel('forecasting_kpi_six_month_forecast', '6-Month Forecast'),
          value: 'Loading...',
          icon: 'calendar',
          iconColor: 'var(--nw-chart-4)'
        }
      ]
    }

    // Calculate metrics
    const today = new Date()
    const activeEmployees = employees.filter(wc => !wc.exitDate || new Date(wc.exitDate) > today)

    const totalMonthlySalary = activeEmployees.reduce((sum, wc) => sum + (wc.monthlyGrossSalary || 0), 0)
    const totalAnnualSalary = activeEmployees.reduce((sum, wc) => sum + (wc.annualGrossSalary || 0), 0)

    const currencyCode =
      activeEmployees.length && activeEmployees[0].currency && (activeEmployees[0].currency as any).code
        ? (activeEmployees[0].currency as any).code
        : ''

    const nextMonthForecast = totalMonthlySalary * 1.05
    const sixMonthForecast = totalMonthlySalary * 1.17

    // Format large numbers
    const formatSalary = (value: number) => {
      if (value >= 1_000_000) {
        return `${(value / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })}M`
      }
      if (value >= 1_000) {
        return `${(value / 1_000).toLocaleString(undefined, { maximumFractionDigits: 1 })}K`
      }
      return value.toLocaleString()
    }

    return [
      {
        id: 'total-annual-payroll',
        title: getTranslationFromI18nKeyAndLabel('forecasting_kpi_total_annual_payroll', 'Total Annual Payroll'),
        value: activeEmployees.length === 0 ? '-' : `${formatSalary(totalAnnualSalary)} ${currencyCode}`,
        icon: 'users',
        iconColor: 'var(--nw-chart-1)',
        footer: 'Annual employee compensation'
      },
      {
        id: 'total-monthly-salary',
        title: getTranslationFromI18nKeyAndLabel('forecasting_kpi_total_salary', 'Total Monthly Salary'),
        value: activeEmployees.length === 0 ? '-' : `${formatSalary(totalMonthlySalary)} ${currencyCode}`,
        icon: 'users',
        iconColor: 'var(--nw-chart-2)',
        footer: 'Current monthly payroll'
      },
      {
        id: 'next-month-forecast',
        title: getTranslationFromI18nKeyAndLabel('forecasting_kpi_next_month_forecast', 'Next Month Forecast'),
        value: activeEmployees.length === 0 ? '-' : `${formatSalary(nextMonthForecast)} ${currencyCode}`,
        icon: 'calendar',
        iconColor: 'var(--nw-chart-3)',
        footer: 'Projected monthly payroll'
      },
      {
        id: 'six-month-forecast',
        title: getTranslationFromI18nKeyAndLabel('forecasting_kpi_six_month_forecast', '6-Month Forecast'),
        value: activeEmployees.length === 0 ? '-' : `${formatSalary(sixMonthForecast)} ${currencyCode}`,
        icon: 'calendar',
        iconColor: 'var(--nw-chart-4)',
        footer: 'Six-month projection'
      }
    ]
  }, [kpiData, payrollLoading])

  return (
    <div data-testid={prefixDataTestId} className="gba:flex gba:flex-col gba:gap-6">
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center">
        <div>
          <Title level={4} className="gba:m-0 gba:text-foreground">
            {getTranslationFromI18nKeyAndLabel('hr_analytics_salary_forecasting', 'Salary Forecasting')}
          </Title>
          <Text className="gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'hr_analytics_salary_forecasting_description',
              'Salary trends, compensation projections, and payroll forecasting'
            )}
          </Text>
        </div>
      </div>

      {/* Salary KPI Cards Section */}
      <div data-testid={`${prefixDataTestId}-kpi-cards`}>
        <SectionKpiCards cards={salaryKpiCards} />
      </div>

      {/* Salary Charts */}
      <div className="gba:space-y-6">
        <SalaryForecastChart data={monthlyData} />
        <SalaryChangesChart {...props} />
        <DepartmentSalaryStackedBarChart {...props} />
        <DepartmentContributionAnalysis {...props} />
      </div>
    </div>
  )
}

export default SalaryForecasting

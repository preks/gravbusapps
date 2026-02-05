import React, { useMemo } from 'react'
import { Typography } from 'antd'
import { SectionKpiCards, KpiCardData, useTranslation, Icon } from '@newwork/nw-design-system'
import { UsersIcon, CalendarIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { WorkingConditionKpi } from '../../../../../hooks/useWorkingConditionForecast'
import { useWorkingConditionForecast } from '../../../../../hooks/useWorkingConditionForecast'
import { useMonthlySalaryForecast } from '../../../../../hooks/useMonthlySalaryForecast'
import { useTotalPayroll } from '../../../../../hooks/useTotalPayroll'
import SalaryForecastChart from '../SalaryForecastChart'
import SalaryChangesChart from '../SalaryChangesChart'
import DepartmentSalaryStackedBarChart from '../DepartmentSalaryStackedBarChart'
import DepartmentContributionAnalysis from '../DepartmentContributionAnalysis'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

const { Title, Text } = Typography

interface SalaryForecastingProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const SalaryForecasting: React.FC<SalaryForecastingProps> = props => {
  const { prefixDataTestId = 'SalaryForecasting' } = props
  const { t } = useTranslation(hrTranslations)
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
          title: t('hr-analytics-forecasting-kpi-total-annual-payroll'),
          value: t('hr-data-filter-loading'),
          icon: <Icon icon={UsersIcon} size="sm" decorative />,
          iconColor: 'var(--nw-chart-1)'
        },
        {
          id: 'total-monthly-salary',
          title: t('hr-analytics-forecasting-kpi-total-monthly-salary'),
          value: t('hr-data-filter-loading'),
          icon: <Icon icon={UsersIcon} size="sm" decorative />,
          iconColor: 'var(--nw-chart-2)'
        },
        {
          id: 'next-month-forecast',
          title: t('hr-analytics-forecasting-kpi-next-month-forecast'),
          value: t('hr-data-filter-loading'),
          icon: <Icon icon={CalendarIcon} size="sm" decorative />,
          iconColor: 'var(--nw-chart-3)'
        },
        {
          id: 'six-month-forecast',
          title: t('hr-analytics-forecasting-kpi-six-month-forecast'),
          value: t('hr-data-filter-loading'),
          icon: <Icon icon={CalendarIcon} size="sm" decorative />,
          iconColor: 'var(--nw-chart-4)'
        }
      ]
    }

    // Calculate metrics
    const today = new Date()
    const activeEmployees = employees.filter(wc => !wc.exitDate || new Date(wc.exitDate) > today)

    const totalMonthlySalary = activeEmployees.reduce((sum, wc) => sum + (wc.monthlyGrossSalary || 0), 0)

    const currencyCode =
      activeEmployees.length && activeEmployees[0].currency && (activeEmployees[0].currency as any).code
        ? (activeEmployees[0].currency as any).code
        : ''

    const nextMonthForecast = totalMonthlySalary * 1.05
    const sixMonthForecast = totalMonthlySalary * 1.17

    // Format large numbers
    const formatSalary = (value: number) => {
      if (value >= 1_000_000) {
        return `${(value / 1_000_000).toLocaleString(getCurrentActiveUserLocale() ?? 'en-US', { maximumFractionDigits: 2 })}M`
      }
      if (value >= 1_000) {
        return `${(value / 1_000).toLocaleString(getCurrentActiveUserLocale() ?? 'en-US', { maximumFractionDigits: 1 })}K`
      }
      return value.toLocaleString()
    }

    return [
      {
        id: 'total-annual-payroll',
        title: t('hr-analytics-forecasting-kpi-total-annual-payroll'),
        value: t('hr-analytics-coming-soon'),
        icon: <Icon icon={UsersIcon} size="sm" decorative />,
        iconColor: 'var(--nw-chart-1)',
        footer: t('hr-analytics-annual-employee-compensation')
      },
      {
        id: 'total-monthly-salary',
        title: t('hr-analytics-forecasting-kpi-total-monthly-salary'),
        value: t('hr-analytics-coming-soon'),
        icon: <Icon icon={UsersIcon} size="sm" decorative />,
        iconColor: 'var(--nw-chart-2)',
        footer: t('hr-analytics-current-monthly-payroll')
      },
      {
        id: 'next-month-forecast',
        title: t('hr-analytics-forecasting-kpi-next-month-forecast'),
        value: activeEmployees.length === 0 ? '-' : `${formatSalary(nextMonthForecast)} ${currencyCode}`,
        icon: <Icon icon={CalendarIcon} size="sm" decorative />,
        iconColor: 'var(--nw-chart-3)',
        footer: t('hr-analytics-projected-monthly-payroll')
      },
      {
        id: 'six-month-forecast',
        title: t('hr-analytics-forecasting-kpi-six-month-forecast'),
        value: activeEmployees.length === 0 ? '-' : `${formatSalary(sixMonthForecast)} ${currencyCode}`,
        icon: <Icon icon={CalendarIcon} size="sm" decorative />,
        iconColor: 'var(--nw-chart-4)',
        footer: t('hr-analytics-six-month-projection')
      }
    ]
  }, [kpiData, payrollLoading])

  return (
    <div data-testid={prefixDataTestId} className="gba:flex gba:flex-col gba:gap-6">
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center">
        <div>
          <Title level={4} className="gba:m-0 gba:text-foreground">
            {t('hr-analytics-salary-forecasting')}
          </Title>
          <Text className="gba:text-muted-foreground">{t('hr-analytics-salary-forecasting-description')}</Text>
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

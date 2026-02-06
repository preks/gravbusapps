import React, { useMemo } from 'react'
import { Typography } from 'antd'
import { SectionKpiCards, KpiCardData, useTranslation, Icon } from '@newwork/nw-design-system'
import { UsersIcon, CalendarIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useMonthlySalaryForecastEmployee } from '../../../../../hooks/useMonthlySalaryForecastEmployee'
import SalaryForecastChart from '../SalaryForecastChart'
import SalaryChangesChart from '../SalaryChangesChart'
import DepartmentSalaryStackedBarChart from '../DepartmentSalaryStackedBarChart'
import DepartmentContributionAnalysis from '../DepartmentContributionAnalysis'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import dayjs from 'dayjs'

const { Title, Text } = Typography

interface SalaryForecastingProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const SalaryForecasting: React.FC<SalaryForecastingProps> = props => {
  const { prefixDataTestId = 'SalaryForecasting' } = props
  const { t } = useTranslation(hrTranslations)

  // Calculate date ranges
  const today = dayjs()
  const currentMonthStart = today.startOf('month')
  const nextMonthStart = currentMonthStart.add(1, 'month')
  const sixMonthsEnd = currentMonthStart.add(6, 'month').endOf('month')
  const yearEnd = today.endOf('year')

  // Fetch data for the full year (for the chart and KPI calculations) - start from beginning of current year
  const fullYearStart = today.startOf('year').format('YYYY-MM-DD')
  const fullYearEnd = yearEnd.format('YYYY-MM-DD')
  const { data: fullYearData, loading: fullYearLoading } = useMonthlySalaryForecastEmployee(
    props.accessToken,
    fullYearStart,
    fullYearEnd
  )

  // Calculate next month and 6-month data from full year data
  const nextMonthData = useMemo(() => {
    if (!fullYearData || fullYearData.length === 0) return []
    const nextMonthStr = nextMonthStart.format('YYYY-MM')
    return fullYearData.filter(item => item.month === nextMonthStr)
  }, [fullYearData, nextMonthStart])

  const sixMonthsData = useMemo(() => {
    if (!fullYearData || fullYearData.length === 0) return []
    const nextMonthStr = nextMonthStart.format('YYYY-MM')
    const sixMonthsEndStr = sixMonthsEnd.format('YYYY-MM')
    return fullYearData.filter(item => item.month >= nextMonthStr && item.month <= sixMonthsEndStr)
  }, [fullYearData, nextMonthStart, sixMonthsEnd])

  const loading = fullYearLoading

  // Calculate Salary-related KPI metrics
  const salaryKpiCards: KpiCardData[] = useMemo(() => {
    if (loading) {
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

    // Calculate Next Month Forecast (sum of next month's salary)
    const nextMonthForecast = nextMonthData.reduce((sum, month) => sum + month.totalSalary, 0)

    // Calculate 6-Month Forecast (sum of next 6 months' salary)
    const sixMonthForecast = sixMonthsData.reduce((sum, month) => sum + month.totalSalary, 0)

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
        value: nextMonthData.length === 0 ? '-' : formatSalary(nextMonthForecast),
        icon: <Icon icon={CalendarIcon} size="sm" decorative />,
        iconColor: 'var(--nw-chart-3)',
        footer: t('hr-analytics-projected-monthly-payroll')
      },
      {
        id: 'six-month-forecast',
        title: t('hr-analytics-forecasting-kpi-six-month-forecast'),
        value: sixMonthsData.length === 0 ? '-' : formatSalary(sixMonthForecast),
        icon: <Icon icon={CalendarIcon} size="sm" decorative />,
        iconColor: 'var(--nw-chart-4)',
        footer: t('hr-analytics-six-month-projection')
      }
    ]
  }, [loading, nextMonthData, sixMonthsData, t])

  // Use full year data for the chart
  const monthlyData = useMemo(() => {
    return fullYearData
  }, [fullYearData])

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

import React, { useMemo } from 'react'
import { Typography, Spin } from 'antd'
import { SectionKpiCards, KpiCardData, useTranslation, Icon } from '@newwork/nw-design-system'
import { UsersIcon, CurrencyDollarIcon } from '@phosphor-icons/react'
import { DashboardProps, AnalyticsKpiData } from './types/analyticsTypes'
import { useEmployeeCount } from '../../../hooks/useEmployeeCount'
import { useNewHiresCount } from '../../../hooks/useNewHiresCount'
import { useTurnoverRate } from '../../../hooks/useTurnoverRate'
import { useCompensationMetrics } from '../../../hooks/useCompensationMetrics'
import { useHiresPerYear } from '../../../hooks/useHiresPerYear'
import { useEmployeesPerYear } from '../../../hooks/useEmployeesPerYear'
import HiresPerYearChart from './components/charts/HiresPerYearChart'
import EmployeesPerYearChart from './components/charts/EmployeesPerYearChart'
import EmployeesByOrgUnitChart from './components/charts/EmployeesByOrgUnitChart'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

const { Title, Text } = Typography

/**
 * HR Analytics Dashboard component that displays various HR metrics and analytics
 */
const Dashboard: React.FC<DashboardProps> = ({ accessToken }) => {
  const { t } = useTranslation(hrTranslations)
  // Get data from custom hooks
  const {
    count: employeeCount,
    diffYoY: employeeCountDiffYoY,
    loading: employeeLoading
  } = useEmployeeCount(accessToken)
  const { count: newHiresCount, loading: hiresLoading } = useNewHiresCount(accessToken)
  const { rate: turnoverRate, change: turnoverChange, loading: turnoverLoading } = useTurnoverRate(accessToken)
  const { averageSalary, loading: salaryLoading } = useCompensationMetrics(accessToken)
  const { hiresData, loading: hiresYearlyLoading, error: hiresYearlyError } = useHiresPerYear(accessToken)
  const {
    data: employeesYearlyData,
    loading: employeesYearlyLoading,
    error: employeesYearlyError
  } = useEmployeesPerYear(accessToken)
  // Hook still needed for potential future use but data not currently displayed

  // Combine loading states for simplicity
  const loading = employeeLoading || hiresLoading || turnoverLoading || salaryLoading

  // Format analytics KPI data
  const analyticsData: AnalyticsKpiData = useMemo(
    () => ({
      employeeCount: {
        value: employeeCount,
        label: t('hr-analytics-total-employees')
      },
      newHires: {
        value: newHiresCount,
        label: t('hr-analytics-new-hires-ytd')
      },
      turnoverRate: {
        value: turnoverRate,
        change: turnoverChange,
        label: t('hr-analytics-turnover-rate')
      },
      averageSalary: {
        value: Math.round(averageSalary / 1000), // Convert to thousands
        label: t('hr-analytics-annual-average')
      }
    }),
    [employeeCount, newHiresCount, turnoverRate, turnoverChange, averageSalary, t]
  )

  // Create KPI cards data for SectionKpiCards component
  const kpiCards: KpiCardData[] = useMemo(() => {
    if (loading) {
      return [
        {
          id: 'total-employees',
          title: analyticsData.employeeCount.label,
          value: t('hr-data-filter-loading'),
          icon: <Icon icon={UsersIcon} size="sm" decorative />,
          iconColor: 'var(--nw-info)'
        },
        {
          id: 'new-hires',
          title: analyticsData.newHires.label,
          value: t('hr-data-filter-loading'),
          icon: <Icon icon={UsersIcon} size="sm" decorative />,
          iconColor: 'var(--nw-success)'
        },
        {
          id: 'turnover-rate',
          title: analyticsData.turnoverRate.label,
          value: t('hr-data-filter-loading'),
          icon: <Icon icon={UsersIcon} size="sm" decorative />,
          iconColor: 'var(--nw-warning)'
        },
        {
          id: 'average-salary',
          title: analyticsData.averageSalary.label,
          value: t('hr-data-filter-loading'),
          icon: <Icon icon={CurrencyDollarIcon} size="sm" decorative />,
          iconColor: 'var(--nw-decorative)'
        }
      ]
    }

    return [
      {
        id: 'total-employees',
        title: analyticsData.employeeCount.label,
        value: analyticsData.employeeCount.value.toLocaleString(),
        icon: <Icon icon={UsersIcon} size="sm" decorative />,
        iconColor: 'var(--nw-info)',
        trend: {
          value: `${employeeCountDiffYoY > 0 ? '+' : ''}${employeeCountDiffYoY}`,
          positive: employeeCountDiffYoY > 0 ? true : false,
          description: t('hr-analytics-this-year')
        },
        footer: t('hr-analytics-active-employees')
      },
      {
        id: 'turnover-rate',
        title: analyticsData.turnoverRate.label,
        value: `${analyticsData.turnoverRate.value.toFixed(1)}%`,
        icon: <Icon icon={UsersIcon} size="sm" decorative />,
        iconColor: analyticsData.turnoverRate.change < 0 ? 'var(--nw-success)' : 'var(--nw-warning)',
        trend: {
          value: `${analyticsData.turnoverRate.change > 0 ? '+' : ''}${analyticsData.turnoverRate.change.toFixed(1)}%`,
          positive: analyticsData.turnoverRate.change > 0 ? true : false
        },
        footer: `${analyticsData.turnoverRate.change > 0 ? '+' : ''}${analyticsData.turnoverRate.change.toFixed(1)}% ${t('hr-analytics-vs-last-month')}`
      },
      {
        id: 'average-salary',
        title: analyticsData.averageSalary.label,
        value: `${analyticsData.averageSalary.value}K`,
        icon: <Icon icon={CurrencyDollarIcon} size="sm" decorative />,
        iconColor: 'var(--nw-info)',
        footer: t('hr-analytics-annual-average')
      }
    ]
  }, [loading, analyticsData, t])

  if (loading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:py-12" data-testid="hr-analytics-loading">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="gba:w-full" data-testid="hr-analytics-dashboard">
      <div className="gba:p-6 gba:pb-0">
        <div className="gba:mb-6">
          <Title level={2} className="gba:m-0 gba:text-foreground">
            {t('hr-analytics-dashboard-title')}
          </Title>
          <Text className="gba:text-muted-foreground">{t('hr-analytics-dashboard-subtitle')}</Text>
        </div>

        {/* KPI Cards Section - Using SectionKpiCards component */}
        <div className="gba:mb-8" data-testid="dashboard-kpi-cards">
          <SectionKpiCards cards={kpiCards} />
        </div>

        {/* Charts Section */}
        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
          {/* Employees Per Year Chart */}
          <div className="gba:col-span-1" data-testid="employees-per-year-chart-container">
            <EmployeesPerYearChart
              data={employeesYearlyData}
              loading={employeesYearlyLoading}
              error={employeesYearlyError}
            />
          </div>

          {/* Hires Per Year Chart */}
          <div className="gba:col-span-1" data-testid="hires-per-year-chart-container">
            <HiresPerYearChart data={hiresData} loading={hiresYearlyLoading} error={hiresYearlyError} />
          </div>

          {/* Employees By Org Unit Chart */}
          <div
            className="gba:col-span-1 gba:md:col-span-2 gba:mt-4"
            data-testid="employees-by-org-unit-chart-container"
          >
            <EmployeesByOrgUnitChart accessToken={accessToken} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

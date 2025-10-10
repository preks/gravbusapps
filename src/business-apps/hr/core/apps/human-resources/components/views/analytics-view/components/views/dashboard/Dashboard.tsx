import React, { useMemo } from 'react'
import { Typography, Spin } from 'antd'
import { SectionKpiCards, KpiCardData } from '@newwork/nw-design-system'
import { DashboardProps, AnalyticsKpiData } from './types/analyticsTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useEmployeeCount } from '../../../hooks/useEmployeeCount'
import { useNewHiresCount } from '../../../hooks/useNewHiresCount'
import { useTurnoverRate } from '../../../hooks/useTurnoverRate'
import { useAverageSalary } from '../../../hooks/useAverageSalary'
import { useHiresPerYear } from '../../../hooks/useHiresPerYear'
import { useEmployeesPerYear } from '../../../hooks/useEmployeesPerYear'
import { useEmployeesByOrgUnit } from '../../../hooks/useEmployeesByOrgUnit'
import HiresPerYearChart from './components/charts/HiresPerYearChart'
import EmployeesPerYearChart from './components/charts/EmployeesPerYearChart'
import EmployeesByOrgUnitChart from './components/charts/EmployeesByOrgUnitChart'

const { Title, Text } = Typography

/**
 * HR Analytics Dashboard component that displays various HR metrics and analytics
 */
const Dashboard: React.FC<DashboardProps> = ({ accessToken }) => {
  // Get data from custom hooks
  const { count: employeeCount, loading: employeeLoading } = useEmployeeCount(accessToken)
  const { count: newHiresCount, loading: hiresLoading } = useNewHiresCount(accessToken)
  const {
    rate: turnoverRate,
    change: turnoverChange,
    loading: turnoverLoading
  } = useTurnoverRate(accessToken, employeeCount)
  const { averageSalary, loading: salaryLoading } = useAverageSalary(accessToken)
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
        label: getTranslationFromI18nKeyAndLabel('hr_analytics_total_employees', 'Total employees')
      },
      newHires: {
        value: newHiresCount,
        label: getTranslationFromI18nKeyAndLabel('hr_analytics_new_hires', 'New hires this year')
      },
      turnoverRate: {
        value: turnoverRate,
        change: turnoverChange,
        label: getTranslationFromI18nKeyAndLabel('hr_analytics_turnover_rate', 'Turnover rate')
      },
      averageSalary: {
        value: Math.round(averageSalary / 1000), // Convert to thousands
        label: getTranslationFromI18nKeyAndLabel('hr_analytics_annual_average', 'Annual average')
      }
    }),
    [employeeCount, newHiresCount, turnoverRate, turnoverChange, averageSalary]
  )

  // Create KPI cards data for SectionKpiCards component
  const kpiCards: KpiCardData[] = useMemo(() => {
    if (loading) {
      return [
        {
          id: 'total-employees',
          title: analyticsData.employeeCount.label,
          value: 'Loading...',
          icon: 'users',
          iconColor: '#1890ff'
        },
        {
          id: 'new-hires',
          title: analyticsData.newHires.label,
          value: 'Loading...',
          icon: 'users',
          iconColor: '#52c41a'
        },
        {
          id: 'turnover-rate',
          title: analyticsData.turnoverRate.label,
          value: 'Loading...',
          icon: 'users',
          iconColor: '#fa8c16'
        },
        {
          id: 'average-salary',
          title: analyticsData.averageSalary.label,
          value: 'Loading...',
          icon: 'mail', // Using mail as currency icon mapping
          iconColor: '#722ed1'
        }
      ]
    }

    return [
      {
        id: 'total-employees',
        title: analyticsData.employeeCount.label,
        value: analyticsData.employeeCount.value.toLocaleString(),
        icon: 'users',
        iconColor: '#1890ff',
        trend: {
          value: analyticsData.newHires.value.toString(),
          positive: analyticsData.newHires.value > 0 ? true : false,
          description: getTranslationFromI18nKeyAndLabel('hr_analytics_this_year', 'This year')
        },
        footer: getTranslationFromI18nKeyAndLabel('hr_analytics_active_employees', 'Active employees')
      },
      {
        id: 'turnover-rate',
        title: analyticsData.turnoverRate.label,
        value: `${analyticsData.turnoverRate.value.toFixed(1)}%`,
        icon: 'users',
        iconColor: analyticsData.turnoverRate.change < 0 ? '#52c41a' : '#fa8c16',
        trend: {
          value: `${analyticsData.turnoverRate.change > 0 ? '+' : ''}${analyticsData.turnoverRate.change.toFixed(1)}%`,
          positive: analyticsData.turnoverRate.change > 0 ? true : false
        },
        footer: `${analyticsData.turnoverRate.change > 0 ? '+' : ''}${analyticsData.turnoverRate.change.toFixed(1)}% ${getTranslationFromI18nKeyAndLabel('hr_analytics_vs_last_month', 'vs last month')}`
      },
      {
        id: 'average-salary',
        title: analyticsData.averageSalary.label,
        value: `$${analyticsData.averageSalary.value}K`,
        icon: 'mail', // Using mail as currency icon mapping
        iconColor: '#722ed1',
        footer: getTranslationFromI18nKeyAndLabel('hr_analytics_annual_average', 'Annual average')
      }
    ]
  }, [loading, analyticsData])

  if (loading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:py-12" data-testid="hr-analytics-loading">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="gba:w-full gba:bg-white" data-testid="hr-analytics-dashboard">
      <div className="gba:p-6 gba:pb-0">
        <div className="gba:mb-6">
          <Title level={2} className="gba:m-0">
            {getTranslationFromI18nKeyAndLabel('hr_analytics_dashboard_title', 'HR Analytics Dashboard')}
          </Title>
          <Text className="gba:text-gray-500">
            {getTranslationFromI18nKeyAndLabel(
              'hr_analytics_dashboard_subtitle',
              'Comprehensive workforce insights and metrics'
            )}
          </Text>
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

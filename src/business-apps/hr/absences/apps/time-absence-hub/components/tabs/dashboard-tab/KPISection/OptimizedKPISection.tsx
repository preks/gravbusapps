import React from 'react'
import { BusinessAppContextProps } from '../../../../../../../../../common/BusinessAppContext'
import { DashboardData, TimeFilter, AbsenceDetailsFilter } from '../../../../types'
import { WidgetGroup, WidgetItem } from '../../../../../../../../../components/widget-group'
import { UsersIcon, ClockIcon, CalendarIcon, PercentIcon } from '@phosphor-icons/react'
import { getDateFormat, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { getAbsenceStatusLabel, getAbsenceStatusColor } from '@/business-apps/hr/absences/utils/absenceStatusUtils'
import { DepartmentBarChart, StatusPieChart, VacationEntitlementsCard, VacationLiabilityCard } from './components'
import dayjs from 'dayjs'
import { TimeScope } from '../../../../constants/routes'

interface OptimizedKPISectionProps extends BusinessAppContextProps {
  dashboardData: DashboardData
  timeFilter?: TimeFilter
  timeScope?: TimeScope
  derivedDateRange?: { dateFrom: string; dateTo: string } | null
  onNavigateToDetails?: (filters: AbsenceDetailsFilter) => void
  onNavigateToEntitlements?: () => void
}

export const OptimizedKPISection: React.FC<OptimizedKPISectionProps> = ({
  dashboardData,
  timeFilter = 'current-year',
  timeScope,
  derivedDateRange,
  onNavigateToDetails,
  onNavigateToEntitlements
}) => {
  const {
    totalAbsences,
    pendingAbsences,
    averageDuration,
    approvalRate,
    departmentStats,
    statusBreakdown,
    entitlements,
    isLoading,
    error
  } = dashboardData

  const statusColors: { [key: string]: string } = {
    PENDING: getAbsenceStatusColor('PENDING'),
    APPROVED: getAbsenceStatusColor('APPROVED'),
    REJECTED: getAbsenceStatusColor('REJECTED'),
    CANCELLED: getAbsenceStatusColor('CANCELLED')
  }

  const departmentChartData = departmentStats.map(dept => ({
    id: (dept as any).id,
    department: dept.name.length > 15 ? `${dept.name.substring(0, 15)}...` : dept.name,
    fullName: dept.name,
    absences: dept.totalDays,
    uniqueEmployees: dept.uniqueEmployees,
    avgDaysPerEmployee: dept.avgDaysPerEmployee,
    avgRequestsPerEmployee: dept.avgRequestsPerEmployee,
    totalRequests: dept.totalRequests
  }))

  const pieChartData = statusBreakdown.map(status => ({
    name: getAbsenceStatusLabel(status.status),
    value: status.count,
    status: status.status,
    count: status.count,
    totalDays: status.totalDays,
    percentage: status.percentage
  }))

  const buildTotalAbsencesDescription = (): string => {
    if (timeScope === 'custom' && derivedDateRange) {
      const dateFrom = dayjs(derivedDateRange.dateFrom).format(getDateFormat('date.short'))
      const dateTo = dayjs(derivedDateRange.dateTo).format(getDateFormat('date.short'))

      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:time_absence_hub.dashboard.absences_in_date_range',
        `Absences from ${dateFrom} to ${dateTo}`,
        {
          dateFrom,
          dateTo
        }
      )
    }

    const resolvedTimeScope = timeScope ?? timeFilter

    if (resolvedTimeScope === 'custom') {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:time_absence_hub.dashboard.absences_custom_range',
        'All absences in custom range'
      )
    }

    if (resolvedTimeScope === 'month') {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:time_absence_hub.dashboard.absences_current_month',
        'All absences this month'
      )
    }

    if (resolvedTimeScope === 'quarter') {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:time_absence_hub.dashboard.absences_current_quarter',
        'All absences this quarter'
      )
    }

    if (resolvedTimeScope === 'everything') {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:time_absence_hub.dashboard.absences_all_time',
        'All absences across all time'
      )
    }

    return getTranslationFromI18nKeyAndLabel(
      'lowcoder:absence_management_hub_backoffice.all_absences_this_year',
      'All absences this year'
    )
  }

  const widgets: WidgetItem[] = [
    {
      key: 'total-absences',
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:absence_management_hub_backoffice.total_absences',
        'Total Absences'
      ),
      value: totalAbsences,
      prefix: <UsersIcon />,
      description: buildTotalAbsencesDescription(),
      span: { xs: 24, sm: 12, lg: 6 }
    },
    {
      key: 'average-duration',
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:absence_management_hub_backoffice.avg_duration',
        'Avg Duration'
      ),
      value: averageDuration,
      suffix: ` ${getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.days', 'days')}`,
      precision: 1,
      prefix: <CalendarIcon />,
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:absence_management_hub_backoffice.average_absence_length',
        'Average absence length'
      ),
      span: { xs: 24, sm: 12, lg: 6 }
    },
    {
      key: 'approval-rate',
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:absence_management_hub_backoffice.approval_rate',
        'Approval Rate'
      ),
      value: approvalRate,
      suffix: '%',
      prefix: <PercentIcon />,
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:absence_management_hub_backoffice.approved_vs_total_requests',
        'Approved vs total requests'
      ),
      span: { xs: 24, sm: 12, lg: 6 }
    },
    {
      key: 'pending-review',
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:absence_management_hub_backoffice.pending_review',
        'Pending Review'
      ),
      value: pendingAbsences,
      prefix: <ClockIcon />,
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:absence_management_hub_backoffice.awaiting_approval',
        'Awaiting approval'
      ),
      span: { xs: 24, sm: 12, lg: 6 }
    }
  ]

  const totalAbsenceCount = pieChartData.reduce((sum, entry) => sum + entry.value, 0)

  const getDateRangeForTimeFilter = () => {
    const now = new Date()
    const currentYear = now.getFullYear()

    switch (timeFilter) {
      case 'current-year':
        return {
          startDate: `${currentYear}-01-01`,
          endDate: `${currentYear}-12-31`
        }
      case 'quarter': {
        const quarter = Math.floor(now.getMonth() / 3)
        const quarterStartMonth = quarter * 3
        const quarterEndMonth = quarterStartMonth + 2
        const lastDayOfQuarter = new Date(currentYear, quarterEndMonth + 1, 0).getDate()
        return {
          startDate: `${currentYear}-${String(quarterStartMonth + 1).padStart(2, '0')}-01`,
          endDate: `${currentYear}-${String(quarterEndMonth + 1).padStart(2, '0')}-${String(lastDayOfQuarter).padStart(2, '0')}`
        }
      }
      case 'month': {
        const currentMonth = now.getMonth()
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
        return {
          startDate: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`,
          endDate: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`
        }
      }
      case 'everything':
      default:
        return {}
    }
  }

  const handlePieChartClick = (data: any) => {
    if (!onNavigateToDetails || !data) return

    const status = String(data.status || '').toUpperCase()
    const dateRange = getDateRangeForTimeFilter()

    onNavigateToDetails({
      status,
      ...dateRange
    })
  }

  if (isLoading) {
    return (
      <div
        className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4"
        data-testid="optimized-kpi-section-loading"
      >
        <div>
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:absence_management_hub_backoffice.loading_kpi_widgets',
            'Loading KPI widgets...'
          )}
        </div>
        <div>
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:absence_management_hub_backoffice.loading_department_chart',
            'Loading department chart...'
          )}
        </div>
        <div>
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:absence_management_hub_backoffice.loading_pie_chart',
            'Loading pie chart...'
          )}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:text-destructive gba:p-4" data-testid="optimized-kpi-section-error">
        {getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_backoffice.error_loading_kpi_data',
          'Error loading KPI data'
        )}
        : {error}
      </div>
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-4" data-testid="optimized-kpi-section-container">
      <div className="gba:col-span-full" data-testid="kpi-widgets">
        <WidgetGroup
          widgets={widgets}
          isLoading={isLoading}
          error={error}
          skeletonCount={4}
          emptyText={getTranslationFromI18nKeyAndLabel(
            'lowcoder:absence_management_hub_backoffice.no_kpi_data_available',
            'No KPI data available.'
          )}
          data-testid="optimized-kpi-widgets"
        />
      </div>

      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
        <DepartmentBarChart data={departmentChartData} />

        <StatusPieChart
          data={pieChartData}
          totalAbsenceCount={totalAbsenceCount}
          statusColors={statusColors}
          onPieClick={handlePieChartClick}
        />

        <VacationEntitlementsCard entitlements={entitlements} onNavigateToEntitlements={onNavigateToEntitlements} />

        <VacationLiabilityCard entitlements={entitlements} />
      </div>
    </div>
  )
}

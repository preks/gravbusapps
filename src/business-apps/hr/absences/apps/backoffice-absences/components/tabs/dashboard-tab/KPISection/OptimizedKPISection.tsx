import React from 'react'
import { Card } from '@newwork/nw-design-system'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { RiBarChartLine, RiPieChart2Line, RiBarChart2Line } from '@remixicon/react'
import { BusinessAppContextProps } from '../../../../../../../../../common/BusinessAppContext'
import { DashboardData, TimeFilter, AbsenceDetailsFilter } from '../../../../types'
import { WidgetGroup, WidgetItem } from '../../../../../../../../../components/widget-group'
import { PiUsers, PiClock, PiCalendar, PiPercent } from 'react-icons/pi'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

const getStatusTranslation = (status: string): string => {
  const statusMap: Record<string, string> = {
    APPROVED: 'lowcoder:absence_calendar.approved',
    PENDING: 'lowcoder:absence_calendar.pending',
    REJECTED: 'lowcoder:absence_calendar.rejected',
    CANCELLED: 'lowcoder:absence_calendar.cancelled'
  }

  const translationKey = statusMap[status]
  if (translationKey) {
    return getTranslationFromI18nKeyAndLabel(translationKey, status)
  }

  return status
}

interface OptimizedKPISectionProps extends BusinessAppContextProps {
  dashboardData: DashboardData
  timeFilter?: TimeFilter
  onNavigateToDetails?: (filters: AbsenceDetailsFilter) => void
  onNavigateToEntitlements?: () => void
}

/**
 * 🚀 OPTIMIZED: Comprehensive KPI Section with all visualizations
 * Uses centralized dashboard data with pre-calculated aggregations
 * No separate GraphQL requests - single efficient data source
 */
export const OptimizedKPISection: React.FC<OptimizedKPISectionProps> = ({
  dashboardData,
  timeFilter = 'current-year',
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

  // Color palettes for consistency with original KPISection
  const statusColors: { [key: string]: string } = {
    PENDING: '#fbbf24',
    APPROVED: '#52c41a',
    REJECTED: '#f87171'
  }

  // Transform data for visualizations
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
    name: status.status,
    value: status.count, // Use count of requests, not total days
    status: status.status,
    count: status.count,
    totalDays: status.totalDays, // Keep days for tooltip
    percentage: status.percentage
  }))

  // Enhanced KPI widgets with all metrics
  const widgets: WidgetItem[] = [
    {
      key: 'total-absences',
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:absence_management_hub_backoffice.total_absences',
        'Total Absences'
      ),
      value: totalAbsences,
      prefix: <PiUsers />,
      color: '#1890ff',
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:absence_management_hub_backoffice.all_absences_this_year',
        'All absences this year'
      ),
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
      prefix: <PiCalendar />,
      color: '#52c41a',
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
      prefix: <PiPercent />,
      color: '#722ed1',
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
      prefix: <PiClock />,
      color: '#fa8c16',
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:absence_management_hub_backoffice.awaiting_approval',
        'Awaiting approval'
      ),
      span: { xs: 24, sm: 12, lg: 6 }
    }
  ]

  const totalAbsenceCount = pieChartData.reduce((sum, entry) => sum + entry.value, 0)

  // Helper function to get date range based on time filter
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
        return {} // No date filter for everything
    }
  }

  // Handle pie chart slice click - navigate to absence details with status filter
  const handlePieChartClick = (data: any) => {
    if (!onNavigateToDetails || !data) return

    const status = String(data.status || '').toUpperCase()
    const dateRange = getDateRangeForTimeFilter()

    // Navigate to absence details with status and date filters
    onNavigateToDetails({
      status,
      ...dateRange
    })
  }

  // Handle bar chart click - navigate to absence details with department filter
  const handleBarChartClick = (data: any) => {
    if (!onNavigateToDetails || !data) return

    const department = data.fullName // Use full department name
    const departmentId = data.id // Prefer id when available
    const dateRange = getDateRangeForTimeFilter()

    // Special handling for "No Department" case
    if (department === 'No Department') {
      // For "No Department", we need to use a special filter identifier
      onNavigateToDetails({
        department: 'NO_DEPARTMENT_SPECIAL', // Special identifier
        departmentId: undefined,
        ...dateRange
      })
    } else {
      // Navigate to absence details with regular department name
      onNavigateToDetails({
        department,
        departmentId,
        ...dateRange
      })
    }
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
      <div className="gba:text-red-600 gba:p-4" data-testid="optimized-kpi-section-error">
        {getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_backoffice.error_loading_kpi_data',
          'Error loading KPI data'
        )}
        : {error}
      </div>
    )
  }

  return (
    <div
      className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4"
      data-testid="optimized-kpi-section-container"
    >
      {/* Enhanced KPI Widgets */}
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

      {/* Department Absences Bar Chart */}
      <Card className="gba:hover:shadow-md gba:transition-shadow gba:p-4" data-testid="department-chart-card">
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
          <RiBarChartLine className="gba:text-blue-600" size={20} />
          <div>
            <h5 className="gba:text-sm gba:font-medium gba:m-0">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.top_departments',
                'Top Departments'
              )}
            </h5>
            <p className="gba:text-xs gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.absence_days_by_department',
                'Absence days by department (with avg per employee)'
              )}
            </p>
          </div>
        </div>
        <div className="gba:h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={departmentChartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              style={{ cursor: 'pointer' }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" angle={-45} textAnchor="end" height={80} fontSize={12} />
              <YAxis fontSize={12} />
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    const data = payload[0].payload
                    return (
                      <div
                        className="gba:bg-white gba:p-3 gba:border gba:rounded gba:shadow gba:min-w-[200px] gba:cursor-pointer gba:hover:shadow-lg gba:transition-shadow gba:select-none"
                        onClick={() => handleBarChartClick(data)}
                        onMouseDown={() => handleBarChartClick(data)}
                        title={getTranslationFromI18nKeyAndLabel(
                          'lowcoder:absence_management_hub_backoffice.click_to_view_department_details',
                          'Click to view department details'
                        )}
                      >
                        <p className="gba:font-medium gba:mb-2">{data.fullName}</p>
                        <div className="gba:space-y-1 gba:text-sm">
                          <p className="gba:text-blue-600">
                            📊 {data.absences}{' '}
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:absence_management_hub_backoffice.total_absence_days',
                              'total absence days'
                            )}
                          </p>
                          <p className="gba:text-purple-600">
                            👥 {data.uniqueEmployees}{' '}
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:absence_management_hub_backoffice.employees',
                              'employees'
                            )}
                          </p>
                          <p className="gba:text-green-600">
                            📈 {data.avgDaysPerEmployee}{' '}
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:absence_management_hub_backoffice.avg_days_per_employee',
                              'avg days/employee'
                            )}
                          </p>
                          <p className="gba:text-orange-600">
                            📋 {data.avgRequestsPerEmployee}{' '}
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:absence_management_hub_backoffice.avg_requests_per_employee',
                              'avg requests/employee'
                            )}
                          </p>
                          <p className="gba:text-gray-600 gba:text-xs gba:mt-2">
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:absence_management_hub_backoffice.total',
                              'Total'
                            )}
                            : {data.totalRequests}{' '}
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:absence_management_hub_backoffice.requests',
                              'requests'
                            )}
                          </p>
                        </div>
                        <div className="gba:text-xs gba:text-blue-500 gba:mt-3 gba:pt-2 gba:border-t gba:border-gray-200 gba:text-center">
                          💡{' '}
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:absence_management_hub_backoffice.click_to_view_department_details',
                            'Click to view department details'
                          )}
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              {/* Invisible larger clickable area for easier interaction */}
              <Bar
                dataKey="absences"
                fill="transparent"
                onClick={handleBarChartClick}
                onMouseDown={handleBarChartClick}
                style={{ cursor: 'pointer' }}
                barSize={40}
              />
              {/* Visual bar - smaller but sits on top */}
              <Bar
                dataKey="absences"
                fill="#3498db"
                onClick={handleBarChartClick}
                onMouseDown={handleBarChartClick}
                style={{ cursor: 'pointer' }}
                radius={[2, 2, 0, 0]}
                barSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Status Breakdown Pie Chart */}
      <Card className="gba:hover:shadow-md gba:transition-shadow gba:p-4" data-testid="status-pie-chart-card">
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
          <RiPieChart2Line className="gba:text-green-600" size={20} />
          <div>
            <h5 className="gba:text-sm gba:font-medium gba:m-0">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.status_breakdown',
                'Status Breakdown'
              )}
            </h5>
            <p className="gba:text-xs gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.absence_approval_status',
                'Absence approval status'
              )}
            </p>
          </div>
        </div>
        <div className="gba:h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieChartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label={({ value }) => {
                  if (!value || totalAbsenceCount === 0) return ''
                  const percent = Math.round((value / totalAbsenceCount) * 100)
                  return percent > 5 ? `${percent}%` : '' // Only show % if slice is large enough
                }}
                labelLine={false}
                onClick={handlePieChartClick}
              >
                {pieChartData.map((entry, index) => (
                  <Cell key={index} fill={statusColors[entry.status] || '#94a3b8'} />
                ))}
              </Pie>
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    const entry = payload[0].payload
                    const percent = totalAbsenceCount > 0 ? Math.round((entry.value / totalAbsenceCount) * 100) : 0

                    return (
                      <div
                        className="gba:bg-white gba:p-3 gba:border gba:rounded gba:shadow"
                        style={{ pointerEvents: 'none' }}
                      >
                        <p className="gba:font-medium">{getStatusTranslation(entry.name)}</p>
                        <p>
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:absence_management_hub_backoffice.count',
                            'Count'
                          )}
                          : {entry.value}{' '}
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:absence_management_hub_backoffice.requests',
                            'requests'
                          )}
                        </p>
                        <p>
                          {getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.days', 'Days')}
                          : {entry.totalDays}{' '}
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:absence_management_hub_backoffice.total_days',
                            'total days'
                          )}
                        </p>
                        <p>
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:absence_management_hub_backoffice.share',
                            'Share'
                          )}
                          : {percent}%{' '}
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:absence_management_hub_backoffice.of_total_requests',
                            'of total requests'
                          )}
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
                wrapperStyle={{ pointerEvents: 'none' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="gba:flex gba:flex-wrap gba:gap-3 gba:mt-2 gba:justify-center">
          {pieChartData.map(entry => {
            const percent = totalAbsenceCount > 0 ? Math.round((Number(entry.value) / totalAbsenceCount) * 100) : 0
            return (
              <span key={entry.name} className="gba:flex gba:items-center gba:gap-2">
                <span
                  className="gba:w-3 gba:h-3 gba:rounded gba:inline-block"
                  style={{ backgroundColor: statusColors[entry.status] || '#94a3b8' }}
                />
                <span className="gba:text-xs">
                  {getStatusTranslation(entry.name)}: {percent}%
                </span>
              </span>
            )
          })}
        </div>
      </Card>

      {/* 🏖️ Vacation Entitlements Analytics Card */}
      <Card
        className="gba:hover:shadow-md gba:transition-shadow gba:p-4 gba:cursor-pointer"
        data-testid="entitlements-card"
        onClick={onNavigateToEntitlements}
      >
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
          <RiBarChart2Line className="gba:text-purple-600" size={20} />
          <div>
            <h5 className="gba:text-sm gba:font-medium gba:m-0">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.vacation_entitlements_analytics',
                'Vacation Entitlements Analytics'
              )}
            </h5>
            <p className="gba:text-xs gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.current_year_vacation_data_from',
                'Current year vacation data from'
              )}{' '}
              {entitlements.totalActiveEmployees}{' '}
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.active_employees',
                'active employees'
              )}
            </p>
          </div>
        </div>

        <div className="gba:space-y-3">
          {/* Key Metrics */}
          <div className="gba:grid gba:grid-cols-2 gba:gap-3 gba:mb-4">
            <div className="gba:text-center gba:p-2 gba:bg-blue-50 gba:rounded">
              <div className="gba:text-lg gba:font-bold gba:text-blue-600">
                {entitlements.totalVacationEntitlement.toFixed(0)}
              </div>
              <div className="gba:text-xs gba:text-gray-600">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_backoffice.total_vacation_days',
                  'Total vacation days'
                )}
              </div>
            </div>
            <div className="gba:text-center gba:p-2 gba:bg-green-50 gba:rounded">
              <div className="gba:text-lg gba:font-bold gba:text-green-600">{entitlements.totalActiveEmployees}</div>
              <div className="gba:text-xs gba:text-gray-600">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_backoffice.active_employees',
                  'Active Employees'
                )}
              </div>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="gba:flex gba:justify-between gba:items-center">
            <span className="gba:text-sm gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.avg_available_per_employee',
                'Avg Available per Employee'
              )}
            </span>
            <span className="gba:font-medium gba:text-blue-600">
              {entitlements.averageAvailable.toFixed(1)}{' '}
              {getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.days', 'days')}
            </span>
          </div>

          <div className="gba:flex gba:justify-between gba:items-center">
            <span className="gba:text-sm gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.avg_used_per_employee',
                'Avg Used per Employee'
              )}
            </span>
            <span className="gba:font-medium gba:text-orange-600">
              {entitlements.averageUsed.toFixed(1)}{' '}
              {getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.days', 'days')}
            </span>
          </div>

          <div className="gba:flex gba:justify-between gba:items-center">
            <span className="gba:text-sm gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.total_vacation_entitlement',
                'Total Vacation Entitlement'
              )}
            </span>
            <span className="gba:font-medium gba:text-purple-600">
              {entitlements.totalVacationEntitlement}{' '}
              {getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.days', 'days')}
            </span>
          </div>

          {/* Real data indicator */}
          <div className="gba:text-xs gba:text-center gba:text-gray-500 gba:border-t gba:pt-2">
            ✅{' '}
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_backoffice.real_vacation_data_indicator',
              'Real vacation data from active employees (current year only)'
            )}
          </div>
        </div>
      </Card>

      {/* 📊 Vacation Liability & Impact Card */}
      <Card className="gba:hover:shadow-md gba:transition-shadow gba:p-4" data-testid="vacation-liability-card">
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
          <div className="gba:text-orange-600 gba:text-lg">📊</div>
          <div>
            <h5 className="gba:text-sm gba:font-medium gba:m-0">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.vacation_liability_financial_impact',
                'Vacation Liability & Financial Impact'
              )}
            </h5>
            <p className="gba:text-xs gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.outstanding_vacation_days_financial_implications',
                'Outstanding vacation days and financial implications'
              )}
            </p>
          </div>
        </div>

        <div className="gba:space-y-4">
          {/* Top metrics grid */}
          <div className="gba:grid gba:grid-cols-2 gba:gap-3">
            <div className="gba:text-center gba:p-3 gba:bg-red-50 gba:rounded">
              <div className="gba:text-xl gba:font-bold gba:text-red-600">
                {entitlements.totalVacationLiability.toFixed(0)}
              </div>
              <div className="gba:text-xs gba:text-gray-600">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_backoffice.remaining_days_total',
                  'Remaining Days Total'
                )}
              </div>
            </div>
            <div className="gba:text-center gba:p-3 gba:bg-amber-50 gba:rounded">
              <div className="gba:text-xl gba:font-bold gba:text-amber-600">TBD</div>
              <div className="gba:text-xs gba:text-gray-600">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_backoffice.financial_impact',
                  'Financial Impact'
                )}
              </div>
            </div>
          </div>

          {/* Detailed breakdown */}
          <div className="gba:space-y-2">
            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:text-gray-600">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_backoffice.avg_remaining_per_employee',
                  'Avg Remaining per Employee'
                )}
              </span>
              <span className="gba:font-medium gba:text-red-600">
                {(entitlements.totalVacationLiability / entitlements.totalActiveEmployees).toFixed(1)}{' '}
                {getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.days', 'days')}
              </span>
            </div>

            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:text-gray-600">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_backoffice.total_active_employees',
                  'Total Active Employees'
                )}
              </span>
              <span className="gba:font-medium gba:text-blue-600">{entitlements.totalActiveEmployees}</span>
            </div>

            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:text-gray-600">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_backoffice.estimated_cost_per_day',
                  'Estimated Cost per Day'
                )}
              </span>
              <span className="gba:font-medium gba:text-amber-600">TBD</span>
            </div>

            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:text-gray-600">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_backoffice.total_liability_estimate',
                  'Total Liability Estimate'
                )}
              </span>
              <span className="gba:font-medium gba:text-amber-600">TBD</span>
            </div>
          </div>

          {/* Calculation note */}
          <div className="gba:bg-amber-50 gba:border gba:border-amber-200 gba:rounded gba:p-3">
            <div className="gba:text-xs gba:text-amber-800">
              💰{' '}
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.financial_calculations_coming_soon',
                'Financial calculations coming soon - will include average salary costs and vacation liability estimates'
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

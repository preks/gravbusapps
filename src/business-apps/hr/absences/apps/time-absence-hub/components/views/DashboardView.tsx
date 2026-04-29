import React from 'react'
import { BusinessAppContextProps } from '../../../../../../../common/BusinessAppContext'
import { DashboardTab } from '../tabs/dashboard-tab/DashboardTab'
import { TimeFilter, AbsenceDetailsFilter } from '../../types'
import { TimeScope } from '../../constants/routes'

interface DashboardViewProps extends BusinessAppContextProps {
  dashboardData?: any
  timeFilter?: TimeFilter
  timeScope?: TimeScope
  derivedDateRange?: { dateFrom: string; dateTo: string } | null
  onTimeFilterChange?: (filter: TimeFilter) => void
  onMonthClick?: (month: string, year?: number) => void
  onNavigateToDetails?: (filters: AbsenceDetailsFilter) => void
  onNavigateToEntitlements?: () => void
  filterAction?: React.ReactNode
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  accessToken,
  userInfo,
  dashboardData,
  timeFilter,
  timeScope,
  derivedDateRange,
  onTimeFilterChange,
  onMonthClick,
  onNavigateToDetails,
  onNavigateToEntitlements,
  filterAction
}) => (
  <div data-testid="time-absence-hub-dashboard-view">
    <DashboardTab
      accessToken={accessToken}
      userInfo={userInfo}
      dashboardData={dashboardData}
      onMonthClick={onMonthClick}
      timeFilter={timeFilter}
      timeScope={timeScope}
      derivedDateRange={derivedDateRange}
      onTimeFilterChange={onTimeFilterChange}
      onNavigateToDetails={onNavigateToDetails}
      onNavigateToEntitlements={onNavigateToEntitlements}
      filterAction={filterAction}
    />
  </div>
)

export default DashboardView

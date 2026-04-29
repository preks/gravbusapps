import React from 'react'
import { BusinessAppContextProps } from '../../../../../../../common/BusinessAppContext'
import { DashboardTab } from '../tabs/dashboard-tab/DashboardTab'
import { TimeFilter, AbsenceDetailsFilter } from '../../types'

interface DashboardViewProps extends BusinessAppContextProps {
  dashboardData?: any
  timeFilter?: TimeFilter
  onTimeFilterChange?: (filter: TimeFilter) => void
  onMonthClick?: (month: string, year?: number) => void
  onNavigateToDetails?: (filters: AbsenceDetailsFilter) => void
  onNavigateToEntitlements?: () => void
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  accessToken,
  userInfo,
  dashboardData,
  timeFilter,
  onTimeFilterChange,
  onMonthClick,
  onNavigateToDetails,
  onNavigateToEntitlements
}) => (
  <div data-testid="time-absence-hub-dashboard-view">
    <DashboardTab
      accessToken={accessToken}
      userInfo={userInfo}
      dashboardData={dashboardData}
      onMonthClick={onMonthClick}
      timeFilter={timeFilter}
      onTimeFilterChange={onTimeFilterChange}
      onNavigateToDetails={onNavigateToDetails}
      onNavigateToEntitlements={onNavigateToEntitlements}
    />
  </div>
)

export default DashboardView

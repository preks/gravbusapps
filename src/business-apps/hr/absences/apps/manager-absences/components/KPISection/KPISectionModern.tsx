import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useAbsenceKPIData } from '../../hooks/useAbsenceKPIData'
import { useAbsenceColors } from '../../utils/absenceColors'
import { useRecentAbsenceRequests } from '../../hooks/useRecentAbsenceRequests'
import { TopAbsenteesList } from './TopAbsenteesList'
import { RecentAbsenceRequestsList } from './PendingAbsenceRequestsList'

export interface KPISectionModernProps extends BusinessAppContextProps {
  onNavigateToAbsenceListPage?: (preFilter?: any) => void
}

export const KPISectionModern: React.FC<KPISectionModernProps> = props => {
  const { data, loading: dataLoading, error: dataError } = useAbsenceKPIData(props)
  const { loading: colorsLoading, error: colorsError } = useAbsenceColors(props)
  const { recentRequests, totalCount, loading: recentLoading, error: recentError } = useRecentAbsenceRequests(props)

  const loading = dataLoading || colorsLoading || recentLoading
  const error = dataError || colorsError || recentError

  if (!props.userInfo?.employeeDetails?.employeeId) {
    return (
      <div className="gba:p-6 gba:text-center gba:text-destructive" data-testid="kpi-error-no-employee">
        Error: Employee ID not found. Please check your user profile.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid="kpi-loading">
        Loading KPI data and colors...
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6 gba:text-center gba:text-destructive" data-testid="kpi-error">
        Error: {error}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid="kpi-no-data">
        No data available.
      </div>
    )
  }

  return (
    <div className="gba:py-2 gba:px-6" data-testid="kpi-section-modern">
      {/* Recent Requests and Top Absentees */}
      <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6 gba:mb-6">
        <RecentAbsenceRequestsList
          recentRequests={recentRequests}
          totalCount={totalCount}
          onNavigateToAbsenceListPage={props.onNavigateToAbsenceListPage}
        />
        <TopAbsenteesList
          topAbsentees={data.topAbsentees}
          maxAbsenceDays={data.maxAbsenceDays}
          onNavigateToAbsenceListPage={props.onNavigateToAbsenceListPage}
        />
      </div>
    </div>
  )
}

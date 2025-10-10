import React, { useState, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useAbsenceKPIData } from '../../hooks/useAbsenceKPIData'
import { useAbsenceColors } from '../../utils/absenceColors'
import { useRecentAbsenceRequests } from '../../hooks/useRecentAbsenceRequests'
import { TopAbsenteesList } from './TopAbsenteesList'
import { RecentAbsenceRequestsList } from './PendingAbsenceRequestsList'
import { AbsenceFilters } from '../../types'

export interface KPISectionModernProps extends BusinessAppContextProps {
  onNavigateToAbsenceListPage?: (preFilter?: any) => void
}

export const KPISectionModern: React.FC<KPISectionModernProps> = props => {
  const [startDate, setStartDate] = useState<string | undefined>(undefined)
  const [endDate, setEndDate] = useState<string | undefined>(undefined)

  // Memoize filters to prevent infinite loops
  const filters = useMemo<AbsenceFilters>(
    () => ({
      search: '',
      statuses: [],
      types: [],
      groups: [],
      employees: [],
      startDate,
      endDate
    }),
    [startDate, endDate]
  )

  const { data, loading: dataLoading, error: dataError } = useAbsenceKPIData(props, filters)
  const {
    colorMap,
    displayItems,
    loading: colorsLoading,
    error: colorsError,
    getColorForAbsence
  } = useAbsenceColors(props)
  const {
    recentRequests,
    totalCount,
    loading: recentLoading,
    error: recentError,
    refetch: refetchRecent
  } = useRecentAbsenceRequests(props)

  const loading = dataLoading || colorsLoading || recentLoading
  const error = dataError || colorsError || recentError

  if (!props.userInfo?.employeeDetails?.employeeId) {
    return (
      <div className="gba:p-6 gba:text-center gba:text-red-600" data-testid="kpi-error-no-employee">
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
      <div className="gba:p-6 gba:text-center gba:text-red-600" data-testid="kpi-error">
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

  const handleDateRangeChange = (newStartDate?: string, newEndDate?: string) => {
    setStartDate(newStartDate)
    setEndDate(newEndDate)
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

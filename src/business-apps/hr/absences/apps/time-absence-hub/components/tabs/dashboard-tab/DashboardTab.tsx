import React from 'react'
import { TabComponentProps, TimeFilter, AbsenceDetailsFilter } from '../../../types'
import { OptimizedKPISection } from './KPISection/OptimizedKPISection'
import OptimizedAbsenceTrends from './AbsenceTrends/OptimizedAbsenceTrends'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { TimeScope } from '../../../constants/routes'

interface DashboardTabProps extends TabComponentProps {
  onMonthClick?: (month: string, year?: number) => void
  timeFilter?: TimeFilter
  timeScope?: TimeScope
  derivedDateRange?: { dateFrom: string; dateTo: string } | null
  onNavigateToDetails?: (filters: AbsenceDetailsFilter) => void
  onNavigateToEntitlements?: () => void
  filterAction?: React.ReactNode
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  accessToken,
  userInfo,
  dashboardData,
  onMonthClick,
  timeFilter = 'current-year',
  timeScope,
  derivedDateRange,
  onNavigateToDetails,
  onNavigateToEntitlements,
  filterAction
}) => {
  if (!dashboardData) {
    return (
      <div>
        {getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_backoffice.loading_dashboard_data',
          'Loading dashboard data...'
        )}
      </div>
    )
  }
  return (
    <div className="gba:space-y-8" data-testid="dashboard-content">
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
        <div>
          <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_backoffice.dashboard_analytics',
              'Dashboard Analytics'
            )}
          </h2>
          <p className="gba:text-sm gba:text-muted-foreground">
            {dashboardData?.isLoading
              ? getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.loading', 'Loading...')
              : `${getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.showing_absences', 'Showing')} ${dashboardData?.totalAbsences || 0} ${getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.absences', 'absences')}`}
          </p>
        </div>
        {filterAction}
      </div>

      {/* Dashboard Components - All optimized */}
      <OptimizedKPISection
        accessToken={accessToken}
        userInfo={userInfo}
        dashboardData={dashboardData}
        timeFilter={timeFilter}
        timeScope={timeScope}
        derivedDateRange={derivedDateRange}
        onNavigateToDetails={onNavigateToDetails}
        onNavigateToEntitlements={onNavigateToEntitlements}
      />

      <OptimizedAbsenceTrends
        accessToken={accessToken}
        userInfo={userInfo}
        dashboardData={dashboardData}
        onMonthClick={onMonthClick}
      />
    </div>
  )
}

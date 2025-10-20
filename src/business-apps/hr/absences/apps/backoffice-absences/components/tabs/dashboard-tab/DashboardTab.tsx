import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { TabComponentProps, TimeFilter, AbsenceDetailsFilter } from '../../../types'
import { OptimizedKPISection } from './KPISection/OptimizedKPISection'
import OptimizedAbsenceTrends from './AbsenceTrends/OptimizedAbsenceTrends'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface DashboardTabProps extends TabComponentProps {
  onMonthClick?: (month: string, year?: number) => void
  timeFilter?: TimeFilter
  onTimeFilterChange?: (filter: TimeFilter) => void
  onNavigateToDetails?: (filters: AbsenceDetailsFilter) => void
  onNavigateToEntitlements?: () => void
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  accessToken,
  userInfo,
  dashboardData,
  onMonthClick,
  timeFilter = 'current-year',
  onTimeFilterChange,
  onNavigateToDetails,
  onNavigateToEntitlements
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
    <div className="gba:space-y-8 gba:px-6" data-testid="dashboard-content">
      {/* Time Filter */}
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
        <div className="gba:flex gba:items-center gba:gap-3">
          <span className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.time_period', 'Time Period')}
            :
          </span>
          <Select value={timeFilter} onValueChange={(value: any) => onTimeFilterChange?.(value)}>
            <SelectTrigger className="gba:w-48">
              <SelectValue
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_backoffice.select_time_period',
                  'Select time period'
                )}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current-year">
                {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.this_year', 'This Year')}
              </SelectItem>
              <SelectItem value="quarter">
                {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.this_quarter', 'This Quarter')}
              </SelectItem>
              <SelectItem value="month">
                {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.this_month', 'This Month')}
              </SelectItem>
              <SelectItem value="everything">
                {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.all_time', 'All Times')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Dashboard Components - All optimized */}
      <OptimizedKPISection
        accessToken={accessToken}
        userInfo={userInfo}
        dashboardData={dashboardData}
        timeFilter={timeFilter}
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

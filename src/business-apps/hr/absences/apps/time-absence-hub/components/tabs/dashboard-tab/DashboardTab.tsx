import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { TabComponentProps, TimeFilter, AbsenceDetailsFilter } from '../../../types'
import { OptimizedKPISection } from './KPISection/OptimizedKPISection'
import OptimizedAbsenceTrends from './AbsenceTrends/OptimizedAbsenceTrends'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { TimeScope } from '../../../constants/routes'
import { getSafeHubErrorMessage } from '../../../utils/safeErrorMessage'
import { ErrorStateCard } from '../../views/shared/DataStateCards'
import translations from '../../../_i18n'

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
  const { t } = useTranslation(translations)
  const header = (
    <div className="gba:flex gba:justify-between gba:items-center">
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
      {!dashboardData?.error ? filterAction : null}
    </div>
  )

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

  if (dashboardData.error) {
    const fallbackMessage = t('error-loading-dashboard')

    return (
      <div className="gba:flex gba:flex-col gba:gap-4" data-testid="dashboard-content-error">
        {header}
        <ErrorStateCard message={getSafeHubErrorMessage(fallbackMessage)} />
      </div>
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-8" data-testid="dashboard-content">
      {header}

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

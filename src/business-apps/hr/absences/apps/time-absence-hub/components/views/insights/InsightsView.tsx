import React from 'react'
import { BusinessAppContextProps } from '../../../../../../../../common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { StatisticsTab } from '../../tabs/statistics-tab/StatisticsTab'
import { useOrgAttendanceData } from '../../../hooks/useOrgAttendanceData'
import { HubGlobalFilters } from '../../../hooks/useHubGlobalFilters'
import { TimeTrackingTrendsSection } from './TimeTrackingTrendsSection'
import { CombinedHealthSection } from './CombinedHealthSection'
import { ComparisonSection } from './ComparisonSection'

interface InsightsViewProps extends BusinessAppContextProps {
  dashboardData?: any
  globalFilters: HubGlobalFilters
  derivedDateRange: { dateFrom: string; dateTo: string } | null
  filterAction?: React.ReactNode
}

const tt = (key: string, fallback: string) =>
  getTranslationFromI18nKeyAndLabel(`lowcoder:time_absence_hub.insights.${key}`, fallback)

export const InsightsView: React.FC<InsightsViewProps> = ({
  accessToken,
  userInfo,
  dashboardData,
  globalFilters,
  derivedDateRange,
  filterAction
}) => {
  const attendanceData = useOrgAttendanceData({
    accessToken,
    filters: globalFilters,
    derivedDateRange
  })

  return (
    <div className="gba:space-y-8" data-testid="time-absence-hub-insights-view">
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
        <div>
          <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">{tt('title', 'Insights')}</h2>
          <p className="gba:text-sm gba:text-muted-foreground">
            {tt(
              'page_intro',
              'Absence statistics, time-tracking trends and combined health metrics. Time-tracking sections use the org-wide attendance batch loader.'
            )}
          </p>
        </div>
        {filterAction}
      </div>

      <StatisticsTab accessToken={accessToken} userInfo={userInfo} dashboardData={dashboardData} />

      <TimeTrackingTrendsSection attendanceData={attendanceData} />
      <CombinedHealthSection attendanceData={attendanceData} />
      <ComparisonSection attendanceData={attendanceData} />
    </div>
  )
}

export default InsightsView

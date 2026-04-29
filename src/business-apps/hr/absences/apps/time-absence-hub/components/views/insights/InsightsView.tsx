import React from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'
import { LightbulbIcon } from '@phosphor-icons/react'
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
}

const tt = (key: string, fallback: string) =>
  getTranslationFromI18nKeyAndLabel(`lowcoder:time_absence_hub.insights.${key}`, fallback)

export const InsightsView: React.FC<InsightsViewProps> = ({
  accessToken,
  userInfo,
  dashboardData,
  globalFilters,
  derivedDateRange
}) => {
  const attendanceData = useOrgAttendanceData({
    accessToken,
    filters: globalFilters,
    derivedDateRange
  })

  return (
    <div className="gba:flex gba:flex-col gba:gap-4" data-testid="time-absence-hub-insights-view">
      <Card>
        <CardContent className="gba:flex gba:items-center gba:gap-2 gba:p-4">
          <LightbulbIcon size={18} className="gba:text-muted-foreground" />
          <span className="gba:text-sm gba:text-muted-foreground">
            {tt(
              'page_intro',
              'Absence statistics, time-tracking trends and combined health metrics. Time-tracking sections use the org-wide attendance batch loader.'
            )}
          </span>
        </CardContent>
      </Card>

      <StatisticsTab accessToken={accessToken} userInfo={userInfo} dashboardData={dashboardData} />

      <TimeTrackingTrendsSection attendanceData={attendanceData} />
      <CombinedHealthSection attendanceData={attendanceData} />
      <ComparisonSection attendanceData={attendanceData} />
    </div>
  )
}

export default InsightsView

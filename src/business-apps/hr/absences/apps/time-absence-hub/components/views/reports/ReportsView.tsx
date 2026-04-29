import React from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'
import { FileTextIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '../../../../../../../../common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { ReportsTab } from '../../tabs/reports-tab/ReportsTab'
import { TimeTrackingReport } from './TimeTrackingReport'
import { EntitlementReport } from './EntitlementReport'
import { HubGlobalFilters } from '../../../hooks/useHubGlobalFilters'

interface ReportsViewProps extends BusinessAppContextProps {
  dashboardData?: any
  globalFilters: HubGlobalFilters
  derivedDateRange: { dateFrom: string; dateTo: string } | null
  filterAction?: React.ReactNode
}

const tt = (key: string, fallback: string) =>
  getTranslationFromI18nKeyAndLabel(`lowcoder:time_absence_hub.reports.${key}`, fallback)

export const ReportsView: React.FC<ReportsViewProps> = ({
  accessToken,
  userInfo,
  dashboardData,
  globalFilters,
  derivedDateRange,
  filterAction
}) => (
  <div className="gba:flex gba:flex-col gba:gap-4" data-testid="time-absence-hub-reports-view">
    <Card>
      <CardContent className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:p-4">
        <div className="gba:flex gba:items-center gba:gap-2">
          <FileTextIcon size={18} className="gba:text-muted-foreground" />
          <span className="gba:text-sm gba:text-muted-foreground">
            {tt(
              'page_intro',
              'Existing absence reports stay below. Time-tracking and entitlement exports use the current global filter selection.'
            )}
          </span>
        </div>
        {filterAction}
      </CardContent>
    </Card>

    <ReportsTab accessToken={accessToken} userInfo={userInfo} dashboardData={dashboardData} />

    <TimeTrackingReport accessToken={accessToken} globalFilters={globalFilters} derivedDateRange={derivedDateRange} />
    <EntitlementReport accessToken={accessToken} globalFilters={globalFilters} />
  </div>
)

export default ReportsView

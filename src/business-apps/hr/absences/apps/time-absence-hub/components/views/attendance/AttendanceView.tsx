import React from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '../../../../../../../../common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useOrgAttendanceData } from '../../../hooks/useOrgAttendanceData'
import { HubGlobalFilters } from '../../../hooks/useHubGlobalFilters'
import { openEmployeeTimeTracking } from '../../../utils/hubNavigation'
import { AttendanceGrid } from './AttendanceGrid'

const tt = (key: string, fallback: string) =>
  getTranslationFromI18nKeyAndLabel(`lowcoder:time_absence_hub.attendance.${key}`, fallback)

interface AttendanceViewProps extends BusinessAppContextProps {
  activeSubTab?: string
  onSubTabChange?: (subTab: string) => void
  globalFilters: HubGlobalFilters
  derivedDateRange: { dateFrom: string; dateTo: string } | null
  filterAction?: React.ReactNode
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  accessToken,
  globalFilters,
  derivedDateRange,
  filterAction
}) => {
  const data = useOrgAttendanceData({ accessToken, filters: globalFilters, derivedDateRange })

  return (
    <div className="gba:flex gba:flex-col gba:gap-4" data-testid="time-absence-hub-attendance-view">
      <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
        <div>
          <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">{tt('title', 'Attendance')}</h2>
          <p className="gba:text-sm gba:text-muted-foreground">
            {tt('description', 'Organization-wide attendance overview for the selected filter scope.')}
          </p>
        </div>
        {filterAction}
      </div>

      <AttendanceGrid
        employees={data.employees}
        attendance={data.attendance}
        absences={data.absences}
        holidays={data.holidays}
        isLoading={data.isLoading}
        error={data.error}
        onOpenEmployee={openEmployeeTimeTracking}
      />

      <AttendanceLimitations />
    </div>
  )
}

const AttendanceLimitations: React.FC = () => (
  <Card>
    <CardContent className="gba:flex gba:flex-col gba:gap-1 gba:p-4 gba:text-xs gba:text-muted-foreground">
      <span className="gba:font-medium gba:text-foreground">{tt('scope_notes_title', 'Attendance scope notes')}</span>
      {/* TODO(B1-followup): replace batched ID query with backend-supported org-wide read once HR admin Hasura role exists */}
      <span>
        {tt('scope_note_batching', 'Data is fetched per-employee in batches of 200 (no org-wide Hasura role yet).')}
      </span>
      {/* TODO(no-schema): "on break" live indicator — no real-time field in EmployeeAttendance schema */}
      <span>
        {tt(
          'scope_note_on_break',
          'Live "on break" status is not available — schema does not expose a real-time break field.'
        )}
      </span>
      {/* TODO(no-schema): planned start/end times — only plannedTime duration available; late clock-in/early departure markers deferred */}
      <span>
        {tt(
          'scope_note_planned_times',
          'Planned start/end times are not available — only planned duration. Late clock-in / early departure markers are deferred.'
        )}
      </span>
    </CardContent>
  </Card>
)

export default AttendanceView

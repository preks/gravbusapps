import React from 'react'
import { Button, Card, CardContent } from '@newwork/nw-design-system'
import { DownloadSimpleIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '../../../../../../../../common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  buildExcelWorkbook,
  buildFilename,
  downloadExcelWorkbook,
  type ExcelColumn
} from '@/common/utils/excelExportUtils'
import { useOrgAttendanceData } from '../../../hooks/useOrgAttendanceData'
import { HubGlobalFilters } from '../../../hooks/useHubGlobalFilters'
import { AttendanceGrid } from './AttendanceGrid'
import { formatMinutes, toMinutes } from './attendanceUtils'
import {
  AbsenceCalendarDay,
  AttendanceRow,
  FilteredEmployee,
  PublicHolidayDay
} from '../../../queries/OrgAttendanceQueries'

const tt = (key: string, fallback: string) =>
  getTranslationFromI18nKeyAndLabel(`lowcoder:time_absence_hub.attendance.${key}`, fallback)

const buildExportColumns = (): ExcelColumn[] => [
  { header: tt('column_employee', 'Employee'), key: 'employee' },
  { header: tt('column_department', 'Department'), key: 'department' },
  { header: tt('column_location', 'Location'), key: 'location' },
  { header: tt('column_manager', 'Manager'), key: 'manager' },
  { header: tt('column_effective', 'Effective'), key: 'effective' },
  { header: tt('column_planned', 'Planned'), key: 'planned' },
  { header: tt('column_difference', 'Difference'), key: 'difference' },
  { header: tt('column_markers', 'Markers'), key: 'markers' }
]

const buildExportRows = (
  employees: FilteredEmployee[],
  attendance: AttendanceRow[],
  absences: AbsenceCalendarDay[],
  holidays: PublicHolidayDay[]
): Record<string, unknown>[] =>
  employees.map(employee => {
    const employeeAttendance = attendance.filter(row => row.employeeId === employee.id)
    const absenceCount = absences.filter(row => row.employeeId === employee.id).length
    const holidayCount = holidays.filter(row => row.employeeId === employee.id).length
    const manualOverrideCount = employeeAttendance.filter(row => Boolean(row.manualOverride)).length
    const missingLogCount = employeeAttendance.filter(
      row => (row.plannedTime ?? 0) > 0 && !row.startTime && !row.endTime
    ).length
    const totalEffectiveMinutes = employeeAttendance.reduce((acc, row) => acc + toMinutes(row.effectiveTime), 0)
    const totalPlannedMinutes = employeeAttendance.reduce((acc, row) => acc + toMinutes(row.plannedTime), 0)
    const totalDifferenceMinutes = employeeAttendance.reduce((acc, row) => acc + toMinutes(row.differenceTime), 0)
    const supervisor = employee.employeePosition?.supervisor

    return {
      employee: `${employee.firstName} ${employee.lastName}`.trim(),
      department: employee.employeePosition?.organizationalUnit?.name ?? '-',
      location: employee.employeePosition?.siteLocation?.name ?? '-',
      manager: supervisor ? `${supervisor.firstName} ${supervisor.lastName}` : '-',
      effective: formatMinutes(totalEffectiveMinutes),
      planned: formatMinutes(totalPlannedMinutes),
      difference: formatMinutes(totalDifferenceMinutes),
      markers: [
        absenceCount > 0 ? `${absenceCount} absence days` : '',
        holidayCount > 0 ? `${holidayCount} holidays` : '',
        manualOverrideCount > 0 ? `${manualOverrideCount} manual` : '',
        missingLogCount > 0 ? `${missingLogCount} missing` : ''
      ]
        .filter(Boolean)
        .join(', ')
    }
  })

interface AttendanceViewProps extends BusinessAppContextProps {
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

  const handleExportExcel = async () => {
    const workbook = buildExcelWorkbook(
      tt('export_sheet_name', 'Attendance'),
      buildExportColumns(),
      buildExportRows(data.employees, data.attendance, data.absences, data.holidays)
    )
    await downloadExcelWorkbook(workbook, buildFilename('time-absence-hub-attendance', 'xlsx'))
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-4" data-testid="time-absence-hub-attendance-view">
      <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
        <div>
          <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">{tt('title', 'Attendance')}</h2>
          <p className="gba:text-sm gba:text-muted-foreground">
            {tt('description', 'Organization-wide attendance overview for the selected filter scope.')}
          </p>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gba:gap-2"
            onClick={handleExportExcel}
            disabled={data.isLoading || data.employees.length === 0}
            data-testid="time-absence-hub-attendance-export-excel"
          >
            <DownloadSimpleIcon size={14} />
            {tt('export_excel', 'Export Excel')}
          </Button>
          {filterAction}
        </div>
      </div>

      <AttendanceGrid
        employees={data.employees}
        attendance={data.attendance}
        absences={data.absences}
        holidays={data.holidays}
        isLoading={data.isLoading}
        error={data.error}
        accessToken={accessToken}
      />

      <AttendanceLimitations />
    </div>
  )
}

const AttendanceLimitations: React.FC = () => (
  <Card>
    <CardContent className="gba:flex gba:flex-col gba:gap-1 gba:p-4 gba:text-xs gba:text-muted-foreground">
      <span className="gba:font-medium gba:text-foreground">{tt('scope_notes_title', 'Attendance scope notes')}</span>
      {/* Follow-up: replace batched ID query with backend-supported org-wide read once HR admin Hasura role exists. */}
      <span>
        {tt('scope_note_batching', 'Data is fetched per-employee in batches of 200 (no org-wide Hasura role yet).')}
      </span>
      {/* Schema limitation: "on break" live indicator needs a real-time field in EmployeeAttendance. */}
      <span>
        {tt(
          'scope_note_on_break',
          'Live "on break" status is not available — schema does not expose a real-time break field.'
        )}
      </span>
      {/* Schema limitation: planned start/end fields are not available, only planned duration. */}
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

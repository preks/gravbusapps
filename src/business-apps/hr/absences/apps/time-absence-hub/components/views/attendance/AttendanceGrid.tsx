import React, { useMemo } from 'react'
import {
  Badge,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@newwork/nw-design-system'
import { CalendarBlankIcon, ClockIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import {
  AbsenceCalendarDay,
  AttendanceRow,
  FilteredEmployee,
  PublicHolidayDay
} from '../../../queries/OrgAttendanceQueries'
import { formatMinutes, toMinutes } from './attendanceUtils'
import { ErrorStateCard, LoadingStateCard } from '../shared/DataStateCards'

const tt = (key: string, fallback: string) =>
  getTranslationFromI18nKeyAndLabel(`lowcoder:time_absence_hub.attendance.${key}`, fallback)

const HEADER_CELL_CLASS = 'gba:px-3 gba:py-3 gba:text-xs'
const TEXT_CELL_CLASS = 'gba:px-3 gba:py-3 gba:text-sm gba:text-muted-foreground'
const TIME_CELL_CLASS = 'gba:px-2 gba:py-3 gba:text-right gba:text-sm'

interface AttendanceGridProps {
  employees: FilteredEmployee[]
  attendance: AttendanceRow[]
  absences: AbsenceCalendarDay[]
  holidays: PublicHolidayDay[]
  isLoading: boolean
  error: string | null
  accessToken?: string
}

interface GridRow {
  employee: FilteredEmployee
  attendanceByDate: Map<string, AttendanceRow>
  absenceByDate: Map<string, AbsenceCalendarDay>
  holidayByDate: Map<string, PublicHolidayDay>
  totalEffectiveMinutes: number
  totalPlannedMinutes: number
  totalDifferenceMinutes: number
  manualOverrideCount: number
  missingLogCount: number
}

const formatTime = (value?: string | null): string => {
  if (!value) {
    return '-'
  }
  return value.length >= 5 ? value.slice(0, 5) : value
}

const buildRows = (
  employees: FilteredEmployee[],
  attendance: AttendanceRow[],
  absences: AbsenceCalendarDay[],
  holidays: PublicHolidayDay[]
): GridRow[] =>
  employees.map(employee => {
    const employeeAttendance = attendance.filter(a => a.employeeId === employee.id)
    const employeeAbsences = absences.filter(a => a.employeeId === employee.id)
    const employeeHolidays = holidays.filter(h => h.employeeId === employee.id)
    const attendanceByDate = new Map(employeeAttendance.map(a => [a.attendanceDate, a]))
    const absenceByDate = new Map(employeeAbsences.map(a => [a.dayDate, a]))
    const holidayByDate = new Map(employeeHolidays.map(h => [h.date, h]))
    const totalEffectiveMinutes = employeeAttendance.reduce((acc, a) => acc + toMinutes(a.effectiveTime), 0)
    const totalPlannedMinutes = employeeAttendance.reduce((acc, a) => acc + toMinutes(a.plannedTime), 0)
    const totalDifferenceMinutes = employeeAttendance.reduce((acc, a) => acc + toMinutes(a.differenceTime), 0)
    const manualOverrideCount = employeeAttendance.filter(a => Boolean(a.manualOverride)).length
    const missingLogCount = employeeAttendance.filter(
      a => (a.plannedTime ?? 0) > 0 && !a.startTime && !a.endTime
    ).length
    return {
      employee,
      attendanceByDate,
      absenceByDate,
      holidayByDate,
      totalEffectiveMinutes,
      totalPlannedMinutes,
      totalDifferenceMinutes,
      manualOverrideCount,
      missingLogCount
    }
  })

const renderEmptyState = (): React.ReactElement => (
  <Card>
    <CardContent className="gba:flex gba:flex-col gba:items-center gba:gap-2 gba:py-8 gba:text-center">
      <CalendarBlankIcon size={32} className="gba:text-muted-foreground" />
      <p className="gba:text-sm gba:text-muted-foreground">
        {tt('grid_empty', 'No employees match the current filters.')}
      </p>
    </CardContent>
  </Card>
)

export const AttendanceGrid: React.FC<AttendanceGridProps> = ({
  employees,
  attendance,
  absences,
  holidays,
  isLoading,
  error,
  accessToken
}) => {
  const rows = useMemo(
    () => buildRows(employees, attendance, absences, holidays),
    [employees, attendance, absences, holidays]
  )

  if (error) {
    return <ErrorStateCard message={error} />
  }

  if (isLoading) {
    return <LoadingStateCard message={tt('grid_loading', 'Loading attendance...')} />
  }

  if (rows.length === 0) {
    return renderEmptyState()
  }

  return (
    <Card>
      <CardContent className="gba:p-0">
        <div className="gba:w-full gba:overflow-hidden">
          <Table className="gba:w-full gba:table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className={`${HEADER_CELL_CLASS} gba:w-36`}>{tt('column_employee', 'Employee')}</TableHead>
                <TableHead className={`${HEADER_CELL_CLASS} gba:w-40`}>
                  {tt('column_department', 'Department')}
                </TableHead>
                <TableHead className={`${HEADER_CELL_CLASS} gba:w-28`}>{tt('column_location', 'Location')}</TableHead>
                <TableHead className={`${HEADER_CELL_CLASS} gba:w-32`}>{tt('column_manager', 'Manager')}</TableHead>
                <TableHead className={`${HEADER_CELL_CLASS} gba:w-20 gba:text-right`}>
                  {tt('column_effective', 'Effective')}
                </TableHead>
                <TableHead className={`${HEADER_CELL_CLASS} gba:w-20 gba:text-right`}>
                  {tt('column_planned', 'Planned')}
                </TableHead>
                <TableHead className={`${HEADER_CELL_CLASS} gba:w-20 gba:text-right`}>
                  {tt('column_difference', 'Difference')}
                </TableHead>
                <TableHead className={`${HEADER_CELL_CLASS} gba:w-28`}>{tt('column_markers', 'Markers')}</TableHead>
                <TableHead className={`${HEADER_CELL_CLASS} gba:w-12 gba:text-right`}>
                  {tt('column_actions', 'Actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(row => (
                <AttendanceGridRow key={row.employee.id} row={row} accessToken={accessToken} />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

interface AttendanceGridRowProps {
  row: GridRow
  accessToken?: string
}

const AttendanceGridRow: React.FC<AttendanceGridRowProps> = ({ row, accessToken }) => {
  const { employee } = row
  const departmentName = employee.employeePosition?.organizationalUnit?.name ?? '-'
  const locationName = employee.employeePosition?.siteLocation?.name ?? '-'
  const managerName = employee.employeePosition?.supervisor
    ? `${employee.employeePosition.supervisor.firstName} ${employee.employeePosition.supervisor.lastName}`
    : '-'
  const absenceCount = row.absenceByDate.size
  const holidayCount = row.holidayByDate.size

  const absenceDaysLabel = getTranslationFromI18nKeyAndLabel(
    'lowcoder:time_absence_hub.attendance.badge_absence_days',
    `${absenceCount} absence days`,
    { count: absenceCount }
  )
  const holidaysLabel = getTranslationFromI18nKeyAndLabel(
    'lowcoder:time_absence_hub.attendance.badge_holidays',
    `${holidayCount} holidays`,
    { count: holidayCount }
  )
  const manualLabel = getTranslationFromI18nKeyAndLabel(
    'lowcoder:time_absence_hub.attendance.badge_manual',
    `${row.manualOverrideCount} manual`,
    { count: row.manualOverrideCount }
  )
  const missingLabel = getTranslationFromI18nKeyAndLabel(
    'lowcoder:time_absence_hub.attendance.badge_missing',
    `${row.missingLogCount} missing`,
    { count: row.missingLogCount }
  )

  return (
    <TableRow data-testid={`attendance-grid-row-${employee.id}`}>
      <TableCell className="gba:px-3 gba:py-3">
        <span
          className="gba:block gba:truncate gba:text-sm gba:font-medium"
          title={`${employee.firstName} ${employee.lastName}`}
        >
          {employee.firstName} {employee.lastName}
        </span>
      </TableCell>
      <TableCell className={TEXT_CELL_CLASS}>
        <span className="gba:block gba:truncate" title={departmentName}>
          {departmentName}
        </span>
      </TableCell>
      <TableCell className={TEXT_CELL_CLASS}>
        <span className="gba:block gba:truncate" title={locationName}>
          {locationName}
        </span>
      </TableCell>
      <TableCell className={TEXT_CELL_CLASS}>
        <span className="gba:block gba:truncate" title={managerName}>
          {managerName}
        </span>
      </TableCell>
      <TableCell className={TIME_CELL_CLASS}>{formatMinutes(row.totalEffectiveMinutes)}</TableCell>
      <TableCell className={TIME_CELL_CLASS}>{formatMinutes(row.totalPlannedMinutes)}</TableCell>
      <TableCell className={TIME_CELL_CLASS}>
        <span className={diffColorClass(row.totalDifferenceMinutes)}>{formatMinutes(row.totalDifferenceMinutes)}</span>
      </TableCell>
      <TableCell className="gba:px-3 gba:py-3">
        <div className="gba:flex gba:flex-wrap gba:gap-1 gba:text-xs">
          {absenceCount > 0 && <Badge variant="secondary">{absenceDaysLabel}</Badge>}
          {holidayCount > 0 && <Badge variant="outline">{holidaysLabel}</Badge>}
          {row.manualOverrideCount > 0 && (
            <Badge variant="outline" className="gba:border-warning gba:text-warning">
              {manualLabel}
            </Badge>
          )}
          {row.missingLogCount > 0 && (
            <Badge variant="outline" className="gba:border-destructive gba:text-destructive">
              {missingLabel}
            </Badge>
          )}
          {absenceCount === 0 && holidayCount === 0 && row.manualOverrideCount === 0 && row.missingLogCount === 0 && (
            <span className="gba:text-xs gba:text-muted-foreground">
              <ClockIcon size={12} className="gba:inline gba:mr-1" />
              {tt('badge_on_track', 'On track')}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="gba:px-1 gba:py-3 gba:text-right">
        {accessToken && (
          <AppAction
            variant="table-row"
            data-testid={`attendance-grid-actions-${employee.id}`}
            contexts={[
              {
                context: FlowContextName.employeeEntity,
                contextData: {
                  employeeId: employee.id,
                  keycloakUserId: getKeycloakUserId(employee.additionalProperties),
                  managerId: employee.employeePosition?.supervisor?.id,
                  organizationalUnitId: employee.employeePosition?.organizationalUnitId
                }
              }
            ]}
            prefixDataTestId={`attendance-grid-action-${employee.id}`}
            accessToken={accessToken}
            emptyState="enable"
          />
        )}
      </TableCell>
    </TableRow>
  )
}

const getKeycloakUserId = (additionalProperties?: Record<string, unknown> | null): string | undefined => {
  const userId = additionalProperties?.userId

  return typeof userId === 'string' ? userId : undefined
}

const diffColorClass = (minutes: number): string => {
  if (minutes < 0) {
    return 'gba:text-destructive'
  }
  if (minutes > 0) {
    return 'gba:text-success'
  }
  return ''
}

export { formatMinutes, formatTime }
export default AttendanceGrid

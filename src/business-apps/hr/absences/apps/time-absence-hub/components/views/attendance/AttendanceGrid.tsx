import React, { useMemo } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@newwork/nw-design-system'
import { ArrowSquareOutIcon, CalendarBlankIcon, ClockIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  AbsenceCalendarDay,
  AttendanceRow,
  FilteredEmployee,
  PublicHolidayDay
} from '../../../queries/OrgAttendanceQueries'

const tt = (key: string, fallback: string) =>
  getTranslationFromI18nKeyAndLabel(`lowcoder:time_absence_hub.attendance.${key}`, fallback)

interface AttendanceGridProps {
  employees: FilteredEmployee[]
  attendance: AttendanceRow[]
  absences: AbsenceCalendarDay[]
  holidays: PublicHolidayDay[]
  isLoading: boolean
  error: string | null
  onOpenEmployee: (employeeId: string) => void
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

const formatMinutes = (minutes?: number | null): string => {
  if (!minutes && minutes !== 0) {
    return '-'
  }
  const sign = minutes < 0 ? '-' : ''
  const abs = Math.abs(minutes)
  const hours = Math.floor(abs / 60)
  const mins = abs % 60
  return `${sign}${hours}h ${String(mins).padStart(2, '0')}m`
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
    const totalEffectiveMinutes = employeeAttendance.reduce((acc, a) => acc + (a.effectiveTime ?? 0), 0)
    const totalPlannedMinutes = employeeAttendance.reduce((acc, a) => acc + (a.plannedTime ?? 0), 0)
    const totalDifferenceMinutes = employeeAttendance.reduce((acc, a) => acc + (a.differenceTime ?? 0), 0)
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
  onOpenEmployee
}) => {
  const rows = useMemo(
    () => buildRows(employees, attendance, absences, holidays),
    [employees, attendance, absences, holidays]
  )

  if (error) {
    return (
      <Card>
        <CardContent className="gba:flex gba:flex-col gba:items-center gba:gap-2 gba:py-8 gba:text-center">
          <WarningCircleIcon size={32} className="gba:text-destructive" />
          <p className="gba:text-sm gba:text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:py-8">
          <Spinner />
          <span className="gba:text-sm gba:text-muted-foreground">{tt('grid_loading', 'Loading attendance...')}</span>
        </CardContent>
      </Card>
    )
  }

  if (rows.length === 0) {
    return renderEmptyState()
  }

  return (
    <Card>
      <CardContent className="gba:p-0">
        <div className="gba:overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tt('column_employee', 'Employee')}</TableHead>
                <TableHead>{tt('column_department', 'Department')}</TableHead>
                <TableHead>{tt('column_location', 'Location')}</TableHead>
                <TableHead>{tt('column_manager', 'Manager')}</TableHead>
                <TableHead className="gba:text-right">{tt('column_effective', 'Effective')}</TableHead>
                <TableHead className="gba:text-right">{tt('column_planned', 'Planned')}</TableHead>
                <TableHead className="gba:text-right">{tt('column_difference', 'Difference')}</TableHead>
                <TableHead>{tt('column_markers', 'Markers')}</TableHead>
                <TableHead className="gba:text-right">{tt('column_actions', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(row => (
                <AttendanceGridRow key={row.employee.id} row={row} onOpenEmployee={onOpenEmployee} />
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
  onOpenEmployee: (employeeId: string) => void
}

const AttendanceGridRow: React.FC<AttendanceGridRowProps> = ({ row, onOpenEmployee }) => {
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
      <TableCell>
        <span className="gba:font-medium gba:text-sm">
          {employee.firstName} {employee.lastName}
        </span>
      </TableCell>
      <TableCell className="gba:text-sm gba:text-muted-foreground">{departmentName}</TableCell>
      <TableCell className="gba:text-sm gba:text-muted-foreground">{locationName}</TableCell>
      <TableCell className="gba:text-sm gba:text-muted-foreground">{managerName}</TableCell>
      <TableCell className="gba:text-right gba:text-sm">{formatMinutes(row.totalEffectiveMinutes)}</TableCell>
      <TableCell className="gba:text-right gba:text-sm">{formatMinutes(row.totalPlannedMinutes)}</TableCell>
      <TableCell className="gba:text-right gba:text-sm">
        <span className={diffColorClass(row.totalDifferenceMinutes)}>{formatMinutes(row.totalDifferenceMinutes)}</span>
      </TableCell>
      <TableCell>
        <div className="gba:flex gba:flex-wrap gba:gap-1">
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
      <TableCell className="gba:text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onOpenEmployee(employee.id)}
          data-testid={`attendance-grid-open-${employee.id}`}
          aria-label={tt('open_employee_record_aria', 'Open employee record')}
        >
          <ArrowSquareOutIcon size={14} />
        </Button>
      </TableCell>
    </TableRow>
  )
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

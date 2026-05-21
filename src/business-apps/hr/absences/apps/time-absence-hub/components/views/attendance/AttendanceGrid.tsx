import React, { useEffect, useMemo, useState } from 'react'
import { Badge } from '@newwork/nw-design-system'
import { ClockIcon, UserIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  AbsenceCalendarDay,
  AttendanceRow,
  FilteredEmployee,
  PublicHolidayDay
} from '../../../queries/OrgAttendanceQueries'
import { formatMinutes, toMinutes } from './attendanceUtils'
import { HubDataTable, type HubDataTableColumn } from '../shared/HubDataTable'

const tt = (key: string, fallback: string) =>
  getTranslationFromI18nKeyAndLabel(`lowcoder:time_absence_hub.attendance.${key}`, fallback)

interface AttendanceGridProps {
  employees: FilteredEmployee[]
  attendance: AttendanceRow[]
  absences: AbsenceCalendarDay[]
  holidays: PublicHolidayDay[]
  isLoading: boolean
  error: string | null
  onOpenEmployee?: (employeeId: string) => void
}

interface GridRow {
  employee: FilteredEmployee
  departmentName: string
  locationName: string
  managerName: string
  totalEffectiveMinutes: number
  totalPlannedMinutes: number
  totalDifferenceMinutes: number
  absenceCount: number
  holidayCount: number
  manualOverrideCount: number
  missingLogCount: number
}

type AttendanceSortField =
  | 'employeeName'
  | 'departmentName'
  | 'locationName'
  | 'managerName'
  | 'totalPlannedMinutes'
  | 'totalEffectiveMinutes'
  | 'totalDifferenceMinutes'
  | 'markerCount'

type AttendanceSortOrder = 'ASC' | 'DESC'

const formatTime = (value?: string | null): string => {
  if (!value) {
    return '-'
  }
  return value.length >= 5 ? value.slice(0, 5) : value
}

const getEmployeeName = (row: GridRow): string => `${row.employee.firstName} ${row.employee.lastName}`.trim()

const getMarkerCount = (row: GridRow): number =>
  row.absenceCount + row.holidayCount + row.manualOverrideCount + row.missingLogCount

const countUniqueBy = <T,>(rows: T[], getKey: (row: T) => string): number =>
  new Set(rows.map(getKey).filter(Boolean)).size

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
    const departmentName = employee.employeePosition?.organizationalUnit?.name ?? '-'
    const locationName = employee.employeePosition?.siteLocation?.name ?? '-'
    const managerName = employee.employeePosition?.supervisor
      ? `${employee.employeePosition.supervisor.firstName} ${employee.employeePosition.supervisor.lastName}`
      : '-'
    const totalEffectiveMinutes = employeeAttendance.reduce((acc, a) => acc + toMinutes(a.effectiveTime), 0)
    const totalPlannedMinutes = employeeAttendance.reduce((acc, a) => acc + toMinutes(a.plannedTime), 0)
    const totalDifferenceMinutes = employeeAttendance.reduce((acc, a) => acc + toMinutes(a.differenceTime), 0)
    const manualOverrideCount = employeeAttendance.filter(a => Boolean(a.manualOverride)).length
    const missingLogCount = employeeAttendance.filter(
      a => toMinutes(a.plannedTime) > 0 && !a.startTime && !a.endTime
    ).length
    return {
      employee,
      departmentName,
      locationName,
      managerName,
      totalEffectiveMinutes,
      totalPlannedMinutes,
      totalDifferenceMinutes,
      absenceCount: countUniqueBy(employeeAbsences, absence => absence.dayDate),
      holidayCount: countUniqueBy(employeeHolidays, holiday => holiday.date),
      manualOverrideCount,
      missingLogCount
    }
  })

export const AttendanceGrid: React.FC<AttendanceGridProps> = ({
  employees,
  attendance,
  absences,
  holidays,
  isLoading,
  error,
  onOpenEmployee
}) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState<AttendanceSortField>('employeeName')
  const [sortOrder, setSortOrder] = useState<AttendanceSortOrder>('ASC')

  const baseRows = useMemo(
    () => buildRows(employees, attendance, absences, holidays),
    [employees, attendance, absences, holidays]
  )

  const rows = useMemo(() => {
    const sortedRows = [...baseRows]
    sortedRows.sort((left, right) => {
      const direction = sortOrder === 'ASC' ? 1 : -1
      const compareStrings = (leftValue: string, rightValue: string): number =>
        leftValue.localeCompare(rightValue, undefined, { sensitivity: 'base' }) * direction
      const compareNumbers = (leftValue: number, rightValue: number): number => {
        if (leftValue === rightValue) {
          return 0
        }
        return leftValue > rightValue ? direction : -direction
      }

      switch (sortField) {
        case 'departmentName':
          return compareStrings(left.departmentName, right.departmentName)
        case 'locationName':
          return compareStrings(left.locationName, right.locationName)
        case 'managerName':
          return compareStrings(left.managerName, right.managerName)
        case 'totalPlannedMinutes':
          return compareNumbers(left.totalPlannedMinutes, right.totalPlannedMinutes)
        case 'totalEffectiveMinutes':
          return compareNumbers(left.totalEffectiveMinutes, right.totalEffectiveMinutes)
        case 'totalDifferenceMinutes':
          return compareNumbers(left.totalDifferenceMinutes, right.totalDifferenceMinutes)
        case 'markerCount':
          return compareNumbers(getMarkerCount(left), getMarkerCount(right))
        case 'employeeName':
        default:
          return compareStrings(getEmployeeName(left), getEmployeeName(right))
      }
    })
    return sortedRows
  }, [baseRows, sortField, sortOrder])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, pageSize, rows.length])

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return rows.slice(start, start + pageSize)
  }, [currentPage, pageSize, rows])

  const handleSort = (field: string) => {
    const nextField = field as AttendanceSortField
    if (nextField === sortField) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')
    } else {
      setSortField(nextField)
      setSortOrder('ASC')
    }
    setCurrentPage(1)
  }

  const columns = useMemo<HubDataTableColumn<GridRow>[]>(
    () => [
      {
        key: 'employee',
        header: tt('column_employee', 'Employee'),
        sortableField: 'employeeName',
        widthClassName: 'gba:w-32',
        headerClassName: 'gba:px-3',
        cellClassName: 'gba:px-2 gba:py-3',
        renderCell: row => (
          <div className="gba:flex gba:items-center gba:gap-2">
            <UserIcon size={16} className="gba:text-muted-foreground" />
            <span
              className="gba:block gba:truncate gba:text-sm gba:font-medium gba:text-foreground"
              title={`${row.employee.firstName} ${row.employee.lastName}`}
            >
              {row.employee.firstName} {row.employee.lastName}
            </span>
          </div>
        )
      },
      {
        key: 'department',
        header: tt('column_department', 'Department'),
        sortableField: 'departmentName',
        widthClassName: 'gba:w-36',
        headerClassName: 'gba:px-3',
        cellClassName: 'gba:px-2 gba:py-3 gba:text-sm',
        renderCell: row => (
          <span className="gba:block gba:truncate" title={row.departmentName}>
            {row.departmentName}
          </span>
        )
      },
      {
        key: 'location',
        header: tt('column_location', 'Location'),
        sortableField: 'locationName',
        widthClassName: 'gba:w-24',
        headerClassName: 'gba:px-2',
        cellClassName: 'gba:px-2 gba:py-3 gba:text-sm',
        renderCell: row => (
          <span className="gba:block gba:truncate" title={row.locationName}>
            {row.locationName}
          </span>
        )
      },
      {
        key: 'manager',
        header: tt('column_manager', 'Manager'),
        sortableField: 'managerName',
        widthClassName: 'gba:w-24',
        headerClassName: 'gba:px-2',
        cellClassName: 'gba:px-2 gba:py-3 gba:text-sm',
        renderCell: row => (
          <span className="gba:block gba:truncate" title={row.managerName}>
            {row.managerName}
          </span>
        )
      },
      {
        key: 'planned',
        header: tt('column_planned', 'Planned'),
        sortableField: 'totalPlannedMinutes',
        widthClassName: 'gba:w-20',
        headerClassName: 'gba:px-2',
        cellClassName: 'gba:px-1 gba:py-3 gba:text-right gba:text-sm',
        renderCell: row => formatMinutes(row.totalPlannedMinutes)
      },
      {
        key: 'effective',
        header: tt('column_effective', 'Effective'),
        sortableField: 'totalEffectiveMinutes',
        widthClassName: 'gba:w-20',
        headerClassName: 'gba:px-2',
        cellClassName: 'gba:px-1 gba:py-3 gba:text-right gba:text-sm',
        renderCell: row => formatMinutes(row.totalEffectiveMinutes)
      },
      {
        key: 'difference',
        header: tt('column_difference', 'Difference'),
        sortableField: 'totalDifferenceMinutes',
        widthClassName: 'gba:w-20',
        headerClassName: 'gba:px-2',
        cellClassName: 'gba:px-1 gba:py-3 gba:text-right gba:text-sm',
        renderCell: row => (
          <span className={diffColorClass(row.totalDifferenceMinutes)}>
            {formatMinutes(row.totalDifferenceMinutes)}
          </span>
        )
      },
      {
        key: 'markers',
        header: tt('column_markers', 'Markers'),
        sortableField: 'markerCount',
        widthClassName: 'gba:w-24',
        headerClassName: 'gba:px-2',
        cellClassName: 'gba:px-2 gba:py-3',
        renderCell: row => <div className="gba:flex gba:flex-wrap gba:gap-1 gba:text-xs">{renderMarkers(row)}</div>
      }
    ],
    []
  )

  return (
    <HubDataTable
      columns={columns}
      rows={paginatedRows}
      getRowKey={row => row.employee.id}
      loading={isLoading}
      error={error}
      total={rows.length}
      currentPage={currentPage}
      pageSize={pageSize}
      onPaginationChange={(page, newPageSize) => {
        if (newPageSize) {
          setPageSize(newPageSize)
        }
        setCurrentPage(page)
      }}
      sortField={sortField}
      sortOrder={sortOrder}
      onSort={handleSort}
      onRowClick={row => onOpenEmployee?.(row.employee.id)}
      dataTestIdPrefix="attendance-grid"
      rowLabel={tt('row_label_employees', 'employees')}
      emptyMessage={tt('grid_empty', 'No employees match the current filters.')}
    />
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

const renderMarkers = (row: GridRow): React.ReactNode => {
  const absenceDaysLabel = getTranslationFromI18nKeyAndLabel(
    'lowcoder:time_absence_hub.attendance.badge_absence_days',
    `${row.absenceCount} absence days`,
    { count: row.absenceCount }
  )
  const holidaysLabel = getTranslationFromI18nKeyAndLabel(
    'lowcoder:time_absence_hub.attendance.badge_bank_holidays',
    `${row.holidayCount} bank holidays`,
    { count: row.holidayCount }
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

  if (row.absenceCount === 0 && row.holidayCount === 0 && row.manualOverrideCount === 0 && row.missingLogCount === 0) {
    return (
      <span className="gba:text-xs gba:text-muted-foreground">
        <ClockIcon size={12} className="gba:inline gba:mr-1" />
        {tt('badge_on_track', 'On track')}
      </span>
    )
  }

  return (
    <>
      {row.absenceCount > 0 && <Badge variant="secondary">{absenceDaysLabel}</Badge>}
      {row.holidayCount > 0 && <Badge variant="outline">{holidaysLabel}</Badge>}
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
    </>
  )
}

export { formatMinutes, formatTime }
export default AttendanceGrid

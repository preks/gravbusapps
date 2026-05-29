import React, { useEffect, useMemo, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage, Badge } from '@newwork/nw-design-system'
import { ClockIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type {
  AbsenceNetDay,
  AbsenceCalendarDay,
  AttendanceRow,
  FilteredEmployee,
  PublicHolidayDay
} from '../../../queries/OrgAttendanceQueries'
import { AttendanceDateRange, formatMinutes } from './attendanceUtils'
import { HubDataTable, type HubDataTableColumn } from '../shared/HubDataTable'
import type { AttendanceAbsenceTypeOption } from './attendanceMetrics'
import { computeAttendanceEmployeeMetrics, formatAbsenceBreakdown } from './attendanceMetrics'

const tt = (key: string, fallback: string) =>
  getTranslationFromI18nKeyAndLabel(`lowcoder:time_absence_hub.attendance.${key}`, fallback)

interface AttendanceGridProps {
  employees: FilteredEmployee[]
  attendance: AttendanceRow[]
  absences: AbsenceCalendarDay[]
  holidays: PublicHolidayDay[]
  absenceNet: AbsenceNetDay[]
  dateRange: AttendanceDateRange | null
  absenceTypes: AttendanceAbsenceTypeOption[]
  isLoading: boolean
  error: string | null
  onOpenEmployee?: (employeeId: string) => void
}

interface GridRow {
  employee: FilteredEmployee
  departmentName: string
  jobPositionName: string
  totalEffectiveMinutes: number
  totalPlannedMinutes: number
  totalDifferenceMinutes: number
  absenceSummary: string
  absenceCount: number
  manualOverrideCount: number
  missingLogCount: number
}

type AttendanceSortField =
  | 'employeeName'
  | 'departmentName'
  | 'totalPlannedMinutes'
  | 'totalEffectiveMinutes'
  | 'totalDifferenceMinutes'
  | 'absenceCount'
  | 'exceptionCount'

type AttendanceSortOrder = 'ASC' | 'DESC'

const formatTime = (value?: string | null): string => {
  if (!value) {
    return '-'
  }
  return value.length >= 5 ? value.slice(0, 5) : value
}

const getEmployeeName = (row: GridRow): string => `${row.employee.firstName} ${row.employee.lastName}`.trim()

const getExceptionCount = (row: GridRow): number => row.manualOverrideCount + row.missingLogCount

const getInitials = (employee: FilteredEmployee): string => {
  const first = employee.firstName?.charAt(0) ?? ''
  const last = employee.lastName?.charAt(0) ?? ''
  return `${first}${last}`.toUpperCase() || 'E'
}

const getAvatarSrc = (pictureThumbnail?: string | null): string | undefined => {
  if (!pictureThumbnail) {
    return undefined
  }

  return pictureThumbnail.startsWith('data:') ? pictureThumbnail : `data:image/png;base64,${pictureThumbnail}`
}

const buildRows = (
  employees: FilteredEmployee[],
  attendance: AttendanceRow[],
  absences: AbsenceCalendarDay[],
  holidays: PublicHolidayDay[],
  absenceNet: AbsenceNetDay[],
  dateRange: AttendanceDateRange | null,
  absenceTypes: AttendanceAbsenceTypeOption[]
): GridRow[] =>
  employees.map(employee => {
    const departmentName = employee.employeePosition?.organizationalUnit?.name ?? '-'
    const metrics = computeAttendanceEmployeeMetrics({
      employee,
      attendance,
      absences,
      holidays,
      absenceNet,
      dateRange,
      absenceTypes
    })

    return {
      employee,
      departmentName,
      jobPositionName: employee.employeePosition?.jobPosition?.name ?? '-',
      totalEffectiveMinutes: metrics.totalEffectiveMinutes,
      totalPlannedMinutes: metrics.totalPlannedMinutes,
      totalDifferenceMinutes: metrics.totalDifferenceMinutes,
      absenceSummary: formatAbsenceBreakdown(metrics.absenceBreakdown),
      absenceCount: metrics.absenceBreakdown.reduce((acc, item) => acc + item.count, 0),
      manualOverrideCount: metrics.manualOverrideCount,
      missingLogCount: metrics.missingLogCount
    }
  })

export const AttendanceGrid: React.FC<AttendanceGridProps> = ({
  employees,
  attendance,
  absences,
  holidays,
  absenceNet,
  dateRange,
  absenceTypes,
  isLoading,
  error,
  onOpenEmployee
}) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState<AttendanceSortField>('employeeName')
  const [sortOrder, setSortOrder] = useState<AttendanceSortOrder>('ASC')

  const baseRows = useMemo(
    () => buildRows(employees, attendance, absences, holidays, absenceNet, dateRange, absenceTypes),
    [employees, attendance, absences, holidays, absenceNet, dateRange, absenceTypes]
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
        case 'totalPlannedMinutes':
          return compareNumbers(left.totalPlannedMinutes, right.totalPlannedMinutes)
        case 'totalEffectiveMinutes':
          return compareNumbers(left.totalEffectiveMinutes, right.totalEffectiveMinutes)
        case 'totalDifferenceMinutes':
          return compareNumbers(left.totalDifferenceMinutes, right.totalDifferenceMinutes)
        case 'absenceCount':
          return compareNumbers(left.absenceCount, right.absenceCount)
        case 'exceptionCount':
          return compareNumbers(getExceptionCount(left), getExceptionCount(right))
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
        widthClassName: 'gba:w-72',
        headerClassName: 'gba:px-3',
        cellClassName: 'gba:px-2 gba:py-3',
        renderCell: row => (
          <div className="gba:flex gba:min-w-0 gba:items-center gba:gap-3">
            <Avatar className="gba:h-9 gba:w-9 gba:flex-shrink-0">
              <AvatarImage src={getAvatarSrc(row.employee.pictureThumbnail)} alt={getEmployeeName(row)} />
              <AvatarFallback className="gba:text-xs">{getInitials(row.employee)}</AvatarFallback>
            </Avatar>
            <div className="gba:min-w-0 gba:space-y-0.5">
              <span className="gba:block gba:truncate gba:text-sm gba:font-medium gba:text-foreground">
                {getEmployeeName(row)}
              </span>
              <span className="gba:block gba:truncate gba:text-xs gba:text-muted-foreground">
                {row.jobPositionName} - {row.departmentName}
              </span>
            </div>
          </div>
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
        key: 'absences',
        header: tt('column_absences', 'Absences'),
        sortableField: 'absenceCount',
        widthClassName: 'gba:w-28',
        headerClassName: 'gba:px-2',
        cellClassName: 'gba:px-2 gba:py-3',
        renderCell: row => <div className="gba:flex gba:flex-wrap gba:gap-1 gba:text-xs">{renderAbsences(row)}</div>
      },
      {
        key: 'exceptions',
        header: tt('column_exceptions', 'Exceptions'),
        sortableField: 'exceptionCount',
        widthClassName: 'gba:w-28',
        headerClassName: 'gba:px-2',
        cellClassName: 'gba:px-2 gba:py-3',
        renderCell: row => <div className="gba:flex gba:flex-wrap gba:gap-1 gba:text-xs">{renderExceptions(row)}</div>
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

const renderAbsences = (row: GridRow): React.ReactNode => {
  if (row.absenceCount === 0) {
    return <span className="gba:text-xs gba:text-muted-foreground">-</span>
  }

  return <Badge variant="secondary">{row.absenceSummary}</Badge>
}

const renderExceptions = (row: GridRow): React.ReactNode => {
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

  if (getExceptionCount(row) === 0) {
    return (
      <span className="gba:text-xs gba:text-muted-foreground">
        <ClockIcon size={12} className="gba:inline gba:mr-1" />
        {tt('badge_on_track', 'On track')}
      </span>
    )
  }

  return (
    <>
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

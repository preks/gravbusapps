import React, { useCallback, useMemo, useState } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Spinner } from '@newwork/nw-design-system'
import { ClockIcon, DownloadIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  buildExcelWorkbook,
  buildFilename,
  downloadCsvData,
  downloadExcelWorkbook,
  formatExportDate,
  type ExcelColumn
} from '@/common/utils/excelExportUtils'
import { useOrgAttendanceData } from '../../../hooks/useOrgAttendanceData'
import { HubGlobalFilters } from '../../../hooks/useHubGlobalFilters'
import { AttendanceRow, FilteredEmployee } from '../../../queries/OrgAttendanceQueries'

interface TimeTrackingReportProps {
  accessToken: string
  globalFilters: HubGlobalFilters
  derivedDateRange: { dateFrom: string; dateTo: string } | null
}

const I18N_PREFIX = 'lowcoder:time_absence_hub.reports.time_tracking'

const tt = (key: string, fallback: string) => getTranslationFromI18nKeyAndLabel(`${I18N_PREFIX}.${key}`, fallback)

interface ExportColumn {
  key: string
  title: string
}

const buildColumns = (): ExportColumn[] => [
  { key: 'date', title: tt('column_date', 'Date') },
  { key: 'employee', title: tt('column_employee', 'Employee') },
  { key: 'department', title: tt('column_department', 'Department') },
  { key: 'location', title: tt('column_location', 'Location') },
  { key: 'legalEntity', title: tt('column_legal_entity', 'Legal entity') },
  { key: 'manager', title: tt('column_manager', 'Manager') },
  { key: 'startTime', title: tt('column_start_time', 'Start') },
  { key: 'endTime', title: tt('column_end_time', 'End') },
  { key: 'recordedHours', title: tt('column_recorded_hours', 'Recorded (h)') },
  { key: 'breakHours', title: tt('column_break_hours', 'Break (h)') },
  { key: 'workedHours', title: tt('column_worked_hours', 'Worked (h)') },
  { key: 'plannedHours', title: tt('column_planned_hours', 'Planned (h)') },
  { key: 'differenceHours', title: tt('column_difference_hours', 'Difference (h)') },
  { key: 'status', title: tt('column_status', 'Status') }
]

const minutesToDecimalHours = (minutes?: number | null): string =>
  typeof minutes === 'number' ? (Math.round((minutes / 60) * 100) / 100).toFixed(2) : '-'

const buildEmployeeIndex = (employees: FilteredEmployee[]): Map<string, FilteredEmployee> => {
  const map = new Map<string, FilteredEmployee>()
  employees.forEach(employee => map.set(employee.id, employee))
  return map
}

interface ExportRow {
  date: string
  employee: string
  department: string
  location: string
  legalEntity: string
  manager: string
  startTime: string
  endTime: string
  recordedHours: string
  breakHours: string
  workedHours: string
  plannedHours: string
  differenceHours: string
  status: string
}

const buildStatus = (row: AttendanceRow): string => {
  const flags: string[] = []
  if (row.manualOverride) {
    flags.push(tt('status_manual', 'Manual'))
  }
  if ((row.plannedTime ?? 0) > 0 && !row.startTime && !row.endTime) {
    flags.push(tt('status_missing', 'Missing'))
  }
  if (flags.length === 0) {
    flags.push(tt('status_ok', 'OK'))
  }
  return flags.join(' / ')
}

const buildExportRows = (attendance: AttendanceRow[], employeeIndex: Map<string, FilteredEmployee>): ExportRow[] =>
  attendance.map(row => {
    const employee = employeeIndex.get(row.employeeId)
    const fullName = employee ? `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() : row.employeeId
    const supervisor = employee?.employeePosition?.supervisor
    return {
      date: formatExportDate(row.attendanceDate),
      employee: fullName,
      department: employee?.employeePosition?.organizationalUnit?.name ?? '-',
      location: employee?.employeePosition?.siteLocation?.name ?? '-',
      legalEntity: employee?.employeePosition?.company?.name ?? '-',
      manager: supervisor ? `${supervisor.firstName ?? ''} ${supervisor.lastName ?? ''}`.trim() : '-',
      startTime: row.startTime ?? '-',
      endTime: row.endTime ?? '-',
      recordedHours: minutesToDecimalHours(row.recordedTime),
      breakHours: minutesToDecimalHours(row.breakTime),
      workedHours: minutesToDecimalHours(row.effectiveTime),
      plannedHours: minutesToDecimalHours(row.plannedTime),
      differenceHours: minutesToDecimalHours(row.differenceTime),
      status: buildStatus(row)
    }
  })

const FILE_PREFIX = 'time-tracking-report'

const downloadCsv = (rows: ExportRow[], columns: ExportColumn[]): void => {
  const dateColumnKeys = new Set<string>(['date'])
  downloadCsvData(
    rows as unknown as Record<string, string>[],
    columns,
    buildFilename(FILE_PREFIX, 'csv'),
    dateColumnKeys
  )
}

const downloadXlsx = async (rows: ExportRow[], columns: ExportColumn[]): Promise<void> => {
  const excelColumns: ExcelColumn[] = columns.map(col => ({ header: col.title, key: col.key }))
  const sheetName = tt('sheet_name', 'Time tracking')
  const workbook = buildExcelWorkbook(sheetName, excelColumns, rows as unknown as Record<string, unknown>[])
  await downloadExcelWorkbook(workbook, buildFilename(FILE_PREFIX, 'xlsx'))
}

export const TimeTrackingReport: React.FC<TimeTrackingReportProps> = ({
  accessToken,
  globalFilters,
  derivedDateRange
}) => {
  const [isExporting, setIsExporting] = useState<'csv' | 'xlsx' | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const attendanceData = useOrgAttendanceData({
    accessToken,
    filters: globalFilters,
    derivedDateRange,
    includeOverlays: false
  })

  const employeeIndex = useMemo(() => buildEmployeeIndex(attendanceData.employees), [attendanceData.employees])
  const exportRows = useMemo(
    () => buildExportRows(attendanceData.attendance, employeeIndex),
    [attendanceData.attendance, employeeIndex]
  )
  const columns = useMemo(buildColumns, [])

  const isReady =
    !attendanceData.isLoading && !attendanceData.error && derivedDateRange !== null && exportRows.length > 0

  const handleCsv = useCallback(() => {
    if (!isReady) {
      return
    }
    setIsExporting('csv')
    setErrorMessage(null)
    try {
      downloadCsv(exportRows, columns)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setIsExporting(null)
    }
  }, [columns, exportRows, isReady])

  const handleXlsx = useCallback(async () => {
    if (!isReady) {
      return
    }
    setIsExporting('xlsx')
    setErrorMessage(null)
    try {
      await downloadXlsx(exportRows, columns)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setIsExporting(null)
    }
  }, [columns, exportRows, isReady])

  const summaryText = renderSummary({
    isLoading: attendanceData.isLoading,
    derivedDateRange,
    error: attendanceData.error,
    rowCount: exportRows.length,
    employeeCount: attendanceData.employees.length
  })

  return (
    <Card data-testid="time-absence-hub-time-tracking-report">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <ClockIcon size={18} />
          {tt('title', 'Time tracking report')}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:flex gba:flex-col gba:gap-3">
        <p className="gba:text-sm gba:text-muted-foreground">
          {tt(
            'description',
            'Export clock-in/clock-out times, breaks, worked hours, planned hours, overtime and deficit for the current global filter selection.'
          )}
        </p>
        <p className="gba:text-xs gba:text-muted-foreground" aria-live="polite">
          {summaryText}
        </p>
        <div className="gba:flex gba:items-center gba:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCsv}
            disabled={!isReady || isExporting !== null}
            data-testid="time-absence-hub-time-tracking-export-csv"
          >
            {isExporting === 'csv' ? <Spinner size="sm" /> : <DownloadIcon size={14} />}
            {tt('export_csv', 'Export CSV')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleXlsx}
            disabled={!isReady || isExporting !== null}
            data-testid="time-absence-hub-time-tracking-export-xlsx"
          >
            {isExporting === 'xlsx' ? <Spinner size="sm" /> : <DownloadIcon size={14} />}
            {tt('export_xlsx', 'Export Excel')}
          </Button>
        </div>
        {errorMessage && (
          <p className="gba:text-xs gba:text-destructive" role="alert">
            {errorMessage}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

interface SummaryParams {
  isLoading: boolean
  derivedDateRange: { dateFrom: string; dateTo: string } | null
  error: string | null
  rowCount: number
  employeeCount: number
}

const renderSummary = ({ isLoading, derivedDateRange, error, rowCount, employeeCount }: SummaryParams): string => {
  if (isLoading) {
    return tt('loading', 'Loading attendance data...')
  }
  if (error) {
    return `${tt('error_prefix', 'Error:')} ${error}`
  }
  if (!derivedDateRange) {
    return tt('no_date_range', 'Pick a time range to enable export.')
  }
  if (rowCount === 0) {
    return tt('no_rows', 'No attendance entries match the current filters.')
  }
  const localized = getTranslationFromI18nKeyAndLabel(
    `${I18N_PREFIX}.row_summary`,
    `${rowCount} rows from ${employeeCount} employees ready to export.`,
    { rows: rowCount, employees: employeeCount }
  )
  return localized
}

export default TimeTrackingReport

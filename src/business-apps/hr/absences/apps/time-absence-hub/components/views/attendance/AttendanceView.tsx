import React, { useState } from 'react'
import { Button, DataDisplay, Sheet, SheetContent, SheetHeader, SheetTitle } from '@newwork/nw-design-system'
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
import { EmployeeDetails } from '@/business-apps/hr/core/details/employee-details'
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
  { header: tt('column_planned', 'Planned'), key: 'planned' },
  { header: tt('column_effective', 'Effective'), key: 'effective' },
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
    const absenceCount = new Set(absences.filter(row => row.employeeId === employee.id).map(row => row.dayDate)).size
    const holidayCount = new Set(holidays.filter(row => row.employeeId === employee.id).map(row => row.date)).size
    const manualOverrideCount = employeeAttendance.filter(row => Boolean(row.manualOverride)).length
    const missingLogCount = employeeAttendance.filter(
      row => toMinutes(row.plannedTime) > 0 && !row.startTime && !row.endTime
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
      planned: formatMinutes(totalPlannedMinutes),
      effective: formatMinutes(totalEffectiveMinutes),
      difference: formatMinutes(totalDifferenceMinutes),
      markers: [
        absenceCount > 0 ? `${absenceCount} absence days` : '',
        holidayCount > 0 ? `${holidayCount} bank holidays` : '',
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
  onGlobalFiltersChange: (filters: HubGlobalFilters) => void
  filterAction?: React.ReactNode
}

interface AttendanceEmployeeSummary {
  employeeId: string
  employeeName: string
  departmentName: string
  plannedMinutes: number
  effectiveMinutes: number
  differenceMinutes: number
  absenceDays: number
  bankHolidayDays: number
  manualOverrides: number
  missingLogs: number
}

const buildAttendanceEmployeeSummary = (
  employeeId: string,
  employees: FilteredEmployee[],
  attendance: AttendanceRow[],
  absences: AbsenceCalendarDay[],
  holidays: PublicHolidayDay[]
): AttendanceEmployeeSummary | null => {
  const employee = employees.find(item => item.id === employeeId)
  if (!employee) {
    return null
  }

  const employeeAttendance = attendance.filter(row => row.employeeId === employeeId)
  const absenceDays = new Set(absences.filter(row => row.employeeId === employeeId).map(row => row.dayDate)).size
  const bankHolidayDays = new Set(holidays.filter(row => row.employeeId === employeeId).map(row => row.date)).size
  const plannedMinutes = employeeAttendance.reduce((acc, row) => acc + toMinutes(row.plannedTime), 0)
  const effectiveMinutes = employeeAttendance.reduce((acc, row) => acc + toMinutes(row.effectiveTime), 0)
  const differenceMinutes = employeeAttendance.reduce((acc, row) => acc + toMinutes(row.differenceTime), 0)
  const manualOverrides = employeeAttendance.filter(row => Boolean(row.manualOverride)).length
  const missingLogs = employeeAttendance.filter(
    row => toMinutes(row.plannedTime) > 0 && !row.startTime && !row.endTime
  ).length

  return {
    employeeId,
    employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
    departmentName: employee.employeePosition?.organizationalUnit?.name ?? '-',
    plannedMinutes,
    effectiveMinutes,
    differenceMinutes,
    absenceDays,
    bankHolidayDays,
    manualOverrides,
    missingLogs
  }
}

const getDateRangeLabel = (dateRange: { dateFrom: string; dateTo: string } | null): string => {
  if (!dateRange?.dateFrom || !dateRange?.dateTo) {
    return tt('sheet_summary_all_time', 'All selected time')
  }
  return `${dateRange.dateFrom} - ${dateRange.dateTo}`
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  accessToken,
  userInfo,
  globalFilters,
  derivedDateRange,
  onGlobalFiltersChange,
  filterAction
}) => {
  const data = useOrgAttendanceData({ accessToken, filters: globalFilters, derivedDateRange })
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)

  const selectedEmployeeSummary = React.useMemo(() => {
    if (!selectedEmployeeId) {
      return null
    }
    return buildAttendanceEmployeeSummary(
      selectedEmployeeId,
      data.employees,
      data.attendance,
      data.absences,
      data.holidays
    )
  }, [data.absences, data.attendance, data.employees, data.holidays, selectedEmployeeId])

  const handleExportExcel = async () => {
    const workbook = buildExcelWorkbook(
      tt('export_sheet_name', 'Attendance'),
      buildExportColumns(),
      buildExportRows(data.employees, data.attendance, data.absences, data.holidays)
    )
    await downloadExcelWorkbook(workbook, buildFilename('time-absence-hub-attendance', 'xlsx'))
  }

  const handleEmployeeSearchChange = (employeeQuery: string) => {
    onGlobalFiltersChange({
      ...globalFilters,
      employeeQuery
    })
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-4" data-testid="time-absence-hub-attendance-view">
      <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
        <div>
          <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">{tt('title', 'Attendance')}</h2>
          <p className="gba:text-sm gba:text-muted-foreground">
            {tt(
              'page_intro',
              'Monitor planned versus effective time, absence markers and attendance gaps across the organization.'
            )}
          </p>
        </div>
      </div>

      <DataDisplay
        titleSections={[
          {
            id: 'attendance',
            label: tt('title', 'Attendance'),
            metadata: {
              count: data.employees.length,
              isLoading: data.isLoading,
              subtitle: tt('subtitle_employees', 'employees')
            }
          }
        ]}
        currentSection="attendance"
        searchValue={globalFilters.employeeQuery}
        searchPlaceholder={tt('search_placeholder', 'Search employee...')}
        onSearchChange={handleEmployeeSearchChange}
        enableLiveFiltering={true}
        secondaryActions={
          <div className="gba:flex gba:items-center gba:gap-2">
            {filterAction}
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
          </div>
        }
        toolbarDensity="default"
      >
        <AttendanceGrid
          employees={data.employees}
          attendance={data.attendance}
          absences={data.absences}
          holidays={data.holidays}
          isLoading={data.isLoading}
          error={data.error}
          onOpenEmployee={setSelectedEmployeeId}
        />
      </DataDisplay>

      <Sheet open={selectedEmployeeId !== null} onOpenChange={open => !open && setSelectedEmployeeId(null)}>
        <SheetContent
          side="right"
          className="gba:flex gba:flex-col gba:p-0"
          data-testid="attendance-employee-details-sheet"
        >
          <SheetHeader className="gba:border-b gba:border-border gba:px-6 gba:py-4 gba:pr-14">
            <SheetTitle className="gba:text-left">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:human_resources_page.employees_section.employee_details',
                'Employee Details'
              )}
            </SheetTitle>
          </SheetHeader>
          <div className="gba:flex-1 gba:min-h-0" data-testid="attendance-employee-details-content">
            {selectedEmployeeId && (
              <EmployeeDetails
                employeeId={selectedEmployeeId}
                accessToken={accessToken}
                userInfo={userInfo}
                hideActionButton
                summaryOnly
                topContent={
                  selectedEmployeeSummary ? (
                    <div
                      className="gba:border gba:border-border gba:rounded-md gba:p-4 gba:space-y-3"
                      data-testid="attendance-employee-summary"
                    >
                      <p className="gba:text-xs gba:text-muted-foreground">
                        {tt('sheet_summary_title', 'Attendance summary')} - {getDateRangeLabel(derivedDateRange)}
                      </p>
                      <div className="gba:grid gba:grid-cols-2 gba:gap-2 gba:text-xs">
                        <SummaryItem
                          label={tt('column_planned', 'Planned')}
                          value={formatMinutes(selectedEmployeeSummary.plannedMinutes)}
                        />
                        <SummaryItem
                          label={tt('column_effective', 'Effective')}
                          value={formatMinutes(selectedEmployeeSummary.effectiveMinutes)}
                        />
                        <SummaryItem
                          label={tt('column_difference', 'Difference')}
                          value={formatMinutes(selectedEmployeeSummary.differenceMinutes)}
                        />
                        <SummaryItem
                          label={tt('badge_absence_days', 'Absence days')}
                          value={String(selectedEmployeeSummary.absenceDays)}
                        />
                        <SummaryItem
                          label={tt('badge_bank_holidays', 'Bank holidays')}
                          value={String(selectedEmployeeSummary.bankHolidayDays)}
                        />
                        <SummaryItem
                          label={tt('badge_manual', 'Manual')}
                          value={String(selectedEmployeeSummary.manualOverrides)}
                        />
                        <SummaryItem
                          label={tt('badge_missing', 'Missing')}
                          value={String(selectedEmployeeSummary.missingLogs)}
                        />
                      </div>
                    </div>
                  ) : undefined
                }
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

interface SummaryItemProps {
  label: string
  value: string
}

const SummaryItem: React.FC<SummaryItemProps> = ({ label, value }) => (
  <div className="gba:rounded gba:bg-muted/40 gba:px-2 gba:py-1">
    <span className="gba:block gba:text-muted-foreground">{label}</span>
    <span className="gba:block gba:font-medium gba:text-foreground">{value}</span>
  </div>
)

export default AttendanceView

import React, { useState } from 'react'
import {
  Button,
  DataDisplay,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  useTranslation
} from '@newwork/nw-design-system'
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
import { clampDateRangeToPast, formatMinutes } from './attendanceUtils'
import {
  AbsenceNetDay,
  AbsenceCalendarDay,
  AttendanceRow,
  FilteredEmployee,
  PublicHolidayDay
} from '../../../queries/OrgAttendanceQueries'
import type { HubFilterOption } from '../../../queries/HubFilterQueries'
import { computeAttendanceEmployeeMetrics, formatAbsenceBreakdown } from './attendanceMetrics'
import { ErrorStateCard, LoadingStateCard } from '../shared/DataStateCards'
import { getSafeHubErrorMessage } from '../../../utils/safeErrorMessage'
import translations from '../../../_i18n'

const tt = (key: string, fallback: string) =>
  getTranslationFromI18nKeyAndLabel(`lowcoder:time_absence_hub.attendance.${key}`, fallback)

const buildExportColumns = (): ExcelColumn[] => [
  { header: tt('column_employee', 'Employee'), key: 'employee' },
  { header: tt('column_job_position', 'Job Position'), key: 'jobPosition' },
  { header: tt('column_department', 'Department'), key: 'department' },
  { header: tt('column_planned', 'Planned'), key: 'planned' },
  { header: tt('column_effective', 'Effective'), key: 'effective' },
  { header: tt('column_difference', 'Difference'), key: 'difference' },
  { header: tt('column_absences', 'Absences'), key: 'absences' },
  { header: tt('column_exceptions', 'Exceptions'), key: 'exceptions' }
]

const buildExportRows = (
  employees: FilteredEmployee[],
  attendance: AttendanceRow[],
  absences: AbsenceCalendarDay[],
  holidays: PublicHolidayDay[],
  absenceNet: AbsenceNetDay[],
  dateRange: { dateFrom: string; dateTo: string } | null,
  absenceTypes: HubFilterOption[]
): Record<string, unknown>[] =>
  employees.map(employee => {
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
      employee: `${employee.firstName} ${employee.lastName}`.trim(),
      jobPosition: employee.employeePosition?.jobPosition?.name ?? '-',
      department: employee.employeePosition?.organizationalUnit?.name ?? '-',
      planned: formatMinutes(metrics.totalPlannedMinutes),
      effective: formatMinutes(metrics.totalEffectiveMinutes),
      difference: formatMinutes(metrics.totalDifferenceMinutes),
      absences: formatAbsenceBreakdown(metrics.absenceBreakdown),
      exceptions: [
        metrics.manualOverrideCount > 0 ? `${metrics.manualOverrideCount} manual` : '',
        metrics.missingLogCount > 0 ? `${metrics.missingLogCount} missing` : ''
      ]
        .filter(Boolean)
        .join(', ')
    }
  })

interface AttendanceViewProps extends BusinessAppContextProps {
  globalFilters: HubGlobalFilters
  derivedDateRange: { dateFrom: string; dateTo: string } | null
  absenceTypes: HubFilterOption[]
  onGlobalFiltersChange: (filters: HubGlobalFilters) => void
  filterAction?: React.ReactNode
}

interface AttendanceEmployeeSummary {
  employeeId: string
  employeeName: string
  departmentName: string
  jobPositionName: string
  locationName: string
  managerName: string
  plannedMinutes: number
  effectiveMinutes: number
  differenceMinutes: number
  absenceSummary: string
  manualOverrides: number
  missingLogs: number
}

const buildAttendanceEmployeeSummary = (
  employeeId: string,
  employees: FilteredEmployee[],
  attendance: AttendanceRow[],
  absences: AbsenceCalendarDay[],
  holidays: PublicHolidayDay[],
  absenceNet: AbsenceNetDay[],
  dateRange: { dateFrom: string; dateTo: string } | null,
  absenceTypes: HubFilterOption[]
): AttendanceEmployeeSummary | null => {
  const employee = employees.find(item => item.id === employeeId)
  if (!employee) {
    return null
  }

  const metrics = computeAttendanceEmployeeMetrics({
    employee,
    attendance,
    absences,
    holidays,
    absenceNet,
    dateRange,
    absenceTypes
  })
  const supervisor = employee.employeePosition?.supervisor

  return {
    employeeId,
    employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
    departmentName: employee.employeePosition?.organizationalUnit?.name ?? '-',
    jobPositionName: employee.employeePosition?.jobPosition?.name ?? '-',
    locationName: employee.employeePosition?.siteLocation?.name ?? '-',
    managerName: supervisor ? `${supervisor.firstName} ${supervisor.lastName}` : '-',
    plannedMinutes: metrics.totalPlannedMinutes,
    effectiveMinutes: metrics.totalEffectiveMinutes,
    differenceMinutes: metrics.totalDifferenceMinutes,
    absenceSummary: formatAbsenceBreakdown(metrics.absenceBreakdown) || '-',
    manualOverrides: metrics.manualOverrideCount,
    missingLogs: metrics.missingLogCount
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
  absenceTypes,
  onGlobalFiltersChange,
  filterAction
}) => {
  const { t } = useTranslation(translations)
  const data = useOrgAttendanceData({ accessToken, filters: globalFilters, derivedDateRange })
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const attendanceDateRange = React.useMemo(() => clampDateRangeToPast(derivedDateRange), [derivedDateRange])

  const selectedEmployeeSummary = React.useMemo(() => {
    if (!selectedEmployeeId) {
      return null
    }
    return buildAttendanceEmployeeSummary(
      selectedEmployeeId,
      data.employees,
      data.attendance,
      data.absences,
      data.holidays,
      data.absenceNet,
      attendanceDateRange,
      absenceTypes
    )
  }, [
    absenceTypes,
    attendanceDateRange,
    data.absenceNet,
    data.absences,
    data.attendance,
    data.employees,
    data.holidays,
    selectedEmployeeId
  ])

  const handleExportExcel = async () => {
    const workbook = buildExcelWorkbook(
      tt('time_balances_export_sheet_name', 'Time Balances'),
      buildExportColumns(),
      buildExportRows(
        data.employees,
        data.attendance,
        data.absences,
        data.holidays,
        data.absenceNet,
        attendanceDateRange,
        absenceTypes
      )
    )
    await downloadExcelWorkbook(workbook, buildFilename('time-absence-hub-time-balances', 'xlsx'))
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
          <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">
            {tt('time_balances_title', 'Time Balances')}
          </h2>
          <p className="gba:text-sm gba:text-muted-foreground">
            {tt(
              'time_balances_page_intro',
              'Monitor planned versus effective time, leave markers and time balance gaps across the organization.'
            )}
          </p>
        </div>
      </div>

      {data.error ? <ErrorStateCard message={getSafeHubErrorMessage(t('error-loading-time-balances'))} /> : null}
      {data.isLoading && data.employees.length === 0 ? <LoadingStateCard message={t('loading-time-balances')} /> : null}

      {data.error || (data.isLoading && data.employees.length === 0) ? null : (
        <DataDisplay
          titleSections={[
            {
              id: 'attendance',
              label: tt('time_balances_title', 'Time Balances'),
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
            absenceNet={data.absenceNet}
            dateRange={attendanceDateRange}
            absenceTypes={absenceTypes}
            isLoading={data.isLoading}
            error={data.error}
            onOpenEmployee={setSelectedEmployeeId}
          />
        </DataDisplay>
      )}

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
                        {tt('sheet_summary_title', 'Attendance summary')} - {getDateRangeLabel(attendanceDateRange)}
                      </p>
                      <div className="gba:grid gba:grid-cols-2 gba:gap-2 gba:text-xs">
                        <SummaryItem
                          label={tt('column_job_position', 'Job Position')}
                          value={selectedEmployeeSummary.jobPositionName}
                        />
                        <SummaryItem
                          label={tt('column_department', 'Department')}
                          value={selectedEmployeeSummary.departmentName}
                        />
                        <SummaryItem
                          label={tt('column_location', 'Location')}
                          value={selectedEmployeeSummary.locationName}
                        />
                        <SummaryItem
                          label={tt('column_manager', 'Manager')}
                          value={selectedEmployeeSummary.managerName}
                        />
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
                          label={tt('column_absences', 'Absences')}
                          value={selectedEmployeeSummary.absenceSummary}
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

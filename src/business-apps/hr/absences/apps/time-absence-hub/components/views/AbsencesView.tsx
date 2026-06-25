import React, { useMemo, useState } from 'react'
import { DownloadSimpleIcon } from '@phosphor-icons/react'
import {
  Button,
  Combobox,
  type ComboboxOption,
  DataDisplay,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  useTranslation
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '../../../../../../../common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  buildExcelWorkbook,
  buildFilename,
  downloadExcelWorkbook,
  formatExportDate,
  type ExcelColumn
} from '@/common/utils/excelExportUtils'
import { getAbsenceStatusLabel } from '@/business-apps/hr/absences/utils/absenceStatusUtils'
import { AbsenceList } from '../tabs/absence-list-tab/AbsenceList/AbsenceList'
import { CalendarTab } from '../tabs/calendar-tab/CalendarTab'
import { AbsencesSubTab, isAbsencesSubTab } from '../../constants/routes'
import { EmployeeDetails } from '@/business-apps/hr/core/details/employee-details'
import { EnhancedAbsence } from '../../types'
import { HubGlobalFilters } from '../../hooks/useHubGlobalFilters'
import { HubFilterOptionsState } from '../../hooks/useHubFilterOptions'
import { ErrorStateCard, LoadingStateCard } from './shared/DataStateCards'
import { getSafeHubErrorMessage } from '../../utils/safeErrorMessage'
import translations from '../../_i18n'

interface AbsencesViewProps extends BusinessAppContextProps {
  activeSubTab?: string
  onSubTabChange?: (subTab: string) => void
  globalFilters: HubGlobalFilters
  derivedDateRange?: { dateFrom: string; dateTo: string } | null
  filterOptions: HubFilterOptionsState
  onGlobalFiltersChange: (filters: HubGlobalFilters) => void
  filterAction?: React.ReactNode
}

type ExportableAbsence = EnhancedAbsence & {
  comment?: string
  substituteEmployeeId?: string | null
  substituteEmployeeName?: string | null
}

const tt = (key: string, fallback: string) =>
  getTranslationFromI18nKeyAndLabel(`lowcoder:time_absence_hub.absences.${key}`, fallback)

const buildExportColumns = (): ExcelColumn[] => [
  { header: tt('export_column_employee', 'Employee'), key: 'employee' },
  { header: tt('export_column_type', 'Type'), key: 'type' },
  { header: tt('export_column_start_date', 'Start Date'), key: 'startDate' },
  { header: tt('export_column_end_date', 'End Date'), key: 'endDate' },
  { header: tt('export_column_status', 'Status'), key: 'status' },
  { header: tt('export_column_days', 'Days'), key: 'days' },
  { header: tt('export_column_comment', 'Comment'), key: 'comment' },
  { header: tt('export_column_substitute', 'Substitute'), key: 'substitute' },
  { header: tt('export_column_created_at', 'Created At'), key: 'createdAt' }
]

const buildExportRows = (absences: ExportableAbsence[]): Record<string, unknown>[] =>
  absences.map(absence => ({
    employee: absence.employeeName || `${absence.employee?.firstName ?? ''} ${absence.employee?.lastName ?? ''}`.trim(),
    type: absence.typeName,
    startDate: formatExportDate(absence.startDate),
    endDate: formatExportDate(absence.endDate),
    status: getAbsenceStatusLabel(absence.status),
    days: absence.effectiveDays ?? '',
    comment: absence.comment ?? '',
    substitute: absence.substituteEmployeeName ?? absence.substituteEmployeeId ?? '',
    createdAt: formatExportDate(absence.createdAt)
  }))

export const AbsencesView: React.FC<AbsencesViewProps> = ({
  accessToken,
  userInfo,
  activeSubTab,
  onSubTabChange,
  globalFilters,
  derivedDateRange,
  filterOptions,
  onGlobalFiltersChange,
  filterAction
}) => {
  const { t } = useTranslation(translations)
  const currentSubTab: AbsencesSubTab = isAbsencesSubTab(activeSubTab) ? activeSubTab : 'list'
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [exportRows, setExportRows] = useState<EnhancedAbsence[]>([])
  const [listTotal, setListTotal] = useState(0)
  const [listError, setListError] = useState<Error | null>(null)
  const [listLoading, setListLoading] = useState(true)
  const [listHasResolved, setListHasResolved] = useState(false)
  const [calendarDepartmentIds, setCalendarDepartmentIds] = useState<string[]>([])

  const calendarDepartmentComboboxOptions = useMemo<ComboboxOption[]>(
    () => filterOptions.departments.map(option => ({ value: option.id, label: option.name })),
    [filterOptions.departments]
  )

  const handleSubTabChange = (next: AbsencesSubTab) => {
    onSubTabChange?.(next)
  }

  const handleExportExcel = async () => {
    const workbook = buildExcelWorkbook(
      tt('leave_requests_export_sheet_name', 'Leave Requests'),
      buildExportColumns(),
      buildExportRows(exportRows)
    )
    await downloadExcelWorkbook(workbook, buildFilename('time-absence-hub-leave-requests', 'xlsx'))
  }

  const handleEmployeeSearchChange = (employeeQuery: string) => {
    onGlobalFiltersChange({
      ...globalFilters,
      employeeQuery
    })
  }

  const secondaryActions =
    currentSubTab === 'list' ? (
      <div className="gba:flex gba:items-center gba:gap-2">
        {filterAction}
        <Button
          variant="outline"
          size="sm"
          className="gba:gap-2"
          onClick={handleExportExcel}
          disabled={exportRows.length === 0}
          data-testid="time-absence-hub-absences-export-excel"
        >
          <DownloadSimpleIcon size={14} />
          {tt('export_excel', 'Export Excel')}
        </Button>
      </div>
    ) : (
      <div className="gba:w-full gba:max-w-sm" data-testid="time-absence-hub-calendar-toolbar">
        <Combobox
          mode="multiple"
          options={calendarDepartmentComboboxOptions}
          value={calendarDepartmentIds}
          onValueChange={setCalendarDepartmentIds}
          placeholder={tt('calendar_department_placeholder', 'All departments')}
          searchPlaceholder={tt('calendar_department_search', 'Search departments...')}
          emptyText={tt('calendar_department_empty', 'No departments found')}
          disabled={calendarDepartmentComboboxOptions.length === 0}
          data-testid="time-absence-hub-calendar-department-select"
        />
      </div>
    )

  return (
    <div className="gba:flex gba:flex-col gba:gap-4" data-testid="time-absence-hub-absences-view">
      <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
        <div>
          <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">
            {tt('leave_requests_title', 'Leave Requests')}
          </h2>
          <p className="gba:text-sm gba:text-muted-foreground">
            {tt(
              'leave_requests_page_intro',
              'Review leave requests and switch to the team calendar for a broader view of time away.'
            )}
          </p>
        </div>
      </div>

      {currentSubTab === 'list' && listError ? (
        <ErrorStateCard message={getSafeHubErrorMessage(t('error-loading-leave-requests'))} />
      ) : null}
      {currentSubTab === 'list' && !listError && listLoading && !listHasResolved ? (
        <LoadingStateCard message={t('loading-leave-requests')} />
      ) : null}
      {currentSubTab === 'list' && !listError && listLoading && !listHasResolved ? (
        <div className="gba:hidden" aria-hidden="true">
          <AbsenceList
            key={`${derivedDateRange?.dateFrom ?? 'no-from'}-${derivedDateRange?.dateTo ?? 'no-to'}-${JSON.stringify(globalFilters)}-loader`}
            accessToken={accessToken}
            userInfo={userInfo}
            initialFilters={{
              startDate: derivedDateRange?.dateFrom,
              endDate: derivedDateRange?.dateTo,
              departmentIds: globalFilters.departmentIds,
              locationIds: globalFilters.locationIds,
              legalEntityIds: globalFilters.legalEntityIds,
              managerIds: globalFilters.managerIds,
              employeeQuery: globalFilters.employeeQuery,
              absenceTypeIds: globalFilters.absenceTypeIds,
              statusIds: globalFilters.statusIds
            }}
            onDataChange={data => {
              setExportRows(data.absences)
              setListTotal(data.total)
              setListHasResolved(true)
            }}
            onErrorChange={error => {
              setListError(error)
              if (error) {
                setListLoading(false)
                setListHasResolved(true)
              }
            }}
            onLoadingChange={setListLoading}
          />
        </div>
      ) : null}

      {currentSubTab === 'list' && (listError || (listLoading && !listHasResolved)) ? null : (
        <DataDisplay
          titleSections={[
            {
              id: 'list',
              label: tt('subtab_list', 'List'),
              metadata: {
                count: listTotal,
                subtitle: tt('leave_requests_title', 'Leave Requests')
              }
            },
            {
              id: 'calendar',
              label: tt('subtab_calendar', 'Calendar'),
              metadata: {
                subtitle: tt('calendar_title', 'Yearly team calendar')
              }
            }
          ]}
          currentSection={currentSubTab}
          onSectionChange={value => handleSubTabChange(value as AbsencesSubTab)}
          searchValue={currentSubTab === 'list' ? globalFilters.employeeQuery : undefined}
          searchPlaceholder={tt('search_placeholder', 'Search employee...')}
          onSearchChange={currentSubTab === 'list' ? handleEmployeeSearchChange : undefined}
          enableLiveFiltering={currentSubTab === 'list'}
          secondaryActions={secondaryActions}
          toolbarDensity="default"
        >
          {currentSubTab === 'list' ? (
            <AbsenceList
              key={`${derivedDateRange?.dateFrom ?? 'no-from'}-${derivedDateRange?.dateTo ?? 'no-to'}-${JSON.stringify(globalFilters)}`}
              accessToken={accessToken}
              userInfo={userInfo}
              initialFilters={{
                startDate: derivedDateRange?.dateFrom,
                endDate: derivedDateRange?.dateTo,
                departmentIds: globalFilters.departmentIds,
                locationIds: globalFilters.locationIds,
                legalEntityIds: globalFilters.legalEntityIds,
                managerIds: globalFilters.managerIds,
                employeeQuery: globalFilters.employeeQuery,
                absenceTypeIds: globalFilters.absenceTypeIds,
                statusIds: globalFilters.statusIds
              }}
              onDataChange={data => {
                setExportRows(data.absences)
                setListTotal(data.total)
                setListHasResolved(true)
              }}
              onErrorChange={setListError}
              onLoadingChange={isLoading => {
                if (!listHasResolved) {
                  setListLoading(isLoading)
                }
              }}
              onOpenEmployeeRecord={setSelectedEmployeeId}
            />
          ) : (
            <CalendarTab accessToken={accessToken} userInfo={userInfo} departmentIds={calendarDepartmentIds} />
          )}
        </DataDisplay>
      )}

      <Sheet open={selectedEmployeeId !== null} onOpenChange={open => !open && setSelectedEmployeeId(null)}>
        <SheetContent
          side="right"
          className="gba:flex gba:flex-col gba:p-0"
          data-testid="absence-list-employee-details-sheet"
        >
          <SheetHeader className="gba:border-b gba:border-border gba:px-6 gba:py-4 gba:pr-14">
            <SheetTitle className="gba:text-left">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:human_resources_page.employees_section.employee_details',
                'Employee Details'
              )}
            </SheetTitle>
          </SheetHeader>
          <div className="gba:flex-1 gba:min-h-0" data-testid="absence-list-employee-details-content">
            {selectedEmployeeId && (
              <EmployeeDetails employeeId={selectedEmployeeId} accessToken={accessToken} userInfo={userInfo} />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default AbsencesView

import React, { useState } from 'react'
import { DownloadSimpleIcon, ListBulletsIcon, CalendarBlankIcon } from '@phosphor-icons/react'
import { Button, Sheet, SheetContent, SheetHeader, SheetTitle } from '@newwork/nw-design-system'
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
import { ABSENCES_SUB_TABS, AbsencesSubTab, isAbsencesSubTab } from '../../constants/routes'
import { EmployeeDetails } from '@/business-apps/hr/core/details/employee-details'
import { EnhancedAbsence } from '../../types'

interface AbsencesViewProps extends BusinessAppContextProps {
  activeSubTab?: string
  onSubTabChange?: (subTab: string) => void
  dashboardData?: any
  derivedDateRange?: { dateFrom: string; dateTo: string } | null
  filterAction?: React.ReactNode
}

const tt = (key: string, fallback: string) =>
  getTranslationFromI18nKeyAndLabel(`lowcoder:time_absence_hub.absences.${key}`, fallback)

const buildSubTabLabel = (subTab: AbsencesSubTab): string => {
  if (subTab === 'list') {
    return tt('subtab_list', 'List')
  }
  return tt('subtab_calendar', 'Calendar')
}

const SUB_TAB_ICONS: Record<AbsencesSubTab, React.ReactElement> = {
  list: <ListBulletsIcon size={16} />,
  calendar: <CalendarBlankIcon size={16} />
}

const buildExportColumns = (): ExcelColumn[] => [
  { header: tt('export_column_employee', 'Employee'), key: 'employee' },
  { header: tt('export_column_group', 'Group'), key: 'group' },
  { header: tt('export_column_start_date', 'Start Date'), key: 'startDate' },
  { header: tt('export_column_end_date', 'End Date'), key: 'endDate' },
  { header: tt('export_column_status', 'Status'), key: 'status' },
  { header: tt('export_column_days', 'Days'), key: 'days' },
  { header: tt('export_column_created_at', 'Created At'), key: 'createdAt' }
]

const buildExportRows = (absences: EnhancedAbsence[]): Record<string, unknown>[] =>
  absences.map(absence => ({
    employee: absence.employeeName || `${absence.employee?.firstName ?? ''} ${absence.employee?.lastName ?? ''}`.trim(),
    group: absence.groupName,
    startDate: formatExportDate(absence.startDate),
    endDate: formatExportDate(absence.endDate),
    status: getAbsenceStatusLabel(absence.status),
    days: absence.effectiveDays ?? '',
    createdAt: formatExportDate(absence.createdAt)
  }))

export const AbsencesView: React.FC<AbsencesViewProps> = ({
  accessToken,
  userInfo,
  activeSubTab,
  onSubTabChange,
  dashboardData,
  derivedDateRange,
  filterAction
}) => {
  const currentSubTab: AbsencesSubTab = isAbsencesSubTab(activeSubTab) ? activeSubTab : 'list'
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [exportRows, setExportRows] = useState<EnhancedAbsence[]>([])

  const handleSubTabChange = (next: AbsencesSubTab) => {
    onSubTabChange?.(next)
  }

  const handleExportExcel = async () => {
    const workbook = buildExcelWorkbook(
      tt('export_sheet_name', 'Absences'),
      buildExportColumns(),
      buildExportRows(exportRows)
    )
    await downloadExcelWorkbook(workbook, buildFilename('time-absence-hub-absences', 'xlsx'))
  }

  const listHeaderAction = (
    <div className="gba:flex gba:items-center gba:gap-2">
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
      {filterAction}
    </div>
  )

  return (
    <div className="gba:flex gba:flex-col gba:gap-4" data-testid="time-absence-hub-absences-view">
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
        <div className="gba:flex gba:items-center gba:gap-2" role="tablist">
          {ABSENCES_SUB_TABS.map(subTab => (
            <Button
              key={subTab}
              variant={currentSubTab === subTab ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSubTabChange(subTab)}
              data-testid={`time-absence-hub-absences-subtab-${subTab}`}
            >
              {SUB_TAB_ICONS[subTab]}
              {buildSubTabLabel(subTab)}
            </Button>
          ))}
        </div>
      </div>

      {currentSubTab === 'list' && (
        <AbsenceList
          key={`${derivedDateRange?.dateFrom ?? 'no-from'}-${derivedDateRange?.dateTo ?? 'no-to'}`}
          accessToken={accessToken}
          userInfo={userInfo}
          initialFilters={{
            startDate: derivedDateRange?.dateFrom,
            endDate: derivedDateRange?.dateTo
          }}
          headerAction={listHeaderAction}
          onDataChange={data => setExportRows(data.absences)}
          onOpenEmployeeRecord={setSelectedEmployeeId}
        />
      )}

      {currentSubTab === 'calendar' && (
        <CalendarTab accessToken={accessToken} userInfo={userInfo} dashboardData={dashboardData} />
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

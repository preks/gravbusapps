import React, { useEffect, useState } from 'react'
import { Button, DataDisplay, Sheet, SheetContent, SheetHeader, SheetTitle } from '@newwork/nw-design-system'
import { DownloadSimpleIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '../../../../../../../../common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  buildExcelWorkbook,
  buildFilename,
  downloadExcelWorkbook,
  formatExportDate,
  type ExcelColumn
} from '@/common/utils/excelExportUtils'
import UpdateEmployeeEntitlements from '@/business-apps/hr/core/forms/update-employee-entitlements'
import { EmployeeDetails } from '@/business-apps/hr/core/details/employee-details'
import { HubGlobalFilters } from '../../../hooks/useHubGlobalFilters'
import {
  EntitlementHealthFilter,
  EntitlementsOverviewSortField,
  EntitlementsOverviewSortOrder,
  useEntitlementsOverviewData
} from '../../../hooks/useEntitlementsOverviewData'
import { EntitlementsTable, type EntitlementsTableProps } from './EntitlementsTable'
import { OrgEntitlementRow } from '../../../queries/OrgEntitlementQueries'
import {
  formatEntitlementNumber,
  getEntitlementEmployeeName,
  getEntitlementRemaining,
  isEntitlementExpiringSoon
} from './entitlementUtils'

interface EntitlementsViewProps extends BusinessAppContextProps {
  globalFilters: HubGlobalFilters
  derivedDateRange: { dateFrom: string; dateTo: string } | null
  onGlobalFiltersChange: (filters: HubGlobalFilters) => void
  filterAction?: React.ReactNode
}

const tt = (key: string, fallback: string) =>
  getTranslationFromI18nKeyAndLabel(`lowcoder:time_absence_hub.entitlements.${key}`, fallback)

const buildExportColumns = (): ExcelColumn[] => [
  { header: tt('column_employee', 'Employee'), key: 'employee' },
  { header: tt('column_department', 'Department'), key: 'department' },
  { header: tt('column_location', 'Location'), key: 'location' },
  { header: tt('column_type', 'Type'), key: 'type' },
  { header: tt('column_total', 'Total'), key: 'total' },
  { header: tt('column_approved', 'Approved'), key: 'approved' },
  { header: tt('column_pending', 'Pending'), key: 'pending' },
  { header: tt('column_remaining', 'Remaining'), key: 'remaining' },
  { header: tt('column_valid_from', 'Valid From'), key: 'validFrom' },
  { header: tt('column_valid_to', 'Valid To'), key: 'validTo' },
  { header: tt('column_flags', 'Flags'), key: 'flags' }
]

const buildFlags = (row: OrgEntitlementRow, todayIso: string): string => {
  const flags = []
  const isNegative = (getEntitlementRemaining(row) ?? 0) < 0
  const expired = Boolean(row.validTo && row.validTo < todayIso)
  const expiring = isEntitlementExpiringSoon(row.validTo, todayIso)

  if (isNegative) {
    flags.push(tt('flag_negative', 'Negative'))
  }
  if (expired) {
    flags.push(tt('flag_expired', 'Expired'))
  }
  if (expiring && !expired) {
    flags.push(tt('flag_expiring', 'Expiring'))
  }

  return flags.join(', ')
}

const buildExportRows = (rows: OrgEntitlementRow[]): Record<string, unknown>[] => {
  const todayIso = new Date().toISOString().slice(0, 10)

  return rows.map(row => ({
    employee: getEntitlementEmployeeName(row, tt('unknown_employee', 'Unknown employee')),
    department: row.employee?.employeePosition?.organizationalUnit?.name ?? '-',
    location: row.employee?.employeePosition?.siteLocation?.name ?? '-',
    type: row.type?.value ?? '-',
    total: formatEntitlementNumber(row.total),
    approved: formatEntitlementNumber(row.approved),
    pending: formatEntitlementNumber(row.pending),
    remaining: formatEntitlementNumber(getEntitlementRemaining(row)),
    validFrom: formatExportDate(row.validFrom),
    validTo: formatExportDate(row.validTo),
    flags: buildFlags(row, todayIso)
  }))
}

export const EntitlementsView: React.FC<EntitlementsViewProps> = ({
  accessToken,
  userInfo,
  globalFilters,
  derivedDateRange,
  onGlobalFiltersChange,
  filterAction
}) => {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [updateEmployeeId, setUpdateEmployeeId] = useState<string | null>(null)
  const [selectedEntitlementRow, setSelectedEntitlementRow] = useState<OrgEntitlementRow | null>(null)
  const [sortField, setSortField] = useState<EntitlementsOverviewSortField>('validFrom')
  const [sortOrder, setSortOrder] = useState<EntitlementsOverviewSortOrder>('DESC')
  const healthFilter: EntitlementHealthFilter = 'all'
  const handleGlobalFiltersChange = React.useCallback(
    (nextFilters: HubGlobalFilters) => {
      setPage(1)
      onGlobalFiltersChange(nextFilters)
    },
    [onGlobalFiltersChange]
  )

  const overview = useEntitlementsOverviewData({
    accessToken,
    filters: globalFilters,
    derivedDateRange,
    healthFilter,
    page,
    pageSize,
    sortField,
    sortOrder
  })

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(overview.total / pageSize))
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [overview.total, page, pageSize])

  const handleSort = (field: string) => {
    const nextField = field as EntitlementsOverviewSortField
    if (nextField === sortField) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')
    } else {
      setSortField(nextField)
      setSortOrder('ASC')
    }
    setPage(1)
  }

  const entitlementsTableProps: EntitlementsTableProps = {
    rows: overview.rows,
    total: overview.total,
    currentPage: page,
    pageSize,
    isLoading: overview.isLoading,
    error: overview.error,
    sortField,
    sortOrder,
    onSort: handleSort,
    onPaginationChange: (nextPage, nextPageSize) => {
      if (nextPageSize) {
        setPageSize(nextPageSize)
      }
      setPage(nextPage)
    },
    onUpdateEntitlement: setUpdateEmployeeId,
    onOpenEmployee: setSelectedEntitlementRow
  }

  const handleExportExcel = async () => {
    const workbook = buildExcelWorkbook(
      tt('leave_balances_export_sheet_name', 'Leave Balances'),
      buildExportColumns(),
      buildExportRows(overview.rows)
    )
    await downloadExcelWorkbook(workbook, buildFilename('time-absence-hub-leave-balances', 'xlsx'))
  }

  const handleEmployeeSearchChange = (employeeQuery: string) => {
    handleGlobalFiltersChange({
      ...globalFilters,
      employeeQuery
    })
  }

  const selectedEmployeeId = selectedEntitlementRow?.employeeId ?? null
  const todayIso = new Date().toISOString().slice(0, 10)
  const selectedFlags = selectedEntitlementRow ? buildFlags(selectedEntitlementRow, todayIso) : ''

  return (
    <div className="gba:flex gba:flex-col gba:gap-4" data-testid="time-absence-hub-entitlements-view">
      <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
        <div>
          <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">
            {tt('leave_balances_title', 'Leave Balances')}
          </h2>
          <p className="gba:text-sm gba:text-muted-foreground">
            {tt(
              'leave_balances_page_intro',
              'Review employee leave balances, validity periods and balance health across the organization.'
            )}
          </p>
        </div>
      </div>

      <DataDisplay
        titleSections={[
          {
            id: 'entitlements',
            label: tt('leave_balances_title', 'Leave Balances'),
            metadata: {
              count: overview.total,
              isLoading: overview.isLoading,
              subtitle: tt('subtitle_entitlements', 'balances')
            }
          }
        ]}
        currentSection="entitlements"
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
              disabled={overview.isLoading || overview.rows.length === 0}
              data-testid="time-absence-hub-entitlements-export-excel"
            >
              <DownloadSimpleIcon size={14} />
              {tt('export_excel', 'Export Excel')}
            </Button>
          </div>
        }
        toolbarDensity="default"
      >
        <EntitlementsTable {...entitlementsTableProps} />
      </DataDisplay>

      <Sheet open={Boolean(updateEmployeeId)} onOpenChange={open => !open && setUpdateEmployeeId(null)}>
        <SheetContent className="gba:w-full gba:max-w-3xl gba:overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{tt('update_sheet_title', 'Update entitlements')}</SheetTitle>
          </SheetHeader>
          {updateEmployeeId && (
            <UpdateEmployeeEntitlements
              accessToken={accessToken}
              userInfo={userInfo}
              additionalData={{ employeeId: updateEmployeeId }}
              onSubmit={() => setUpdateEmployeeId(null)}
              onCancel={() => setUpdateEmployeeId(null)}
            />
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={selectedEntitlementRow !== null} onOpenChange={open => !open && setSelectedEntitlementRow(null)}>
        <SheetContent
          side="right"
          className="gba:flex gba:flex-col gba:p-0"
          data-testid="entitlements-employee-details-sheet"
        >
          <SheetHeader className="gba:border-b gba:border-border gba:px-6 gba:py-4 gba:pr-14">
            <SheetTitle className="gba:text-left">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:human_resources_page.employees_section.employee_details',
                'Employee Details'
              )}
            </SheetTitle>
          </SheetHeader>
          <div className="gba:flex-1 gba:min-h-0" data-testid="entitlements-employee-details-content">
            {selectedEmployeeId && (
              <EmployeeDetails
                employeeId={selectedEmployeeId}
                accessToken={accessToken}
                userInfo={userInfo}
                summaryOnly
                topContent={
                  selectedEntitlementRow ? (
                    <div
                      className="gba:border gba:border-border gba:rounded-md gba:p-4 gba:space-y-3"
                      data-testid="entitlements-employee-summary"
                    >
                      <p className="gba:text-xs gba:text-muted-foreground">
                        {tt('sheet_summary_title', 'Balance summary')}
                      </p>
                      <div className="gba:grid gba:grid-cols-2 gba:gap-2 gba:text-xs">
                        <SummaryItem
                          label={tt('column_type', 'Type')}
                          value={selectedEntitlementRow.type?.value ?? '-'}
                        />
                        <SummaryItem
                          label={tt('column_total', 'Total')}
                          value={formatEntitlementNumber(selectedEntitlementRow.total)}
                        />
                        <SummaryItem
                          label={tt('column_approved', 'Approved')}
                          value={formatEntitlementNumber(selectedEntitlementRow.approved)}
                        />
                        <SummaryItem
                          label={tt('column_pending', 'Pending')}
                          value={formatEntitlementNumber(selectedEntitlementRow.pending)}
                        />
                        <SummaryItem
                          label={tt('column_remaining', 'Remaining')}
                          value={formatEntitlementNumber(getEntitlementRemaining(selectedEntitlementRow))}
                        />
                        <SummaryItem label={tt('column_flags', 'Flags')} value={selectedFlags || '-'} />
                        <SummaryItem
                          label={tt('column_valid_from', 'Valid From')}
                          value={formatSummaryDate(selectedEntitlementRow.validFrom)}
                        />
                        <SummaryItem
                          label={tt('column_valid_to', 'Valid To')}
                          value={formatSummaryDate(selectedEntitlementRow.validTo)}
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

const formatSummaryDate = (value?: string | null): string => {
  if (!value) {
    return '-'
  }
  return value.slice(0, 10)
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

export default EntitlementsView

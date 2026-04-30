import React, { useState } from 'react'
import { Button, Sheet, SheetContent, SheetHeader, SheetTitle } from '@newwork/nw-design-system'
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
import { HubGlobalFilters } from '../../../hooks/useHubGlobalFilters'
import { EntitlementHealthFilter, useEntitlementsOverviewData } from '../../../hooks/useEntitlementsOverviewData'
import { openEmployeeTimeTracking } from '../../../utils/hubNavigation'
import { EntitlementsTable } from './EntitlementsTable'
import { OrgEntitlementRow } from '../../../queries/OrgEntitlementQueries'

interface EntitlementsViewProps extends BusinessAppContextProps {
  globalFilters: HubGlobalFilters
  derivedDateRange: { dateFrom: string; dateTo: string } | null
  onNavigateToEntitlementsDetails?: () => void
  filterAction?: React.ReactNode
}

const tt = (key: string, fallback: string) =>
  getTranslationFromI18nKeyAndLabel(`lowcoder:time_absence_hub.entitlements.${key}`, fallback)

const PAGE_SIZE = 50

const formatNumber = (value?: number | null): string => {
  if (value === null || value === undefined) {
    return '-'
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

const getEmployeeName = (row: OrgEntitlementRow): string => {
  const displayName = row.employee?.displayName?.trim()

  if (displayName) {
    return displayName
  }

  const name = `${row.employee?.firstName ?? ''} ${row.employee?.lastName ?? ''}`.trim()

  return name || tt('unknown_employee', 'Unknown employee')
}

const isExpiringSoon = (validTo?: string | null, todayIso?: string): boolean => {
  if (!validTo || !todayIso) {
    return false
  }
  const today = new Date(todayIso)
  const end = new Date(validTo)
  const diffDays = (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays >= 0 && diffDays <= 30
}

const buildExportColumns = (): ExcelColumn[] => [
  { header: tt('column_employee', 'Employee'), key: 'employee' },
  { header: tt('column_department', 'Department'), key: 'department' },
  { header: tt('column_location', 'Location'), key: 'location' },
  { header: tt('column_type', 'Type'), key: 'type' },
  { header: tt('column_total', 'Total'), key: 'total' },
  { header: tt('column_approved', 'Approved'), key: 'approved' },
  { header: tt('column_pending', 'Pending'), key: 'pending' },
  { header: tt('column_available', 'Available'), key: 'available' },
  { header: tt('column_valid_from', 'Valid From'), key: 'validFrom' },
  { header: tt('column_valid_to', 'Valid To'), key: 'validTo' },
  { header: tt('column_flags', 'Flags'), key: 'flags' }
]

const buildFlags = (row: OrgEntitlementRow, todayIso: string): string => {
  const flags = []
  const isNegative = (row.available ?? 0) < 0
  const expired = Boolean(row.validTo && row.validTo < todayIso)
  const expiring = isExpiringSoon(row.validTo, todayIso)

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
    employee: getEmployeeName(row),
    department: row.employee?.employeePosition?.organizationalUnit?.name ?? '-',
    location: row.employee?.employeePosition?.siteLocation?.name ?? '-',
    type: row.type?.value ?? '-',
    total: formatNumber(row.total),
    approved: formatNumber(row.approved),
    pending: formatNumber(row.pending),
    available: formatNumber(row.available),
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
  filterAction
}) => {
  const [page, setPage] = useState(1)
  const [updateEmployeeId, setUpdateEmployeeId] = useState<string | null>(null)
  const healthFilter: EntitlementHealthFilter = 'all'

  const overview = useEntitlementsOverviewData({
    accessToken,
    filters: globalFilters,
    derivedDateRange,
    healthFilter,
    page,
    pageSize: PAGE_SIZE
  })

  const totalPages = Math.max(1, Math.ceil(overview.total / PAGE_SIZE))
  const pageInfoText = getTranslationFromI18nKeyAndLabel(
    'lowcoder:time_absence_hub.entitlements.page_info',
    `Page ${page} of ${totalPages}`,
    { page, totalPages }
  )

  const handleExportExcel = async () => {
    const workbook = buildExcelWorkbook(
      tt('export_sheet_name', 'Entitlements'),
      buildExportColumns(),
      buildExportRows(overview.rows)
    )
    await downloadExcelWorkbook(workbook, buildFilename('time-absence-hub-entitlements', 'xlsx'))
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-4" data-testid="time-absence-hub-entitlements-view">
      <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
        <div>
          <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">{tt('title', 'Entitlements')}</h2>
          <p className="gba:text-sm gba:text-muted-foreground">
            {tt('description', 'Vacation entitlement balances for the selected filter scope.')}
          </p>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2">
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
          {filterAction}
        </div>
      </div>

      <EntitlementsTable
        rows={overview.rows}
        isLoading={overview.isLoading}
        error={overview.error}
        onUpdateEntitlement={setUpdateEmployeeId}
        onOpenEmployee={openEmployeeTimeTracking}
      />

      {overview.total > PAGE_SIZE && (
        <div className="gba:flex gba:items-center gba:justify-end gba:gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
            data-testid="time-absence-hub-entitlements-prev-page"
          >
            {tt('pagination_previous', 'Previous')}
          </Button>
          <span className="gba:text-xs gba:text-muted-foreground">{pageInfoText}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
            data-testid="time-absence-hub-entitlements-next-page"
          >
            {tt('pagination_next', 'Next')}
          </Button>
        </div>
      )}

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
    </div>
  )
}

export default EntitlementsView

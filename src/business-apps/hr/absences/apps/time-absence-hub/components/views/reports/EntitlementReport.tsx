import React, { useCallback, useMemo, useState } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Spinner } from '@newwork/nw-design-system'
import { CalendarBlankIcon, DownloadIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  buildExcelWorkbook,
  buildFilename,
  downloadCsvData,
  downloadExcelWorkbook,
  formatExportDate,
  type ExcelColumn
} from '@/common/utils/excelExportUtils'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_ORG_ENTITLEMENTS_OVERVIEW, OrgEntitlementRow } from '../../../queries/OrgEntitlementQueries'
import { HubGlobalFilters } from '../../../hooks/useHubGlobalFilters'

interface EntitlementReportProps {
  accessToken: string
  globalFilters: HubGlobalFilters
}

const I18N_PREFIX = 'lowcoder:time_absence_hub.reports.entitlement'

const tt = (key: string, fallback: string) => getTranslationFromI18nKeyAndLabel(`${I18N_PREFIX}.${key}`, fallback)

const FILE_PREFIX = 'entitlement-report'
const EXPORT_PAGE_SIZE = 1000
const MAX_EXPORT_ROWS = 10000

interface ExportColumn {
  key: string
  title: string
}

const buildColumns = (): ExportColumn[] => [
  { key: 'employee', title: tt('column_employee', 'Employee') },
  { key: 'department', title: tt('column_department', 'Department') },
  { key: 'location', title: tt('column_location', 'Location') },
  { key: 'legalEntity', title: tt('column_legal_entity', 'Legal entity') },
  { key: 'absenceType', title: tt('column_absence_type', 'Absence type') },
  { key: 'validFrom', title: tt('column_valid_from', 'Valid from') },
  { key: 'validTo', title: tt('column_valid_to', 'Valid to') },
  { key: 'total', title: tt('column_total', 'Total') },
  { key: 'approved', title: tt('column_approved', 'Approved') },
  { key: 'pending', title: tt('column_pending', 'Pending') },
  { key: 'available', title: tt('column_available', 'Available') },
  { key: 'health', title: tt('column_health', 'Health flags') }
]

const buildWhereForExport = (filters: HubGlobalFilters): Record<string, any> => {
  const conditions: Record<string, any>[] = []
  if (filters.departmentIds.length > 0) {
    conditions.push({
      employee: { employeePosition: { organizationalUnitId: { _in: filters.departmentIds } } }
    })
  }
  if (filters.legalEntityIds.length > 0) {
    conditions.push({
      employee: { employeePosition: { companyId: { _in: filters.legalEntityIds } } }
    })
  }
  if (filters.locationIds.length > 0) {
    conditions.push({
      employee: { employeePosition: { siteLocationId: { _in: filters.locationIds } } }
    })
  }
  if (filters.managerIds.length > 0) {
    conditions.push({
      employee: { employeePosition: { supervisorEmployeeId: { _in: filters.managerIds } } }
    })
  }
  if (filters.absenceTypeIds.length > 0) {
    conditions.push({ typeRef: { _in: filters.absenceTypeIds } })
  }
  if (filters.employeeQuery) {
    const like = `%${filters.employeeQuery}%`
    conditions.push({
      employee: {
        _or: [{ firstName: { _ilike: like } }, { lastName: { _ilike: like } }, { displayName: { _ilike: like } }]
      }
    })
  }
  return conditions.length > 0 ? { _and: conditions } : {}
}

interface ExportRow {
  employee: string
  department: string
  location: string
  legalEntity: string
  absenceType: string
  validFrom: string
  validTo: string
  total: string
  approved: string
  pending: string
  available: string
  health: string
}

const buildHealthFlags = (row: OrgEntitlementRow, today: string): string => {
  const flags: string[] = []
  if ((row.available ?? 0) < 0) {
    flags.push(tt('flag_negative', 'Negative'))
  }
  if (row.validTo && row.validTo < today) {
    flags.push(tt('flag_expired', 'Expired'))
  } else if (row.validTo) {
    const in30 = new Date()
    in30.setDate(in30.getDate() + 30)
    if (row.validTo <= in30.toISOString().slice(0, 10)) {
      flags.push(tt('flag_expiring', 'Expiring soon'))
    }
  }
  return flags.length > 0 ? flags.join(' / ') : tt('flag_ok', 'OK')
}

const mapToExportRow = (row: OrgEntitlementRow, today: string): ExportRow => {
  const employee = row.employee
  const fullName = employee ? `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() : (row.employeeId ?? '-')
  return {
    employee: fullName,
    department: employee?.employeePosition?.organizationalUnit?.name ?? '-',
    location: employee?.employeePosition?.siteLocation?.name ?? '-',
    legalEntity: employee?.employeePosition?.company?.name ?? '-',
    absenceType: row.type?.value ?? '-',
    validFrom: formatExportDate(row.validFrom),
    validTo: formatExportDate(row.validTo),
    total: String(row.total ?? 0),
    approved: String(row.approved ?? 0),
    pending: String(row.pending ?? 0),
    available: String(row.available ?? 0),
    health: buildHealthFlags(row, today)
  }
}

const downloadCsv = (rows: ExportRow[], columns: ExportColumn[]): void => {
  const dateColumnKeys = new Set<string>(['validFrom', 'validTo'])
  downloadCsvData(
    rows as unknown as Record<string, string>[],
    columns,
    buildFilename(FILE_PREFIX, 'csv'),
    dateColumnKeys
  )
}

const downloadXlsx = async (rows: ExportRow[], columns: ExportColumn[]): Promise<void> => {
  const excelColumns: ExcelColumn[] = columns.map(col => ({ header: col.title, key: col.key }))
  const sheetName = tt('sheet_name', 'Entitlements')
  const workbook = buildExcelWorkbook(sheetName, excelColumns, rows as unknown as Record<string, unknown>[])
  await downloadExcelWorkbook(workbook, buildFilename(FILE_PREFIX, 'xlsx'))
}

export const EntitlementReport: React.FC<EntitlementReportProps> = ({ accessToken, globalFilters }) => {
  const graphqlClient = useGraphQLClient(accessToken)
  const [isExporting, setIsExporting] = useState<'csv' | 'xlsx' | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const columns = useMemo(buildColumns, [])

  const fetchAllRows = useCallback(async (): Promise<OrgEntitlementRow[]> => {
    const where = buildWhereForExport(globalFilters)
    const collected: OrgEntitlementRow[] = []
    let offset = 0
    while (offset < MAX_EXPORT_ROWS) {
      const response = await graphqlClient.request<{
        EmployeeAbsenceEntitlement: OrgEntitlementRow[]
      }>(GET_ORG_ENTITLEMENTS_OVERVIEW, {
        where,
        offset,
        limit: EXPORT_PAGE_SIZE,
        orderBy: [{ validFrom: 'DESC' }]
      })
      const batch = response.EmployeeAbsenceEntitlement ?? []
      collected.push(...batch)
      if (batch.length < EXPORT_PAGE_SIZE) {
        break
      }
      offset += EXPORT_PAGE_SIZE
    }
    return collected
  }, [globalFilters, graphqlClient])

  const runExport = useCallback(
    async (format: 'csv' | 'xlsx') => {
      setIsExporting(format)
      setErrorMessage(null)
      try {
        const today = new Date().toISOString().slice(0, 10)
        const rows = await fetchAllRows()
        if (rows.length === 0) {
          setErrorMessage(tt('no_rows', 'No entitlements match the current filters.'))
          return
        }
        const exportRows = rows.map(row => mapToExportRow(row, today))
        if (format === 'csv') {
          downloadCsv(exportRows, columns)
        } else {
          await downloadXlsx(exportRows, columns)
        }
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Export failed')
      } finally {
        setIsExporting(null)
      }
    },
    [columns, fetchAllRows]
  )

  return (
    <Card data-testid="time-absence-hub-entitlement-report">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <CalendarBlankIcon size={18} />
          {tt('title', 'Entitlement report')}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:flex gba:flex-col gba:gap-3">
        <p className="gba:text-sm gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel(
            `${I18N_PREFIX}.description`,
            `Export entitlement balances (total, approved, pending, available) and at-risk indicators for the current global filter selection. Exports up to ${MAX_EXPORT_ROWS} rows per run.`,
            { max: MAX_EXPORT_ROWS }
          )}
        </p>
        <div className="gba:flex gba:items-center gba:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void runExport('csv')}
            disabled={isExporting !== null}
            data-testid="time-absence-hub-entitlement-export-csv"
          >
            {isExporting === 'csv' ? <Spinner size="sm" /> : <DownloadIcon size={14} />}
            {tt('export_csv', 'Export CSV')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void runExport('xlsx')}
            disabled={isExporting !== null}
            data-testid="time-absence-hub-entitlement-export-xlsx"
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

export default EntitlementReport

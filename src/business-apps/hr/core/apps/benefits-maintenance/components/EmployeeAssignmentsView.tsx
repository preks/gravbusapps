import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { DownloadSimpleIcon } from '@phosphor-icons/react'
import type { ColumnDef } from '@tanstack/react-table'
import { Button, DataDisplay } from '@newwork/nw-design-system'
import { format, startOfMonth } from 'date-fns'
import { useActiveStructureCompanies } from '@/business-apps/hr/compensation/hooks/useActiveStructureCompanies'
import { exportWorkbookToExcel } from '@/common/utils/excelExportUtils'
import { useActiveBenefits } from '@/business-apps/hr/core/apps/monthly-compensation-changes/hooks/useActiveBenefits'
import { useEmployeeIdsByCompany } from '@/business-apps/hr/core/apps/monthly-compensation-changes/hooks/useEmployeeIdsByCompany'
import { buildBenefitColumns } from '@/business-apps/hr/core/apps/monthly-compensation-changes/components/tableColumns'
import { buildBenefitsFilterConfig } from '@/business-apps/hr/core/apps/monthly-compensation-changes/hooks/buildFilterConfigs'
import { TabDataTable } from '@/business-apps/hr/core/apps/monthly-compensation-changes/components/TabDataTable'
import { DetailSheet } from '@/business-apps/hr/core/apps/monthly-compensation-changes/components/DetailSheet'
import {
  BenefitDetailPanel,
  type TranslationFn
} from '@/business-apps/hr/core/apps/monthly-compensation-changes/components/ChangeDetailPanels'
import { MonthNavigator } from '@/business-apps/hr/core/apps/monthly-compensation-changes/components/MonthNavigator'
import {
  formatDateShort,
  formatMonthYear
} from '@/business-apps/hr/core/apps/monthly-compensation-changes/utils/formatUtils'
import type { ActiveBenefitRow } from '@/business-apps/hr/core/apps/monthly-compensation-changes/types/compensationChanges.types'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import type { BenefitsFilterConfiguration } from '../types/benefitsMaintenanceTypes'

export interface AssignmentKpiCounts {
  totalBenefits: number
  employeesWithBenefits: number
  avgBenefitsPerEmployee: number
}

interface EmployeeAssignmentsViewProps {
  readonly accessToken: string
  readonly t: TranslationFn
  readonly onKpiChange?: (counts: AssignmentKpiCounts) => void
}

const EMPTY_EMPLOYEE_SET = new Set<string>()
const toExportValue = (value: number | null | undefined) => (value == null ? '' : value.toString())
const isActiveBenefitAssignment = (row: ActiveBenefitRow) => row.status.toLowerCase() === 'active'

export function EmployeeAssignmentsView({ accessToken, t, onKpiChange }: EmployeeAssignmentsViewProps) {
  const locale = getCurrentActiveUserLocale() ?? 'en-US'
  const [selectedDate, setSelectedDate] = useState(() => startOfMonth(new Date()))
  const [section, setSection] = useState('all')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Record<string, string[]>>({ status: ['Active'] })
  const [selectedRow, setSelectedRow] = useState<ActiveBenefitRow | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const deferredSection = useDeferredValue(section)
  const deferredSearch = useDeferredValue(search)
  const deferredFilters = useDeferredValue(filters)

  const { companies } = useActiveStructureCompanies(accessToken)
  const legalEntityIds: string[] = filters.legalEntity ?? []

  const { employeeIdsByCompany, loading: employeeIdsLoading } = useEmployeeIdsByCompany(accessToken, legalEntityIds)

  const companyLookupLoading = useMemo(
    () => legalEntityIds.some(id => !employeeIdsByCompany.has(id)),
    [legalEntityIds, employeeIdsByCompany]
  )

  const allowedEmployeeIds = useMemo(() => {
    if (legalEntityIds.length === 0) return null
    if (employeeIdsLoading || companyLookupLoading) return undefined
    const union = new Set<string>()
    for (const companyId of legalEntityIds) {
      const set = employeeIdsByCompany.get(companyId)
      if (set) for (const id of set) union.add(id)
    }
    return union.size > 0 ? union : EMPTY_EMPLOYEE_SET
  }, [legalEntityIds, employeeIdsByCompany, employeeIdsLoading, companyLookupLoading])

  const { rows: allRows, loading, error } = useActiveBenefits(accessToken, selectedDate, allowedEmployeeIds)

  const activeBenefitRows = useMemo(() => allRows.filter(isActiveBenefitAssignment), [allRows])

  useEffect(() => {
    if (!onKpiChange) return
    const uniqueEmployees = new Set(activeBenefitRows.map(r => r.employeeId)).size
    const totalBenefits = activeBenefitRows.length
    const avgBenefitsPerEmployee = uniqueEmployees > 0 ? Math.round((totalBenefits / uniqueEmployees) * 10) / 10 : 0
    onKpiChange({ totalBenefits, employeesWithBenefits: uniqueEmployees, avgBenefitsPerEmployee })
  }, [activeBenefitRows, onKpiChange])

  const columns = useMemo<ColumnDef<ActiveBenefitRow>[]>(() => buildBenefitColumns(t, locale), [t, locale])

  const companyFilterOptions = useMemo(() => companies.map(c => ({ id: c.id, label: c.name })), [companies])

  const providerOptions = useMemo(() => {
    const providers = new Set(allRows.map(r => r.provider).filter(p => p && p !== '-'))
    return Array.from(providers)
      .sort((a, b) => a.localeCompare(b))
      .map(p => ({ id: p, label: p }))
  }, [allRows])

  const filterConfig = useMemo<BenefitsFilterConfiguration>(
    () => buildBenefitsFilterConfig(t, companyFilterOptions, providerOptions),
    [companyFilterOptions, providerOptions, t]
  )

  const benefitTypeCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const row of activeBenefitRows) {
      const key = row.benefitType || '-'
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return counts
  }, [activeBenefitRows])

  const titleSections = useMemo(
    () => [
      { id: 'all', label: t('assignments-section-all'), metadata: { count: activeBenefitRows.length } },
      ...Array.from(benefitTypeCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => ({ id: type, label: type, metadata: { count } }))
    ],
    [activeBenefitRows.length, benefitTypeCounts, t]
  )

  const filteredRows = useMemo(() => {
    let rows = allRows
    if (deferredSection !== 'all') rows = rows.filter(r => r.benefitType === deferredSection)
    if (deferredSearch.trim()) {
      const q = deferredSearch.toLowerCase()
      rows = rows.filter(
        r =>
          r.employeeName.toLowerCase().includes(q) ||
          r.benefitType.toLowerCase().includes(q) ||
          r.provider.toLowerCase().includes(q)
      )
    }
    const providerFilter: string[] = deferredFilters.provider ?? []
    if (providerFilter.length > 0) rows = rows.filter(r => providerFilter.includes(r.provider))
    const statusFilter: string[] = deferredFilters.status ?? []
    if (statusFilter.length > 0) {
      rows = rows.filter(r => statusFilter.some(s => r.status.toLowerCase().includes(s.toLowerCase())))
    }
    return rows
  }, [allRows, deferredSection, deferredSearch, deferredFilters.provider, deferredFilters.status])

  const monthLabel = formatMonthYear(selectedDate, locale)

  const handleExport = useCallback(async () => {
    if (isExporting || filteredRows.length === 0) return
    setIsExporting(true)
    try {
      const data = filteredRows.map(row => ({
        employee: row.employeeName,
        benefitType: row.benefitType,
        provider: row.provider,
        monthlyAmount: toExportValue(row.monthlyAmount),
        yearlyAmount: toExportValue(row.yearlyAmount),
        employeeContribution: toExportValue(row.employeeContribution),
        currency: row.currency,
        startDate: formatDateShort(row.startDate),
        endDate: formatDateShort(row.endDate),
        status: row.status
      }))
      await exportWorkbookToExcel(`Employee-Benefits-${format(selectedDate, 'yyyy-MM')}`, [
        {
          name: monthLabel,
          columns: [
            { header: t('col-employee'), key: 'employee' },
            { header: t('col-benefit-type'), key: 'benefitType' },
            { header: t('col-provider'), key: 'provider' },
            { header: t('col-monthly-amount'), key: 'monthlyAmount' },
            { header: t('col-yearly-amount'), key: 'yearlyAmount' },
            { header: t('col-employee-contribution'), key: 'employeeContribution' },
            { header: t('col-currency'), key: 'currency' },
            { header: t('col-start-date'), key: 'startDate' },
            { header: t('col-end-date'), key: 'endDate' },
            { header: t('col-status'), key: 'status' }
          ],
          data
        }
      ])
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setIsExporting(false)
    }
  }, [filteredRows, isExporting, monthLabel, selectedDate, t])

  const monthNavigator = <MonthNavigator selectedDate={selectedDate} onChange={setSelectedDate} t={t} locale={locale} />

  return (
    <DataDisplay
      titleSections={titleSections}
      currentSection={section}
      onSectionChange={setSection}
      searchValue={search}
      searchPlaceholder={t('assignments-search-placeholder')}
      onSearchChange={setSearch}
      filters={filters}
      filterConfiguration={filterConfig}
      onFilterChange={setFilters}
      filterSheetTitle={t('assignments-filter-title')}
      filterSheetDescription={t('assignments-filter-description')}
      secondaryActions={
        <div className="gba:flex gba:items-center gba:gap-2">
          {monthNavigator}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting || filteredRows.length === 0}
          >
            <DownloadSimpleIcon className="gba:size-4 gba:mr-1.5" />
            {isExporting ? t('assignments-exporting') : t('action-export')}
          </Button>
        </div>
      }
      toolbarDensity="compact"
    >
      <TabDataTable
        data={filteredRows}
        columns={columns}
        loading={loading || employeeIdsLoading || companyLookupLoading}
        error={error}
        emptyMessage={t('assignments-empty')}
        onRowClick={setSelectedRow}
      />

      <DetailSheet
        open={selectedRow !== null}
        onClose={() => setSelectedRow(null)}
        title={t('assignments-detail-title')}
      >
        {selectedRow && <BenefitDetailPanel record={selectedRow.raw} t={t} />}
      </DetailSheet>
    </DataDisplay>
  )
}

export default EmployeeAssignmentsView

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import {
  DataDisplay,
  type FilterConfiguration,
  DataTable,
  Alert,
  AlertDescription,
  Button,
  PageLayout,
  Tabs,
  TabsList,
  TabsTrigger
} from '@newwork/nw-design-system'
import type { ColumnDef as TanstackColumnDef, OnChangeFn, SortingState } from '@tanstack/react-table'
import { PiDownload, PiFileText } from 'react-icons/pi'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useBackofficeExpenseReportData, ReportType } from '../../hooks/useBackofficeExpenseReportData'
import { useDebounce } from '@/common/hooks/useDebounce'
import { useFilterData } from '../../hooks/useFilterData'
import { getActiveStructureDepartmentNames } from '../../utils/departmentOptions'
import { ensureShortDateFormat } from '../../../manager-expenses/utils/dateUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrencyDisplay } from '../../../personal-expenses/utils'
import { isDateKey, downloadCsvReport, downloadExcelReport } from './backofficeExpenseReportsPage.utils'
import { normalizeFilterValues } from '../../hooks/queryFilterUtils'
import { getReportColumns, getExportColumns, getBackendSortableColumnKeys } from './reportColumnDefinitions'
import ReportSlaKpiCards from './ReportSlaKpiCards'

type ReportFilters = { status: string[]; employeeName: string[]; departmentName: string[] }
type ReportSnapshot = { rows: any[]; totalCount: number }
type ReportFilterOptionSnapshot = { employees: string[]; departments: string[] }

const EMPTY_REPORT_FILTERS: ReportFilters = { status: [], employeeName: [], departmentName: [] }

const normalizeReportFilters = (filters: Record<string, any> | undefined | null): ReportFilters => {
  const raw = filters ?? {}
  return {
    status: normalizeFilterValues(raw.status),
    employeeName: normalizeFilterValues(raw.employeeName),
    departmentName: normalizeFilterValues(raw.departmentName)
  }
}

const areReportFiltersEqual = (left: ReportFilters, right: ReportFilters): boolean =>
  left.status.length === right.status.length &&
  left.employeeName.length === right.employeeName.length &&
  left.departmentName.length === right.departmentName.length &&
  left.status.every((v, i) => v === right.status[i]) &&
  left.employeeName.every((v, i) => v === right.employeeName[i]) &&
  left.departmentName.every((v, i) => v === right.departmentName[i])

const hasAnyReportFilters = (filters: ReportFilters): boolean =>
  filters.status.length > 0 || filters.employeeName.length > 0 || filters.departmentName.length > 0

const toFilterText = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value).trim()
  return ''
}

const REPORT_TYPE_DEFINITIONS: Array<{
  key: ReportType
  nameKey: string
  nameFallback: string
  descKey: string
  descFallback: string
}> = [
  {
    key: ReportType.APPROVAL_PAYOUT_CYCLE,
    nameKey: 'lowcoder:team_expenses_page.dashboard_tab.approval_payout_cycle',
    nameFallback: 'Approval & Payout Cycle',
    descKey: 'lowcoder:team_expenses_page.dashboard_tab.approval_payout_cycle_subheader',
    descFallback: 'Pending to approved to paid cycle durations'
  },
  {
    key: ReportType.EXPENSE_ITEM,
    nameKey: 'lowcoder:personal_expenses.expense_items',
    nameFallback: 'Expense Items',
    descKey: 'lowcoder:team_expenses_page.dashboard_tab.individual_expense_transactions',
    descFallback: 'Individual expense items and transactions'
  },
  {
    key: ReportType.EXPENSE_PLAN,
    nameKey: 'lowcoder:team_expenses_page.dashboard_tab.expense_plans',
    nameFallback: 'Expense Plans',
    descKey: 'lowcoder:team_expenses_page.dashboard_tab.expense_plans_subheader',
    descFallback: 'Budget plans and allocations'
  },
  {
    key: ReportType.EXPENSE_REQUEST,
    nameKey: 'lowcoder:employee_list.flows_button.expense_requests',
    nameFallback: 'Expense Requests',
    descKey: 'lowcoder:team_expenses_page.dashboard_tab.expense_requests_subheader',
    descFallback: 'Submitted expense requests and approvals'
  },
  {
    key: ReportType.ADVANCE_PAYMENT,
    nameKey: 'lowcoder:backoffice_expense_landing_page.advance_title',
    nameFallback: 'Advance Payments',
    descKey: 'lowcoder:team_expenses_page.dashboard_tab.advance_payments_subheader',
    descFallback: 'Cash advances and prepayments'
  }
]

const BackofficeExpenseReportsPage: React.FC<BusinessAppContextProps> = ({ accessToken, userInfo }) => {
  const [filtersByReportType, setFiltersByReportType] = useState<Partial<Record<ReportType, Record<string, any>>>>({})
  const [sorting, setSorting] = useState<SortingState>([])
  const [reportSnapshotsByType, setReportSnapshotsByType] = useState<Partial<Record<ReportType, ReportSnapshot>>>({})
  const [fullFilterOptionsByType, setFullFilterOptionsByType] = useState<
    Partial<Record<ReportType, ReportFilterOptionSnapshot>>
  >({})
  const didHandleInitialFilterSyncRef = useRef<Partial<Record<ReportType, boolean>>>({})

  const contextProps = useMemo(() => ({ accessToken, userInfo }), [accessToken, userInfo])
  const {
    reportData,
    isLoading,
    error,
    totalCount,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    searchTerm,
    setSearchTerm,
    selectedReportType,
    reportDataType,
    setSelectedReportType,
    fetchAllForExport,
    fetchAllForFilterOptions,
    slaKpiCounts
  } = useBackofficeExpenseReportData(contextProps, filtersByReportType, sorting)
  const { organizationalUnits } = useFilterData({ accessToken })

  const selectedFilters = useMemo(() => {
    if (!selectedReportType) return EMPTY_REPORT_FILTERS
    return normalizeReportFilters(filtersByReportType[selectedReportType] ?? {})
  }, [filtersByReportType, selectedReportType])

  const reportTypes = useMemo(
    () =>
      REPORT_TYPE_DEFINITIONS.map(def => ({
        key: def.key,
        name: getTranslationFromI18nKeyAndLabel(def.nameKey, def.nameFallback),
        description: getTranslationFromI18nKeyAndLabel(def.descKey, def.descFallback)
      })),
    []
  )

  const columns = useMemo(() => getReportColumns(selectedReportType), [selectedReportType])
  const backendSortableColumnKeys = useMemo(
    () => getBackendSortableColumnKeys(selectedReportType),
    [selectedReportType]
  )
  const isDataAlignedWithSelectedType = reportDataType === selectedReportType
  const selectedReportSnapshot = selectedReportType ? reportSnapshotsByType[selectedReportType] : undefined
  const baseReportRows = useMemo<any[]>(
    () =>
      isDataAlignedWithSelectedType && Array.isArray(reportData)
        ? (reportData as any[])
        : (selectedReportSnapshot?.rows ?? []),
    [isDataAlignedWithSelectedType, reportData, selectedReportSnapshot]
  )
  const hasReportRows = Array.isArray(baseReportRows) && baseReportRows.length > 0
  const displayTotalCount = isDataAlignedWithSelectedType ? totalCount : (selectedReportSnapshot?.totalCount ?? 0)
  const tableLoading = isLoading && !hasReportRows

  useEffect(() => {
    if (!selectedReportType || !isDataAlignedWithSelectedType || !Array.isArray(reportData)) return
    setReportSnapshotsByType(prev => ({ ...prev, [selectedReportType]: { rows: reportData as any[], totalCount } }))
  }, [selectedReportType, isDataAlignedWithSelectedType, reportData, totalCount])

  const selectedReportMeta = reportTypes.find(t => t.key === selectedReportType)
  const tabsValue = selectedReportType || ReportType.APPROVAL_PAYOUT_CYCLE

  const handleReportTypeChange = (value: string) => {
    const nextType = reportTypes.find(t => t.key === value)?.key
    if (nextType) setSelectedReportType(nextType)
  }

  const handleDownload = async () => {
    const cols = getExportColumns(selectedReportType)
    if (!cols.length) return
    const allRows = await fetchAllForExport()
    downloadCsvReport(selectedReportType, cols, allRows as any[])
  }

  const handleDownloadExcel = async () => {
    const cols = getExportColumns(selectedReportType)
    if (!cols.length) return
    const allRows = await fetchAllForExport()
    downloadExcelReport(selectedReportType, cols, allRows as any[])
  }

  const slaKpiValues = useMemo(() => {
    const formatRate = (count: number, total: number) => (total > 0 ? `${((count / total) * 100).toFixed(1)}%` : '0.0%')
    if (!slaKpiCounts)
      return {
        approvalBreachedLabel: '0/0',
        approvalBreachedRate: '0.0%',
        payoutBreachedLabel: '0/0',
        payoutBreachedRate: '0.0%',
        totalBreachedLabel: '0/0',
        totalBreachedRate: '0.0%',
        withinTotalLabel: '0/0',
        withinTotalRate: '0.0%'
      }
    return {
      approvalBreachedLabel: `${slaKpiCounts.approvalBreached}/${slaKpiCounts.approvalEvaluated}`,
      approvalBreachedRate: formatRate(slaKpiCounts.approvalBreached, slaKpiCounts.approvalEvaluated),
      payoutBreachedLabel: `${slaKpiCounts.payoutBreached}/${slaKpiCounts.payoutEvaluated}`,
      payoutBreachedRate: formatRate(slaKpiCounts.payoutBreached, slaKpiCounts.payoutEvaluated),
      totalBreachedLabel: `${slaKpiCounts.totalBreached}/${slaKpiCounts.totalEvaluated}`,
      totalBreachedRate: formatRate(slaKpiCounts.totalBreached, slaKpiCounts.totalEvaluated),
      withinTotalLabel: `${slaKpiCounts.totalWithin}/${slaKpiCounts.totalEvaluated}`,
      withinTotalRate: formatRate(slaKpiCounts.totalWithin, slaKpiCounts.totalEvaluated)
    }
  }, [slaKpiCounts])

  // Transfer Required status grouping
  const transferRequiredFilterLabel = 'Transfer Required'
  const transferRequiredStatusAliases = useMemo(
    () =>
      new Set([
        transferRequiredFilterLabel,
        'VERIFIED',
        'BOOKED',
        'TRANSFERRED',
        getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.verified', 'Verified'),
        getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.booked', 'Booked'),
        getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.transferred', 'Transferred'),
        getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.booking_required', 'Booking Required')
      ]),
    [transferRequiredFilterLabel]
  )

  const normalizeStatusFilterValue = (value: unknown): string => {
    const normalized = toFilterText(value)
    if (!normalized) return ''
    if (transferRequiredStatusAliases.has(normalized) || transferRequiredStatusAliases.has(normalized.toUpperCase())) {
      return transferRequiredFilterLabel
    }
    return normalized
  }

  const alignedReportRows = useMemo<any[]>(
    () => (Array.isArray(baseReportRows) ? baseReportRows : []),
    [baseReportRows]
  )
  const reportRowsWithGroupedStatuses = useMemo(
    () => alignedReportRows.map(row => ({ ...row, status: normalizeStatusFilterValue(row?.status) })),
    [alignedReportRows, transferRequiredStatusAliases, transferRequiredFilterLabel]
  )

  // Filter options
  const statusFilterOptions = useMemo(() => {
    if (selectedReportType === ReportType.APPROVAL_PAYOUT_CYCLE) {
      return [
        { id: 'In Approval', label: 'In Approval' },
        { id: 'Verification Required', label: 'Verification Required' },
        { id: 'Payment Required', label: 'Payment Required' },
        { id: 'Prepared', label: 'Prepared' },
        { id: transferRequiredFilterLabel, label: transferRequiredFilterLabel },
        { id: 'Paid', label: 'Paid' }
      ]
    }
    const restrictedStatuses = new Set(['Payment Required', 'Prepared'])
    const options = Array.from(
      new Set(reportRowsWithGroupedStatuses.map(row => String(row?.status || '').trim()).filter(Boolean))
    )
      .sort((a, b) => a.localeCompare(b))
      .map(v => ({ id: v, label: v }))
    if (selectedReportType === ReportType.ADVANCE_PAYMENT) return options
    return options.filter(o => !restrictedStatuses.has(String(o.id)))
  }, [selectedReportType, reportRowsWithGroupedStatuses, transferRequiredFilterLabel])

  useEffect(() => {
    if (!selectedReportType || fullFilterOptionsByType[selectedReportType]) return
    let cancelled = false
    const loadAllRowsForFilterOptions = async () => {
      const allRows = (await fetchAllForFilterOptions()) as any[]
      if (cancelled) return
      const employees = Array.from(
        new Set(allRows.map(r => String(r?.employeeName || '').trim()).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b))
      const departments = Array.from(
        new Set(allRows.map(r => String(r?.departmentName || '').trim()).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b))
      setFullFilterOptionsByType(prev => ({ ...prev, [selectedReportType]: { employees, departments } }))
    }
    void loadAllRowsForFilterOptions()
    return () => {
      cancelled = true
    }
  }, [selectedReportType, fullFilterOptionsByType, fetchAllForFilterOptions])

  const employeeFilterOptions = useMemo(() => {
    const full = selectedReportType ? fullFilterOptionsByType[selectedReportType]?.employees || [] : []
    return full.map(v => ({ id: v, label: v }))
  }, [selectedReportType, fullFilterOptionsByType])

  const departmentFilterOptions = useMemo(() => {
    const structureDepts = getActiveStructureDepartmentNames(organizationalUnits || []).map(v => ({ id: v, label: v }))
    if (structureDepts.length > 0) return structureDepts
    const full = selectedReportType ? fullFilterOptionsByType[selectedReportType]?.departments || [] : []
    if (full.length > 0) return full.map(v => ({ id: v, label: v }))
    return Array.from(
      new Set(reportRowsWithGroupedStatuses.map(r => String(r?.departmentName || '').trim()).filter(Boolean))
    )
      .sort((a, b) => a.localeCompare(b))
      .map(v => ({ id: v, label: v }))
  }, [organizationalUnits, reportRowsWithGroupedStatuses, selectedReportType, fullFilterOptionsByType])

  const filterConfiguration = useMemo<FilterConfiguration>(
    () => ({
      id: `backoffice-expense-reports-filters-${selectedReportType || 'unknown'}`,
      name: 'Report Filters',
      groups: [
        {
          id: 'status-group',
          label: 'Status',
          collapsible: true,
          defaultExpanded: false,
          filters: [
            {
              id: 'status',
              field: 'status',
              label: 'Status',
              type: 'multi-select',
              config: {
                options: statusFilterOptions,
                searchPlaceholder: 'Search status...',
                totalCount: statusFilterOptions.length,
                hasMore: false
              }
            }
          ]
        },
        {
          id: 'employee-group',
          label: 'Employee',
          collapsible: true,
          defaultExpanded: false,
          filters: [
            {
              id: 'employeeName',
              field: 'employeeName',
              label: 'Employee',
              type: 'multi-select',
              config: {
                options: employeeFilterOptions,
                searchPlaceholder: 'Search employee...',
                totalCount: employeeFilterOptions.length,
                hasMore: false
              }
            }
          ]
        },
        {
          id: 'department-group',
          label: 'Department',
          collapsible: true,
          defaultExpanded: false,
          filters: [
            {
              id: 'departmentName',
              field: 'departmentName',
              label: 'Department',
              type: 'multi-select',
              config: {
                options: departmentFilterOptions,
                searchPlaceholder: 'Search departments...',
                totalCount: departmentFilterOptions.length,
                hasMore: false
              }
            }
          ]
        }
      ]
    }),
    [statusFilterOptions, employeeFilterOptions, departmentFilterOptions, selectedReportType]
  )

  // Sanitize stale filter values when options change
  useEffect(() => {
    if (!selectedReportType) return
    const allowedStatusIds = new Set(statusFilterOptions.map(o => String(o.id)))
    const allowedEmployeeIds = new Set(employeeFilterOptions.map(o => String(o.id)))
    const allowedDepartmentIds = new Set(departmentFilterOptions.map(o => String(o.id)))
    const current = normalizeReportFilters(filtersByReportType[selectedReportType] ?? {})
    const sanitized = {
      status: current.status.filter(s => allowedStatusIds.has(s)),
      employeeName: current.employeeName.filter(e => allowedEmployeeIds.has(e)),
      departmentName: current.departmentName.filter(d => allowedDepartmentIds.has(d))
    }
    if (
      sanitized.status.length === current.status.length &&
      sanitized.employeeName.length === current.employeeName.length &&
      sanitized.departmentName.length === current.departmentName.length
    )
      return
    setFiltersByReportType(prev => ({ ...prev, [selectedReportType]: sanitized }))
  }, [selectedReportType, statusFilterOptions, employeeFilterOptions, departmentFilterOptions, filtersByReportType])

  // Client-side filtering for EXPENSE_ITEM (no backend filter support)
  const filteredReportRows = useMemo(() => {
    const isBackendFiltered = selectedReportType !== ReportType.EXPENSE_ITEM
    const statuses = Array.isArray(selectedFilters?.status) ? selectedFilters.status : []
    const employees = Array.isArray(selectedFilters?.employeeName) ? selectedFilters.employeeName : []
    const departments = Array.isArray(selectedFilters?.departmentName) ? selectedFilters.departmentName : []
    if (statuses.length === 0 && employees.length === 0 && departments.length === 0)
      return reportRowsWithGroupedStatuses
    const statusSet = isBackendFiltered
      ? new Set<string>()
      : new Set(statuses.map(s => normalizeStatusFilterValue(s)).filter(Boolean))
    const employeeSet = isBackendFiltered ? new Set<string>() : new Set(employees.map(String))
    const departmentSet = isBackendFiltered ? new Set<string>() : new Set(departments.map(String))
    return reportRowsWithGroupedStatuses.filter(
      row =>
        (statusSet.size === 0 || statusSet.has(String(row?.status || ''))) &&
        (employeeSet.size === 0 || employeeSet.has(String(row?.employeeName || ''))) &&
        (departmentSet.size === 0 || departmentSet.has(String(row?.departmentName || '')))
    )
  }, [
    selectedReportType,
    reportRowsWithGroupedStatuses,
    selectedFilters,
    transferRequiredStatusAliases,
    transferRequiredFilterLabel
  ])

  const hasClientSideFilters = useMemo(() => {
    const isBackendFiltered = selectedReportType !== ReportType.EXPENSE_ITEM
    return (
      !isBackendFiltered &&
      (selectedFilters.employeeName.length > 0 ||
        selectedFilters.status.length > 0 ||
        selectedFilters.departmentName.length > 0)
    )
  }, [selectedFilters, selectedReportType])

  // Table columns
  const renderTableCell = (columnKey: string, rowOriginal: any) => {
    const value = rowOriginal?.[columnKey]
    if (columnKey.includes('amount') || columnKey.includes('Amount')) {
      return <span className="gba:text-sm">{formatCurrencyDisplay(value || 0, rowOriginal?.currency || 'EUR')}</span>
    }
    if (isDateKey(columnKey)) {
      return <span className="gba:text-sm">{value ? ensureShortDateFormat(value) : '-'}</span>
    }
    if (columnKey === 'title') {
      const titleValue = value || '-'
      return (
        <span className="gba:block gba:max-w-[280px] gba:truncate gba:text-sm" title={titleValue}>
          {titleValue}
        </span>
      )
    }
    return (
      <span className="gba:text-sm">{value === null || value === undefined || value === '' ? '-' : String(value)}</span>
    )
  }

  const dataTableColumns = useMemo<TanstackColumnDef<any>[]>(
    () =>
      columns.map(col => ({
        id: col.key,
        enableSorting: backendSortableColumnKeys.has(col.key),
        header: col.title ?? '',
        accessorFn: (row: any) => row?.[col.key],
        cell: ({ row }: any) => renderTableCell(col.key, row?.original)
      })),
    [columns, backendSortableColumnKeys]
  )

  const sortableColumns = useMemo(
    () =>
      columns
        .filter(c => backendSortableColumnKeys.has(c.key))
        .map(c => ({ id: c.key, label: typeof c.title === 'string' ? c.title : c.key })),
    [columns, backendSortableColumnKeys]
  )

  // Search
  const [localSearchText, setLocalSearchText] = useState(searchTerm)
  const debouncedLocalSearch = useDebounce(localSearchText, 300)
  useEffect(() => {
    setSearchTerm(debouncedLocalSearch)
    setCurrentPage(1)
  }, [debouncedLocalSearch, setSearchTerm, setCurrentPage])
  const handleSearchChange = useCallback((value: string) => {
    setLocalSearchText(value)
  }, [])

  // Filter handlers
  const handleFilterChange = (filters: Record<string, any>) => {
    if (!selectedReportType) return
    const nextFilters = normalizeReportFilters(filters)
    const currentFilters = normalizeReportFilters(filtersByReportType[selectedReportType] ?? {})
    const didSync = didHandleInitialFilterSyncRef.current[selectedReportType] === true
    if (!didSync) {
      didHandleInitialFilterSyncRef.current[selectedReportType] = true
      if (!hasAnyReportFilters(currentFilters) && hasAnyReportFilters(nextFilters)) return
    }
    if (areReportFiltersEqual(currentFilters, nextFilters)) return
    setFiltersByReportType(prev => ({ ...prev, [selectedReportType]: nextFilters }))
    setCurrentPage(1)
  }

  const handleSortingChange: OnChangeFn<SortingState> = updater => {
    setSorting(prev => (typeof updater === 'function' ? updater(prev) : updater))
    setCurrentPage(1)
  }

  const handleResetFilters = () => {
    if (!selectedReportType) return
    didHandleInitialFilterSyncRef.current[selectedReportType] = true
    setFiltersByReportType(prev => ({ ...prev, [selectedReportType]: { ...EMPTY_REPORT_FILTERS } }))
    setLocalSearchText('')
    setSearchTerm('')
    setCurrentPage(1)
  }

  const tablePagination = useMemo(
    () => ({ pageIndex: Math.max(currentPage - 1, 0), pageSize }),
    [currentPage, pageSize]
  )
  const handleTablePaginationChange = (pagination: { pageIndex: number; pageSize: number }) => {
    if (pagination.pageSize === pageSize) {
      setCurrentPage(pagination.pageIndex + 1)
      return
    }
    setPageSize(pagination.pageSize)
    setCurrentPage(1)
  }

  const dataDisplayStateKey = useMemo(() => {
    return `${selectedReportType || 'unknown'}::${selectedFilters.status.join('|')}::${selectedFilters.employeeName.join('|')}::${selectedFilters.departmentName.join('|')}::${searchTerm || ''}`
  }, [selectedFilters, selectedReportType, searchTerm])

  return (
    <div data-testid="backoffice-expense-reports-page-container">
      <PageLayout
        headerTitle={getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_request_list.modal_list_or_flow_button.absence_same_location_btn',
          'Expense Reports'
        )}
        headerDescription={getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.dashboard_tab.expense_reports_subheader',
          'Generate and download comprehensive expense reports across different categories and time periods'
        )}
        headerIcon={PiFileText as any}
        className="gba:min-h-screen"
      >
        <div
          className="gba:px-6 gba:pb-6 gba:flex gba:flex-col gba:gap-4"
          data-testid="backoffice-expense-reports-page"
        >
          <div className="gba:flex-1 gba:flex gba:flex-col gba:gap-4">
            {error && (
              <Alert data-testid="backoffice-expense-reports-error-alert">
                <AlertDescription>
                  <strong>{getTranslationFromI18nKeyAndLabel('lowcoder:common.error_title', 'Error')}</strong> {error}
                </AlertDescription>
              </Alert>
            )}

            <ReportSlaKpiCards kpiValues={slaKpiValues} />

            <div>
              <Tabs
                value={tabsValue}
                onValueChange={handleReportTypeChange}
                data-testid="backoffice-expense-reports-tabs-card"
              >
                <TabsList className="gba:grid gba:w-full gba:grid-cols-5">
                  {reportTypes.map(type => (
                    <TabsTrigger
                      key={type.key}
                      value={type.key}
                      data-testid={`backoffice-expense-reports-type-${type.key}`}
                    >
                      {type.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            <p
              className="gba:text-xs gba:text-muted-foreground gba:px-1"
              data-testid="backoffice-expense-reports-selected-type-description"
            >
              {selectedReportMeta?.description}
            </p>

            <div>
              <DataDisplay
                key={`backoffice-reports-datadisplay-${dataDisplayStateKey}`}
                titleSections={[
                  {
                    id: 'results',
                    label: getTranslationFromI18nKeyAndLabel('lowcoder:common.data', 'Data'),
                    metadata: {
                      count: hasClientSideFilters ? filteredReportRows.length : displayTotalCount,
                      isLoading: tableLoading
                    }
                  }
                ]}
                currentSection="results"
                searchValue={localSearchText}
                searchPlaceholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:team_expenses_page.dashboard_tab.search_report_data',
                  'Search report data...'
                )}
                onSearchChange={handleSearchChange}
                filters={selectedFilters}
                filterConfiguration={filterConfiguration}
                onFilterChange={handleFilterChange}
                sorting={sorting}
                sortableColumns={sortableColumns}
                onSortingChange={handleSortingChange}
                primaryAction={
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Button
                      variant="outline"
                      onClick={handleResetFilters}
                      className="gba:flex gba:items-center gba:gap-2"
                      data-testid="backoffice-expense-reports-reset-filters-button"
                    >
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:team_expenses_page.dashboard_tab.reset_filters',
                        'Reset Filters'
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDownload}
                      className="gba:flex gba:items-center gba:gap-2"
                      data-testid="backoffice-expense-reports-download-button"
                    >
                      <PiDownload className="gba:text-sm" />
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:team_expenses_page.dashboard_tab.download_report',
                        'Download CSV'
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDownloadExcel}
                      className="gba:flex gba:items-center gba:gap-2"
                      data-testid="backoffice-expense-reports-download-excel-button"
                    >
                      <PiDownload className="gba:text-sm" />
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:team_expenses_page.dashboard_tab.download_report_excel',
                        'Download Excel'
                      )}
                    </Button>
                  </div>
                }
                toolbarDensity="default"
                enableLiveFiltering={true}
                data-testid="backoffice-expense-reports-filters-card"
              >
                <div className="gba:border gba:border-border gba:rounded-md gba:bg-background">
                  <DataTable
                    data={filteredReportRows}
                    columns={dataTableColumns}
                    loading={tableLoading}
                    totalCount={hasClientSideFilters ? filteredReportRows.length : displayTotalCount}
                    pagination={tablePagination}
                    onPaginationChange={handleTablePaginationChange}
                    enablePagination
                    enableSorting
                    sorting={sorting}
                    onSortingChange={handleSortingChange}
                    enableSelection={false}
                    enableColumnPinning
                    enableResizing={true}
                    tableLayout="fixed"
                    rowsPerPageOptions={[10, 20, 50, 100]}
                    showPageNumbers
                    maxVisiblePages={7}
                    emptyMessage={getTranslationFromI18nKeyAndLabel(
                      'lowcoder:team_expenses_page.dashboard_tab.no_expense_reports_found',
                      'No expense reports found'
                    )}
                    data-testid="backoffice-expense-reports-table"
                  />
                </div>
              </DataDisplay>
            </div>
          </div>
        </div>
      </PageLayout>
    </div>
  )
}

export default BackofficeExpenseReportsPage

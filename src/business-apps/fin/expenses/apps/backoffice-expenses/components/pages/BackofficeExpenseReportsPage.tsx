import React, { useEffect, useMemo, useState, useCallback } from 'react'
import {
  DataDisplay,
  DataTable,
  Alert,
  AlertDescription,
  Button,
  PageLayout,
  Tabs,
  TabsList,
  TabsTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import type { ColumnDef as TanstackColumnDef, OnChangeFn, SortingState } from '@tanstack/react-table'
import { PiDownload, PiFileText } from 'react-icons/pi'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useBackofficeExpenseReportData, ReportType } from '../../hooks/useBackofficeExpenseReportData'
import { useDebounce } from '@/common/hooks/useDebounce'
import { useFilterData } from '../../hooks/useFilterData'
import { downloadCsvReport, downloadExcelReport } from './backofficeExpenseReportsPage.utils'
import { getReportColumns, getExportColumns, getBackendSortableColumnKeys } from './reportColumnDefinitions'
import ReportSlaKpiCards from './ReportSlaKpiCards'
import { type ReportSnapshot, REPORT_TYPE_DEFINITIONS, hasAnyReportFilters } from './reportFilterUtils'
import { useReportFilters } from './useReportFilters'
import { renderReportTableCell } from './reportTableCells'
import { useSlaKpiValues } from './useSlaKpiValues'
import translations from '../../_i18n'

const readUrlParams = () => {
  const params = new URLSearchParams(globalThis.location?.search || '')
  return {
    reportType: (params.get('reportType') as ReportType) || null,
    search: params.get('search') || '',
    page: Math.max(1, Number(params.get('page')) || 1),
    status: params.get('status')?.split(',').filter(Boolean) || [],
    department: params.get('department')?.split(',').filter(Boolean) || []
  }
}

const writeUrlParams = (values: Record<string, string | undefined>) => {
  const params = new URLSearchParams(globalThis.location?.search || '')
  for (const [key, value] of Object.entries(values)) {
    if (value) params.set(key, value)
    else params.delete(key)
  }
  const qs = params.toString()
  const url = qs ? `${globalThis.location.pathname}?${qs}` : globalThis.location.pathname
  globalThis.history?.replaceState(null, '', url)
}

const BackofficeExpenseReportsPage: React.FC<BusinessAppContextProps> = ({ accessToken, userInfo }) => {
  const { t } = useTranslation(translations)
  const [initialUrlParams] = useState(readUrlParams)
  const [sorting, setSorting] = useState<SortingState>([])
  const [reportSnapshotsByType, setReportSnapshotsByType] = useState<Partial<Record<ReportType, ReportSnapshot>>>({})
  const [localSearchText, setLocalSearchText] = useState(initialUrlParams.search)
  const [filtersByReportType, setFiltersByReportType] = useState<Partial<Record<ReportType, Record<string, any>>>>(
    () => {
      const rt = initialUrlParams.reportType
      if (!rt) return {}
      const initial: Record<string, any> = {}
      if (initialUrlParams.status.length > 0) initial.status = initialUrlParams.status
      if (initialUrlParams.department.length > 0) initial.departmentName = initialUrlParams.department
      return Object.keys(initial).length > 0 ? { [rt]: initial } : {}
    }
  )

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
    allEmployeeNames,
    slaKpiCounts
  } = useBackofficeExpenseReportData(contextProps, t, filtersByReportType, sorting)

  const { organizationalUnits } = useFilterData({ accessToken })

  useEffect(() => {
    if (initialUrlParams.reportType && initialUrlParams.reportType !== selectedReportType) {
      setSelectedReportType(initialUrlParams.reportType)
    }
    if (initialUrlParams.search) setSearchTerm(initialUrlParams.search)
    if (initialUrlParams.page > 1) setCurrentPage(initialUrlParams.page)
  }, [])

  const isDataAlignedWithSelectedType = reportDataType === selectedReportType
  const selectedReportSnapshot = selectedReportType ? reportSnapshotsByType[selectedReportType] : undefined
  const baseReportRows = useMemo<any[]>(
    () =>
      isDataAlignedWithSelectedType && Array.isArray(reportData)
        ? (reportData as any[])
        : (selectedReportSnapshot?.rows ?? []),
    [isDataAlignedWithSelectedType, reportData, selectedReportSnapshot]
  )

  useEffect(() => {
    if (!selectedReportType || !isDataAlignedWithSelectedType || !Array.isArray(reportData)) return
    setReportSnapshotsByType(prev => ({ ...prev, [selectedReportType]: { rows: reportData as any[], totalCount } }))
  }, [selectedReportType, isDataAlignedWithSelectedType, reportData, totalCount])

  const reportRowsWithGroupedStatuses = useMemo(
    () => (Array.isArray(baseReportRows) ? baseReportRows : []),
    [baseReportRows]
  )

  const {
    selectedFilters,
    filterConfiguration,
    filteredReportRows,
    hasClientSideFilters,
    handleFilterChange,
    handleResetFilters
  } = useReportFilters({
    selectedReportType,
    reportRowsWithGroupedStatuses,
    organizationalUnits,
    allEmployeeNames,
    filtersByReportType,
    setFiltersByReportType,
    setCurrentPage,
    setLocalSearchText,
    setSearchTerm,
    t
  })

  const slaKpiValues = useSlaKpiValues(slaKpiCounts)
  const hasActiveFilters = useMemo(() => hasAnyReportFilters(selectedFilters), [selectedFilters])
  const activeFiltersOnly = useMemo(() => {
    if (!hasActiveFilters) return undefined
    const result: Record<string, any> = {}
    if (selectedFilters.status.length > 0) result['status'] = selectedFilters.status
    if (selectedFilters.employeeName.length > 0) result['employeeName'] = selectedFilters.employeeName
    if (selectedFilters.departmentName.length > 0) result['departmentName'] = selectedFilters.departmentName
    if (selectedFilters.dateFrom || selectedFilters.dateTo) {
      result['dateRange'] = [selectedFilters.dateFrom ?? null, selectedFilters.dateTo ?? null]
    }
    if (selectedFilters.effectiveDateFrom || selectedFilters.effectiveDateTo) {
      result['effectiveDateRange'] = [
        selectedFilters.effectiveDateFrom ?? null,
        selectedFilters.effectiveDateTo ?? null
      ]
    }
    if (selectedFilters.requestDateFrom || selectedFilters.requestDateTo) {
      result['requestDateRange'] = [selectedFilters.requestDateFrom ?? null, selectedFilters.requestDateTo ?? null]
    }
    if (selectedFilters.planDateFrom || selectedFilters.planDateTo) {
      result['planDateRange'] = [selectedFilters.planDateFrom ?? null, selectedFilters.planDateTo ?? null]
    }
    return result
  }, [selectedFilters, hasActiveFilters])

  useEffect(() => {
    writeUrlParams({
      reportType: selectedReportType || undefined,
      search: searchTerm || undefined,
      page: currentPage > 1 ? String(currentPage) : undefined,
      status: selectedFilters.status.length > 0 ? selectedFilters.status.join(',') : undefined,
      department: selectedFilters.departmentName.length > 0 ? selectedFilters.departmentName.join(',') : undefined
    })
  }, [selectedReportType, searchTerm, currentPage, selectedFilters.status, selectedFilters.departmentName])

  const hasReportRows = Array.isArray(baseReportRows) && baseReportRows.length > 0
  const displayTotalCount = isDataAlignedWithSelectedType ? totalCount : (selectedReportSnapshot?.totalCount ?? 0)
  const tableLoading = isLoading && !hasReportRows

  const reportTypes = useMemo(
    () =>
      REPORT_TYPE_DEFINITIONS.map(def => ({
        key: def.key,
        name: t(def.nameKey),
        description: t(def.descKey)
      })),
    [t]
  )
  const selectedReportMeta = reportTypes.find(rt => rt.key === selectedReportType)

  const columns = useMemo(() => getReportColumns(selectedReportType, t), [selectedReportType, t])
  const backendSortableColumnKeys = useMemo(
    () => getBackendSortableColumnKeys(selectedReportType),
    [selectedReportType]
  )
  const dataTableColumns = useMemo<TanstackColumnDef<any>[]>(
    () =>
      columns.map(col => ({
        id: col.key,
        enableSorting: backendSortableColumnKeys.has(col.key),
        header: col.title ?? '',
        accessorFn: (row: any) => row?.[col.key],
        cell: ({ row }: any) => renderReportTableCell(col.key, row?.original, t)
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

  const debouncedLocalSearch = useDebounce(localSearchText, 300)
  useEffect(() => {
    setSearchTerm(debouncedLocalSearch)
    setCurrentPage(1)
  }, [debouncedLocalSearch, setSearchTerm, setCurrentPage])
  const handleSearchChange = useCallback((value: string) => {
    setLocalSearchText(value)
  }, [])

  const handleReportTypeChange = (value: string) => {
    const nextType = reportTypes.find(rt => rt.key === value)?.key
    if (nextType) setSelectedReportType(nextType)
  }
  const handleSortingChange: OnChangeFn<SortingState> = updater => {
    setSorting(prev => (typeof updater === 'function' ? updater(prev) : updater))
    setCurrentPage(1)
  }
  const handleDownload = async () => {
    const cols = getExportColumns(selectedReportType, t)
    if (!cols.length) return
    downloadCsvReport(selectedReportType, cols, (await fetchAllForExport()) as any[])
  }
  const handleDownloadExcel = async () => {
    const cols = getExportColumns(selectedReportType, t)
    if (!cols.length) return
    downloadExcelReport(selectedReportType, cols, (await fetchAllForExport()) as any[])
  }
  const tablePagination = useMemo(
    () => ({ pageIndex: Math.max(currentPage - 1, 0), pageSize }),
    [currentPage, pageSize]
  )
  const handlePaginationChange = (p: { pageIndex: number; pageSize: number }) => {
    if (p.pageSize === pageSize) {
      setCurrentPage(p.pageIndex + 1)
      return
    }
    setPageSize(p.pageSize)
    setCurrentPage(1)
  }
  const dataDisplayStateKey = useMemo(
    () =>
      `${selectedReportType || 'unknown'}::${selectedFilters.status.join('|')}::${selectedFilters.employeeName.join('|')}::${selectedFilters.departmentName.join('|')}::${selectedFilters.dateFrom || ''}::${selectedFilters.dateTo || ''}::${selectedFilters.effectiveDateFrom || ''}::${selectedFilters.effectiveDateTo || ''}::${selectedFilters.requestDateFrom || ''}::${selectedFilters.requestDateTo || ''}::${selectedFilters.planDateFrom || ''}::${selectedFilters.planDateTo || ''}::${searchTerm || ''}`,
    [selectedFilters, selectedReportType, searchTerm]
  )

  return (
    <div data-testid="backoffice-expense-reports-page-container">
      <PageLayout
        headerTitle={t('expense-reports-title')}
        headerDescription={t('expense-reports-subheader')}
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
                  <strong>{t('common-error')}</strong> {error}
                </AlertDescription>
              </Alert>
            )}
            <ReportSlaKpiCards kpiValues={slaKpiValues} />
            <Tabs
              value={selectedReportType || ReportType.APPROVAL_PAYOUT_CYCLE}
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
            <p
              className="gba:text-xs gba:text-muted-foreground gba:px-1"
              data-testid="backoffice-expense-reports-selected-type-description"
            >
              {selectedReportMeta?.description}
            </p>
            <DataDisplay
              key={`backoffice-reports-datadisplay-${dataDisplayStateKey}`}
              titleSections={[
                {
                  id: 'results',
                  label: t('report-data-label'),
                  metadata: {
                    count: hasClientSideFilters ? filteredReportRows.length : displayTotalCount,
                    isLoading: tableLoading
                  }
                }
              ]}
              currentSection="results"
              searchValue={localSearchText}
              searchPlaceholder={t('report-search')}
              onSearchChange={handleSearchChange}
              filters={activeFiltersOnly}
              filterConfiguration={filterConfiguration}
              onFilterChange={handleFilterChange}
              sorting={sorting}
              sortableColumns={sortableColumns}
              onSortingChange={handleSortingChange}
              primaryAction={
                <div className="gba:flex gba:items-center gba:gap-2">
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      onClick={handleResetFilters}
                      data-testid="backoffice-expense-reports-reset-filters-button"
                    >
                      {t('filter-report-filters')}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={handleDownload}
                    className="gba:flex gba:items-center gba:gap-2"
                    data-testid="backoffice-expense-reports-download-button"
                  >
                    <PiDownload className="gba:text-sm" />
                    {t('report-download-csv')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDownloadExcel}
                    className="gba:flex gba:items-center gba:gap-2"
                    data-testid="backoffice-expense-reports-download-excel-button"
                  >
                    <PiDownload className="gba:text-sm" />
                    {t('report-download-excel')}
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
                  onPaginationChange={handlePaginationChange}
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
                  emptyMessage={t('report-no-reports-found')}
                  data-testid="backoffice-expense-reports-table"
                />
              </div>
            </DataDisplay>
          </div>
        </div>
      </PageLayout>
    </div>
  )
}

export default BackofficeExpenseReportsPage

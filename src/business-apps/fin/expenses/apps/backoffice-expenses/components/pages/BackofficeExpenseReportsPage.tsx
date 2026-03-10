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
  TabsTrigger
} from '@newwork/nw-design-system'
import type { ColumnDef as TanstackColumnDef, OnChangeFn, SortingState } from '@tanstack/react-table'
import { PiDownload, PiFileText } from 'react-icons/pi'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useBackofficeExpenseReportData, ReportType } from '../../hooks/useBackofficeExpenseReportData'
import { useDebounce } from '@/common/hooks/useDebounce'
import { useFilterData } from '../../hooks/useFilterData'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { downloadCsvReport, downloadExcelReport } from './backofficeExpenseReportsPage.utils'
import { getReportColumns, getExportColumns, getBackendSortableColumnKeys } from './reportColumnDefinitions'
import ReportSlaKpiCards from './ReportSlaKpiCards'
import {
  type ReportSnapshot,
  REPORT_TYPE_DEFINITIONS,
  normalizeStatusFilterValue,
  buildTransferRequiredAliases,
  hasAnyReportFilters
} from './reportFilterUtils'
import { useReportFilters } from './useReportFilters'
import { renderReportTableCell } from './reportTableCells'
import { useSlaKpiValues } from './useSlaKpiValues'

const BackofficeExpenseReportsPage: React.FC<BusinessAppContextProps> = ({ accessToken, userInfo }) => {
  const [sorting, setSorting] = useState<SortingState>([])
  const [reportSnapshotsByType, setReportSnapshotsByType] = useState<Partial<Record<ReportType, ReportSnapshot>>>({})
  const [localSearchText, setLocalSearchText] = useState('')
  const [filtersByReportType, setFiltersByReportType] = useState<Partial<Record<ReportType, Record<string, any>>>>({})

  const contextProps = useMemo(() => ({ accessToken, userInfo }), [accessToken, userInfo])
  const transferRequiredAliases = useMemo(() => buildTransferRequiredAliases(), [])

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
    () =>
      (Array.isArray(baseReportRows) ? baseReportRows : []).map(row => ({
        ...row,
        status: normalizeStatusFilterValue(row?.status, transferRequiredAliases)
      })),
    [baseReportRows, transferRequiredAliases]
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
    fetchAllForFilterOptions,
    filtersByReportType,
    setFiltersByReportType,
    setCurrentPage,
    setLocalSearchText,
    setSearchTerm
  })

  const slaKpiValues = useSlaKpiValues(slaKpiCounts)
  const hasActiveFilters = useMemo(() => hasAnyReportFilters(selectedFilters), [selectedFilters])
  const activeFiltersOnly = useMemo(() => {
    if (!hasActiveFilters) return undefined
    const result: Record<string, string[]> = {}
    for (const [key, values] of Object.entries(selectedFilters)) {
      if (Array.isArray(values) && values.length > 0) result[key] = values
    }
    return result
  }, [selectedFilters, hasActiveFilters])
  const hasReportRows = Array.isArray(baseReportRows) && baseReportRows.length > 0
  const displayTotalCount = isDataAlignedWithSelectedType ? totalCount : (selectedReportSnapshot?.totalCount ?? 0)
  const tableLoading = isLoading && !hasReportRows

  const reportTypes = useMemo(
    () =>
      REPORT_TYPE_DEFINITIONS.map(def => ({
        key: def.key,
        name: getTranslationFromI18nKeyAndLabel(def.nameKey, def.nameFallback),
        description: getTranslationFromI18nKeyAndLabel(def.descKey, def.descFallback)
      })),
    []
  )
  const selectedReportMeta = reportTypes.find(t => t.key === selectedReportType)

  const columns = useMemo(() => getReportColumns(selectedReportType), [selectedReportType])
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
        cell: ({ row }: any) => renderReportTableCell(col.key, row?.original)
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
    const nextType = reportTypes.find(t => t.key === value)?.key
    if (nextType) setSelectedReportType(nextType)
  }
  const handleSortingChange: OnChangeFn<SortingState> = updater => {
    setSorting(prev => (typeof updater === 'function' ? updater(prev) : updater))
    setCurrentPage(1)
  }
  const handleDownload = async () => {
    const cols = getExportColumns(selectedReportType)
    if (!cols.length) return
    downloadCsvReport(selectedReportType, cols, (await fetchAllForExport()) as any[])
  }
  const handleDownloadExcel = async () => {
    const cols = getExportColumns(selectedReportType)
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
      `${selectedReportType || 'unknown'}::${selectedFilters.status.join('|')}::${selectedFilters.employeeName.join('|')}::${selectedFilters.departmentName.join('|')}::${searchTerm || ''}`,
    [selectedFilters, selectedReportType, searchTerm]
  )

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
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:team_expenses_page.dashboard_tab.reset_filters',
                        'Reset Filters'
                      )}
                    </Button>
                  )}
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
      </PageLayout>
    </div>
  )
}

export default BackofficeExpenseReportsPage

import { useState, useCallback, useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { useCurrencySecondaryAction } from '../../../common/hooks/useSharedTabState'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { useExpenseRequestFileService as useCommonExpenseRequestFileService } from '../../../../../common/files/useExpenseRequestFileService'
import translations from '../../../_i18n'
import { ExpenseData } from '../../../types'
import { useExpenseRequestExport } from './export/expenseRequestExport'
import BackofficeTabHeaderAlert from '../common/BackofficeTabHeaderAlert'
import useBackofficeTabSearch from '../common/useBackofficeTabSearch'
import useBackofficeContentHeader from '../common/useBackofficeContentHeader'
import type { BackofficeTabProps } from '../common/backofficeTabProps'
import {
  useExpenseRequestPdf,
  useExpenseRequestActions,
  useExpenseRequestTransfer,
  useExpenseRequestSelection,
  useExpenseRequestTabState
} from './hooks'
import { useTableSetup } from '../../../common/hooks/useTableSetup'
import {
  createBackofficeExpenseRequestColumns,
  type BackofficeExpenseRequestTableChrome
} from './table/backofficeExpenseRequestColumns'
import ExpenseRequestsTable from './table/ExpenseRequestsTable'
import ExpenseRequestTableActions from './components/ExpenseRequestTableActions'
import { ExpenseRequestPdfModal, EmployeeSearchFilter, ExpenseRequestSecondaryActions } from './components'
import { BackofficeDataDisplay } from '../../../common/components/BackofficeDataDisplay'
import { ExpenseRequestFilterSheet, type EmployeeFilterRenderProps } from './components/ExpenseRequestFilterSheet'
import BackofficeExpenseRequestDetailsSheet from './components/BackofficeExpenseRequestDetailsSheet'

type ExpenseRequestTabProps = BackofficeTabProps

function ExpenseRequestTab(props: Readonly<ExpenseRequestTabProps>) {
  const { onContentHeaderChange, isActive = true, accessToken } = props
  const { t } = useTranslation(translations)

  const { searchTerm, handleSearchChange: handleParentSearchChange } = useBackofficeTabSearch()

  const overviewHeader = useMemo(
    () => (
      <BackofficeTabHeaderAlert
        wrapperTestId="expense-request-stats-header"
        alertTestId="expense-request-stats-alert"
        title={t('expense-requests-overview-title')}
        description={t('expense-requests-overview-description')}
      />
    ),
    [t]
  )
  useBackofficeContentHeader(onContentHeaderChange, overviewHeader)

  const {
    expenses,
    totalItems,
    loading,
    error,
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize,
    fetchData,
    searchText,
    handleSearchChange,
    sortingState,
    allDataColumns,
    sortableColumns,
    handleSortingChange,
    columnsFilteredByVisibility,
    setVisibleColumns,
    filterConfiguration,
    filtersObject,
    handleFilterChangeFromDisplay,
    listEmptyMessage,
    buildQueryConditions,
    availableCurrencyCodes,
    selectedCurrencyCode,
    handleCurrencyChange,
    employeeSearchFilterProps
  } = useExpenseRequestTabState({
    accessToken: accessToken ?? '',
    t,
    isActive,
    searchFromParent: searchTerm,
    onSearchChange: handleParentSearchChange
  })

  const [selectedExpense, setSelectedExpense] = useState<ExpenseData | null>(null)

  const {
    selectedRowKeys,
    selectedRecords,
    clearSelection,
    handleSelectRecord,
    handleSelectAllRecords,
    hasBookableSelected,
    allBookableSelected,
    bookableRecordsCount,
    selectedBookableCount
  } = useExpenseRequestSelection(expenses)

  const { isPdfModalVisible, pdfUrl, pdfLoading, pdfError, handlePrintExpenseRequest, handleClosePdfModal } =
    useExpenseRequestPdf(props)
  const { handleDownloadAccountingNote, handleTriggerCSV } = useExpenseRequestActions(props)
  const { handleTransferPayment, handleBulkTransferPayment, isTransferInProgress, isBulkTransferInProgress } =
    useExpenseRequestTransfer(props, () => fetchData(true), clearSelection)
  const { printExpenseRequest } = useCommonExpenseRequestFileService(props)

  const { isExporting, handleExportCsv, handleExportExcel, getExportCsvTitle, getExportExcelTitle } =
    useExpenseRequestExport({ accessToken, totalItems, buildQueryConditions })

  const currencySecondaryAction = useCurrencySecondaryAction(
    availableCurrencyCodes,
    selectedCurrencyCode,
    handleCurrencyChange,
    'backoffice-expense-requests'
  )

  const renderEmployeeFilter = useCallback(
    ({ selectedEmployeeIds, onSelectedEmployeeIdsChange }: EmployeeFilterRenderProps) => (
      <EmployeeSearchFilter
        {...employeeSearchFilterProps}
        selectedEmployeeIds={selectedEmployeeIds}
        onSelectedEmployeeIdsChange={onSelectedEmployeeIdsChange}
      />
    ),
    [employeeSearchFilterProps]
  )

  const handleBulkTransfer = useCallback(() => {
    const bookableRecords = selectedRecords.filter(record => record.status === 'BOOKED')
    if (bookableRecords.length > 0) {
      handleBulkTransferPayment(bookableRecords)
    }
  }, [selectedRecords, handleBulkTransferPayment])

  const secondaryActions = useMemo(
    () => (
      <ExpenseRequestSecondaryActions
        currencySecondaryAction={currencySecondaryAction}
        showExport={selectedRecords.length === 0}
        isExporting={isExporting}
        totalItems={totalItems}
        onExportCsv={handleExportCsv}
        onExportExcel={handleExportExcel}
        getCsvTitle={getExportCsvTitle}
        getExcelTitle={getExportExcelTitle}
        labelExporting={t('export-exporting')}
        labelCsv={t('export-csv-label')}
        labelExcel={t('export-excel-label')}
        showBulkTransfer={hasBookableSelected}
        onBulkTransfer={handleBulkTransfer}
        bulkTransferLabel={t('transfer-payment-label')}
        transferInProgressLabel={t('transfer-in-progress')}
        transferSelectedLabel={t('transfer-selected')}
        selectedBookableCount={selectedBookableCount}
        isBulkTransferInProgress={isBulkTransferInProgress}
      />
    ),
    [
      currencySecondaryAction,
      selectedRecords.length,
      isExporting,
      totalItems,
      handleExportCsv,
      handleExportExcel,
      getExportCsvTitle,
      getExportExcelTitle,
      t,
      hasBookableSelected,
      handleBulkTransfer,
      selectedBookableCount,
      isBulkTransferInProgress
    ]
  )

  const handleNavigateToExpenseRequest = useCallback((record: ExpenseData) => {
    const url = buildPlatformUrl('/platform/fin/expenses/expense-request-record', {
      expenseRequestId: record.id,
      referrer: '/platform/fin/expenses/backoffice-expenses?tab=expense-requests'
    })
    navigateTo(url)
  }, [])

  const handleRowClick = useCallback((record: ExpenseData) => {
    setSelectedExpense(record)
  }, [])

  const renderRowActions = useCallback(
    (row: { original: ExpenseData }) => (
      <ExpenseRequestTableActions
        record={row.original}
        accessToken={accessToken ?? ''}
        transferInProgress={isTransferInProgress(row.original.id)}
        onNavigateToExpenseRequest={handleNavigateToExpenseRequest}
        onDownloadAccountingNote={handleDownloadAccountingNote}
        onTriggerCSV={handleTriggerCSV}
        onPrintExpenseRequest={handlePrintExpenseRequest}
        onTransferPayment={handleTransferPayment}
      />
    ),
    [
      accessToken,
      isTransferInProgress,
      handleNavigateToExpenseRequest,
      handleDownloadAccountingNote,
      handleTriggerCSV,
      handlePrintExpenseRequest,
      handleTransferPayment
    ]
  )

  const handleCloseDetails = useCallback(() => {
    setSelectedExpense(null)
  }, [])

  const tableChrome: BackofficeExpenseRequestTableChrome = useMemo(
    () => ({
      bookableRecordsCount,
      allBookableSelected,
      onSelectAllRecords: handleSelectAllRecords,
      selectedRowKeys,
      onSelectRecord: handleSelectRecord
    }),
    [bookableRecordsCount, allBookableSelected, handleSelectAllRecords, selectedRowKeys, handleSelectRecord]
  )

  const allExpenseRequestColumns = useMemo(
    () => createBackofficeExpenseRequestColumns(t, tableChrome),
    [t, tableChrome]
  )

  const visibleExpenseRequestColumnIds = useMemo(
    () => ['select', ...columnsFilteredByVisibility],
    [columnsFilteredByVisibility]
  )

  const {
    columns: expenseRequestTableColumns,
    pagination,
    handlePaginationChange
  } = useTableSetup(
    props,
    allExpenseRequestColumns,
    visibleExpenseRequestColumnIds,
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize
  )

  return (
    <div className="gba:h-full gba:flex gba:flex-col" data-testid="expense-requests-tab-container">
      <div className="gba:relative gba:w-full gba:h-full gba:-mx-6" data-testid="expense-requests-table-wrapper">
        <BackofficeDataDisplay
          titleSections={[
            {
              id: 'list',
              label: t('tab-expense-requests'),
              metadata: { count: totalItems, isLoading: loading }
            }
          ]}
          currentSection="list"
          searchValue={searchText}
          searchPlaceholder={t('common-search-expense-requests')}
          onSearchChange={handleSearchChange}
          filters={filtersObject}
          filterConfiguration={filterConfiguration}
          onFilterChange={handleFilterChangeFromDisplay}
          sorting={sortingState}
          sortableColumns={sortableColumns}
          onSortingChange={handleSortingChange}
          availableColumns={allDataColumns}
          visibleColumns={columnsFilteredByVisibility}
          onVisibleColumnsChange={setVisibleColumns}
          toolbarDensity="default"
          secondaryActions={secondaryActions}
          renderFilterSheet={(open, onOpenChange) => (
            <ExpenseRequestFilterSheet
              open={open}
              onOpenChange={onOpenChange}
              configuration={filterConfiguration}
              values={filtersObject}
              onApply={handleFilterChangeFromDisplay}
              onChange={handleFilterChangeFromDisplay}
              enableLiveFiltering={false}
              title={getTranslationFromI18nKeyAndLabel(
                'lowcoder:expense_request_list.expense_plan_table.title',
                'Filter Expense Requests'
              )}
              description={getTranslationFromI18nKeyAndLabel(
                'lowcoder:personal_expenses.filter_expense_requests_description',
                'Apply filters to narrow down the expense requests list.'
              )}
              renderEmployeeFilter={renderEmployeeFilter}
            />
          )}
        >
          <ExpenseRequestsTable
            expenses={expenses ?? []}
            loading={loading}
            error={error}
            totalItems={totalItems}
            columns={expenseRequestTableColumns}
            sorting={sortingState}
            onSortingChange={handleSortingChange}
            pagination={pagination}
            onPaginationChange={handlePaginationChange}
            emptyMessage={listEmptyMessage}
            onRowClick={handleRowClick}
            actions={renderRowActions}
          />
        </BackofficeDataDisplay>

        <BackofficeExpenseRequestDetailsSheet
          open={!!selectedExpense}
          onOpenChange={(open: boolean) => {
            if (!open) handleCloseDetails()
          }}
          selectedExpense={selectedExpense}
          t={t}
          accessToken={accessToken ?? ''}
          printExpenseRequest={printExpenseRequest}
        />

        <ExpenseRequestPdfModal
          isVisible={isPdfModalVisible}
          pdfUrl={pdfUrl}
          pdfLoading={pdfLoading}
          pdfError={pdfError}
          onClose={handleClosePdfModal}
        />
      </div>
    </div>
  )
}

export default ExpenseRequestTab

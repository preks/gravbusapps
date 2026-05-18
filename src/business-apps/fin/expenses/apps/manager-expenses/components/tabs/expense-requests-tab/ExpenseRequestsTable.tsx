import type { SortingState } from '@tanstack/react-table'
import React, { useCallback, useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ExpenseRequest } from '../../../hooks/useGetExpenseRequests'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { AppAction } from '@/components/app-action'
import { RowActionsWrapper, RowActionsIcon } from '../../../../../common/components/table/RowActionComponents'
import { PrintPreviewDialog } from '../../../common/components/PrintPreviewDialog'
import { useExpenseRequestFileService } from '../../../../../common/files/useExpenseRequestFileService'
import { ExpenseDataTable } from '../../../../../common/components/table/ExpenseDataTable'
import { TableErrorState } from '../../../../../common/components/table/TableErrorState'
import { useTableSetup } from '../../../../../common/hooks/useTableSetup'
import { usePrintPreview } from '../../../common/hooks/usePrintPreview'
import { createExpenseRequestColumns } from './expenseRequestColumns'
import translations from '../../../_i18n'

interface ExpenseRequestsTableProps extends BusinessAppContextProps {
  expenseRequests: ExpenseRequest[]
  loading: boolean
  error: Error | null
  totalCount: number
  currencyFilter: string | null
  currentPage: number
  setCurrentPage: (page: number) => void
  sorting: SortingState
  onSortingChange: (sorting: SortingState) => void
  pageSize: number
  setPageSize: (size: number) => void
  visibleColumnIds: string[]
  emptyMessage: string
  onViewDetails?: (request: ExpenseRequest) => void
}

const DATA_TEST_ID_PREFIX = 'expense-requests'

const ExpenseRequestsTable: React.FC<ExpenseRequestsTableProps> = props => {
  const {
    expenseRequests,
    loading,
    error,
    totalCount,
    currencyFilter,
    currentPage,
    setCurrentPage,
    sorting,
    onSortingChange,
    pageSize,
    setPageSize,
    visibleColumnIds,
    emptyMessage,
    onViewDetails
  } = props

  const { t } = useTranslation(translations)
  const allColumns = useMemo(() => createExpenseRequestColumns(currencyFilter ?? null, t), [currencyFilter, t])
  const { contextProps, columns, pagination, handlePaginationChange } = useTableSetup(
    props,
    allColumns,
    visibleColumnIds,
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize
  )

  const { printExpenseRequest, isMounted } = useExpenseRequestFileService(contextProps)
  const {
    modalOpen: printModalOpen,
    pdfUrl: printPdfUrl,
    loading: printLoading,
    handlePrint: handlePrintRequest,
    handleClose: handlePrintClose
  } = usePrintPreview<ExpenseRequest>(printExpenseRequest, isMounted)

  const handleViewRequestDetails = useCallback((request: ExpenseRequest) => {
    const url = buildPlatformUrl('/platform/fin/expenses/expense-request-record', {
      expenseRequestId: request.id,
      referrer: '/platform/fin/expenses/manager-expenses?tab=expense-requests'
    })
    navigateTo(url)
  }, [])

  const actions = useCallback(
    (row: { original: ExpenseRequest }) => {
      const record = row.original
      const hasValidStatus =
        record.status === 'APPROVED' ||
        record.status === 'VERIFIED' ||
        record.status === 'BOOKED' ||
        record.status === 'TRANSFERRED' ||
        record.status === 'PAID'
      const hasDocument = !!record.employeeDocument?.file?.trim()

      const customActions: Array<{
        category: string
        key: string
        label: string
        onClick: (e?: React.MouseEvent) => void
      }> = []
      if (hasValidStatus && hasDocument) {
        customActions.push({
          category: t('expense-plans-row-category-actions'),
          key: 'print',
          label: t('expense-plans-row-print'),
          onClick: (e?: React.MouseEvent) => {
            e?.stopPropagation()
            handlePrintRequest(record)
          }
        })
      }
      customActions.push({
        category: t('expense-plans-row-category-navigations'),
        key: 'view-request-details',
        label: t('advance-payments-row-view-request-details'),
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation()
          handleViewRequestDetails(record)
        }
      })

      return (
        <RowActionsWrapper>
          <AppAction
            variant="table-row"
            customActions={customActions}
            prefixDataTestId={`${DATA_TEST_ID_PREFIX}-update`}
            accessToken={contextProps.accessToken}
            data-testid={`${DATA_TEST_ID_PREFIX}-update-button-${record.id}`}
          >
            <RowActionsIcon />
          </AppAction>
        </RowActionsWrapper>
      )
    },
    [handlePrintRequest, handleViewRequestDetails, contextProps.accessToken, t]
  )

  const onRowClick = useCallback(
    (request: ExpenseRequest) => {
      onViewDetails?.(request)
    },
    [onViewDetails]
  )

  const errorMessage = error?.message ?? null

  if (error) {
    return <TableErrorState message={errorMessage} testIdPrefix={DATA_TEST_ID_PREFIX} />
  }

  return (
    <div data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      <ExpenseDataTable<ExpenseRequest>
        data={expenseRequests}
        columns={columns}
        loading={loading}
        error={errorMessage}
        totalCount={totalCount}
        sorting={sorting}
        onSortingChange={onSortingChange}
        pagination={pagination}
        onPaginationChange={handlePaginationChange}
        onRowClick={onRowClick}
        actions={actions}
        emptyMessage={emptyMessage}
        dataTestId={`${DATA_TEST_ID_PREFIX}-table`}
      />

      <PrintPreviewDialog
        open={printModalOpen}
        onOpenChange={open => {
          if (!open) handlePrintClose()
        }}
        title={t('expense-requests-print-preview-title')}
        loading={printLoading}
        pdfUrl={printPdfUrl}
        testIdPrefix="print-request"
        noDocumentDetailsMessage={t('expense-requests-print-no-document')}
      />
    </div>
  )
}

export default React.memo(ExpenseRequestsTable)

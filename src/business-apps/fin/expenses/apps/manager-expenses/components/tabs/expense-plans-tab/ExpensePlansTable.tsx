import React, { useState, useCallback, useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import type { SortingState } from '@tanstack/react-table'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ExpensePlan, SortField } from '../../../hooks/useMainViewExpensePlans'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { AppAction } from '@/components/app-action'
import { RowActionsWrapper, RowActionsIcon } from '../../../../../common/components/table/RowActionComponents'
import { PrintPreviewDialog } from '../../../common/components/PrintPreviewDialog'
import { DetailsSheet } from '../../../common/components/DetailsSheet'
import { useExpensePlanFileService } from '../../../../../common/files/useExpensePlanFileService'
import ExpensePlanDetails from './ExpensePlanDetails'
import { ExpenseDataTable } from '../../../../../common/components/table/ExpenseDataTable'
import { TableErrorState } from '../../../../../common/components/table/TableErrorState'
import { useTableSetup } from '../../../../../common/hooks/useTableSetup'
import { usePrintPreview } from '../../../common/hooks/usePrintPreview'
import { useSortingState } from '../../../hooks/useTabState'
import { createExpensePlanColumns } from './expensePlanColumns'
import translations from '../../../_i18n'

interface ExpensePlansTableProps extends BusinessAppContextProps {
  onViewDetails?: (plan: ExpensePlan) => void
  currencyFilter?: string | null
  expensePlans: ExpensePlan[]
  loading: boolean
  error: Error | null
  totalCount: number
  currentPage: number
  setCurrentPage: (page: number) => void
  sorting: { field: SortField | null; order: 'ASC' | 'DESC' | null; lastField: SortField | null }
  onSortingChange: (sorting: SortingState) => void
  pageSize: number
  setPageSize: (size: number) => void
  visibleColumnIds: string[]
  emptyMessage: string
}

const DATA_TEST_ID_PREFIX = 'ExpensePlansTable'

const ExpensePlansTable: React.FC<ExpensePlansTableProps> = props => {
  const { t } = useTranslation(translations)
  const currentCurrencyFilter = props.currencyFilter ?? null
  const allColumns = useMemo(() => createExpensePlanColumns(currentCurrencyFilter, t), [currentCurrencyFilter, t])
  const { contextProps, columns, pagination, handlePaginationChange } = useTableSetup(
    props,
    allColumns,
    props.visibleColumnIds,
    props.currentPage,
    props.pageSize,
    props.setCurrentPage,
    props.setPageSize
  )

  const [selectedItem, setSelectedItem] = useState<ExpensePlan | null>(null)

  const { printExpensePlan, isMounted } = useExpensePlanFileService(contextProps)
  const {
    modalOpen: printModalOpen,
    pdfUrl: printPdfUrl,
    loading: printLoading,
    handlePrint: handlePrintPlan,
    handleClose: handlePrintClose
  } = usePrintPreview<ExpensePlan>(printExpensePlan, isMounted)

  const { expensePlans, loading, error, totalCount, sorting, onSortingChange } = props

  const sortingState = useSortingState(sorting)
  const handleCloseDetails = useCallback(() => setSelectedItem(null), [])

  const handleViewDetails = useCallback((plan: ExpensePlan) => {
    const url = buildPlatformUrl('/platform/fin/expenses/expense-plan-record', {
      expensePlanId: plan.id,
      referrer: '/platform/fin/expenses/manager-expenses?tab=expense-plans'
    })
    navigateTo(url)
  }, [])

  const errorMessage = error?.message ?? null

  const actions = useCallback(
    (row: { original: ExpensePlan }) => {
      const record = row.original
      return (
        <RowActionsWrapper>
          <AppAction
            variant="table-row"
            customActions={[
              ...((record.status === 'APPROVED' ||
                record.status === 'VERIFIED' ||
                record.status === 'BOOKED' ||
                record.status === 'TRANSFERRED' ||
                record.status === 'PAID') &&
              record.employeeDocument?.file?.trim()
                ? [
                    {
                      category: t('expense-plans-row-category-actions'),
                      key: 'print',
                      label: t('expense-plans-row-print'),
                      onClick: (e?: React.MouseEvent) => {
                        e?.stopPropagation()
                        handlePrintPlan(record)
                      }
                    }
                  ]
                : []),
              {
                category: t('expense-plans-row-category-navigations'),
                key: 'view-plan-details',
                label: t('expense-plans-row-view-details'),
                onClick: (e?: React.MouseEvent) => {
                  e?.stopPropagation()
                  handleViewDetails(record)
                }
              }
            ]}
            prefixDataTestId={`${DATA_TEST_ID_PREFIX}-update-expense-plan`}
            accessToken={contextProps.accessToken}
            data-testid={`${DATA_TEST_ID_PREFIX}-update-expense-plan-button-${record.id}`}
          >
            <RowActionsIcon />
          </AppAction>
        </RowActionsWrapper>
      )
    },
    [handlePrintPlan, handleViewDetails, contextProps.accessToken, t]
  )

  const onRowClick = useCallback((plan: ExpensePlan) => setSelectedItem(plan), [])

  if (error) {
    return <TableErrorState message={errorMessage} testIdPrefix={DATA_TEST_ID_PREFIX} />
  }

  return (
    <div data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      <ExpenseDataTable<ExpensePlan>
        data={expensePlans}
        columns={columns}
        loading={loading}
        error={errorMessage}
        totalCount={totalCount}
        sorting={sortingState}
        onSortingChange={onSortingChange}
        pagination={pagination}
        onPaginationChange={handlePaginationChange}
        onRowClick={onRowClick}
        actions={actions}
        emptyMessage={props.emptyMessage}
        dataTestId={DATA_TEST_ID_PREFIX}
      />

      <PrintPreviewDialog
        open={printModalOpen}
        onOpenChange={open => {
          if (!open) handlePrintClose()
        }}
        title={t('expense-plans-print-dialog-title')}
        loading={printLoading}
        pdfUrl={printPdfUrl}
        testIdPrefix="print-plan"
      />

      <DetailsSheet
        open={!!selectedItem}
        onOpenChange={open => !open && handleCloseDetails()}
        title={selectedItem?.title || t('expense-plans-details-title')}
        testId="expense-plan-details-sheet"
        onClose={handleCloseDetails}
      >
        {selectedItem && (
          <ExpensePlanDetails
            selectedItem={selectedItem}
            onClose={handleCloseDetails}
            accessToken={contextProps.accessToken}
            userInfo={contextProps.userInfo}
          />
        )}
      </DetailsSheet>
    </div>
  )
}

export default React.memo(ExpensePlansTable)

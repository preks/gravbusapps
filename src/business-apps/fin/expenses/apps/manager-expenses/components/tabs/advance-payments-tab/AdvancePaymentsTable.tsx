import React, { useCallback, useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import type { SortingState } from '@tanstack/react-table'
import { AppAction } from '@/components/app-action'
import { RowActionsWrapper, RowActionsIcon } from '../../../../../common/components/table/RowActionComponents'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { AdvancePayment as AdvancePaymentItem } from '../../../hooks/useMainViewAdvancePayments'
import { ExpenseDataTable } from '../../../../../common/components/table/ExpenseDataTable'
import { TableErrorState } from '../../../../../common/components/table/TableErrorState'
import { useTableSetup } from '../../../../../common/hooks/useTableSetup'
import { createAdvancePaymentColumns } from './advancePaymentColumns'
import translations from '../../../_i18n'

interface AdvancePaymentsTableProps extends BusinessAppContextProps {
  advancePayments: AdvancePaymentItem[]
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
  onViewDetails?: (payment: AdvancePaymentItem) => void
}

const DATA_TEST_ID_PREFIX = 'advance-payments'

const AdvancePaymentsTable: React.FC<AdvancePaymentsTableProps> = props => {
  const {
    advancePayments,
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
  const allColumns = useMemo(() => createAdvancePaymentColumns(currencyFilter ?? null, t), [currencyFilter, t])
  const { contextProps, columns, pagination, handlePaginationChange } = useTableSetup(
    props,
    allColumns,
    visibleColumnIds,
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize
  )

  const handleViewExpensePlanDetails = useCallback((record: AdvancePaymentItem) => {
    const url = buildPlatformUrl('/platform/fin/expenses/expense-plan-record', {
      expensePlanId: record.expensePlan?.id ?? '',
      referrer: '/platform/fin/expenses/manager-expenses?tab=advance-payments'
    })
    navigateTo(url)
  }, [])

  const handleViewExpenseRequestDetails = useCallback((record: AdvancePaymentItem) => {
    const expenseRequests = record.expensePlan?.expenseRequest
    const first = Array.isArray(expenseRequests) && expenseRequests.length > 0 ? expenseRequests[0] : null
    if (!first?.id) return
    const url = buildPlatformUrl('/platform/fin/expenses/expense-request-record', {
      expenseRequestId: first.id,
      referrer: '/platform/fin/expenses/manager-expenses?tab=advance-payments'
    })
    navigateTo(url)
  }, [])

  const actions = useCallback(
    (row: { original: AdvancePaymentItem }) => {
      const record = row.original
      return (
        <RowActionsWrapper>
          <AppAction
            variant="table-row"
            customActions={[
              ...(record.expensePlan?.id
                ? [
                    {
                      category: getTranslationFromI18nKeyAndLabel(
                        'lowcoder:employee_list.flows_button.navigations',
                        'Navigations'
                      ),
                      key: 'view-plan-details',
                      label: getTranslationFromI18nKeyAndLabel(
                        'lowcoder:expense_plan_list.expense_plan_flows.view_plan_details',
                        'View Plan Details'
                      ),
                      onClick: (e?: React.MouseEvent) => {
                        e?.stopPropagation()
                        handleViewExpensePlanDetails(record)
                      }
                    }
                  ]
                : []),
              ...(record.expensePlan?.expenseRequest &&
              Array.isArray(record.expensePlan.expenseRequest) &&
              record.expensePlan.expenseRequest.length > 0 &&
              record.expensePlan.expenseRequest[0].id
                ? [
                    {
                      category: getTranslationFromI18nKeyAndLabel(
                        'lowcoder:employee_list.flows_button.navigations',
                        'Navigations'
                      ),
                      key: 'view-request-details',
                      label: getTranslationFromI18nKeyAndLabel(
                        'lowcoder:expense_request_list.modal_list_or_flow_button.view_request_details',
                        'View Request Details'
                      ),
                      onClick: (e?: React.MouseEvent) => {
                        e?.stopPropagation()
                        handleViewExpenseRequestDetails(record)
                      }
                    }
                  ]
                : [])
            ]}
            prefixDataTestId={`${DATA_TEST_ID_PREFIX}-update`}
            accessToken={contextProps.accessToken}
            data-testid={`${DATA_TEST_ID_PREFIX}-update-button-${record.id}`}
          >
            <RowActionsIcon />
          </AppAction>
        </RowActionsWrapper>
      )
    },
    [handleViewExpensePlanDetails, handleViewExpenseRequestDetails, contextProps.accessToken]
  )

  const onRowClick = useCallback(
    (payment: AdvancePaymentItem) => {
      onViewDetails?.(payment)
    },
    [onViewDetails]
  )

  const errorMessage = error?.message ?? null

  if (error) {
    return <TableErrorState message={errorMessage} testIdPrefix={DATA_TEST_ID_PREFIX} />
  }

  return (
    <div data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      <ExpenseDataTable<AdvancePaymentItem>
        data={advancePayments}
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
    </div>
  )
}

export default React.memo(AdvancePaymentsTable)

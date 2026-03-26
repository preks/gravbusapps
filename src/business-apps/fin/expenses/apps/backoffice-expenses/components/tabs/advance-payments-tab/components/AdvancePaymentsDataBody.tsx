import type { ReactNode } from 'react'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { ExpenseDataTable } from '../../../../common/components/ExpenseDataTable'
import { TableErrorState } from '../../../../common/components/TableErrorState'
import type { AdvancePaymentItem } from '../../../../types'

interface AdvancePaymentsDataBodyProps {
  payments: AdvancePaymentItem[]
  isLoading: boolean
  error: unknown
  totalCount: number
  columns: ColumnDef<AdvancePaymentItem>[]
  sorting: SortingState
  onSortingChange: (sorting: SortingState) => void
  pagination: { pageIndex: number; pageSize: number }
  onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void
  emptyMessage: string
  onRowClick: (record: AdvancePaymentItem) => void
  actions: (row: { original: AdvancePaymentItem }) => ReactNode
}

export default function AdvancePaymentsDataBody({
  payments,
  isLoading,
  error,
  totalCount,
  columns,
  sorting,
  onSortingChange,
  pagination,
  onPaginationChange,
  emptyMessage,
  onRowClick,
  actions
}: Readonly<AdvancePaymentsDataBodyProps>) {
  if (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return <TableErrorState message={errorMessage} testIdPrefix="advance-payments" />
  }

  return (
    <div data-testid="advance-payments-scroll-anchor" className="gba:w-full">
      <ExpenseDataTable<AdvancePaymentItem>
        data={payments}
        loading={isLoading}
        error={null}
        totalCount={totalCount}
        columns={columns}
        sorting={sorting}
        onSortingChange={onSortingChange}
        pagination={pagination}
        onPaginationChange={onPaginationChange}
        onRowClick={onRowClick}
        actions={actions}
        emptyMessage={emptyMessage}
        dataTestId="advance-payments-data-table"
      />
    </div>
  )
}

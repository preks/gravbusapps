import type { ReactNode } from 'react'
import React from 'react'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { ExpenseData } from '../../../../types'
import { ExpenseDataTable } from '../../../../common/components/ExpenseDataTable'
import { TableErrorState } from '../../../../common/components/TableErrorState'

const DEFAULT_DATA_TEST_ID_PREFIX = 'expense-requests'

export interface ExpenseRequestsTableProps {
  expenses: ExpenseData[]
  loading: boolean
  error: string | null
  totalItems: number
  columns: ColumnDef<ExpenseData>[]
  sorting: SortingState
  onSortingChange: (sorting: SortingState) => void
  pagination: { pageIndex: number; pageSize: number }
  onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void
  emptyMessage: string
  onRowClick: (record: ExpenseData) => void
  actions?: (row: { original: ExpenseData }) => ReactNode
  dataTestIdPrefix?: string
}

function ExpenseRequestsTable(props: Readonly<ExpenseRequestsTableProps>) {
  const {
    expenses,
    loading,
    error,
    totalItems,
    columns,
    sorting,
    onSortingChange,
    pagination,
    onPaginationChange,
    emptyMessage,
    onRowClick,
    actions,
    dataTestIdPrefix = DEFAULT_DATA_TEST_ID_PREFIX
  } = props

  if (error) {
    return <TableErrorState message={error} testIdPrefix={dataTestIdPrefix} />
  }

  return (
    <div data-testid={`${dataTestIdPrefix}-scroll-anchor`} className="gba:w-full">
      <ExpenseDataTable<ExpenseData>
        data={expenses}
        loading={loading}
        error={null}
        totalCount={totalItems}
        columns={columns}
        sorting={sorting}
        onSortingChange={onSortingChange}
        pagination={pagination}
        onPaginationChange={onPaginationChange}
        onRowClick={onRowClick}
        actions={actions}
        emptyMessage={emptyMessage}
        dataTestId="expense-requests-data-table"
      />
    </div>
  )
}

export default React.memo(ExpenseRequestsTable)

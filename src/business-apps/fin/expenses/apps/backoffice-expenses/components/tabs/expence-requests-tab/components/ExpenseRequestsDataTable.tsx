import React from 'react'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { ExpenseData } from '../../../../types'
import { ExpenseDataTable } from '../../../../common/components/ExpenseDataTable'
import { TableErrorState } from '../../../../common/components/TableErrorState'

interface ExpenseRequestsDataTableProps {
  error: string | null
  loading: boolean
  expenses: ExpenseData[]
  totalItems: number
  columns: ColumnDef<ExpenseData>[]
  sorting: SortingState
  onSortingChange: (sorting: SortingState) => void
  pagination: { pageIndex: number; pageSize: number }
  onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void
  onRowClick: (record: ExpenseData) => void
  emptyMessage: string
  dataTestIdPrefix: string
}

function ExpenseRequestsDataTable(props: Readonly<ExpenseRequestsDataTableProps>) {
  const {
    error,
    loading,
    expenses,
    totalItems,
    columns,
    sorting,
    onSortingChange,
    pagination,
    onPaginationChange,
    onRowClick,
    emptyMessage,
    dataTestIdPrefix
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
        emptyMessage={emptyMessage}
        dataTestId="expense-requests-data-table"
      />
    </div>
  )
}

export default React.memo(ExpenseRequestsDataTable)

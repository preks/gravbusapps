import React from 'react'
import { DataTable } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'

export interface ExpenseDataTableProps<T = unknown> {
  data: T[]
  loading?: boolean
  error?: string | null
  totalCount: number
  columns: ColumnDef<T>[]
  sorting?: Array<{ id: string; desc: boolean }>
  onSortingChange?: (sorting: Array<{ id: string; desc: boolean }>) => void
  pagination?: { pageIndex: number; pageSize: number }
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void
  onRowClick?: (row: T) => void
  actions?: (row: { original: T }) => React.ReactNode
  emptyMessage?: string
  dataTestId?: string
}

export function ExpenseDataTable<T extends { id?: string }>(props: Readonly<ExpenseDataTableProps<T>>) {
  const {
    data,
    loading = false,
    error = null,
    totalCount,
    columns,
    sorting,
    onSortingChange,
    pagination,
    onPaginationChange,
    onRowClick,
    actions,
    emptyMessage = 'No data found',
    dataTestId = 'expense-data-table'
  } = props

  return (
    <DataTable<T>
      data={data}
      columns={columns}
      loading={loading}
      error={error ?? undefined}
      totalCount={totalCount}
      sorting={sorting}
      onSortingChange={onSortingChange}
      pagination={pagination}
      onPaginationChange={onPaginationChange}
      enablePagination
      enableSorting
      enableSelection={false}
      enableColumnPinning
      enableResizing={false}
      tableLayout="fixed"
      rowsPerPageOptions={[10, 20, 50, 100]}
      showPageNumbers
      maxVisiblePages={7}
      emptyMessage={emptyMessage}
      actions={actions}
      onRowClick={onRowClick}
      data-testid={dataTestId}
    />
  )
}

export default ExpenseDataTable

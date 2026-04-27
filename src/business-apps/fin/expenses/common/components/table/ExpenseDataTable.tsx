import type { ReactNode } from 'react'
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
  actions?: (row: { original: T }) => ReactNode
  emptyMessage?: string
  dataTestId?: string
  rowsPerPage?: number
  /**
   * `fixed` (default) uses column size hints; `auto` lets the browser size columns closer to content
   * (useful for wide, many-column report tables so e.g. employee name does not reserve a huge track).
   */
  tableLayout?: 'fixed' | 'auto'
}

function normalizeTotalCountForDataTable(value: number | undefined): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
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
    dataTestId = 'expense-data-table',
    rowsPerPage,
    tableLayout = 'fixed'
  } = props

  const safeTotalCount = normalizeTotalCountForDataTable(totalCount)

  return (
    <DataTable<T>
      data={data}
      columns={columns}
      loading={loading}
      error={error ?? undefined}
      totalCount={safeTotalCount}
      sorting={sorting}
      onSortingChange={onSortingChange}
      pagination={pagination}
      onPaginationChange={onPaginationChange}
      rowsPerPage={rowsPerPage}
      enablePagination
      enableSorting
      enableSelection={false}
      enableColumnPinning
      enableResizing={false}
      tableLayout={tableLayout}
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

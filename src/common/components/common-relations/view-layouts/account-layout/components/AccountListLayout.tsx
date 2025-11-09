import React from 'react'
import { DataTable } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import type { Account } from '@/common/data/relations/types/accountTypes'

export interface AccountListLayoutProps<T extends Account = Account> {
  // Data
  data: T[]
  loading?: boolean
  error?: string | null
  totalCount: number

  // Columns
  columns: ColumnDef<T>[]

  // Sorting
  sorting?: Array<{ id: string; desc: boolean }>
  onSortingChange?: (sorting: Array<{ id: string; desc: boolean }>) => void

  // Pagination
  pagination?: { pageIndex: number; pageSize: number }
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void

  // Row interaction
  onRowClick?: (row: T) => void

  // Row actions
  actions?: (row: { original: T }) => React.ReactNode

  // Test ID
  dataTestId?: string
}

export function AccountListLayout<T extends Account = Account>(props: Readonly<AccountListLayoutProps<T>>) {
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
    dataTestId = 'account-list-layout'
  } = props
  return (
    <DataTable<T>
      data={data}
      columns={columns}
      loading={loading}
      error={error || undefined}
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
      emptyMessage="No accounts found"
      actions={actions}
      onRowClick={onRowClick}
      data-testid={dataTestId}
    />
  )
}

export default AccountListLayout

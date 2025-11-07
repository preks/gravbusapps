import React, { useEffect } from 'react'
import { DataTable } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'

export interface OpportunityListLayoutProps<T = any> {
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

export function OpportunityListLayout<T = any>(props: Readonly<OpportunityListLayoutProps<T>>) {
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
    dataTestId = 'opportunity-list-layout'
  } = props

  useEffect(() => {
    console.log('[OpportunityListLayout] Data loaded:', {
      dataType: typeof data,
      isArray: Array.isArray(data),
      dataLength: Array.isArray(data) ? data.length : 'N/A',
      dataValue: data,
      totalCount,
      loading,
      error,
      columnsCount: columns?.length,
      firstItem: Array.isArray(data) && data.length > 0 ? data[0] : null,
      dataStructure: Array.isArray(data) && data.length > 0 ? Object.keys(data[0]) : []
    })
  }, [data, totalCount, loading, error, columns])

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
      emptyMessage="No opportunities found"
      actions={actions}
      onRowClick={onRowClick}
      data-testid={dataTestId}
    />
  )
}

export default OpportunityListLayout

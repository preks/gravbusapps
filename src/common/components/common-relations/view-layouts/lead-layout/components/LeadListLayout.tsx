import { useMemo, useCallback } from 'react'
import { DataTable } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import type { Lead } from '@/common/data/relations/types/leadTypes'

export interface LeadListLayoutProps<T extends Lead = Lead> {
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

export function LeadListLayout<T extends Lead = Lead>(props: Readonly<LeadListLayoutProps<T>>) {
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
    dataTestId = 'lead-list-layout'
  } = props

  // Ensure data is always an array
  const safeData = Array.isArray(data) ? data : []

  // Create getRowId function
  const getRowId = useCallback((row: T) => row.id, [])

  // Create a stable key that changes when transitioning from loading to loaded state
  // This forces DataTable to remount and reinitialize the internal table instance
  // when data is first loaded, preventing "Cannot read properties of undefined (reading 'rows')" error
  const tableKey = useMemo(() => {
    // Key changes when: transitioning from loading to loaded, or when columns change
    // This ensures DataTable remounts when it first receives data
    const hasData = safeData.length > 0
    const isLoaded = !loading && hasData
    return `table-${isLoaded ? 'loaded' : 'loading'}-${columns.length}-${hasData ? safeData.length : 0}`
  }, [safeData.length, loading, columns.length])

  // Guard: Don't render DataTable until columns are defined and not empty
  // This prevents the "Cannot read properties of undefined (reading 'rows')" error
  // which occurs when DataTable tries to access table.getRowModel().rows before initialization
  if (!columns || columns.length === 0) {
    return null
  }

  return (
    <DataTable<T>
      key={tableKey}
      data={safeData}
      columns={columns}
      getRowId={getRowId}
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
      emptyMessage="No leads found"
      actions={actions}
      onRowClick={onRowClick}
      data-testid={dataTestId}
    />
  )
}

export default LeadListLayout

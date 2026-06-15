import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@newwork/nw-design-system'
import { useDataTablePaginationLabels } from '@/business-apps/hr/core/apps/shared/utils/dataTablePaginationLabels'

interface TabDataTableProps<TData> {
  readonly data: TData[]
  readonly columns: ColumnDef<TData>[]
  readonly loading: boolean
  readonly error: string | null
  readonly emptyMessage: string
  readonly onRowClick?: (row: TData) => void
}

export function TabDataTable<TData>({
  data,
  columns,
  loading,
  error,
  emptyMessage,
  onRowClick
}: TabDataTableProps<TData>) {
  const paginationLabels = useDataTablePaginationLabels()

  return (
    <div className="gba:p-4">
      <DataTable<TData>
        data={data}
        columns={columns}
        loading={loading}
        error={error}
        enableSorting
        enablePagination
        rowsPerPage={10}
        rowsPerPageOptions={[10, 20, 50, 100]}
        density="compact"
        emptyMessage={emptyMessage}
        onRowClick={onRowClick}
        paginationLabels={paginationLabels}
      />
    </div>
  )
}

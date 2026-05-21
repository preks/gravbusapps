import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@newwork/nw-design-system'

interface TabDataTableProps<TData> {
  readonly data: TData[]
  readonly columns: ColumnDef<TData>[]
  readonly loading: boolean
  readonly error: string | null
  readonly emptyMessage: string
  readonly onRowClick: (row: TData) => void
}

export function TabDataTable<TData>({
  data,
  columns,
  loading,
  error,
  emptyMessage,
  onRowClick
}: TabDataTableProps<TData>) {
  return (
    <div className="gba:p-4">
      <DataTable<TData>
        data={data}
        columns={columns}
        loading={loading}
        error={error}
        enableSorting
        enablePagination
        rowsPerPage={15}
        density="compact"
        emptyMessage={emptyMessage}
        onRowClick={onRowClick}
      />
    </div>
  )
}

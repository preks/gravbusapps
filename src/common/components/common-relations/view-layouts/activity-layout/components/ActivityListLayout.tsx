import { DataTable, Button, Alert } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import type { Activity } from '@/common/data/relations/types/activityTypes'

export interface ActivityListLayoutProps<TActivity extends Activity = Activity> {
  data: TActivity[]
  columns: ColumnDef<TActivity>[]
  loading?: boolean
  error?: string | null
  totalCount?: number
  pagination: {
    pageIndex: number
    pageSize: number
  }
  sorting: Array<{ id: string; desc: boolean }>
  onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void
  onSortingChange: (sorting: Array<{ id: string; desc: boolean }>) => void
  onRowClick?: (activity: TActivity) => void
  actions?: (row: { original: TActivity }) => React.ReactNode
  onRetry?: () => void
  dataTestId?: string
}

export const ActivityListLayout = <TActivity extends Activity = Activity>({
  data,
  columns,
  loading = false,
  error = null,
  totalCount = 0,
  pagination,
  sorting,
  onPaginationChange,
  onSortingChange,
  onRowClick,
  actions,
  onRetry,
  dataTestId = 'activity-list'
}: ActivityListLayoutProps<TActivity>) => {
  // Show error state
  if (error && !loading) {
    return (
      <div data-testid={`${dataTestId}-error`} className="gba:p-4">
        <Alert variant="destructive" className="gba:mb-4">
          <div className="gba:flex gba:flex-col gba:gap-2">
            <h3 className="gba:text-lg gba:font-semibold">Error Loading Activities</h3>
            <p className="gba:text-sm">{error}</p>
            {onRetry && (
              <Button onClick={onRetry} variant="outline" size="sm" className="gba:mt-2 gba:w-fit">
                Retry
              </Button>
            )}
          </div>
        </Alert>
      </div>
    )
  }

  return (
    <div data-testid={dataTestId}>
      <DataTable<TActivity>
        data={data}
        columns={columns}
        loading={loading}
        totalCount={totalCount}
        pagination={pagination}
        sorting={sorting}
        onPaginationChange={onPaginationChange}
        onSortingChange={onSortingChange}
        onRowClick={onRowClick}
        actions={actions}
        enablePagination
        enableSorting
        enableSelection={false}
        enableColumnPinning
        enableResizing={false}
        tableLayout="fixed"
        rowsPerPageOptions={[10, 20, 50, 100]}
        showPageNumbers
        maxVisiblePages={7}
        emptyMessage="No activities found"
        data-testid={dataTestId}
      />
    </div>
  )
}

export default ActivityListLayout

import React, { useMemo } from 'react'
import { DataTable, Avatar, AvatarImage, AvatarFallback, Badge } from '@newwork/nw-design-system'
import type { ColumnDef, CellContext } from '@tanstack/react-table'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { Investment } from '@/common/data/investment/types/investmentTypes.new'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { Building2, Calendar } from 'lucide-react'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { formatDate } from '@/common/data/investment/utils/formatters'

// Helper function to format group names for display
const formatGroupName = (groupName: string): string => {
  if (groupName === 'RealEstate') {
    return 'Real Estate'
  }
  if (groupName === 'LiquidFund' || groupName === 'LiquidFunds') {
    return 'Liquid Fund'
  }
  return groupName.replaceAll(/([A-Z])/g, ' $1').trim()
}

// Helper function to get owner display name
const getOwnerName = (investment: Investment): string => {
  if (investment.ownerEmployee?.displayName) {
    return investment.ownerEmployee.displayName
  }
  if (investment.ownerEmployee?.firstName || investment.ownerEmployee?.lastName) {
    return `${investment.ownerEmployee.firstName || ''} ${investment.ownerEmployee.lastName || ''}`.trim()
  }
  return '-'
}

// Helper to get initials from owner name
const getOwnerInitials = (ownerName: string): string => {
  if (ownerName === '-') return 'O'
  const initials = ownerName
    .split(' ')
    .map(n => n[0] || '')
    .join('')
    .toUpperCase()
  return initials || 'O'
}

// Currency helper to render amounts
const renderAmount = (amount: number | undefined, currencyCode?: string) => {
  if (typeof amount !== 'number') {
    return <div className="gba:text-right gba:text-sm gba:text-muted-foreground">-</div>
  }

  const formattedValue = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode || 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)

  return <div className="gba:text-right gba:text-sm gba:font-mono gba:truncate">{formattedValue}</div>
}

// Cell renderer: Name cell
const NameCell = ({ row }: CellContext<Investment, unknown>) => (
  <div className="gba:flex gba:items-center gba:gap-2">
    <Building2 className="gba:w-4 gba:h-4 gba:text-gray-500" />
    <span className="gba:font-medium">{row.original.name}</span>
  </div>
)

// Cell renderer: Investment Group cell
const InvestmentGroupCell = ({ row }: CellContext<Investment, unknown>) => {
  const groupValue = row.original.investmentGroup?.value || 'Unknown'
  return (
    <span className="gba:text-sm gba:truncate gba:block" title={formatGroupName(groupValue)}>
      {formatGroupName(groupValue)}
    </span>
  )
}

// Cell renderer: Investment Type cell
const InvestmentTypeCell = ({ row }: CellContext<Investment, unknown>) => {
  const typeValue = row.original.investmentType?.value || 'Unknown'
  return (
    <span className="gba:text-sm gba:truncate gba:block" title={typeValue}>
      {typeValue}
    </span>
  )
}

// Cell renderer: Total Investment Amount cell
const TotalInvestmentAmountCell = ({ row }: CellContext<Investment, unknown>) =>
  renderAmount(row.original.totalInvestmentAmount, row.original.currency?.code)

// Cell renderer: Owner Employee cell
const OwnerEmployeeCell = ({ row }: CellContext<Investment, unknown>) => {
  if (!row.original.ownerEmployee) {
    return <span className="gba:text-sm gba:text-muted-foreground">No owner</span>
  }

  const ownerName = getOwnerName(row.original)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    const empId = row.original.ownerEmployee?.id
    if (empId) {
      navigateTo(`/platform/employee-record?employeeId=${empId}`)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="gba:flex gba:items-center gba:gap-3 gba:cursor-pointer gba:group gba:bg-transparent gba:border-0 gba:p-0 gba:w-full gba:text-left"
      data-testid={`owner-link-${row.original.id}`}
    >
      <Avatar className="gba:w-8 gba:h-8 gba:outline gba:outline-2 gba:outline-offset-2 gba:outline-transparent gba:group-hover:[outline-color:var(--nw-color-primary-500)] gba:transition-all">
        {row.original.ownerEmployee.pictureThumbnail && (
          <AvatarImage src={`data:image/gif;base64,${row.original.ownerEmployee.pictureThumbnail}`} alt={ownerName} />
        )}
        <AvatarFallback>{getOwnerInitials(ownerName)}</AvatarFallback>
      </Avatar>
      <div className="gba:min-w-0 gba:flex-1">
        <div className="gba:font-medium gba:truncate gba:text-sm gba:group-hover:gba:text-primary gba:transition-colors">
          {ownerName}
        </div>
      </div>
    </button>
  )
}

// Cell renderer: Investment Status cell
const InvestmentStatusCell = ({ row }: CellContext<Investment, unknown>) => (
  <Badge variant={row.original.investmentStatus?.code === 'ACTIVE' ? 'default' : 'secondary'}>
    {row.original.investmentStatus?.value || 'Unknown'}
  </Badge>
)

// Cell renderer: Created At cell
const CreatedAtCell = ({ row }: CellContext<Investment, unknown>) => {
  if (!row.original.createdAt) {
    return <span className="gba:text-sm gba:text-muted-foreground">No date</span>
  }
  return (
    <div className="gba:flex gba:items-center gba:gap-2 gba:truncate">
      <Calendar className="gba:h-4 gba:w-4 gba:text-gray-400 gba:shrink-0" />
      <span className="gba:text-sm gba:truncate">{formatDate(row.original.createdAt)}</span>
    </div>
  )
}

export interface AllInvestmentsListProps extends BusinessAppContextProps {
  // Data
  data: Investment[]
  loading?: boolean
  error?: string | null
  totalCount: number
  // Sorting
  sorting?: Array<{ id: string; desc: boolean }>
  onSortingChange?: (sorting: Array<{ id: string; desc: boolean }>) => void
  // Pagination
  pagination?: { pageIndex: number; pageSize: number }
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void
  // Column visibility
  visibleColumns?: string[]
}

// Row actions component - extracted outside
const createRowActions =
  (accessToken: string) =>
  (row: { original: Investment }): React.ReactNode => (
    <AppAction
      variant="table-row"
      contexts={[
        {
          context: FlowContextName.investmentEntity,
          contextData: { investmentId: row.original.id }
        }
      ]}
      prefixDataTestId="all-investment-update"
      accessToken={accessToken}
      emptyState="enable"
      lazyLoad
      onClick={e => e.stopPropagation()}
      data-testid={`all-investment-update-button-${row.original.id}`}
    />
  )

// Column definitions - extracted outside component
const createColumns = (): ColumnDef<Investment>[] => [
  {
    id: 'name',
    header: 'Investment',
    accessorKey: 'name',
    size: 250,
    minSize: 200,
    maxSize: 350,
    enableResizing: false,
    cell: NameCell
  },
  {
    id: 'investmentGroup',
    header: 'Group',
    accessorKey: 'investmentGroup.value',
    cell: InvestmentGroupCell
  },
  {
    id: 'investmentType',
    header: 'Type',
    accessorKey: 'investmentType.value',
    cell: InvestmentTypeCell
  },
  {
    id: 'totalInvestmentAmount',
    header: 'Total Investment',
    accessorKey: 'totalInvestmentAmount',
    cell: TotalInvestmentAmountCell,
    meta: {
      align: 'right'
    }
  },
  {
    id: 'ownerEmployee',
    header: 'Owner',
    accessorKey: 'ownerEmployee.displayName',
    size: 200,
    minSize: 180,
    maxSize: 280,
    enableResizing: false,
    cell: OwnerEmployeeCell
  },
  {
    id: 'investmentStatus',
    header: 'Status',
    accessorKey: 'investmentStatus.value',
    cell: InvestmentStatusCell
  },
  {
    id: 'createdAt',
    header: 'Created',
    accessorKey: 'createdAt',
    size: 150,
    minSize: 130,
    maxSize: 180,
    enableResizing: false,
    meta: {
      type: 'date' as const
    },
    cell: CreatedAtCell
  }
]

const AllInvestmentsList: React.FC<AllInvestmentsListProps> = ({
  accessToken,
  data: investments,
  loading = false,
  error = null,
  totalCount,
  sorting,
  onSortingChange,
  pagination,
  onPaginationChange,
  visibleColumns = [
    'name',
    'investmentGroup',
    'investmentType',
    'totalInvestmentAmount',
    'ownerEmployee',
    'investmentStatus',
    'createdAt'
  ]
}) => {
  const handleRowClick = (investment: Investment) => {
    if (!investment.id) return
    const detailsUrl = buildPlatformUrl('/platform/irm/investment-record', {
      investmentId: investment.id,
      fromView: 'investments',
      fromSubView: 'overview'
    })
    navigateTo(detailsUrl)
  }

  // Row actions - memoized
  const rowActions = useMemo(() => createRowActions(accessToken || ''), [accessToken])

  // Columns - memoized
  const columns = useMemo(() => createColumns(), [])

  // Filter columns based on visibleColumns
  const filteredColumns = useMemo(
    () => columns.filter(col => col.id && visibleColumns.includes(col.id)),
    [columns, visibleColumns]
  )

  return (
    <DataTable<Investment>
      data={investments}
      columns={filteredColumns}
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
      emptyMessage="No investments found"
      onRowClick={handleRowClick}
      actions={rowActions}
      data-testid="all-investments-list"
    />
  )
}

export default AllInvestmentsList

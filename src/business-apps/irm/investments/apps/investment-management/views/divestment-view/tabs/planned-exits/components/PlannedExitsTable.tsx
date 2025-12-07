import React, { useMemo } from 'react'
import { DataTable, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
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

// Helper function to get performance color class
const getPerformanceColorClass = (value: number, type: 'amount' | 'percentage'): string => {
  if (value === 0) {
    return type === 'amount' ? 'gba:text-gray-500' : 'gba:text-gray-400'
  }
  if (value > 0) {
    return type === 'amount' ? 'gba:text-green-600' : 'gba:text-green-500'
  }
  return type === 'amount' ? 'gba:text-red-600' : 'gba:text-red-500'
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

// Helper to get performance sign
const getPerformanceSign = (isZero: boolean, isPositive: boolean): string => {
  if (isZero) return ''
  if (isPositive) return '+'
  return '-'
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

// Cell renderer: Amount cell
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

// Cell renderer: Total Investment Amount cell
const TotalInvestmentAmountCell = ({ row }: CellContext<Investment, unknown>) =>
  renderAmount(row.original.totalInvestmentAmount, row.original.currency?.code)

// Cell renderer: Market Value cell
const MarketValueCell = ({ row }: CellContext<Investment, unknown>) =>
  renderAmount(row.original.investmentMarketValue, row.original.currency?.code)

// Cell renderer: Performance cell
const PerformanceCell = ({ row }: CellContext<Investment, unknown>) => {
  const currentValue = row.original.investmentMarketValue || 0
  const totalValue = row.original.totalInvestmentAmount || 0
  const performanceAmount = currentValue - totalValue
  const performancePercentage = totalValue > 0 ? (performanceAmount / totalValue) * 100 : 0
  const isZero = performancePercentage === 0
  const isPositive = performancePercentage > 0

  const formattedValue = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: row.original.currency?.code || 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.abs(performanceAmount))

  const sign = getPerformanceSign(isZero, isPositive)

  return (
    <div className="gba:flex gba:flex-col gba:items-end">
      <div
        className={`gba:text-right gba:text-sm gba:font-mono gba:truncate ${getPerformanceColorClass(performancePercentage, 'amount')}`}
      >
        {formattedValue}
      </div>
      <span className={`${getPerformanceColorClass(performancePercentage, 'percentage')} gba:text-sm`}>
        ({sign}
        {Math.abs(performancePercentage).toFixed(2)}%)
      </span>
    </div>
  )
}

// Cell renderer: Planned Exit Date cell
const PlannedExitDateCell = ({ row }: CellContext<Investment, unknown>) => {
  if (!row.original.plannedExitDate) {
    return <span className="gba:text-gray-400">N/A</span>
  }
  return (
    <div className="gba:flex gba:items-center gba:gap-2">
      <Calendar className="gba:w-4 gba:h-4 gba:text-gray-500" />
      <span>{formatDate(row.original.plannedExitDate)}</span>
    </div>
  )
}

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

// Cell renderer: Created At cell
const CreatedAtCell = ({ row }: CellContext<Investment, unknown>) => <span>{formatDate(row.original.createdAt)}</span>

export interface PlannedExitsTableProps extends BusinessAppContextProps {
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
          contextData: { investmentId: row.original.id, dealType: 'DIVESTMENT_DEAL' }
        }
      ]}
      prefixDataTestId="planned-exit-investment-update"
      accessToken={accessToken}
      emptyState="enable"
      lazyLoad
      onClick={e => e.stopPropagation()}
      data-testid={`planned-exit-investment-update-button-${row.original.id}`}
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
    id: 'investmentMarketValue',
    header: 'Market Value',
    accessorKey: 'investmentMarketValue',
    cell: MarketValueCell,
    meta: {
      align: 'right'
    }
  },
  {
    id: 'performance',
    header: 'Performance',
    enableSorting: false,
    cell: PerformanceCell,
    meta: {
      align: 'right'
    }
  },
  {
    id: 'plannedExitDate',
    header: 'Planned Exit Date',
    accessorKey: 'plannedExitDate',
    size: 200,
    minSize: 180,
    maxSize: 250,
    enableResizing: false,
    cell: PlannedExitDateCell
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
    id: 'createdAt',
    header: 'Created',
    accessorKey: 'createdAt',
    cell: CreatedAtCell
  }
]

const PlannedExitsTable: React.FC<PlannedExitsTableProps> = ({
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
    'investmentMarketValue',
    'plannedExitDate',
    'ownerEmployee',
    'createdAt'
  ]
}) => {
  const handleRowClick = (investment: Investment) => {
    if (!investment.id) return
    const detailsUrl = buildPlatformUrl('/platform/irm/investment-record', {
      investmentId: investment.id,
      fromView: 'divestments',
      fromSubView: 'planned-exits'
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
      emptyMessage="No planned exits found"
      onRowClick={handleRowClick}
      actions={rowActions}
      data-testid="planned-exits-table"
    />
  )
}

export default PlannedExitsTable

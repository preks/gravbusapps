import React, { useCallback, useMemo } from 'react'
import { DataTable, Avatar, AvatarFallback, AvatarImage } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import { User } from 'lucide-react'
import { formatCurrency } from '@/common/utils/numberFormatter'
import { OwnerDisplay } from '@/business-apps/irm/core/apps/investment-relations/views/task-view/components/OwnerDisplay'
import { SalesTeamMember } from './types'

const DATA_TEST_ID_PREFIX = 'SalesTeamMembersList'

// Cell Component: Member Name (uses OwnerDisplay hover styles, but keeps performance view redirect)
interface MemberNameCellProps {
  member: SalesTeamMember
}

const MemberNameCell: React.FC<MemberNameCellProps> = ({ member }) => (
  <div
    className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer hover:gba:bg-transparent focus:gba:bg-transparent gba:group"
    data-testid={`${DATA_TEST_ID_PREFIX}-member-name-${member.id}`}
  >
    <Avatar
      size="sm"
      className="gba:outline gba:outline-2 gba:outline-offset-2 gba:outline-transparent gba:group-hover:[outline-color:var(--nw-color-primary-500)] gba:rounded-full"
    >
      {member.avatar && <AvatarImage src={`data:image/jpeg;base64,${member.avatar}`} alt={member.name} />}
      <AvatarFallback>
        <User className="gba:h-4 gba:w-4" />
      </AvatarFallback>
    </Avatar>
    <span className="gba:text-[color:var(--nw-color-text-primary)] group-hover:gba:text-[color:var(--nw-color-primary-500)]">
      {member.name}
    </span>
  </div>
)

// Cell Component: Manager
interface ManagerCellProps {
  memberId: string
  manager?: { id?: string; name: string; avatar?: string | null } | null
}

const ManagerCell: React.FC<ManagerCellProps> = ({ memberId, manager }) => {
  if (!manager?.id) {
    return <span className="gba:text-sm gba:text-muted-foreground">No Manager</span>
  }

  // Transform manager data to match OwnerDisplay's expected format
  const ownerEmployee = {
    id: manager.id,
    displayName: manager.name,
    pictureThumbnail: manager.avatar || undefined
  }

  return (
    <OwnerDisplay ownerEmployee={ownerEmployee} entityId={memberId} testIdPrefix={`${DATA_TEST_ID_PREFIX}-manager`} />
  )
}

// Cell Component: Revenue
interface RevenueCellProps {
  memberId: string
  revenue: number
  currencyId?: string
}

const RevenueCell: React.FC<RevenueCellProps> = ({ memberId, revenue, currencyId }) => {
  const formattedValue = formatCurrency(revenue, currencyId || 'EUR')
  return (
    <div
      className="gba:text-right gba:text-sm gba:font-mono gba:truncate gba:text-green-600 gba:font-medium"
      data-testid={`${DATA_TEST_ID_PREFIX}-revenue-cell-${memberId}`}
    >
      {formattedValue}
    </div>
  )
}

// Cell Component: Position
interface PositionCellProps {
  position: string
}

const PositionCell: React.FC<PositionCellProps> = ({ position }) => (
  <div className="gba:text-sm gba:truncate" title={position}>
    {position}
  </div>
)

export interface SalesMembersListProps {
  members?: SalesTeamMember[]
  loading?: boolean
  error?: Error | null
  onRetry?: () => void
  onMemberClick?: (member: SalesTeamMember) => void
  selectedMemberId?: string
  accessToken: string
  search?: string
  total?: number
  currentPage?: number
  pageSize?: number
  sorting?: Array<{ id: string; desc: boolean }>
  onSearchChange?: (value: string) => void
  onPaginationChange?: (page: number, newPageSize?: number) => void
  onSortingChange?: (sorting: Array<{ id: string; desc: boolean }>) => void
}

// Helper function to get activity score badge variant based on performance
/**
 * Table component for displaying sales team members with their performance metrics
 */
export const SalesTeamMembersList: React.FC<SalesMembersListProps> = props => {
  const {
    members: propsMembers,
    loading: propsLoading = false,
    error: propsError = null,
    onMemberClick,
    accessToken,
    total = 0,
    currentPage = 1,
    pageSize = 20,
    sorting = [],
    onPaginationChange,
    onSortingChange
  } = props

  const rawMembers = propsMembers || []

  // Memoized cell renderers
  const renderMemberNameCell = useCallback((row: SalesTeamMember) => <MemberNameCell member={row} />, [])
  const renderPositionCell = useCallback((row: SalesTeamMember) => <PositionCell position={row.position} />, [])
  const renderManagerCell = useCallback(
    (row: SalesTeamMember) => <ManagerCell memberId={row.id} manager={row.manager} />,
    []
  )
  const renderRevenueCell = useCallback(
    (row: SalesTeamMember) => <RevenueCell memberId={row.id} revenue={row.totalRevenue} currencyId={row.currencyId} />,
    []
  )

  // Define columns using TanStack Table's ColumnDef
  const columns = useMemo<ColumnDef<SalesTeamMember>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Name',
        size: 250,
        minSize: 200,
        maxSize: 350,
        enableResizing: false,
        cell: ({ row }) => renderMemberNameCell(row.original)
      },
      {
        id: 'position',
        accessorKey: 'position',
        header: 'Position',
        size: 180,
        minSize: 150,
        maxSize: 250,
        enableResizing: false,
        cell: ({ row }) => renderPositionCell(row.original)
      },
      {
        id: 'manager',
        accessorFn: row => row.manager?.name || '',
        header: 'Manager',
        size: 200,
        minSize: 180,
        maxSize: 280,
        enableResizing: false,
        cell: ({ row }) => renderManagerCell(row.original)
      },
      {
        id: 'totalRevenue',
        accessorKey: 'totalRevenue',
        header: 'Total Sales',
        size: 150,
        minSize: 130,
        maxSize: 200,
        enableResizing: false,
        meta: {
          type: 'currency' as const,
          align: 'right' as const
        },
        cell: ({ row }) => renderRevenueCell(row.original)
      }
    ],
    [accessToken, onMemberClick, renderMemberNameCell, renderPositionCell, renderManagerCell, renderRevenueCell]
  )

  return (
    <div data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      <DataTable<SalesTeamMember>
        data={rawMembers}
        columns={columns}
        loading={propsLoading}
        error={propsError?.message}
        totalCount={total}
        pagination={{ pageIndex: currentPage - 1, pageSize }}
        onPaginationChange={newPagination => {
          onPaginationChange?.(newPagination.pageIndex + 1, newPagination.pageSize)
        }}
        sorting={sorting}
        onSortingChange={onSortingChange}
        enablePagination
        enableSorting
        enableSelection={false}
        enableColumnPinning
        enableResizing={false}
        tableLayout="fixed"
        rowsPerPageOptions={[10, 20, 50, 100]}
        showPageNumbers
        maxVisiblePages={7}
        emptyMessage="No team members found"
        onRowClick={member => onMemberClick?.(member)}
        data-testid={DATA_TEST_ID_PREFIX}
      />
    </div>
  )
}

export default SalesTeamMembersList

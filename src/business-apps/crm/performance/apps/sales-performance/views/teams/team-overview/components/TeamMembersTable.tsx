import React, { useMemo } from 'react'
import { DataTable, DataDisplay, Avatar, AvatarFallback, AvatarImage } from '@newwork/nw-design-system'
import type { CellContext, ColumnDef, SortingState } from '@tanstack/react-table'
import type { ColumnConfig, SortableColumn } from '@newwork/nw-design-system'
import { UserIcon } from '@phosphor-icons/react'
import { formatCurrency } from '@/common/utils/numberFormatter'
import { SalesTeamMember } from '../../../../types/teamMemberTypes'

const DATA_TEST_ID_PREFIX = 'TeamPerformanceView-members'

const availableColumns: ColumnConfig[] = [
  { id: 'name', label: 'Name', visible: true, sortable: true },
  { id: 'position', label: 'Position', visible: true, sortable: true },
  { id: 'totalRevenue', label: 'Total Sales', visible: true, sortable: true }
]

const sortableColumns: SortableColumn[] = [
  { id: 'name', label: 'Name' },
  { id: 'position', label: 'Position' },
  { id: 'totalRevenue', label: 'Total Sales' }
]

interface MemberNameCellProps {
  member: SalesTeamMember
}

const MemberNameCell: React.FC<MemberNameCellProps> = ({ member }) => (
  <div className="gba:flex gba:items-center gba:gap-2" data-testid={`${DATA_TEST_ID_PREFIX}-name-${member.id}`}>
    <Avatar size="sm" className="gba:rounded-full">
      {member.avatar && <AvatarImage src={`data:image/jpeg;base64,${member.avatar}`} alt={member.name} />}
      <AvatarFallback>
        <UserIcon className="gba:h-4 gba:w-4" />
      </AvatarFallback>
    </Avatar>
    <span className="gba:text-[color:var(--nw-color-text-primary)]">{member.name}</span>
  </div>
)

interface RevenueCellProps {
  memberId: string
  revenue: number
  currencyCode: string
}

const RevenueCell: React.FC<RevenueCellProps> = ({ memberId, revenue, currencyCode }) => (
  <div
    className="gba:text-right gba:text-sm gba:font-mono gba:truncate gba:text-green-600 gba:font-medium"
    data-testid={`${DATA_TEST_ID_PREFIX}-revenue-${memberId}`}
  >
    {formatCurrency(revenue, currencyCode)}
  </div>
)

const PositionCell: React.FC<{ position: string }> = ({ position }) => (
  <div className="gba:text-sm gba:truncate" title={position}>
    {position}
  </div>
)

const renderMemberNameCell = ({ row }: CellContext<SalesTeamMember, unknown>) => (
  <MemberNameCell member={row.original} />
)

const renderPositionCell = ({ row }: CellContext<SalesTeamMember, unknown>) => (
  <PositionCell position={row.original.position} />
)

const createRevenueCellRenderer = (currencyCode: string) => {
  const renderRevenueCell = ({ row }: CellContext<SalesTeamMember, unknown>) => (
    <RevenueCell memberId={row.original.id} revenue={row.original.totalRevenue} currencyCode={currencyCode} />
  )
  return renderRevenueCell
}

export interface TeamMembersTableProps {
  members: SalesTeamMember[]
  totalCount: number
  isLoading: boolean
  error: string | null
  search: string
  onSearchChange: (value: string) => void
  sorting: SortingState
  onSortingChange: (sorting: SortingState) => void
  visibleColumns: string[]
  onVisibleColumnsChange: (columns: string[]) => void
  currentPage: number
  pageSize: number
  onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void
  selectedCurrency: string
  currencyFilter: React.ReactNode
}

export const TeamMembersTable: React.FC<TeamMembersTableProps> = ({
  members,
  totalCount,
  isLoading,
  error,
  search,
  onSearchChange,
  sorting,
  onSortingChange,
  visibleColumns,
  onVisibleColumnsChange,
  currentPage,
  pageSize,
  onPaginationChange,
  selectedCurrency,
  currencyFilter
}) => {
  const columns = useMemo<ColumnDef<SalesTeamMember>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Name',
        size: 220,
        minSize: 180,
        maxSize: 300,
        enableResizing: false,
        cell: renderMemberNameCell
      },
      {
        id: 'position',
        accessorKey: 'position',
        header: 'Position',
        size: 180,
        minSize: 150,
        maxSize: 250,
        enableResizing: false,
        cell: renderPositionCell
      },
      {
        id: 'totalRevenue',
        accessorKey: 'totalRevenue',
        header: 'Total Sales',
        size: 140,
        minSize: 120,
        maxSize: 180,
        enableResizing: false,
        meta: {
          type: 'currency' as const,
          align: 'right' as const
        },
        cell: createRevenueCellRenderer(selectedCurrency)
      }
    ],
    [selectedCurrency]
  )

  return (
    <DataDisplay
      titleSections={[
        {
          id: 'all',
          label: 'Team Members',
          metadata: {
            count: totalCount,
            isLoading
          }
        }
      ]}
      currentSection="all"
      searchValue={search}
      searchPlaceholder="Search team members by name or position..."
      onSearchChange={onSearchChange}
      sorting={sorting}
      sortableColumns={sortableColumns}
      onSortingChange={onSortingChange}
      availableColumns={availableColumns}
      visibleColumns={visibleColumns}
      onVisibleColumnsChange={onVisibleColumnsChange}
      toolbarDensity="default"
      secondaryActions={currencyFilter}
      data-testid={`${DATA_TEST_ID_PREFIX}-display`}
    >
      <DataTable<SalesTeamMember>
        data={members}
        columns={columns.filter(col => visibleColumns.includes(col.id as string))}
        loading={isLoading}
        error={error || undefined}
        totalCount={totalCount}
        pagination={{ pageIndex: currentPage - 1, pageSize }}
        onPaginationChange={onPaginationChange}
        sorting={sorting}
        onSortingChange={onSortingChange}
        manualSorting
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
        data-testid={`${DATA_TEST_ID_PREFIX}-table`}
      />
    </DataDisplay>
  )
}

export default TeamMembersTable

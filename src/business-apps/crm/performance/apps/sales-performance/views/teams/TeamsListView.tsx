import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  DataTable,
  DataDisplay,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import type { CellContext, ColumnDef, SortingState } from '@tanstack/react-table'
import type { ColumnConfig, SortableColumn } from '@newwork/nw-design-system'
import { ArrowClockwiseIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatCurrency } from '@/common/utils/numberFormatter'
import { useTeamsListData, type TeamsListSortColumn } from '../../hooks/useTeamsListData'
import { type CurrencyOption } from '../../hooks'
import type { TeamListItem } from '../../types/teamTypes'

interface TeamsListViewProps extends BusinessAppContextProps {
  currencies: CurrencyOption[]
  currenciesLoading: boolean
  onTeamSelect: (teamId: string) => void
}

const DATA_TEST_ID_PREFIX = 'sales-performance-teams-list'
const DEFAULT_CURRENCY = 'EUR'
const DEFAULT_PAGE_SIZE = 20

const availableColumns: ColumnConfig[] = [
  { id: 'name', label: 'Name', visible: true, sortable: true },
  { id: 'memberCount', label: 'Members', visible: true, sortable: true },
  // Total Sales is a derived value the DB cannot order by, so it is display-only.
  { id: 'totalSales', label: 'Total Sales', visible: true, sortable: false }
]

const sortableColumns: SortableColumn[] = [
  { id: 'name', label: 'Name' },
  { id: 'memberCount', label: 'Members' }
]

interface CurrencyFilterProps {
  selectedCurrency: string
  currencies: Array<{ code: string; label: string; id: string }>
  onCurrencyChange: (currencyCode: string) => void
  isLoading?: boolean
}

const CurrencyFilter: React.FC<CurrencyFilterProps> = ({
  selectedCurrency,
  currencies,
  onCurrencyChange,
  isLoading = false
}) => {
  if (currencies.length === 0 && !isLoading) return null

  return (
    <div className="gba:flex gba:items-center gba:gap-2">
      <Label className="gba:text-sm gba:font-medium gba:whitespace-nowrap">Currency:</Label>
      <Select value={selectedCurrency} onValueChange={onCurrencyChange} disabled={isLoading}>
        <SelectTrigger className="gba:w-32" data-testid={`${DATA_TEST_ID_PREFIX}-currency-selector`}>
          <SelectValue placeholder="Select currency">{selectedCurrency}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {currencies.map(currency => (
            <SelectItem key={currency.code} value={currency.code}>
              {currency.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

interface TeamNameCellProps {
  team: TeamListItem
}

const TeamNameCell: React.FC<TeamNameCellProps> = ({ team }) => (
  <span
    className="gba:font-medium gba:text-[color:var(--nw-color-text-primary)]"
    data-testid={`${DATA_TEST_ID_PREFIX}-name-${team.id}`}
  >
    {team.name}
  </span>
)

interface TotalSalesCellProps {
  team: TeamListItem
}

const TotalSalesCell: React.FC<TotalSalesCellProps> = ({ team }) => (
  <div
    className="gba:text-right gba:text-sm gba:font-mono gba:font-medium gba:text-green-600"
    data-testid={`${DATA_TEST_ID_PREFIX}-sales-${team.id}`}
  >
    {formatCurrency(team.totalSales, team.currencyCode)}
  </div>
)

const renderTeamNameCell = ({ row }: CellContext<TeamListItem, unknown>) => <TeamNameCell team={row.original} />

const renderMemberCountCell = ({ row }: CellContext<TeamListItem, unknown>) => (
  <div className="gba:text-right gba:text-sm" data-testid={`${DATA_TEST_ID_PREFIX}-members-${row.original.id}`}>
    {row.original.memberCount}
  </div>
)

const renderTotalSalesCell = ({ row }: CellContext<TeamListItem, unknown>) => <TotalSalesCell team={row.original} />

export const TeamsListView: React.FC<TeamsListViewProps> = ({
  accessToken,
  currencies,
  currenciesLoading,
  onTeamSelect
}) => {
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string>(DEFAULT_CURRENCY)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'memberCount', desc: true }])
  const [search, setSearch] = useState('')
  const [visibleColumns, setVisibleColumns] = useState<string[]>(availableColumns.filter(c => c.visible).map(c => c.id))
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE })

  // The design system DataDisplay/DataToolbar already debounces search (300ms) before
  // firing onSearchChange, so we use the search value directly (no extra debounce).
  const sort = sorting[0]
  const sortColumn: TeamsListSortColumn = (sort?.id as TeamsListSortColumn) ?? 'memberCount'
  const sortDesc = sort?.desc ?? true

  const { teams, totalCount, isLoading, error, refetch } = useTeamsListData({
    accessToken,
    currencyCode: selectedCurrencyCode,
    limit: pagination.pageSize,
    offset: pagination.pageIndex * pagination.pageSize,
    search,
    sortColumn,
    sortDesc
  })

  useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [selectedCurrencyCode, search])

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handleSortingChange = useCallback((newSorting: SortingState) => {
    setSorting(newSorting)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handlePaginationChange = useCallback((newPagination: { pageIndex: number; pageSize: number }) => {
    setPagination(newPagination)
  }, [])

  const handleCurrencyChange = useCallback((currencyCode: string) => {
    setSelectedCurrencyCode(currencyCode)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const columns = useMemo<ColumnDef<TeamListItem>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Name',
        size: 280,
        minSize: 200,
        maxSize: 400,
        enableResizing: false,
        cell: renderTeamNameCell
      },
      {
        id: 'memberCount',
        accessorKey: 'memberCount',
        header: 'Members',
        size: 120,
        minSize: 100,
        maxSize: 160,
        enableResizing: false,
        meta: {
          align: 'right' as const
        },
        cell: renderMemberCountCell
      },
      {
        id: 'totalSales',
        accessorKey: 'totalSales',
        header: 'Total Sales',
        size: 160,
        minSize: 140,
        maxSize: 200,
        enableResizing: false,
        enableSorting: false,
        meta: {
          type: 'currency' as const,
          align: 'right' as const
        },
        cell: renderTotalSalesCell
      }
    ],
    []
  )

  const handleRowClick = useCallback(
    (team: TeamListItem) => {
      onTeamSelect(team.id)
    },
    [onTeamSelect]
  )

  if (error && teams.length === 0 && !isLoading) {
    return (
      <Alert
        variant="destructive"
        title="Error loading teams"
        description={error}
        data-testid={`${DATA_TEST_ID_PREFIX}-error`}
        action={
          <Button variant="outline" size="sm" onClick={refetch} data-testid={`${DATA_TEST_ID_PREFIX}-retry-button`}>
            <ArrowClockwiseIcon className="gba:mr-2 gba:h-4 gba:w-4" />
            Retry
          </Button>
        }
      />
    )
  }

  return (
    <div className="gba:space-y-4" data-testid={DATA_TEST_ID_PREFIX}>
      <DataDisplay
        titleSections={[
          {
            id: 'all',
            label: 'Teams',
            metadata: {
              count: totalCount,
              isLoading
            }
          }
        ]}
        currentSection="all"
        searchValue={search}
        searchPlaceholder="Search teams by name..."
        onSearchChange={handleSearchChange}
        sorting={sorting}
        sortableColumns={sortableColumns}
        onSortingChange={handleSortingChange}
        availableColumns={availableColumns}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        toolbarDensity="default"
        secondaryActions={
          <CurrencyFilter
            selectedCurrency={selectedCurrencyCode}
            currencies={currencies}
            onCurrencyChange={handleCurrencyChange}
            isLoading={currenciesLoading}
          />
        }
        data-testid={`${DATA_TEST_ID_PREFIX}-display`}
      >
        <DataTable<TeamListItem>
          data={teams}
          columns={columns.filter(col => visibleColumns.includes(col.id as string))}
          loading={isLoading}
          error={error || undefined}
          totalCount={totalCount}
          pagination={pagination}
          onPaginationChange={handlePaginationChange}
          sorting={sorting}
          onSortingChange={handleSortingChange}
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
          emptyMessage="No teams found"
          onRowClick={handleRowClick}
          data-testid={`${DATA_TEST_ID_PREFIX}-table`}
        />
      </DataDisplay>
    </div>
  )
}

export default TeamsListView

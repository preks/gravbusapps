import React, { useState, useCallback, useMemo } from 'react'
import {
  DataTable,
  DataDisplay,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label
} from '@newwork/nw-design-system'
import type { CellContext, ColumnDef, SortingState } from '@tanstack/react-table'
import type { FilterConfiguration, ColumnConfig, SortableColumn } from '@newwork/nw-design-system'
import { UserIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatCurrency } from '@/common/utils/numberFormatter'
import { OwnerDisplay } from '@/business-apps/irm/core/apps/investment-relations/views/task-view/components/OwnerDisplay'
import { useEmployeesList, type EmployeeListItem } from '../../hooks/useEmployeesList'
import { type CurrencyOption } from '../../hooks'

const DATA_TEST_ID_PREFIX = 'sales-performance-employees-list'
const DEFAULT_CURRENCY = 'EUR'

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

interface EmployeesListViewProps extends BusinessAppContextProps {
  currencies: CurrencyOption[]
  currenciesLoading: boolean
  onEmployeeSelect: (employeeId: string) => void
}

const EmployeeNameCell: React.FC<{ employee: EmployeeListItem }> = ({ employee }) => (
  <div
    className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer gba:group"
    data-testid={`${DATA_TEST_ID_PREFIX}-employee-name-${employee.id}`}
  >
    <Avatar
      size="sm"
      className="gba:outline gba:outline-2 gba:outline-offset-2 gba:outline-transparent gba:group-hover:[outline-color:var(--nw-color-primary-500)] gba:rounded-full"
    >
      {employee.avatar && <AvatarImage src={`data:image/jpeg;base64,${employee.avatar}`} alt={employee.name} />}
      <AvatarFallback>
        <UserIcon className="gba:h-4 gba:w-4" />
      </AvatarFallback>
    </Avatar>
    <span className="gba:text-[color:var(--nw-color-text-primary)] group-hover:gba:text-[color:var(--nw-color-primary-500)]">
      {employee.name}
    </span>
  </div>
)

const PositionCell: React.FC<{ position: string }> = ({ position }) => (
  <div className="gba:text-sm gba:truncate" title={position}>
    {position}
  </div>
)

const DepartmentCell: React.FC<{ department: string }> = ({ department }) => (
  <div className="gba:text-sm gba:truncate" title={department}>
    {department}
  </div>
)

const ManagerCell: React.FC<{
  employeeId: string
  manager?: { id?: string; name: string; avatar?: string | null } | null
}> = ({ employeeId, manager }) => {
  if (!manager?.id) {
    return <span className="gba:text-sm gba:text-muted-foreground">No Manager</span>
  }

  const ownerEmployee = {
    id: manager.id,
    displayName: manager.name,
    pictureThumbnail: manager.avatar || undefined
  }

  return (
    <OwnerDisplay ownerEmployee={ownerEmployee} entityId={employeeId} testIdPrefix={`${DATA_TEST_ID_PREFIX}-manager`} />
  )
}

const RevenueCell: React.FC<{ employeeId: string; revenue: number; currencyCode: string }> = ({
  employeeId,
  revenue,
  currencyCode
}) => {
  const formattedValue = formatCurrency(revenue, currencyCode)
  return (
    <div
      className="gba:text-right gba:text-sm gba:font-mono gba:truncate gba:text-green-600 gba:font-medium"
      data-testid={`${DATA_TEST_ID_PREFIX}-revenue-cell-${employeeId}`}
    >
      {formattedValue}
    </div>
  )
}

const renderEmployeeNameCell = ({ row }: CellContext<EmployeeListItem, unknown>) => (
  <EmployeeNameCell employee={row.original} />
)

const renderPositionCell = ({ row }: CellContext<EmployeeListItem, unknown>) => (
  <PositionCell position={row.original.position} />
)

const renderDepartmentCell = ({ row }: CellContext<EmployeeListItem, unknown>) => (
  <DepartmentCell department={row.original.department} />
)

const renderManagerCell = ({ row }: CellContext<EmployeeListItem, unknown>) => (
  <ManagerCell employeeId={row.original.id} manager={row.original.manager} />
)

const createRevenueCellRenderer = (currencyCode: string) => {
  const renderRevenueCell = ({ row }: CellContext<EmployeeListItem, unknown>) => (
    <RevenueCell employeeId={row.original.id} revenue={row.original.totalRevenue} currencyCode={currencyCode} />
  )
  return renderRevenueCell
}

const availableColumns: ColumnConfig[] = [
  { id: 'name', label: 'Name', visible: true, sortable: true },
  { id: 'position', label: 'Position', visible: true, sortable: true },
  { id: 'department', label: 'Department', visible: true, sortable: true },
  { id: 'manager', label: 'Manager', visible: true, sortable: true },
  // Total Sales is computed via per-employee aggregates (no server-side orderBy
  // possible) and only fetched for the visible page, so it is display-only.
  { id: 'totalRevenue', label: 'Total Sales', visible: true, sortable: false }
]

const sortableColumns: SortableColumn[] = [
  { id: 'name', label: 'Name' },
  { id: 'position', label: 'Position' },
  { id: 'department', label: 'Department' },
  { id: 'manager', label: 'Manager' }
]

export const EmployeesListView: React.FC<EmployeesListViewProps> = ({
  accessToken,
  currencies,
  currenciesLoading,
  onEmployeeSelect
}) => {
  const [sorting, setSorting] = useState<SortingState>([])
  const [selectedFilters, setSelectedFilters] = useState<Record<string, unknown>>({})
  const [visibleColumns, setVisibleColumns] = useState<string[]>(availableColumns.filter(c => c.visible).map(c => c.id))
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string>(DEFAULT_CURRENCY)

  const selectedCurrencyId = useMemo(() => {
    const currency = currencies.find(c => c.code === selectedCurrencyCode)
    if (currency) return currency.id

    const eurCurrency = currencies.find(c => c.code === DEFAULT_CURRENCY)
    if (eurCurrency) return eurCurrency.id

    return currencies[0]?.id
  }, [selectedCurrencyCode, currencies])

  const {
    employees,
    total,
    isLoading,
    error,
    currentPage,
    pageSize,
    search,
    departments,
    positions,
    setSearch,
    setDepartmentFilter,
    setPositionFilter,
    setCurrentPage,
    setPageSize,
    setSorting: setHookSorting
  } = useEmployeesList(accessToken, selectedCurrencyId)

  const filterConfiguration: FilterConfiguration = useMemo(
    () => ({
      id: 'employee-filters',
      name: 'Employee Filters',
      groups: [
        {
          id: 'department-group',
          label: 'Department',
          collapsible: true,
          defaultExpanded: true,
          filters: [
            {
              id: 'departmentId',
              field: 'departmentId',
              label: 'Department',
              type: 'multi-select',
              config: {
                options: departments.map(d => ({ id: d.id, label: d.label })),
                searchPlaceholder: 'Search departments...'
              }
            }
          ]
        },
        {
          id: 'position-group',
          label: 'Position',
          collapsible: true,
          defaultExpanded: true,
          filters: [
            {
              id: 'positionId',
              field: 'positionId',
              label: 'Position',
              type: 'multi-select',
              config: {
                options: positions.map(p => ({ id: p.id, label: p.label })),
                searchPlaceholder: 'Search positions...'
              }
            }
          ]
        }
      ]
    }),
    [departments, positions]
  )

  const handleFilterChange = useCallback(
    (filters: Record<string, unknown>) => {
      setSelectedFilters(filters)

      const departmentIds = filters.departmentId as string[] | undefined
      const positionIds = filters.positionId as string[] | undefined

      setDepartmentFilter(departmentIds || [])
      setPositionFilter(positionIds || [])
      setCurrentPage(1)
    },
    [setDepartmentFilter, setPositionFilter, setCurrentPage]
  )

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value)
      setCurrentPage(1)
    },
    [setSearch, setCurrentPage]
  )

  const handleSortingChange = useCallback(
    (newSorting: SortingState) => {
      setSorting(newSorting)
      setHookSorting(newSorting.map(s => ({ id: s.id, desc: s.desc })))
      setCurrentPage(1)
    },
    [setHookSorting, setCurrentPage]
  )

  const handlePaginationChange = useCallback(
    (newPagination: { pageIndex: number; pageSize: number }) => {
      setCurrentPage(newPagination.pageIndex + 1)
      setPageSize(newPagination.pageSize)
    },
    [setCurrentPage, setPageSize]
  )

  const columns = useMemo<ColumnDef<EmployeeListItem>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Name',
        size: 220,
        minSize: 180,
        maxSize: 300,
        enableResizing: false,
        cell: renderEmployeeNameCell
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
        id: 'department',
        accessorKey: 'department',
        header: 'Department',
        size: 180,
        minSize: 150,
        maxSize: 250,
        enableResizing: false,
        cell: renderDepartmentCell
      },
      {
        id: 'manager',
        accessorFn: row => row.manager?.name || '',
        header: 'Manager',
        size: 180,
        minSize: 150,
        maxSize: 250,
        enableResizing: false,
        cell: renderManagerCell
      },
      {
        id: 'totalRevenue',
        accessorKey: 'totalRevenue',
        header: 'Total Sales',
        size: 140,
        minSize: 120,
        maxSize: 180,
        enableResizing: false,
        enableSorting: false,
        meta: {
          type: 'currency' as const,
          align: 'right' as const
        },
        cell: createRevenueCellRenderer(selectedCurrencyCode)
      }
    ],
    [selectedCurrencyCode]
  )

  const handleEmployeeClick = useCallback(
    (employee: EmployeeListItem) => {
      onEmployeeSelect(employee.id)
    },
    [onEmployeeSelect]
  )

  const handleCurrencyChange = useCallback(
    (currencyCode: string) => {
      setSelectedCurrencyCode(currencyCode)
      setCurrentPage(1)
    },
    [setCurrentPage]
  )

  return (
    <div className="gba:space-y-4" data-testid={DATA_TEST_ID_PREFIX}>
      <DataDisplay
        titleSections={[
          {
            id: 'all',
            label: 'Employees',
            metadata: {
              count: total,
              isLoading
            }
          }
        ]}
        currentSection="all"
        searchValue={search}
        searchPlaceholder="Search employees by name, position, or department..."
        onSearchChange={handleSearchChange}
        filters={selectedFilters}
        filterConfiguration={filterConfiguration}
        onFilterChange={handleFilterChange}
        sorting={sorting}
        sortableColumns={sortableColumns}
        onSortingChange={handleSortingChange}
        availableColumns={availableColumns}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        toolbarDensity="default"
        filterSheetTitle="Filter Employees"
        filterSheetDescription="Apply filters to narrow down the employee list"
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
        <DataTable<EmployeeListItem>
          data={employees}
          columns={columns.filter(col => visibleColumns.includes(col.id as string))}
          loading={isLoading}
          error={error || undefined}
          totalCount={total}
          pagination={{ pageIndex: currentPage - 1, pageSize }}
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
          emptyMessage="No employees found"
          onRowClick={handleEmployeeClick}
          data-testid={`${DATA_TEST_ID_PREFIX}-table`}
        />
      </DataDisplay>
    </div>
  )
}

export default EmployeesListView

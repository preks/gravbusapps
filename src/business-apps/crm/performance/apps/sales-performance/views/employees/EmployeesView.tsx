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
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import type { FilterConfiguration, ColumnConfig, SortableColumn } from '@newwork/nw-design-system'
import { User } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatCurrency } from '@/common/utils/numberFormatter'
import { OwnerDisplay } from '@/business-apps/irm/core/apps/investment-relations/views/task-view/components/OwnerDisplay'
import { useEmployeesList, type EmployeeListItem } from '../../hooks/useEmployeesList'
import { useCurrencies } from '../../hooks'
import { EmployeePerformanceView } from './EmployeePerformanceView'

const DATA_TEST_ID_PREFIX = 'sales-performance-employees'
const DEFAULT_CURRENCY = 'EUR'

/**
 * Currency filter component
 */
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

interface EmployeesViewProps extends BusinessAppContextProps {
  /** Currently selected employee ID (controlled from parent via URL params) */
  selectedEmployeeId?: string | null
  /** Callback when employee selection changes */
  onEmployeeSelect?: (employeeId: string | null) => void
}

// Cell Component: Employee Name
const EmployeeNameCell: React.FC<{ employee: EmployeeListItem }> = ({ employee }) => (
  <div
    className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer hover:gba:bg-transparent focus:gba:bg-transparent gba:group"
    data-testid={`${DATA_TEST_ID_PREFIX}-employee-name-${employee.id}`}
  >
    <Avatar
      size="sm"
      className="gba:outline gba:outline-2 gba:outline-offset-2 gba:outline-transparent gba:group-hover:[outline-color:var(--nw-color-primary-500)] gba:rounded-full"
    >
      {employee.avatar && <AvatarImage src={`data:image/jpeg;base64,${employee.avatar}`} alt={employee.name} />}
      <AvatarFallback>
        <User className="gba:h-4 gba:w-4" />
      </AvatarFallback>
    </Avatar>
    <span className="gba:text-[color:var(--nw-color-text-primary)] group-hover:gba:text-[color:var(--nw-color-primary-500)]">
      {employee.name}
    </span>
  </div>
)

// Cell Component: Position
const PositionCell: React.FC<{ position: string }> = ({ position }) => (
  <div className="gba:text-sm gba:truncate" title={position}>
    {position}
  </div>
)

// Cell Component: Department
const DepartmentCell: React.FC<{ department: string }> = ({ department }) => (
  <div className="gba:text-sm gba:truncate" title={department}>
    {department}
  </div>
)

// Cell Component: Manager
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

// Cell Component: Revenue
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

// Available columns configuration for column visibility
const availableColumns: ColumnConfig[] = [
  { id: 'name', label: 'Name', visible: true, sortable: true },
  { id: 'position', label: 'Position', visible: true, sortable: true },
  { id: 'department', label: 'Department', visible: true, sortable: true },
  { id: 'manager', label: 'Manager', visible: true, sortable: true },
  { id: 'totalRevenue', label: 'Total Sales', visible: true, sortable: true }
]

// Sortable columns configuration
const sortableColumns: SortableColumn[] = [
  { id: 'name', label: 'Name' },
  { id: 'position', label: 'Position' },
  { id: 'department', label: 'Department' },
  { id: 'manager', label: 'Manager' },
  { id: 'totalRevenue', label: 'Total Sales' }
]

// Columns that require client-side sorting (can't be sorted via GraphQL)
const CLIENT_SORT_COLUMNS = ['totalRevenue']

/**
 * Employees View for Sales Performance
 * Displays a list of all employees with their department and performance metrics.
 * Clicking on an employee opens their individual performance view.
 */
export const EmployeesView: React.FC<EmployeesViewProps> = ({
  accessToken,
  userInfo,
  selectedEmployeeId,
  onEmployeeSelect
}) => {
  const [sorting, setSorting] = useState<SortingState>([])
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>({})
  const [visibleColumns, setVisibleColumns] = useState<string[]>(availableColumns.filter(c => c.visible).map(c => c.id))
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string>(DEFAULT_CURRENCY)

  // Fetch currencies for the selector
  const { currencies, isLoading: currenciesLoading } = useCurrencies(accessToken)

  // Convert currency code to full ID for filtering
  const selectedCurrencyId = useMemo(() => {
    const currency = currencies.find(c => c.code === selectedCurrencyCode)
    if (currency) return currency.id

    // If selected currency not found, try EUR
    const eurCurrency = currencies.find(c => c.code === DEFAULT_CURRENCY)
    if (eurCurrency) return eurCurrency.id

    // Fallback to first available currency
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

  // Build dynamic filter configuration with loaded options
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

  // Handle filter changes from DataDisplay
  const handleFilterChange = useCallback(
    (filters: Record<string, any>) => {
      setSelectedFilters(filters)

      // Map DataDisplay filters to hook filters
      const departmentIds = filters.departmentId as string[] | undefined
      const positionIds = filters.positionId as string[] | undefined

      // For now, we only support single selection in the hook - take first value
      setDepartmentFilter(departmentIds?.[0] || '')
      setPositionFilter(positionIds?.[0] || '')

      // Reset to first page when filters change
      setCurrentPage(1)
    },
    [setDepartmentFilter, setPositionFilter, setCurrentPage]
  )

  // Handle search from DataDisplay
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value)
      setCurrentPage(1)
    },
    [setSearch, setCurrentPage]
  )

  // Handle sorting change - update both local state and hook state for server-side sorting
  const handleSortingChange = useCallback(
    (newSorting: SortingState) => {
      setSorting(newSorting)
      // Only send server-sortable columns to the hook
      const serverSorting = newSorting.filter(s => !CLIENT_SORT_COLUMNS.includes(s.id))
      setHookSorting(serverSorting.map(s => ({ id: s.id, desc: s.desc })))
      // Only reset page for server-side sorting changes
      if (serverSorting.length > 0 || newSorting.length === 0) {
        setCurrentPage(1)
      }
    },
    [setHookSorting, setCurrentPage]
  )

  // Apply client-side sorting for columns that can't be sorted server-side
  const sortedEmployees = useMemo(() => {
    // Check if we need client-side sorting
    const clientSort = sorting.find(s => CLIENT_SORT_COLUMNS.includes(s.id))
    if (!clientSort) {
      return employees
    }

    // Create a copy and sort client-side
    const sorted = [...employees]
    if (clientSort.id === 'totalRevenue') {
      sorted.sort((a, b) => {
        const diff = a.totalRevenue - b.totalRevenue
        return clientSort.desc ? -diff : diff
      })
    }

    return sorted
  }, [employees, sorting])

  // Handle pagination change
  const handlePaginationChange = useCallback(
    (newPagination: { pageIndex: number; pageSize: number }) => {
      setCurrentPage(newPagination.pageIndex + 1)
      setPageSize(newPagination.pageSize)
    },
    [setCurrentPage, setPageSize]
  )

  // Define columns
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
        cell: ({ row }) => <EmployeeNameCell employee={row.original} />
      },
      {
        id: 'position',
        accessorKey: 'position',
        header: 'Position',
        size: 180,
        minSize: 150,
        maxSize: 250,
        enableResizing: false,
        cell: ({ row }) => <PositionCell position={row.original.position} />
      },
      {
        id: 'department',
        accessorKey: 'department',
        header: 'Department',
        size: 180,
        minSize: 150,
        maxSize: 250,
        enableResizing: false,
        cell: ({ row }) => <DepartmentCell department={row.original.department} />
      },
      {
        id: 'manager',
        accessorFn: row => row.manager?.name || '',
        header: 'Manager',
        size: 180,
        minSize: 150,
        maxSize: 250,
        enableResizing: false,
        cell: ({ row }) => <ManagerCell employeeId={row.original.id} manager={row.original.manager} />
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
        cell: ({ row }) => (
          <RevenueCell
            employeeId={row.original.id}
            revenue={row.original.totalRevenue}
            currencyCode={selectedCurrencyCode}
          />
        )
      }
    ],
    [selectedCurrencyCode]
  )

  const handleEmployeeClick = useCallback(
    (employee: EmployeeListItem) => {
      onEmployeeSelect?.(employee.id)
    },
    [onEmployeeSelect]
  )

  const handleBack = useCallback(() => {
    onEmployeeSelect?.(null)
  }, [onEmployeeSelect])

  // Handle currency change and reset pagination
  const handleCurrencyChange = useCallback(
    (currencyCode: string) => {
      setSelectedCurrencyCode(currencyCode)
      setCurrentPage(1) // Reset to first page when currency changes
    },
    [setCurrentPage]
  )

  // Show individual employee performance view when selected
  if (selectedEmployeeId) {
    return (
      <EmployeePerformanceView
        employeeId={selectedEmployeeId}
        onBack={handleBack}
        accessToken={accessToken}
        userInfo={userInfo}
      />
    )
  }

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
        data-testid={DATA_TEST_ID_PREFIX}
      >
        <DataTable<EmployeeListItem>
          data={sortedEmployees}
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

export default EmployeesView

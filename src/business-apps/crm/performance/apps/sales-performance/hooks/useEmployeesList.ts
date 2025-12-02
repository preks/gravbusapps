import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface EmployeeListItem {
  id: string
  name: string
  position: string
  department: string
  departmentId: string
  totalRevenue: number
  currencyId?: string
  avatar?: string | null
  manager?: {
    id: string
    name: string
    avatar?: string | null
  } | null
}

export interface FilterOption {
  id: string
  label: string
}

export interface SortingItem {
  id: string
  desc: boolean
}

interface UseEmployeesListResult {
  employees: EmployeeListItem[]
  total: number
  isLoading: boolean
  error: string | null
  currentPage: number
  pageSize: number
  search: string
  departmentFilter: string
  positionFilter: string
  departments: FilterOption[]
  positions: FilterOption[]
  setSearch: (search: string) => void
  setDepartmentFilter: (department: string) => void
  setPositionFilter: (position: string) => void
  setCurrentPage: (page: number) => void
  setPageSize: (size: number) => void
  setSorting: (sorting: SortingItem[]) => void
  refetch: () => void
}

// Query to get won opportunities per employee for revenue - with optional currency filter
const buildEmployeeRevenuesQuery = (currencyId?: string) => {
  const currencyFilter = currencyId ? `, currencyRef: { _eq: "${currencyId}" }` : ''
  return `
    query GetEmployeeRevenues {
      Opportunity(
        where: {
          isDeleted: { _eq: false }
          ownerEmployeeId: { _isNull: false }
          estimatedAmount: { _isNull: false }
          opportunityStatus: { code: { _eq: "WON" } }${currencyFilter}
        }
      ) {
        ownerEmployeeId
        estimatedAmount
        currencyRef
      }
    }
  `
}

// Sales Associate capability name for filtering
const SALES_ASSOCIATE_CAPABILITY = 'Sales Associate'

// Query to get all employees with their position and department via employeePosition
// Filtered to only include employees with Sales Associate capability
const GET_ALL_EMPLOYEES = `
  query GetAllEmployees($limit: Int, $offset: Int, $where: EmployeeBoolExp, $orderBy: [EmployeeOrderBy!]) {
    Employee(
      where: $where
      limit: $limit
      offset: $offset
      orderBy: $orderBy
    ) {
      id
      firstName
      lastName
      displayName
      pictureThumbnail
      employeePosition {
        jobPosition {
          id
          name
        }
        organizationalUnit {
          id
          name
        }
        supervisor {
          id
          firstName
          lastName
          displayName
          pictureThumbnail
        }
      }
    }
    EmployeeAggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`

// Columns that can be sorted server-side via GraphQL
const SERVER_SORTABLE_COLUMNS = ['name', 'position', 'department', 'manager']

// Build orderBy clause for GraphQL - only for server-sortable columns
const buildOrderBy = (sorting: SortingItem[]): any[] => {
  // Filter to only server-sortable columns
  const serverSorting = sorting.filter(s => SERVER_SORTABLE_COLUMNS.includes(s.id))

  if (serverSorting.length === 0) {
    return [{ displayName: 'ASC' }]
  }

  return serverSorting.map(sort => {
    const direction = sort.desc ? 'DESC' : 'ASC'

    switch (sort.id) {
      case 'name':
        return { displayName: direction }
      case 'position':
        return { employeePosition: { jobPosition: { name: direction } } }
      case 'department':
        return { employeePosition: { organizationalUnit: { name: direction } } }
      case 'manager':
        return { employeePosition: { supervisor: { displayName: direction } } }
      default:
        return { displayName: direction }
    }
  })
}

// Query to get filter options (all unique departments and positions)
const GET_FILTER_OPTIONS = `
  query GetFilterOptions {
    OrganizationalUnit(
      where: { isDeleted: { _eq: false } }
      orderBy: { name: ASC }
    ) {
      id
      name
    }
    JobPosition(
      where: { isDeleted: { _eq: false } }
      orderBy: { name: ASC }
    ) {
      id
      name
    }
  }
`

interface EmployeeResponse {
  id: string
  firstName: string
  lastName: string
  displayName: string
  pictureThumbnail?: string
  employeePosition?: {
    jobPosition?: { id: string; name: string }
    organizationalUnit?: {
      id: string
      name: string
    }
    supervisor?: {
      id: string
      firstName: string
      lastName: string
      displayName: string
      pictureThumbnail?: string
    }
  }
}

/**
 * Hook to fetch employees list with department information and revenue
 * @param accessToken - Access token for API calls
 * @param currencyId - Optional currency ID to filter revenues (e.g., "Currency:v1:EUR")
 */
export const useEmployeesList = (accessToken: string, currencyId?: string): UseEmployeesListResult => {
  const [employees, setEmployees] = useState<EmployeeListItem[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [positionFilter, setPositionFilter] = useState('')
  const [departments, setDepartments] = useState<FilterOption[]>([])
  const [positions, setPositions] = useState<FilterOption[]>([])
  const [sorting, setSorting] = useState<SortingItem[]>([])

  const graphqlClient = useGraphQLClient(accessToken)
  const [filterOptionsLoaded, setFilterOptionsLoaded] = useState(false)

  // Fetch filter options (departments and positions) once on initial load
  const fetchFilterOptions = useCallback(async () => {
    if (!accessToken || filterOptionsLoaded) return

    try {
      const result = await graphqlClient.request<{
        OrganizationalUnit: Array<{ id: string; name: string }>
        JobPosition: Array<{ id: string; name: string }>
      }>(GET_FILTER_OPTIONS)

      setDepartments(
        (result.OrganizationalUnit || []).filter(d => d.id && d.name).map(d => ({ id: d.id, label: d.name }))
      )
      setPositions((result.JobPosition || []).filter(p => p.id && p.name).map(p => ({ id: p.id, label: p.name })))
      setFilterOptionsLoaded(true)
    } catch (err) {
      console.error('Failed to fetch filter options:', err)
    }
  }, [accessToken, graphqlClient, filterOptionsLoaded])

  const fetchEmployees = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Build where condition - always filter by Sales Associate capability
      const whereCondition: any = {
        isDeleted: { _eq: false },
        employeePosition: {
          employeeCapabilities: {
            capability: {
              name: { _eq: SALES_ASSOCIATE_CAPABILITY }
            }
          }
        }
      }

      // Add search filter if provided
      if (search?.trim()) {
        const searchPattern = `%${search.trim()}%`
        whereCondition._or = [
          { firstName: { _ilike: searchPattern } },
          { lastName: { _ilike: searchPattern } },
          { displayName: { _ilike: searchPattern } },
          { employeePosition: { jobPosition: { name: { _ilike: searchPattern }, isDeleted: { _eq: false } } } },
          { employeePosition: { organizationalUnit: { name: { _ilike: searchPattern }, isDeleted: { _eq: false } } } }
        ]
      }

      // Add department filter (also ensure org unit is not deleted)
      if (departmentFilter) {
        whereCondition.employeePosition = {
          ...whereCondition.employeePosition,
          organizationalUnit: { id: { _eq: departmentFilter }, isDeleted: { _eq: false } }
        }
      }

      // Add position filter (also ensure job position is not deleted)
      if (positionFilter) {
        whereCondition.employeePosition = {
          ...whereCondition.employeePosition,
          jobPosition: { id: { _eq: positionFilter }, isDeleted: { _eq: false } }
        }
      }

      // Build orderBy clause
      const orderBy = buildOrderBy(sorting)

      // Fetch employees and revenues in parallel
      const [employeesResult, revenuesResult] = await Promise.all([
        graphqlClient.request<{
          Employee: EmployeeResponse[]
          EmployeeAggregate: { aggregate: { count: number } }
        }>(GET_ALL_EMPLOYEES, {
          limit: pageSize,
          offset: (currentPage - 1) * pageSize,
          where: whereCondition,
          orderBy
        }),
        graphqlClient.request<{
          Opportunity: Array<{
            ownerEmployeeId: string
            estimatedAmount: number
            currencyRef: string
          }>
        }>(buildEmployeeRevenuesQuery(currencyId))
      ])

      // Build revenue map by employee
      const revenueMap = new Map<string, { total: number; currencyId: string }>()
      revenuesResult.Opportunity?.forEach(opp => {
        const existing = revenueMap.get(opp.ownerEmployeeId)
        if (existing) {
          existing.total += opp.estimatedAmount
        } else {
          revenueMap.set(opp.ownerEmployeeId, {
            total: opp.estimatedAmount,
            currencyId: opp.currencyRef?.split(':').pop() || 'EUR'
          })
        }
      })

      // Transform employee data
      const transformedEmployees: EmployeeListItem[] = employeesResult.Employee.map(emp => {
        const orgUnit = emp.employeePosition?.organizationalUnit
        const jobPos = emp.employeePosition?.jobPosition
        const revenue = revenueMap.get(emp.id)

        return {
          id: emp.id,
          name: emp.displayName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
          position: jobPos?.name || 'Unknown Position',
          department: orgUnit?.name || 'Unknown Department',
          departmentId: orgUnit?.id || '',
          totalRevenue: revenue?.total || 0,
          currencyId: revenue?.currencyId,
          avatar: emp.pictureThumbnail,
          manager: emp.employeePosition?.supervisor
            ? {
                id: emp.employeePosition.supervisor.id,
                name:
                  emp.employeePosition.supervisor.displayName ||
                  `${emp.employeePosition.supervisor.firstName || ''} ${emp.employeePosition.supervisor.lastName || ''}`.trim(),
                avatar: emp.employeePosition.supervisor.pictureThumbnail
              }
            : null
        }
      })

      setEmployees(transformedEmployees)
      setTotal(employeesResult.EmployeeAggregate?.aggregate?.count || transformedEmployees.length)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch employees')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, graphqlClient, currentPage, pageSize, search, departmentFilter, positionFilter, currencyId, sorting])

  // Fetch filter options on initial load
  useEffect(() => {
    void fetchFilterOptions()
  }, [fetchFilterOptions])

  // Fetch employees when filters/pagination change
  useEffect(() => {
    void fetchEmployees()
  }, [fetchEmployees])

  return {
    employees,
    total,
    isLoading,
    error,
    currentPage,
    pageSize,
    search,
    departmentFilter,
    positionFilter,
    departments,
    positions,
    setSearch,
    setDepartmentFilter,
    setPositionFilter,
    setCurrentPage,
    setPageSize,
    setSorting,
    refetch: fetchEmployees
  }
}

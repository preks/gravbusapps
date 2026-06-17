import { useState, useEffect, useCallback, useMemo } from 'react'
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
  departmentFilter: string[]
  positionFilter: string[]
  departments: FilterOption[]
  positions: FilterOption[]
  setSearch: (search: string) => void
  setDepartmentFilter: (departmentIds: string[]) => void
  setPositionFilter: (positionIds: string[]) => void
  setCurrentPage: (page: number) => void
  setPageSize: (size: number) => void
  setSorting: (sorting: SortingItem[]) => void
  refetch: () => void
}

// Build a single batched request with one aliased WON-revenue aggregate per
// employee, scoped to just the employees on the current page. Avoids pulling
// every WON opportunity in the company to sum them client-side.
const buildEmployeeRevenuesQuery = (employeeIds: string[], currencyId?: string) => {
  const currencyFilter = currencyId ? `\n          currencyRef: {_eq: "${currencyId}"}` : ''

  const aggregates = employeeIds
    .map(
      (employeeId, index) => `
    e${index}: OpportunityAggregate(
      where: {
        isDeleted: {_eq: false}
        opportunityStatus: {code: {_eq: "WON"}}
        estimatedAmount: {_isNull: false}
        ownerEmployeeId: {_eq: "${employeeId}"}${currencyFilter}
      }
    ) {
      aggregate {
        sum { estimatedAmount }
        max { currencyRef }
      }
    }
  `
    )
    .join('\n')

  return `
  query GetEmployeeRevenues {
    ${aggregates}
  }
`
}

interface RevenueAggregateResult {
  aggregate: {
    sum: { estimatedAmount: number | null } | null
    max: { currencyRef: string | null } | null
  } | null
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

// Query the positions/departments actually held by Sales Associates, so the
// filter options match the table contents (instead of every JobPosition /
// OrganizationalUnit in the org, most of which return no rows here).
const GET_FILTER_OPTIONS = `
  query GetFilterOptions {
    Employee(
      where: {
        isDeleted: { _eq: false }
        employeePosition: {
          employeeCapabilities: {
            capability: { name: { _eq: "${SALES_ASSOCIATE_CAPABILITY}" } }
          }
        }
      }
    ) {
      employeePosition {
        jobPosition {
          id
          name
          isDeleted
        }
        organizationalUnit {
          id
          name
          isDeleted
        }
      }
    }
  }
`

interface FilterOptionsEmployee {
  employeePosition?: {
    jobPosition?: { id: string; name: string; isDeleted?: boolean } | null
    organizationalUnit?: { id: string; name: string; isDeleted?: boolean } | null
  } | null
}

// Dedupe an id->label map into sorted filter options.
const toSortedFilterOptions = (entries: Map<string, string>): FilterOption[] =>
  Array.from(entries, ([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label))

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
 * @param visibleColumns - Visible column ids the free-text search is scoped to; undefined searches default fields
 */
export const useEmployeesList = (
  accessToken: string,
  currencyId?: string,
  visibleColumns?: string[]
): UseEmployeesListResult => {
  // Base employee list (currency-independent) and per-employee revenue kept
  // separately so a currency change only re-fetches revenue, not the list.
  const [baseEmployees, setBaseEmployees] = useState<EmployeeListItem[]>([])
  const [revenueMap, setRevenueMap] = useState<Map<string, { total: number; currencyId: string }>>(new Map())
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState<string[]>([])
  const [positionFilter, setPositionFilter] = useState<string[]>([])
  const [departments, setDepartments] = useState<FilterOption[]>([])
  const [positions, setPositions] = useState<FilterOption[]>([])
  const [sorting, setSorting] = useState<SortingItem[]>([])

  const graphqlClient = useGraphQLClient(accessToken)
  const [filterOptionsLoaded, setFilterOptionsLoaded] = useState(false)

  // Only re-fetch on column changes while a search is active, so toggling columns alone does not refetch.
  const scopedSearchColumnsKey = search.trim() ? JSON.stringify(visibleColumns ?? null) : 'none'

  // Fetch filter options (departments and positions) once on initial load
  const fetchFilterOptions = useCallback(async () => {
    if (!accessToken || filterOptionsLoaded) return

    try {
      const result = await graphqlClient.request<{
        Employee: FilterOptionsEmployee[]
      }>(GET_FILTER_OPTIONS)

      const departmentMap = new Map<string, string>()
      const positionMap = new Map<string, string>()

      result.Employee?.forEach(emp => {
        const jobPosition = emp.employeePosition?.jobPosition
        const organizationalUnit = emp.employeePosition?.organizationalUnit

        if (jobPosition?.id && jobPosition.name && !jobPosition.isDeleted) {
          positionMap.set(jobPosition.id, jobPosition.name)
        }
        if (organizationalUnit?.id && organizationalUnit.name && !organizationalUnit.isDeleted) {
          departmentMap.set(organizationalUnit.id, organizationalUnit.name)
        }
      })

      setDepartments(toSortedFilterOptions(departmentMap))
      setPositions(toSortedFilterOptions(positionMap))
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

      // Add search filter if provided, scoped to the visible table columns.
      if (search?.trim()) {
        const searchPattern = `%${search.trim()}%`
        const predicateMap: Record<string, any[]> = {
          name: [
            { firstName: { _ilike: searchPattern } },
            { lastName: { _ilike: searchPattern } },
            { displayName: { _ilike: searchPattern } }
          ],
          position: [
            { employeePosition: { jobPosition: { name: { _ilike: searchPattern }, isDeleted: { _eq: false } } } }
          ],
          department: [
            {
              employeePosition: {
                organizationalUnit: { name: { _ilike: searchPattern }, isDeleted: { _eq: false } }
              }
            }
          ],
          manager: [
            { employeePosition: { supervisor: { firstName: { _ilike: searchPattern } } } },
            { employeePosition: { supervisor: { lastName: { _ilike: searchPattern } } } },
            { employeePosition: { supervisor: { displayName: { _ilike: searchPattern } } } }
          ]
        }

        const columns = visibleColumns && visibleColumns.length > 0 ? visibleColumns : Object.keys(predicateMap)
        const orConditions = columns.flatMap(column => predicateMap[column] || [])

        if (orConditions.length > 0) {
          whereCondition._or = orConditions
        }
      }

      // Add department filter (supports multiple selected org units)
      if (departmentFilter.length > 0) {
        whereCondition.employeePosition = {
          ...whereCondition.employeePosition,
          organizationalUnit: { id: { _in: departmentFilter }, isDeleted: { _eq: false } }
        }
      }

      // Add position filter (supports multiple selected job positions)
      if (positionFilter.length > 0) {
        whereCondition.employeePosition = {
          ...whereCondition.employeePosition,
          jobPosition: { id: { _in: positionFilter }, isDeleted: { _eq: false } }
        }
      }

      // Build orderBy clause
      const orderBy = buildOrderBy(sorting)

      // Fetch the page of employees. This is currency-independent, so changing
      // the currency filter never re-runs this query.
      const employeesResult = await graphqlClient.request<{
        Employee: EmployeeResponse[]
        EmployeeAggregate: { aggregate: { count: number } }
      }>(GET_ALL_EMPLOYEES, {
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        where: whereCondition,
        orderBy
      })

      // Transform employee data (revenue is merged in separately via revenueMap)
      const transformedEmployees: EmployeeListItem[] = employeesResult.Employee.map(emp => {
        const orgUnit = emp.employeePosition?.organizationalUnit
        const jobPos = emp.employeePosition?.jobPosition

        return {
          id: emp.id,
          name: emp.displayName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
          position: jobPos?.name || 'Unknown Position',
          department: orgUnit?.name || 'Unknown Department',
          departmentId: orgUnit?.id || '',
          totalRevenue: 0,
          currencyId: undefined,
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

      setBaseEmployees(transformedEmployees)
      setTotal(employeesResult.EmployeeAggregate?.aggregate?.count || transformedEmployees.length)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch employees')
    } finally {
      setIsLoading(false)
    }
  }, [
    accessToken,
    graphqlClient,
    currentPage,
    pageSize,
    search,
    scopedSearchColumnsKey,
    departmentFilter,
    positionFilter,
    sorting
  ])

  // Stable, order-independent key for the current page's employees. Re-sorting
  // the same page (same employees, different order) keeps this key unchanged, so
  // revenue isn't re-fetched just because the row order changed.
  const pageEmployeeIdsKey = useMemo(
    () =>
      baseEmployees
        .map(emp => emp.id)
        .sort((a, b) => a.localeCompare(b))
        .join(','),
    [baseEmployees]
  )

  // Fetch per-employee revenue for the current page. Keyed off the page's
  // employee set + currency, so it re-runs only when the visible employees or
  // the currency actually change (not on column re-sort of the same page).
  const fetchRevenues = useCallback(async () => {
    const pageEmployeeIds = pageEmployeeIdsKey ? pageEmployeeIdsKey.split(',') : []
    if (!accessToken || pageEmployeeIds.length === 0) {
      setRevenueMap(new Map())
      return
    }

    try {
      const revenuesResult = await graphqlClient.request<Record<string, RevenueAggregateResult>>(
        buildEmployeeRevenuesQuery(pageEmployeeIds, currencyId)
      )

      const fallbackCurrencyCode = currencyId?.split(':').pop() || 'EUR'
      const nextRevenueMap = new Map<string, { total: number; currencyId: string }>()
      pageEmployeeIds.forEach((employeeId, index) => {
        const aggregate = revenuesResult[`e${index}`]?.aggregate
        const total = aggregate?.sum?.estimatedAmount ?? 0
        const currencyCode = aggregate?.max?.currencyRef?.split(':').pop() || fallbackCurrencyCode
        nextRevenueMap.set(employeeId, { total, currencyId: currencyCode })
      })
      setRevenueMap(nextRevenueMap)
    } catch (err) {
      // Revenue is non-critical for the list; keep employees visible without it.
      console.error('Failed to fetch employee revenues:', err instanceof Error ? err.message : err)
    }
  }, [accessToken, graphqlClient, pageEmployeeIdsKey, currencyId])

  // Merge the currency-independent employee list with the per-employee revenue.
  const employees = useMemo<EmployeeListItem[]>(
    () =>
      baseEmployees.map(emp => {
        const revenue = revenueMap.get(emp.id)
        return {
          ...emp,
          totalRevenue: revenue?.total ?? 0,
          currencyId: revenue?.currencyId ?? emp.currencyId
        }
      }),
    [baseEmployees, revenueMap]
  )

  // Fetch filter options on initial load
  useEffect(() => {
    fetchFilterOptions().catch(() => undefined)
  }, [fetchFilterOptions])

  // Fetch employees when filters/pagination change
  useEffect(() => {
    fetchEmployees().catch(() => undefined)
  }, [fetchEmployees])

  // Fetch revenues when the page's employees or the currency change
  useEffect(() => {
    fetchRevenues().catch(() => undefined)
  }, [fetchRevenues])

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

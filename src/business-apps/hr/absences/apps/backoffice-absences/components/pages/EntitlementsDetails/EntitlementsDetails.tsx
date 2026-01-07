import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Spinner
} from '@newwork/nw-design-system'
import { PiArrowLeft, PiCalendarBlank, PiUsers, PiArrowUp, PiArrowDown, PiCalendar, PiUser } from 'react-icons/pi'
import dayjs from 'dayjs'
import { Spin, Alert } from 'antd'
import { DataContainer } from '../../../../../../../../components/layout/dataContainer'
import { BusinessAppContextProps } from '../../../../../../../../common/BusinessAppContext'
import { useGraphQLClient } from '../../../../../../../../common/network/graphql/useGraphQLClient'
import { useCatalogManagerClient } from '../../../../../../../../common/network/catalogs/useCatalogManagerClient'
import { TimeFilter, DataFilterGroup } from '../../../types'
import { getTranslationFromI18nKeyAndLabel, getDateFormat } from '@/common/utils/windowUtils'

interface EntitlementsDetailsProps extends BusinessAppContextProps {
  timeFilter?: TimeFilter
  onNavigateBack: () => void
}

// Helper functions
const renderSortIcon = (field: string, sortField: string, sortOrder: 'asc' | 'desc' | '') => {
  if (sortField !== field) return null
  if (sortOrder === 'asc') return <PiArrowUp className="gba:inline gba:ml-1" size={12} />
  if (sortOrder === 'desc') return <PiArrowDown className="gba:inline gba:ml-1" size={12} />
  return null
}

const formatDateForDisplay = (dateStr: string) => {
  return dayjs(dateStr).format(getDateFormat('date.short'))
}

interface DetailedEntitlement {
  id: string // Add unique ID for table keys
  employeeId: string
  employeeName: string
  organizationalUnit: string | null
  absenceType: string
  absenceTypeId: string
  entitlement: number
  validFrom: string
  validTo: string
  used: number
  available: number
  status: string
}

type SortField =
  | 'employeeName'
  | 'organizationalUnit'
  | 'absenceType'
  | 'entitlement'
  | 'validFrom'
  | 'validTo'
  | 'used'
  | 'available'
type SortOrder = 'asc' | 'desc'

const EntitlementsDetails: React.FC<EntitlementsDetailsProps> = ({
  accessToken,
  timeFilter = 'current-year',
  onNavigateBack
}) => {
  const graphQLClient = useGraphQLClient(accessToken)
  const catalogClient = useCatalogManagerClient(accessToken)

  const [entitlements, setEntitlements] = useState<DetailedEntitlement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [employees, setEmployees] = useState<any[]>([])
  const [organizationalUnits, setOrganizationalUnits] = useState<any[]>([])
  const [absenceTypesMap, setAbsenceTypesMap] = useState<Record<string, string>>({})
  const [employeesLoading, setEmployeesLoading] = useState(false)
  const [orgUnitsLoading, setOrgUnitsLoading] = useState(false)

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('employeeName')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  // Track initial load to prevent unnecessary re-renders (like AbsenceList)
  const initialLoadDone = useRef(false)

  // Filtering state
  const [search, setSearch] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)

  // Get date filter for the current time filter
  const getDateFilters = () => {
    const now = new Date()

    switch (timeFilter) {
      case 'current-year':
        return {
          startDate: `${now.getFullYear()}-01-01`,
          endDate: `${now.getFullYear()}-12-31`
        }
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3)
        const quarterStart = new Date(now.getFullYear(), quarter * 3, 1)
        const quarterEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 0)
        return {
          startDate: quarterStart.toISOString().split('T')[0],
          endDate: quarterEnd.toISOString().split('T')[0]
        }
      case 'month':
        return {
          startDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
          endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
        }
      case 'everything':
      default:
        return null
    }
  }

  // Build GraphQL where conditions like AbsenceList does
  const buildWhereConditions = () => {
    const conditions: any = {
      isDeleted: { _eq: false }
    }

    // Add filters EXACTLY like AbsenceList - employee filters are raw IDs, others have prefixes
    const employeeFilters = selectedFilters.filter(f => !f.startsWith('department-') && !f.startsWith('type-'))
    const departmentFilters = selectedFilters
      .filter(f => f.startsWith('department-'))
      .map(f => f.replace('department-', ''))
    const typeFilters = selectedFilters.filter(f => f.startsWith('type-')).map(f => f.replace('type-', ''))

    // FIXED: If employee filters are selected, use them instead of search for employees
    if (employeeFilters.length > 0) {
      conditions.employee = { id: { _in: employeeFilters } }

      // Still allow search on type and department, but not employee names
      if (search && search.trim()) {
        conditions._or = [
          { type: { value: { _ilike: `%${search.trim()}%` } } },
          { employee: { employeePosition: { organizationalUnit: { name: { _ilike: `%${search.trim()}%` } } } } }
        ]
      }
    } else {
      // No employee filters, use search for everything including employee names
      if (search && search.trim()) {
        conditions._or = [
          { employee: { firstName: { _ilike: `%${search.trim()}%` } } },
          { employee: { lastName: { _ilike: `%${search.trim()}%` } } },
          { type: { value: { _ilike: `%${search.trim()}%` } } },
          { employee: { employeePosition: { organizationalUnit: { name: { _ilike: `%${search.trim()}%` } } } } }
        ]
      }
    }

    if (departmentFilters.length > 0) {
      const departmentCondition = { organizationalUnit: { id: { _in: departmentFilters } } }

      // Merge with existing employee conditions properly
      if (conditions.employee) {
        conditions.employee.employeePosition = departmentCondition
      } else {
        conditions.employee = { employeePosition: departmentCondition }
      }
    }

    if (typeFilters.length > 0) {
      // Filter by absence type IDs (from catalog)
      const typeIds = typeFilters.map(f => f.replace('type-', ''))
      conditions.type = { id: { _in: typeIds } }
    }

    // Active employee positions filter - ADD TO _and instead of overwriting employee condition
    const currentDate = new Date().toISOString()

    // Always add active position filter as a separate condition to avoid conflicts
    if (!conditions._and) {
      conditions._and = []
    }

    conditions._and.push({
      employee: {
        employeePosition: {
          _or: [{ exitDate: { _isNull: true } }, { exitDate: { _gte: currentDate } }]
        }
      }
    })

    // Date filters - ADD to existing _and array
    const dateFilters = getDateFilters()
    if (dateFilters) {
      conditions._and.push({ validFrom: { _lte: dateFilters.endDate } }, { validTo: { _gte: dateFilters.startDate } })
    }

    return conditions
  }

  const getDetailedEntitlementsQuery = () => {
    return `
      query GetDetailedEntitlements($where: EmployeeAbsenceEntitlementBoolExp!, $offset: Int!, $limit: Int!, $orderBy: [EmployeeAbsenceEntitlementOrderBy!]) {
        EmployeeAbsenceEntitlement(
          where: $where
          offset: $offset
          limit: $limit
          orderBy: $orderBy
        ) {
          id
          employeeId
          total
          available
          approved
          pending
          validFrom
          validTo
          type {
            id
            value
            parentEntryId
          }
        }
        EmployeeAbsenceEntitlementAggregate(where: $where) {
          aggregate {
            count
          }
        }
      }
    `
  }

  // Separate employee fetching like AbsenceList does
  const fetchEmployees = useCallback(async () => {
    if (!accessToken) return

    setEmployeesLoading(true)
    try {
      // EXACT same query as AbsenceList for employees
      const employeesQuery = `
        query GetEmployees {
          Employee(
            limit: 500
            orderBy: [{ firstName: ASC }, { lastName: ASC }]
            where: { isDeleted: { _eq: false } }
          ) {
            id
            firstName
            lastName
            employeePosition {
              organizationalUnit {
                name
              }
            }
          }
        }
      `

      const result = await graphQLClient.request(employeesQuery)
      setEmployees(result?.Employee || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
      setEmployees([])
    } finally {
      setEmployeesLoading(false)
    }
  }, [graphQLClient, accessToken])

  // Separate org units fetching like AbsenceList does
  const fetchOrganizationalUnits = useCallback(async () => {
    if (!accessToken) return

    setOrgUnitsLoading(true)
    try {
      const orgUnitsQuery = `
        query GetOrganizationalUnitsFromEmployees {
          Employee(
            where: {
              isDeleted: { _eq: false },
              employeePosition: {
                organizationalUnit: { id: { _isNull: false } }
              }
            }
          ) {
            employeePosition {
              organizationalUnit {
                id
                name
              }
            }
          }
        }
      `

      const result = await graphQLClient.request(orgUnitsQuery)
      const orgUnits =
        result?.Employee?.map((emp: any) => emp.employeePosition?.organizationalUnit)
          ?.filter((org: any) => org && org.name)
          ?.reduce((unique: any[], org: any) => {
            if (!unique.find((u: any) => u.id === org.id)) {
              unique.push(org)
            }
            return unique
          }, []) || []

      setOrganizationalUnits(orgUnits)
    } catch (error) {
      console.error('Error fetching org units:', error)
      setOrganizationalUnits([])
    } finally {
      setOrgUnitsLoading(false)
    }
  }, [graphQLClient, accessToken])

  // Load employees and org units on mount like AbsenceList
  useEffect(() => {
    fetchEmployees()
    fetchOrganizationalUnits()
  }, [fetchEmployees, fetchOrganizationalUnits])

  // Fetch catalog data once on mount (like AbsenceList does)
  useEffect(() => {
    const fetchCatalogData = async () => {
      if (!accessToken) return

      try {
        // Ensure catalog client has access token (like dashboard does)
        catalogClient.setAccessToken(accessToken)

        // Fetch AbsenceType catalog with ALL required parameters like manager-absences
        const typesCatalogData = await catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'AbsenceType', version: 'v1' },
          {
            limit: 100,
            offset: 0,
            returnTotalRecords: true,
            includeChildCatalogEntries: true
          }
        )

        // Map types EXACTLY like AbsenceList maps groups
        const typesMap: Record<string, string> = {}
        typesCatalogData.data.forEach((entry: any) => {
          typesMap[entry.id] = entry.value
          // Map by both the main id and the catalogEntryLocalId for compatibility
          if (entry.catalogEntryLocalId) {
            typesMap[entry.catalogEntryLocalId] = entry.value
          }
        })
        setAbsenceTypesMap(typesMap)
      } catch (err) {
        console.error('❌ Error loading catalog:', err)
      }
    }

    fetchCatalogData()
  }, [accessToken])

  // Initial load effect - wait for both accessToken and employees to be loaded
  useEffect(() => {
    if (!initialLoadDone.current && accessToken && employees.length > 0) {
      initialLoadDone.current = true
      fetchEntitlements()
    }
  }, [accessToken, employees.length])

  // Pagination effect - fetch new page when currentPage changes
  useEffect(() => {
    if (initialLoadDone.current) {
      fetchEntitlements()
    }
  }, [currentPage])

  // Search and filter effects - reset to page 1 and fetch
  useEffect(() => {
    if (initialLoadDone.current) {
      setCurrentPage(1) // Reset pagination like AbsenceList
      // fetchEntitlements will be called by the currentPage useEffect above
    }
  }, [search, JSON.stringify(selectedFilters), pageSize])

  // Main data fetching function (like AbsenceList fetchAbsences)
  const fetchEntitlements = async () => {
    if (!accessToken) return

    try {
      // ✅ KEY FIX: Only show loading on initial load, not filter changes
      if (!initialLoadDone.current) {
        setLoading(true)
      }
      setError(null)

      // Create employee lookup map from state (employees fetched separately)
      const employeesMap: Record<string, any> = {}
      employees.forEach((emp: any) => {
        employeesMap[emp.id] = emp
      })

      // Fetch entitlements data with GraphQL variables like AbsenceList
      const whereConditions = buildWhereConditions()

      // Build order by clause (map sort fields to GraphQL field names)
      const orderBy: any[] = []
      if (sortField && sortOrder) {
        const graphqlSortOrder = sortOrder.toUpperCase() // Convert to uppercase for GraphQL
        if (sortField === 'employeeName') {
          // For employee name, we can't sort directly since it's computed client-side
          // Sort by employeeId instead (not ideal but functional)
          orderBy.push({ employeeId: graphqlSortOrder })
        } else if (sortField === 'organizationalUnit') {
          // This field is also computed, skip sorting for now
          orderBy.push({ employeeId: graphqlSortOrder })
        } else if (sortField === 'absenceType') {
          // Sort by type value
          orderBy.push({ type: { value: graphqlSortOrder } })
        } else {
          // Direct mapping for other fields
          orderBy.push({ [sortField]: graphqlSortOrder })
        }
      } else {
        orderBy.push({ employeeId: 'ASC' })
      }

      const query = getDetailedEntitlementsQuery()
      const result = await graphQLClient.request<{
        EmployeeAbsenceEntitlement: any[]
        EmployeeAbsenceEntitlementAggregate: { aggregate: { count: number } }
      }>(query, {
        where: whereConditions,
        offset: (currentPage - 1) * pageSize,
        limit: pageSize,
        orderBy: orderBy
      })

      // Transform data using EXACT same pattern as AbsenceList for type mapping
      const transformedData: DetailedEntitlement[] = result.EmployeeAbsenceEntitlement.map((ent: any) => {
        const employee = employeesMap[ent.employeeId]

        // Use EXACT same pattern as AbsenceList for type mapping
        const typeName = absenceTypesMap[ent.type?.id] || ent.type?.value || 'Unknown Type'

        // Log any unmapped types for debugging
        if (typeName === 'Unknown Type') {
          console.warn('❌ Unmapped absence type:', {
            typeId: ent.type?.id,
            typeValue: ent.type?.value
          })
        }

        return {
          id: ent.id, // Use entitlement ID for unique keys
          employeeId: ent.employeeId || '',
          employeeName: employee ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() : 'Unknown Employee',
          organizationalUnit: employee?.employeePosition?.organizationalUnit?.name || 'No Department',
          absenceType: typeName, // Use dashboard pattern
          absenceTypeId: ent.type?.id || '',
          entitlement: ent.total || 0,
          validFrom: ent.validFrom || '',
          validTo: ent.validTo || '',
          used: ent.approved || 0, // Use approved field as "used"
          available: ent.available || 0,
          status: ent.available > 0 ? 'Active' : 'Expired'
        }
      })

      setEntitlements(transformedData)
      setTotal(result.EmployeeAbsenceEntitlementAggregate.aggregate.count)
    } catch (err) {
      console.error('❌ Error loading entitlements:', err)
      setError(err instanceof Error ? err.message : 'Failed to load entitlements data')
    } finally {
      setLoading(false)
    }
  }

  // Filtering and sorting logic
  const getEmployeeFilters = useCallback(
    (searchTerm: string) => {
      // FIXED: Show selected employees when no search term (like AbsenceList shows selected departments)
      if (!searchTerm || searchTerm.trim().length < 3) {
        // Get currently selected employees
        const selectedEmployeeIds = selectedFilters.filter(f => !f.startsWith('department-') && !f.startsWith('type-'))
        const selectedEmployees = employees.filter(employee => selectedEmployeeIds.includes(employee.id))

        return {
          filters: selectedEmployees.map(employee => ({
            id: employee.id,
            label: `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unknown Employee',
            selected: true // These are all selected employees
          })),
          loading: employeesLoading,
          error: null
        }
      }

      // FIXED: Only search employee names, not org units
      const filteredEmployees = employees.filter(employee => {
        const firstName = employee.firstName || ''
        const lastName = employee.lastName || ''
        const fullName = `${firstName} ${lastName}`.toLowerCase()
        return fullName.includes(searchTerm.toLowerCase())
      })

      const filterResults = filteredEmployees.map(employee => ({
        id: employee.id,
        label: `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unknown Employee',
        selected: selectedFilters.includes(employee.id)
      }))

      return {
        filters: filterResults,
        loading: employeesLoading, // Use real loading state
        error: null
      }
    },
    [employees, selectedFilters, employeesLoading]
  )

  const getDepartmentFilters = useCallback(
    (searchTerm: string) => {
      const selectedDepartmentIds = selectedFilters
        .filter(f => f.startsWith('department-'))
        .map(f => f.replace('department-', ''))

      const selectedDepartments = organizationalUnits.filter(department =>
        selectedDepartmentIds.includes(department.id)
      )

      if (!searchTerm || searchTerm.trim().length < 3) {
        return {
          filters: selectedDepartments.map(department => ({
            id: `department-${department.id}`,
            label: department.name || 'Unknown Department',
            selected: true
          })),
          loading: orgUnitsLoading, // Use real loading state
          error: null
        }
      }

      const filteredDepartments = organizationalUnits.filter(department => {
        const name = department.name || ''
        return name.toLowerCase().includes(searchTerm.toLowerCase())
      })

      return {
        filters: filteredDepartments.map(department => ({
          id: `department-${department.id}`,
          label: department.name || 'Unknown Department',
          selected: selectedFilters.includes(`department-${department.id}`)
        })),
        loading: orgUnitsLoading, // Use real loading state
        error: null
      }
    },
    [organizationalUnits, selectedFilters, orgUnitsLoading]
  )

  // Get absence types for filtering (from catalog)
  const absenceTypeFilters = useMemo(() => {
    const uniqueTypes = Array.from(new Set(entitlements.map(e => e.absenceTypeId)))
      .filter(Boolean)
      .map(typeId => ({
        id: `type-${typeId}`,
        label: absenceTypesMap[typeId] || 'Unknown Type',
        selected: selectedFilters.includes(`type-${typeId}`)
      }))

    return uniqueTypes
  }, [entitlements, absenceTypesMap, selectedFilters])

  // Filter configuration
  const filterGroups: DataFilterGroup[] = [
    {
      id: 'employee',
      title: 'Employee',
      backendSearch: getEmployeeFilters
    },
    {
      id: 'department',
      title: 'Org Unit',
      backendSearch: getDepartmentFilters
    },
    {
      id: 'absenceType',
      title: 'Absence Type',
      filters: absenceTypeFilters
    }
  ]

  // Handlers
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const handleFilterChange = (filterId: string, selected: boolean) => {
    setSelectedFilters(prev => {
      const newFilters = selected ? [...prev, filterId] : prev.filter(f => f !== filterId)

      // Filter selection should now work smoothly without page refresh

      return newFilters
    })
    setCurrentPage(1) // Reset to first page when filters change
  }

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    setCurrentPage(1) // Reset to first page when search changes
  }, []) // Remove search dependency to prevent dropdown closing

  const handlePaginationChange = (page: number, newPageSize?: number) => {
    setCurrentPage(page)
    if (newPageSize && newPageSize !== pageSize) {
      setPageSize(newPageSize)
      setCurrentPage(1)
    }
  }

  // Filter label map for display
  const filterLabelMap = useMemo(() => {
    const map: Record<string, string> = {}

    employees.forEach(emp => {
      map[emp.id] = `${emp.firstName || ''} ${emp.lastName || ''}`.trim()
    })

    organizationalUnits.forEach(org => {
      map[`department-${org.id}`] = org.name || 'Unknown Department'
    })

    // Use absence type IDs and names from catalog
    Object.entries(absenceTypesMap).forEach(([id, name]) => {
      map[`type-${id}`] = name
    })

    return map
  }, [employees, organizationalUnits, absenceTypesMap])

  // Summary statistics based on filtered data
  const summaryStats = useMemo(() => {
    if (total === 0) return null

    const totalEmployees = new Set(entitlements.map(e => e.employeeId)).size
    const totalEntitlements = entitlements.reduce((sum, e) => sum + e.entitlement, 0)
    const totalUsed = entitlements.reduce((sum, e) => sum + e.used, 0)
    const totalAvailable = entitlements.reduce((sum, e) => sum + e.available, 0)

    return {
      totalEmployees,
      totalEntitlements,
      totalUsed,
      totalAvailable,
      utilizationRate: totalEntitlements > 0 ? ((totalUsed / totalEntitlements) * 100).toFixed(1) : '0'
    }
  }, [entitlements, total])

  if (loading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:min-h-[400px]">
        <Spin size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6">
        <Alert message="Error Loading Entitlements" description={error} type="error" showIcon />
      </div>
    )
  }

  // Table component
  const EntitlementsTable: React.FC = () => {
    const totalPages = Math.ceil(total / pageSize)

    if (loading) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-8" data-testid="entitlements-table-loading">
          <Spinner />
        </div>
      )
    }

    if (error) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-8" data-testid="entitlements-table-error">
          <div className="gba:text-center">
            <p className="gba:text-destructive gba:mb-2">{error}</p>
            <Button onClick={() => window.location.reload()}>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.absence_list.retry',
                'Retry'
              )}
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div data-testid="entitlements-table-container">
        <div className="gba:overflow-x-auto">
          <Table data-testid="entitlements-table">
            <TableHeader>
              <TableRow className="gba:border-b gba:bg-muted">
                <TableHead
                  className="gba:w-[20%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-muted"
                  onClick={() => handleSort('employeeName')}
                  data-testid="entitlements-employee-header"
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:absence_management_hub_backoffice.summary_statistics.name',
                      'Name'
                    )}
                    {renderSortIcon('employeeName', sortField, sortOrder)}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[15%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-muted"
                  onClick={() => handleSort('organizationalUnit')}
                  data-testid="entitlements-org-unit-header"
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:absence_management_hub_backoffice.summary_statistics.org_unit',
                      'Org Unit'
                    )}
                    {renderSortIcon('organizationalUnit', sortField, sortOrder)}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[15%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-muted"
                  onClick={() => handleSort('absenceType')}
                  data-testid="entitlements-absence-type-header"
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:absence_management_hub_backoffice.summary_statistics.absence_type',
                      'Absence Type'
                    )}
                    {renderSortIcon('absenceType', sortField, sortOrder)}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[12%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-muted"
                  onClick={() => handleSort('entitlement')}
                  data-testid="entitlements-entitlement-header"
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:absence_management_hub_backoffice.summary_statistics.entitlement',
                      'Entitlement'
                    )}
                    {renderSortIcon('entitlement', sortField, sortOrder)}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[12%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-muted"
                  onClick={() => handleSort('validFrom')}
                  data-testid="entitlements-valid-from-header"
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:absence_management_hub_backoffice.summary_statistics.valid_from',
                      'Valid From'
                    )}
                    {renderSortIcon('validFrom', sortField, sortOrder)}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[12%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-muted"
                  onClick={() => handleSort('validTo')}
                  data-testid="entitlements-valid-to-header"
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:absence_management_hub_backoffice.summary_statistics.valid_to',
                      'Valid To'
                    )}
                    {renderSortIcon('validTo', sortField, sortOrder)}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[12%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-muted"
                  onClick={() => handleSort('used')}
                  data-testid="entitlements-used-header"
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:absence_management_hub_backoffice.summary_statistics.used',
                      'Used'
                    )}
                    {renderSortIcon('used', sortField, sortOrder)}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entitlements.map(entitlement => (
                <TableRow
                  key={entitlement.id}
                  className="gba:border-b gba:hover:bg-muted gba:transition-colors"
                  data-testid={`entitlements-row-${entitlement.id}`}
                >
                  <TableCell className="gba:py-4 gba:px-6" data-testid={`entitlements-employee-cell-${entitlement.id}`}>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <PiUser size={16} className="gba:text-muted-foreground" />
                      <span className="gba:font-medium gba:text-sm">{entitlement.employeeName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="gba:py-4 gba:px-6" data-testid={`entitlements-org-unit-cell-${entitlement.id}`}>
                    <span className="gba:text-sm">{entitlement.organizationalUnit}</span>
                  </TableCell>
                  <TableCell
                    className="gba:py-4 gba:px-6"
                    data-testid={`entitlements-absence-type-cell-${entitlement.id}`}
                  >
                    <span className="gba:text-sm">{entitlement.absenceType}</span>
                  </TableCell>
                  <TableCell
                    className="gba:py-4 gba:px-6"
                    data-testid={`entitlements-entitlement-cell-${entitlement.id}`}
                  >
                    <span className="gba:text-sm gba:font-medium gba:text-right">{entitlement.entitlement}</span>
                  </TableCell>
                  <TableCell
                    className="gba:py-4 gba:px-6"
                    data-testid={`entitlements-valid-from-cell-${entitlement.id}`}
                  >
                    {entitlement.validFrom ? (
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiCalendar size={16} className="gba:text-muted-foreground" />
                        <span className="gba:text-sm">{formatDateForDisplay(entitlement.validFrom)}</span>
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="gba:py-4 gba:px-6" data-testid={`entitlements-valid-to-cell-${entitlement.id}`}>
                    {entitlement.validTo ? (
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiCalendar size={16} className="gba:text-muted-foreground" />
                        <span className="gba:text-sm">{formatDateForDisplay(entitlement.validTo)}</span>
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="gba:py-4 gba:px-6" data-testid={`entitlements-used-cell-${entitlement.id}`}>
                    <span className="gba:text-sm gba:font-medium gba:text-right">{entitlement.used}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer - match AbsenceListTable design */}
        {totalPages > 1 ? (
          <div
            className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-4"
            data-testid="entitlements-pagination"
          >
            <div className="gba:text-sm gba:text-muted-foreground" data-testid="entitlements-pagination-info">
              {`${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, total)} ${getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.of', 'of')} ${total} ${getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.summary_statistics.pagination_entitlements', 'entitlements')}`}
            </div>
            <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
              <div className="gba:flex gba:items-center gba:space-x-2">
                <p className="gba:text-sm gba:font-medium">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.rows_per_page', 'Rows per page')}
                </p>
                <select
                  value={pageSize}
                  onChange={e => handlePaginationChange(1, Number(e.target.value))}
                  className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                  data-testid="entitlements-page-size-select"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div
                className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium"
                data-testid="entitlements-page-info"
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.page', 'Page')} {currentPage}{' '}
                {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.of', 'of')} {totalPages}
              </div>
              <div className="gba:flex gba:items-center gba:space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => handlePaginationChange(1)}
                  disabled={currentPage === 1}
                  data-testid="entitlements-first-page-button"
                >
                  <span className="gba:sr-only">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:absence_management_hub_backoffice.absence_list.go_to_first_page',
                      'Go to first page'
                    )}
                  </span>
                  «
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => handlePaginationChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  data-testid="entitlements-previous-page-button"
                >
                  <span className="gba:sr-only">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:absence_management_hub_backoffice.absence_list.go_to_previous_page',
                      'Go to previous page'
                    )}
                  </span>
                  ‹
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => handlePaginationChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  data-testid="entitlements-next-page-button"
                >
                  <span className="gba:sr-only">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:absence_management_hub_backoffice.absence_list.go_to_next_page',
                      'Go to next page'
                    )}
                  </span>
                  ›
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => handlePaginationChange(totalPages)}
                  disabled={currentPage >= totalPages}
                  data-testid="entitlements-last-page-button"
                >
                  <span className="gba:sr-only">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:absence_management_hub_backoffice.absence_list.go_to_last_page',
                      'Go to last page'
                    )}
                  </span>
                  »
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-4"
            data-testid="entitlements-pagination-info-single-page"
          >
            <div className="gba:text-sm gba:text-muted-foreground">
              {`${total} ${getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.summary_statistics.employee_entitlements', 'entitlements')}`}
            </div>
            <div className="gba:flex gba:items-center gba:space-x-2">
              <p className="gba:text-sm gba:font-medium">
                {getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.rows_per_page', 'Rows per page')}
              </p>
              <select
                value={pageSize}
                onChange={e => handlePaginationChange(1, Number(e.target.value))}
                className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                data-testid="entitlements-page-size-select-single"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div data-testid="entitlements-details-page" className="gba:space-y-6">
      {/* Back Navigation */}
      <div className="gba:mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onNavigateBack}
          className="gba:flex gba:items-center gba:gap-2"
          data-testid="back-to-dashboard-button"
        >
          <PiArrowLeft size={16} />
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:team_expenses_page.dashboard_tab.back_to_btn',
            'Back to Dashboard'
          )}
        </Button>
      </div>

      {/* Page Header */}
      <div className="gba:bg-white gba:p-6 gba:rounded-lg gba:border gba:shadow-sm">
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-3">
            <PiUsers size={24} className="gba:text-info" />
            <div>
              <h1 className="gba:text-2xl gba:font-bold gba:text-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_backoffice.summary_statistics.title_vacation',
                  'Vacation Entitlements Details'
                )}
              </h1>
              <p className="gba:text-muted-foreground gba:mt-1">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_backoffice.summary_statistics.description',
                  'Complete breakdown of all employee vacation entitlements and usage'
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      {summaryStats && (
        <div className="gba:bg-white gba:p-6 gba:rounded-lg gba:border gba:shadow-sm">
          <h3 className="gba:text-lg gba:font-medium gba:mb-4 gba:flex gba:items-center gba:gap-2">
            <PiCalendarBlank size={20} className="gba:text-info" />
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_backoffice.summary_statistics.title',
              'Summary Statistics (Filtered Results)'
            )}
          </h3>
          <div className="gba:grid gba:grid-cols-2 gba:md:grid-cols-5 gba:gap-4">
            <div className="gba:text-center gba:p-3 gba:bg-info-secondary gba:rounded">
              <div className="gba:text-lg gba:font-bold gba:text-info">{summaryStats.totalEmployees}</div>
              <div className="gba:text-xs gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_backoffice.summary_statistics.total_employees',
                  'Total Employees'
                )}
              </div>
            </div>
            <div className="gba:text-center gba:p-3 gba:bg-success-secondary gba:rounded">
              <div className="gba:text-lg gba:font-bold gba:text-success">{summaryStats.totalEntitlements}</div>
              <div className="gba:text-xs gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_backoffice.summary_statistics.total_entitlement_days',
                  'Total Entitlement Days'
                )}
              </div>
            </div>
            <div className="gba:text-center gba:p-3 gba:bg-warning-secondary gba:rounded">
              <div className="gba:text-lg gba:font-bold gba:text-warning">{summaryStats.totalUsed}</div>
              <div className="gba:text-xs gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_backoffice.summary_statistics.days_used',
                  'Days Used'
                )}
              </div>
            </div>
            <div className="gba:text-center gba:p-3 gba:bg-info-secondary gba:rounded">
              <div className="gba:text-lg gba:font-bold gba:text-info">{summaryStats.totalAvailable}</div>
              <div className="gba:text-xs gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_backoffice.summary_statistics.days_available',
                  'Days Available'
                )}
              </div>
            </div>
            <div className="gba:text-center gba:p-3 gba:bg-muted gba:rounded">
              <div className="gba:text-lg gba:font-bold gba:text-muted-foreground">{summaryStats.utilizationRate}%</div>
              <div className="gba:text-xs gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_backoffice.summary_statistics.utilization_rate',
                  'Utilization Rate'
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DataContainer with filtering and table */}
      <DataContainer
        dataControllerProps={{
          search,
          setSearch: handleSearchChange,
          debounceDelay: 500,
          filter: selectedFilters,
          setFilter: setSelectedFilters,
          filterLabelMap,
          listTitle: (
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span>
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:absence_management_hub_backoffice.summary_statistics.employee_entitlements',
                    'Employee Entitlements'
                  )}
                </span>
                <span className="gba:text-muted-foreground">({total})</span>
              </div>
            </div>
          )
        }}
        dataFilterProps={{
          filterGroups,
          onFilterChange: handleFilterChange
        }}
        dataBody={
          <div data-testid="entitlements-table-container">
            <EntitlementsTable />
          </div>
        }
      />
    </div>
  )
}

export default EntitlementsDetails

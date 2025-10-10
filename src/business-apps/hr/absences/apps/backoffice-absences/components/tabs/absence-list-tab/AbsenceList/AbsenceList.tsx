import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { DataContainer } from '../../../../../../../../../components/layout/dataContainer'
import { BusinessAppContextProps } from '../../../../../../../../../common/BusinessAppContext'
import { useGraphQLClient } from '../../../../../../../../../common/network/graphql/useGraphQLClient'
import { useCatalogManagerClient } from '../../../../../../../../../common/network/catalogs/useCatalogManagerClient'
import {
  getTranslationFromI18nKeyAndLabel,
  getCurrentActiveUserLocale
} from '../../../../../../../../../common/utils/windowUtils'
import dayjs from 'dayjs'
import { DateRangeFilter } from './DateRangeFilter'
import { CreationDateFilter } from './CreationDateFilter'
import { AbsenceListTable } from './AbsenceListTable'
import { EnhancedAbsence, DataFilterGroup } from '../../../../types'

// Hardcoded statuses (these are actual status values)
const ABSENCE_STATUSES = [
  { id: 'PENDING', name: 'Pending' },
  { id: 'APPROVED', name: 'Approved' },
  { id: 'REJECTED', name: 'Rejected' },
  { id: 'CANCELLED', name: 'Cancelled' }
]

// Extended interface for AbsenceList with initial filters
interface AbsenceListProps extends BusinessAppContextProps {
  initialFilters?: {
    startDate?: string
    endDate?: string
    status?: string
    department?: string
    departmentId?: string
  }
  preFilteredData?: EnhancedAbsence[] // RESTORED for testing drill-down context
  onDataChange?: (data: {
    absences: EnhancedAbsence[]
    total: number
    isFiltered: boolean
    appliedFilters: {
      search?: string
      selectedFilters: string[]
      dateRange?: { startDate?: string; endDate?: string }
      creationDateRange?: { startDate?: string; endDate?: string }
    }
  }) => void
}

/**
 * Modern Absence List component with server-side pagination
 */
export const AbsenceList: React.FC<AbsenceListProps> = props => {
  const { accessToken, initialFilters, onDataChange } = props
  const graphQLClient = useGraphQLClient(accessToken)
  const catalogClient = useCatalogManagerClient(accessToken)

  // State management following manager-absences pattern
  const [search, setSearch] = useState('')
  // Seed initial filters from navigation to ensure first fetch matches dashboard (especially status)
  const seededInitialFilters = React.useMemo(() => {
    const seeds: string[] = []
    if (initialFilters?.status) {
      seeds.push(`status-${String(initialFilters.status).toUpperCase()}`)
    }
    if (initialFilters?.departmentId) {
      seeds.push(`department-${initialFilters.departmentId}`)
    }
    if (initialFilters?.department === 'NO_DEPARTMENT_SPECIAL') {
      seeds.push('department-no-department')
    }
    return seeds
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [selectedFilters, setSelectedFilters] = useState<string[]>(seededInitialFilters)
  const [absences, setAbsences] = useState<EnhancedAbsence[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState('')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC' | ''>('DESC')
  const [selectedAbsence, setSelectedAbsence] = useState<EnhancedAbsence | null>(null)
  const [absenceGroups, setAbsenceGroups] = useState<Record<string, string>>({})
  const [originalAbsenceGroups, setOriginalAbsenceGroups] = useState<Record<string, string>>({})
  const [teamEmployees, setTeamEmployees] = useState<any[]>([])
  const [employeesLoading, setEmployeesLoading] = useState(false)
  const [organizationalUnits, setOrganizationalUnits] = useState<any[]>([])
  const [orgUnitsLoading, setOrgUnitsLoading] = useState(false)

  // Date range state (exactly like manager-absences)
  // Initialize default current-year range unless pre-filtered or explicit initial filters provided
  const defaultStartOfYear = dayjs().startOf('year').format('YYYY-MM-DD')
  const defaultEndOfYear = dayjs().endOf('year').format('YYYY-MM-DD')
  const [startDate, setStartDate] = useState<string | undefined>(initialFilters?.startDate ?? defaultStartOfYear)
  const [endDate, setEndDate] = useState<string | undefined>(initialFilters?.endDate ?? defaultEndOfYear)
  const [creationStartDate, setCreationStartDate] = useState<string | undefined>(undefined)
  const [creationEndDate, setCreationEndDate] = useState<string | undefined>(undefined)

  // Track initial load to prevent unnecessary re-renders
  const initialLoadDone = useRef(false)

  // (Removed effect: defaults applied at initialization to avoid unbounded initial fetch)

  const fetchAbsences = async () => {
    if (!accessToken) {
      return
    }

    // Always use server-side filtering

    // 🚀 ORIGINAL: Server-side pagination when no preFilteredData
    try {
      if (!initialLoadDone.current) {
        setLoading(true)
      } else {
      }

      // Build where conditions from a single source of truth
      const conditions: any = buildWhereConditions()

      // Build order by clause
      let orderBy: any[] = []
      if (sortField && sortOrder) {
        const graphqlSortOrder = sortOrder.toUpperCase() // Convert to uppercase for GraphQL
        if (sortField === 'employeeName') {
          orderBy.push({ employee: { firstName: graphqlSortOrder } })
          orderBy.push({ employee: { lastName: graphqlSortOrder } })
        } else if (sortField === 'groupName') {
          orderBy.push({ type: { value: graphqlSortOrder } })
        } else {
          orderBy.push({ [sortField]: graphqlSortOrder })
        }
      } else {
        orderBy.push({ createdAt: 'DESC' })
      }

      // Real GraphQL query for absences (based on manager-absences pattern)
      const query = `
        query GetEmployeeAbsences($where: EmployeeAbsenceBoolExp!, $offset: Int!, $limit: Int!, $orderBy: [EmployeeAbsenceOrderBy!]) {
          EmployeeAbsence(where: $where, offset: $offset, limit: $limit, orderBy: $orderBy) {
            id
            startDate
            endDate
            status
            calendarDays
            effectiveDays
            createdAt
            type {
              id
              value
              parentEntryId
              parentEntry {
                objectValue
                translations {
                  localeCode
                  value
                }
                id
                value
              }
            }
            employee {
              id
              firstName
              lastName
              employeePosition {
                id
                organizationalUnit {
                  id
                  name
                }
              }
            }
          }
          EmployeeAbsenceAggregate(where: $where) {
            aggregate {
              count
            }
          }
        }
      `

      const variables = {
        where: conditions,
        offset: (currentPage - 1) * pageSize,
        limit: pageSize,
        orderBy: orderBy
      }

      const result = await graphQLClient.request(query, variables)

      // Transform and enhance the data (similar to dashboard processing)
      const enhancedAbsences: EnhancedAbsence[] = result.EmployeeAbsence.map((absence: any) => {
        // Ensure employee object exists and has required properties
        const employee = absence.employee || {}
        const employeeName =
          employee.firstName || employee.lastName
            ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unknown Employee'
            : 'Unknown Employee'

        return {
          ...absence,
          employee: {
            id: employee.id || '',
            firstName: employee.firstName || '',
            lastName: employee.lastName || '',
            employeePosition: employee.employeePosition || null
          },
          employeeName,
          groupName:
            absence.type?.parentEntryId && absenceGroups[absence.type.parentEntryId]
              ? absenceGroups[absence.type.parentEntryId]
              : 'Unknown Group',
          originalGroupName:
            absence.type?.parentEntryId && originalAbsenceGroups[absence.type.parentEntryId]
              ? originalAbsenceGroups[absence.type.parentEntryId]
              : absence.type?.value || 'Unknown Group',
          typeName: absence.type?.value || 'Unknown Type',
          color: extractColorFromObjectValue(absence.type?.parentEntry?.objectValue)
        }
      })

      setAbsences(enhancedAbsences)
      setTotal(result.EmployeeAbsenceAggregate.aggregate.count)

      // Notify parent component with current data
      if (onDataChange) {
        onDataChange({
          absences: enhancedAbsences,
          total: result.EmployeeAbsenceAggregate.aggregate.count,
          isFiltered: selectedFilters.length > 0 || !!search,
          appliedFilters: {
            search,
            selectedFilters,
            dateRange: { startDate, endDate },
            creationDateRange: { startDate: creationStartDate, endDate: creationEndDate }
          }
        })
      }
    } catch (error) {
      console.error('Error fetching absences:', error)
      setError(error instanceof Error ? error : new Error('Failed to fetch absences'))
      setAbsences([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  // Effect 1: Initial load
  useEffect(() => {
    if (!accessToken || initialLoadDone.current) return
    initialLoadDone.current = true
    fetchAbsences()
  }, [accessToken])

  // Effect 2: Search and filter changes (reset to page 1)
  useEffect(() => {
    if (!initialLoadDone.current || !accessToken) return
    // If we're not on page 1, reset to page 1 (Effect 3 will fetch)
    if (currentPage !== 1) {
      setCurrentPage(1)
      return
    }
    // Already on page 1: fetch once
    fetchAbsences()
  }, [search, JSON.stringify(selectedFilters), pageSize, startDate, endDate, creationStartDate, creationEndDate])

  // Effect 2b: When organizational units load/update and a department filter is active, ensure fetch reflects mapped names
  useEffect(() => {
    if (!initialLoadDone.current || !accessToken) return
    const hasDepartmentFilter =
      selectedFilters.some(f => f.startsWith('department-')) || selectedFilters.includes('department-no-department')
    if (!hasDepartmentFilter) return
    if (currentPage !== 1) {
      setCurrentPage(1)
      return
    }
    fetchAbsences()
  }, [organizationalUnits])

  // Effect 3: Pagination, sorting, and after page reset
  useEffect(() => {
    if (initialLoadDone.current && accessToken) {
      fetchAbsences()
    }
  }, [currentPage, sortField, sortOrder])

  // Fetch team employees for the requester filter
  const fetchTeamEmployees = useCallback(async () => {
    if (!accessToken) return

    setEmployeesLoading(true)
    try {
      // Real query to get all employees for backoffice view (wider scope than just team)
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
      const employees = result?.Employee || []

      // Deduplicate employees by ID to avoid duplicates from the database
      const uniqueEmployees = employees.reduce((acc: any[], employee: any) => {
        if (!acc.find((emp: any) => emp.id === employee.id)) {
          acc.push(employee)
        }
        return acc
      }, [])

      setTeamEmployees(uniqueEmployees)
    } catch (error) {
      console.error('Error fetching employees:', error)
      setTeamEmployees([])
    } finally {
      setEmployeesLoading(false)
    }
  }, [graphQLClient, accessToken])

  // Load team employees on mount
  useEffect(() => {
    fetchTeamEmployees()
  }, [fetchTeamEmployees])

  // 🚀 FIX: Always fetch absence groups catalog data (regardless of preFilteredData)
  useEffect(() => {
    const fetchAbsenceGroupsCatalog = async () => {
      if (!accessToken) return

      try {
        const userLocale = getCurrentActiveUserLocale()

        // Fetch translated catalog data for absence groups
        const translatedCatalogData = await catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'AbsenceGroup', version: 'v1' },
          { limit: 100, offset: 0, returnTotalRecords: true, localeCode: userLocale }
        )

        // Fetch original English catalog data for color lookup
        const originalCatalogData = await catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'AbsenceGroup', version: 'v1' },
          { limit: 100, offset: 0, returnTotalRecords: true, localeCode: 'en-US' }
        )

        const translatedGroupsMap: Record<string, string> = {}
        translatedCatalogData.data.forEach((entry: any) => {
          translatedGroupsMap[entry.id] = entry.value
          // Only add catalogEntryLocalId mapping for data processing, not for filter display
          if (entry.catalogEntryLocalId) {
            translatedGroupsMap[entry.catalogEntryLocalId] = entry.value
          }
        })

        const originalGroupsMap: Record<string, string> = {}
        originalCatalogData.data.forEach((entry: any) => {
          originalGroupsMap[entry.id] = entry.value
          // Only add catalogEntryLocalId mapping for data processing, not for filter display
          if (entry.catalogEntryLocalId) {
            originalGroupsMap[entry.catalogEntryLocalId] = entry.value
          }
        })

        setAbsenceGroups(translatedGroupsMap)
        setOriginalAbsenceGroups(originalGroupsMap)
      } catch (error) {
        console.error('❌ Error fetching absence groups catalog:', error)
        setAbsenceGroups({})
        setOriginalAbsenceGroups({})
      }
    }

    fetchAbsenceGroupsCatalog()
  }, [accessToken, catalogClient])

  // Fetch organizational units for department filter (only those with employees)
  const fetchOrganizationalUnits = useCallback(async () => {
    if (!accessToken) return

    setOrgUnitsLoading(true)
    try {
      // Query to get organizational units from employees (same as CalendarList)
      const orgUnitsQuery = `
        query GetOrganizationalUnitsFromEmployees {
          Employee(
            where: {
              isDeleted: { _eq: false }
            }
            limit: 1000
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

      // Extract unique organizational units from employees
      const orgUnitsMap = new Map<string, { id: string; name: string }>()

      result?.Employee?.forEach((employee: any) => {
        if (employee.employeePosition?.organizationalUnit) {
          const orgUnit = employee.employeePosition.organizationalUnit
          orgUnitsMap.set(orgUnit.id, {
            id: orgUnit.id,
            name: orgUnit.name
          })
        }
      })

      const uniqueOrgUnits = Array.from(orgUnitsMap.values()).sort((a, b) => a.name.localeCompare(b.name))
      setOrganizationalUnits(uniqueOrgUnits)
    } catch (error) {
      console.error('Error fetching organizational units:', error)
      setOrganizationalUnits([])
    } finally {
      setOrgUnitsLoading(false)
    }
  }, [graphQLClient, accessToken])

  // Load organizational units on mount
  useEffect(() => {
    fetchOrganizationalUnits()
  }, [fetchOrganizationalUnits])

  // Extract color from GraphQL objectValue
  const extractColorFromObjectValue = (objectValue: any): string => {
    if (!objectValue || typeof objectValue !== 'object') {
      return '#6b7280' // Default fallback color
    }

    const color = objectValue.color
    if (!color) {
      return '#6b7280' // Default fallback color
    }

    // Add # prefix if missing
    return color.startsWith('#') ? color : `#${color}`
  }

  // Format date for filter display (matching manager-absences pattern)
  const formatDateForDisplay = (dateString: string) => {
    const userLocale = getCurrentActiveUserLocale()
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString(userLocale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  // Date range handlers (exactly like manager-absences)
  const handleDateRangeChange = useCallback((start?: string, end?: string) => {
    setStartDate(start || undefined)
    setEndDate(end || undefined)
  }, [])

  const handleCreationDateRangeChange = useCallback((start?: string, end?: string) => {
    setCreationStartDate(start || undefined)
    setCreationEndDate(end || undefined)
  }, [])

  // Date range handlers for filter integration
  const handleDateRangeChangeForFilter = useCallback(
    (startDate: string | null, endDate: string | null) => {
      handleDateRangeChange(startDate || undefined, endDate || undefined)
    },
    [handleDateRangeChange]
  )

  const handleCreationDateRangeChangeForFilter = useCallback(
    (startDate: string | null, endDate: string | null) => {
      handleCreationDateRangeChange(startDate || undefined, endDate || undefined)
    },
    [handleCreationDateRangeChange]
  )

  // Build GraphQL where conditions from filters (enhanced with date and department filtering)
  const buildWhereConditions = useCallback(() => {
    const conditions: any = {
      isDeleted: { _eq: false } // Ensure we don't get deleted records
    }

    // Add search condition
    if (search && search.trim()) {
      conditions._or = [
        { employee: { firstName: { _ilike: `%${search.trim()}%` } } },
        { employee: { lastName: { _ilike: `%${search.trim()}%` } } },
        { type: { value: { _ilike: `%${search.trim()}%` } } },
        { employee: { employeePosition: { organizationalUnit: { name: { _ilike: `%${search.trim()}%` } } } } },
        { status: { _ilike: `%${search.trim()}%` } }
      ]
    }

    // Add filters
    const statusFilters = selectedFilters
      .filter(f => f.startsWith('status-'))
      .map(f => f.replace('status-', ''))
      .map(s => String(s).toUpperCase())
    const groupFilters = selectedFilters.filter(f => f.startsWith('group-')).map(f => f.replace('group-', ''))
    const departmentFilters = selectedFilters
      .filter(f => f.startsWith('department-'))
      .map(f => f.replace('department-', ''))
    const employeeFilters = selectedFilters.filter(
      f => !f.startsWith('status-') && !f.startsWith('group-') && !f.startsWith('department-')
    )

    if (statusFilters.length > 0) {
      conditions.status = { _in: statusFilters }
    }

    if (groupFilters.length > 0) {
      // Use the real parentEntryId values directly (no hardcoded mapping)
      conditions.type = { ...conditions.type, parentEntryId: { _in: groupFilters } }
    }

    if (departmentFilters.length > 0) {
      // Check if "No Department" filter is selected
      const hasNoDepartmentFilter = departmentFilters.includes('no-department')
      const regularDepartmentIds = departmentFilters.filter(f => f !== 'no-department')

      let departmentCondition: any = undefined

      if (hasNoDepartmentFilter && regularDepartmentIds.length > 0) {
        // Both regular departments by ID AND "No Department" selected
        departmentCondition = {
          _or: [
            { organizationalUnit: { id: { _in: regularDepartmentIds } } },
            { organizationalUnit: { _isNull: true } }
          ]
        }
      } else if (hasNoDepartmentFilter) {
        // Only "No Department" selected
        departmentCondition = { organizationalUnit: { _isNull: true } }
      } else if (regularDepartmentIds.length > 0) {
        // Only regular departments by ID selected
        departmentCondition = { organizationalUnit: { id: { _in: regularDepartmentIds } } }
      }

      if (departmentCondition) {
        if (conditions.employee) {
          conditions.employee = { ...conditions.employee, employeePosition: departmentCondition }
        } else {
          conditions.employee = { employeePosition: departmentCondition }
        }
      }
    }

    if (employeeFilters.length > 0) {
      const employeeIds = employeeFilters.filter(filter => filter && filter.trim() !== '')
      if (employeeIds.length > 0) {
        if (conditions.employee) {
          conditions.employee = { ...conditions.employee, id: { _in: employeeIds } }
        } else {
          conditions.employee = { id: { _in: employeeIds } }
        }
      }
    }

    // Add date range filters (use ISO with UTC boundaries, aligned with server aggregates)
    if (startDate || endDate) {
      if (startDate && endDate) {
        const [sY, sM, sD] = String(startDate)
          .split('-')
          .map(n => parseInt(n, 10))
        const [eY, eM, eD] = String(endDate)
          .split('-')
          .map(n => parseInt(n, 10))
        const startDateTime = new Date(Date.UTC(sY, (sM || 1) - 1, sD || 1, 0, 0, 0, 0)).toISOString()
        const endDateTime = new Date(Date.UTC(eY, (eM || 1) - 1, eD || 1, 23, 59, 59, 999)).toISOString()
        conditions.startDate = { _lte: endDateTime }
        conditions.endDate = { _gte: startDateTime }
      } else if (startDate) {
        const [sY, sM, sD] = String(startDate)
          .split('-')
          .map(n => parseInt(n, 10))
        const startDateTime = new Date(Date.UTC(sY, (sM || 1) - 1, sD || 1, 0, 0, 0, 0)).toISOString()
        conditions.endDate = { _gte: startDateTime }
      } else if (endDate) {
        const [eY, eM, eD] = String(endDate)
          .split('-')
          .map(n => parseInt(n, 10))
        const endDateTime = new Date(Date.UTC(eY, (eM || 1) - 1, eD || 1, 23, 59, 59, 999)).toISOString()
        conditions.startDate = { _lte: endDateTime }
      }
    }

    // Add creation date range filters (use ISO with UTC boundaries)
    if (creationStartDate || creationEndDate) {
      if (creationStartDate && creationEndDate) {
        const [csY, csM, csD] = String(creationStartDate)
          .split('-')
          .map(n => parseInt(n, 10))
        const [ceY, ceM, ceD] = String(creationEndDate)
          .split('-')
          .map(n => parseInt(n, 10))
        const startDateTime = new Date(Date.UTC(csY, (csM || 1) - 1, csD || 1, 0, 0, 0, 0)).toISOString()
        const endDateTime = new Date(Date.UTC(ceY, (ceM || 1) - 1, ceD || 1, 23, 59, 59, 999)).toISOString()
        conditions.createdAt = { _gte: startDateTime, _lte: endDateTime }
      } else if (creationStartDate) {
        const [csY, csM, csD] = String(creationStartDate)
          .split('-')
          .map(n => parseInt(n, 10))
        const startDateTime = new Date(Date.UTC(csY, (csM || 1) - 1, csD || 1, 0, 0, 0, 0)).toISOString()
        conditions.createdAt = { _gte: startDateTime }
      } else if (creationEndDate) {
        const [ceY, ceM, ceD] = String(creationEndDate)
          .split('-')
          .map(n => parseInt(n, 10))
        const endDateTime = new Date(Date.UTC(ceY, (ceM || 1) - 1, ceD || 1, 23, 59, 59, 999)).toISOString()
        conditions.createdAt = { _lte: endDateTime }
      }
    }

    return conditions
  }, [search, selectedFilters, organizationalUnits, startDate, endDate, creationStartDate, creationEndDate])

  // Map department name to department ID once organizational units are loaded
  useEffect(() => {
    // If departmentId provided, prefer it and seed selectedFilters deterministically
    if (initialFilters?.departmentId) {
      const filterToken = `department-${initialFilters.departmentId}`
      setSelectedFilters(prev => (prev.includes(filterToken) ? prev : [...prev, filterToken]))
      return
    }

    if (initialFilters?.department) {
      // Special handling for "No Department" case
      if (initialFilters.department === 'NO_DEPARTMENT_SPECIAL') {
        setSelectedFilters(prev => {
          if (!prev.includes('department-no-department')) {
            const newFilters = [...prev, 'department-no-department']
            return newFilters
          }
          return prev
        })
        return
      }

      // Regular department mapping (need organizational units loaded)
      if (organizationalUnits.length > 0) {
        const departmentFromName = organizationalUnits.find(dept => dept.name === initialFilters.department)

        if (departmentFromName) {
          const correctDepartmentFilter = `department-${departmentFromName.id}`
          const incorrectDepartmentFilter = `department-${initialFilters.department}`

          // Update selectedFilters to use department ID instead of name
          setSelectedFilters(prev => {
            const filtered = prev.filter(f => f !== incorrectDepartmentFilter)
            if (!filtered.includes(correctDepartmentFilter)) {
              filtered.push(correctDepartmentFilter)
            }
            return filtered
          })
        } else {
          console.warn('⚠️ Department not found in organizational units:', initialFilters.department)
        }
      }
    }
  }, [organizationalUnits, initialFilters?.department])

  // ✅ FIX: Handle initialFilters.status (missing logic for pie chart drill-down)
  useEffect(() => {
    if (initialFilters?.status) {
      const statusFilter = `status-${String(initialFilters.status).toUpperCase()}`
      setSelectedFilters(prev => {
        if (!prev.includes(statusFilter)) {
          const newFilters = [...prev, statusFilter]
          return newFilters
        }
        return prev
      })
    }
  }, [initialFilters?.status])

  // 🚀 PHASE 1: Expose filtered data to parent component for dynamic analysis
  useEffect(() => {
    if (onDataChange) {
      const isFiltered = !!(
        search ||
        selectedFilters.length > 0 ||
        startDate ||
        endDate ||
        creationStartDate ||
        creationEndDate
      )

      const appliedFilters = {
        search: search || undefined,
        selectedFilters,
        dateRange: startDate || endDate ? { startDate, endDate } : undefined,
        creationDateRange:
          creationStartDate || creationEndDate
            ? {
                startDate: creationStartDate,
                endDate: creationEndDate
              }
            : undefined,
        // 🔧 FIX: Pass current date ranges to parent for dynamic analysis
        currentDateRange: {
          startDate,
          endDate,
          creationStartDate,
          creationEndDate
        }
      }

      onDataChange({
        absences,
        total,
        isFiltered,
        appliedFilters
      })
    }
  }, [absences, total, search, selectedFilters, startDate, endDate, creationStartDate, creationEndDate, onDataChange])

  // Employee filter backend search function
  const getEmployeeFilters = useCallback(
    (searchTerm: string) => {
      // Only show results if search term has at least 3 characters
      if (!searchTerm || searchTerm.trim().length < 3) {
        return {
          filters: [],
          loading: employeesLoading,
          error: null
        }
      }

      const filteredEmployees = teamEmployees.filter(employee => {
        const firstName = employee.firstName || ''
        const lastName = employee.lastName || ''
        const fullName = `${firstName} ${lastName}`.toLowerCase()
        const orgUnit = (employee.employeePosition?.organizationalUnit?.name || '').toLowerCase()
        return fullName.includes(searchTerm.toLowerCase()) || orgUnit.includes(searchTerm.toLowerCase())
      })

      // Deduplicate employees by ID to avoid showing the same person multiple times
      const uniqueEmployees = filteredEmployees.reduce((acc: any[], employee: any) => {
        if (!acc.find((emp: any) => emp.id === employee.id)) {
          acc.push(employee)
        }
        return acc
      }, [])

      return {
        filters: uniqueEmployees.map(employee => ({
          id: employee.id,
          label: `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unknown Employee',
          selected: selectedFilters.includes(employee.id)
        })),
        loading: employeesLoading,
        error: null
      }
    },
    [teamEmployees, selectedFilters, employeesLoading]
  )

  // Department filter backend search function
  const getDepartmentFilters = useCallback(
    (searchTerm: string) => {
      // Special "No Department" filter for employees without department assignment
      const noDepartmentFilter = {
        id: 'department-no-department',
        label: getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_backoffice.absence_list.no_department',
          'No Department'
        ),
        selected: selectedFilters.includes('department-no-department')
      }

      // If no (or short) search term, show ALL departments separately (even if names duplicate)
      if (!searchTerm || searchTerm.trim().length < 3) {
        const filters = organizationalUnits.map(department => ({
          id: `department-${department.id}`,
          label: department.name || 'Unknown Department',
          selected: selectedFilters.includes(`department-${department.id}`)
        }))

        // Include "No Department" option at the top
        filters.unshift(noDepartmentFilter)

        return {
          filters,
          loading: orgUnitsLoading,
          error: null
        }
      }

      // Filter departments by search term
      const filteredDepartments = organizationalUnits.filter(department => {
        const name = department.name || ''
        return name.toLowerCase().includes(searchTerm.toLowerCase())
      })

      const filters = filteredDepartments.map(department => ({
        id: `department-${department.id}`,
        label: department.name || 'Unknown Department',
        selected: selectedFilters.includes(`department-${department.id}`)
      }))

      // Add "No Department" option if search term matches
      if (
        'no department'.includes(searchTerm.toLowerCase()) ||
        'unassigned'.includes(searchTerm.toLowerCase()) ||
        'none'.includes(searchTerm.toLowerCase())
      ) {
        filters.unshift(noDepartmentFilter)
      }

      return {
        filters,
        loading: orgUnitsLoading,
        error: null
      }
    },
    [organizationalUnits, selectedFilters, orgUnitsLoading]
  )

  // Create dynamic groups from catalog data (only main IDs, no duplicates)
  const dynamicGroups = Object.entries(absenceGroups)
    .filter(([id]) => {
      // Only include main catalog IDs (not catalogEntryLocalId duplicates)
      // Main IDs typically start with "AbsenceGroup:v1:" pattern
      return id.startsWith('AbsenceGroup:v1:')
    })
    .map(([id, name]) => ({
      id,
      name
    }))

  // Filter configuration matching manager-absences pattern exactly
  const filterGroups: DataFilterGroup[] = [
    {
      id: 'absenceDateRange',
      title: `${getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.start_date', 'Start')} - ${getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.end_date', 'End Date')}`,
      customComponent: React.createElement(DateRangeFilter, {
        key: `absenceDateRange-${startDate}-${endDate}`, // Force re-render when dates change
        initialStartDate: startDate,
        initialEndDate: endDate,
        onDateRangeChange: handleDateRangeChangeForFilter
      }),
      hideSearch: true
    },
    {
      id: 'creationDateRange',
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:manager_expense_request_list.expense_table.creation_date',
        'Creation Date'
      ),
      customComponent: React.createElement(CreationDateFilter, {
        key: `creationDateRange-${creationStartDate}-${creationEndDate}`, // Force re-render when dates change
        initialStartDate: creationStartDate,
        initialEndDate: creationEndDate,
        onCreationDateRangeChange: handleCreationDateRangeChangeForFilter
      }),
      hideSearch: true
    },
    {
      id: 'employee',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.employee', 'Employee'),
      backendSearch: getEmployeeFilters
    },
    {
      id: 'department',
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:absence_management_hub_backoffice.absence_list.department',
        'Department'
      ),
      backendSearch: getDepartmentFilters
    },
    {
      id: 'status',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status'),
      filters: ABSENCE_STATUSES.map(status => ({
        id: `status-${status.id}`,
        label: getTranslationFromI18nKeyAndLabel(`lowcoder:expense_statuses.${status.name.toLowerCase()}`, status.name),
        selected: selectedFilters.includes(`status-${status.id}`)
      }))
    },
    {
      id: 'group',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.group', 'Group'),
      filters: dynamicGroups.map(group => ({
        id: `group-${group.id}`,
        label: group.name,
        selected: selectedFilters.includes(`group-${group.id}`)
      }))
    }
  ]

  // Only include selected employees in filter label map to avoid showing all employees
  const selectedEmployees = teamEmployees.filter(e => selectedFilters.includes(e.id))
  const selectedDepartments = organizationalUnits.filter(d => selectedFilters.includes(`department-${d.id}`))

  // Add "No Department" to selected departments if it's selected
  const selectedDepartmentsWithNoDepOption = [...selectedDepartments]
  if (selectedFilters.includes('department-no-department')) {
    selectedDepartmentsWithNoDepOption.push({
      id: 'no-department',
      name: getTranslationFromI18nKeyAndLabel(
        'lowcoder:absence_management_hub_backoffice.absence_list.no_department',
        'No Department'
      )
    } as any)
  }

  // Compute selectedFilters including date ranges for display (exactly like manager-absences)
  const computedSelectedFilters = useMemo(() => {
    const allSelectedFilters = [...selectedFilters]

    // Add absence date range filter if active
    if (startDate || endDate) {
      if (!allSelectedFilters.includes('absenceDateRange')) {
        allSelectedFilters.push('absenceDateRange')
      }
    } else {
      // Remove if no longer active
      const index = allSelectedFilters.indexOf('absenceDateRange')
      if (index > -1) {
        allSelectedFilters.splice(index, 1)
      }
    }

    // Add creation date range filter if active
    if (creationStartDate || creationEndDate) {
      if (!allSelectedFilters.includes('creationDateRange')) {
        allSelectedFilters.push('creationDateRange')
      }
    } else {
      // Remove if no longer active
      const index = allSelectedFilters.indexOf('creationDateRange')
      if (index > -1) {
        allSelectedFilters.splice(index, 1)
      }
    }

    return allSelectedFilters
  }, [selectedFilters, startDate, endDate, creationStartDate, creationEndDate])

  const filterLabelMap = {
    ...Object.fromEntries(
      selectedEmployees.map(e => [
        e.id,
        `${e.firstName || ''} ${e.lastName || ''}`.trim() ||
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:absence_management_hub_backoffice.absence_list.unknown_employee',
            'Unknown Employee'
          )
      ])
    ),
    ...Object.fromEntries(
      selectedDepartmentsWithNoDepOption.map(d => [`department-${d.id}`, d.name || 'Unknown Department'])
    ),
    ...Object.fromEntries(
      ABSENCE_STATUSES.map(s => [
        `status-${s.id}`,
        getTranslationFromI18nKeyAndLabel(`lowcoder:expense_statuses.${s.name.toLowerCase()}`, s.name)
      ])
    ),
    ...Object.fromEntries(dynamicGroups.map(g => [`group-${g.id}`, g.name])),
    // Date range labels (exactly like manager-absences with locale formatting)
    absenceDateRange:
      startDate && endDate
        ? `${getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.start_date', 'Start Date')} - ${getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.end_date', 'End Date')}: ${formatDateForDisplay(startDate)} ${getTranslationFromI18nKeyAndLabel('lowcoder:absence_overview_screen.absence_overview_table.to', 'to')} ${formatDateForDisplay(endDate)}`
        : startDate
          ? `${getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.start_date', 'Start Date')} - ${getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.end_date', 'End Date')}: ${getTranslationFromI18nKeyAndLabel('lowcoder:absence_overview_screen.absence_overview_table.from', 'from')} ${formatDateForDisplay(startDate)}`
          : endDate
            ? `${getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.start_date', 'Start Date')} - ${getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.end_date', 'End Date')}: Until ${formatDateForDisplay(endDate)}`
            : 'Date Range',
    creationDateRange:
      creationStartDate && creationEndDate
        ? `${getTranslationFromI18nKeyAndLabel('lowcoder:manager_expense_request_list.expense_table.creation_date', 'Creation Date')}: ${formatDateForDisplay(creationStartDate)} ${getTranslationFromI18nKeyAndLabel('lowcoder:absence_overview_screen.absence_overview_table.to', 'to')} ${formatDateForDisplay(creationEndDate)}`
        : creationStartDate
          ? `${getTranslationFromI18nKeyAndLabel('lowcoder:manager_expense_request_list.expense_table.creation_date', 'Creation Date')}: ${getTranslationFromI18nKeyAndLabel('lowcoder:absence_overview_screen.absence_overview_table.from', 'from')} ${formatDateForDisplay(creationStartDate)}`
          : creationEndDate
            ? `${getTranslationFromI18nKeyAndLabel('lowcoder:manager_expense_request_list.expense_table.creation_date', 'Creation Date')}: Until ${formatDateForDisplay(creationEndDate)}`
            : 'Creation Date'
  }

  // Filter handlers (enhanced for date ranges)
  const handleFilterChange = useCallback((filterId: string, selected: boolean) => {
    // Handle date range filters specially
    if (filterId === 'absenceDateRange') {
      if (!selected) {
        setStartDate(undefined)
        setEndDate(undefined)
      }
      // Do not return; allow pills state to update through handleSetFilter path
    }

    if (filterId === 'creationDateRange') {
      if (!selected) {
        setCreationStartDate(undefined)
        setCreationEndDate(undefined)
      }
      // Do not return; allow pills state to update through handleSetFilter path
    }

    setSelectedFilters(prev => {
      const next = selected ? Array.from(new Set([...prev, filterId])) : prev.filter(f => f !== filterId)
      return next
    })
  }, [])

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
  }, [])

  const handleSetFilter = useCallback(
    (filters: string[]) => {
      // Check if date range filters were removed
      if (!filters.includes('absenceDateRange') && (startDate || endDate)) {
        setStartDate(undefined)
        setEndDate(undefined)
      }

      if (!filters.includes('creationDateRange') && (creationStartDate || creationEndDate)) {
        setCreationStartDate(undefined)
        setCreationEndDate(undefined)
      }

      // Filter out date range filters from the regular filters
      const regularFilters = filters.filter(f => f !== 'absenceDateRange' && f !== 'creationDateRange')
      setSelectedFilters(regularFilters)
    },
    [startDate, endDate, creationStartDate, creationEndDate]
  )

  // Table handlers
  const handleRowClick = useCallback((record: EnhancedAbsence) => {
    setSelectedAbsence(record)
  }, [])

  const handlePaginationChange = useCallback(
    (page: number, newPageSize?: number) => {
      const targetPageSize = newPageSize || pageSize
      setCurrentPage(page)
      setPageSize(targetPageSize)
    },
    [pageSize]
  )

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortOrder === 'ASC') {
        setSortOrder('DESC')
      } else if (sortOrder === 'DESC') {
        setSortField('')
        setSortOrder('')
      } else {
        setSortOrder('ASC')
      }
    } else {
      setSortField(field)
      setSortOrder('ASC')
    }
  }

  // 🚀 FIX: Re-map groupName whenever absenceGroups loads to fix timing issue
  const absencesWithUpdatedGroups = useMemo(() => {
    return absences.map(absence => ({
      ...absence,
      groupName:
        (absence.type?.parentEntryId && absenceGroups[absence.type.parentEntryId]) ||
        absence.type?.value ||
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_backoffice.absence_list.unknown_group',
          'Unknown Group'
        )
    }))
  }, [absences, absenceGroups])

  return (
    <div data-testid="backoffice-absence-list-modern-content">
      <DataContainer
        dataControllerProps={{
          search,
          setSearch: handleSearchChange,
          debounceDelay: 500,
          filter: computedSelectedFilters,
          setFilter: handleSetFilter,
          filterLabelMap,
          listTitle: (
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span>{getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.absences', 'Absences')}</span>
                <span className="gba:text-gray-500">({total})</span>
              </div>
            </div>
          )
        }}
        dataFilterProps={{
          filterGroups,
          onFilterChange: handleFilterChange
        }}
        dataBody={
          <AbsenceListTable
            absences={absencesWithUpdatedGroups}
            loading={loading}
            error={error}
            total={total}
            currentPage={currentPage}
            pageSize={pageSize}
            sortField={sortField}
            sortOrder={sortOrder}
            selectedAbsence={selectedAbsence}
            onRowClick={handleRowClick}
            onSort={handleSort}
            onPaginationChange={handlePaginationChange}
          />
        }
      />
    </div>
  )
}

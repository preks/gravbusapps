import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '../../../../../../common/network/graphql/useGraphQLClient'
import { useCatalogManagerClient } from '../../../../../../common/network/catalogs/useCatalogManagerClient'
import { getTranslationFromI18nKeyAndLabel } from '../../../../../../common/utils/windowUtils'
import { GET_TEAM_EMPLOYEES_AND_ORG_UNITS } from '../queries/absenceQueries'
import { LEGAL_ENTITY_NOT_DEFINED_FILTER_ID } from '../constants/routes'

export interface UseAbsenceFiltersProps {
  accessToken: string
  initialFilters?: {
    startDate?: string
    endDate?: string
    status?: string
    department?: string
    departmentId?: string
    departmentIds?: string[]
    locationIds?: string[]
    legalEntityIds?: string[]
    managerIds?: string[]
    employeeQuery?: string
    absenceTypeIds?: string[]
    statusIds?: string[]
  }
}

export interface UseAbsenceFiltersReturn {
  search: string
  selectedFilters: string[]
  startDate: string | undefined
  endDate: string | undefined
  creationStartDate: string | undefined
  creationEndDate: string | undefined
  teamEmployees: any[]
  organizationalUnits: any[]
  absenceGroups: Record<string, string>
  originalAbsenceGroups: Record<string, string>
  employeesLoading: boolean
  orgUnitsLoading: boolean
  setSearch: (search: string) => void
  setSelectedFilters: (filters: string[]) => void
  setStartDate: (date: string | undefined) => void
  setEndDate: (date: string | undefined) => void
  setCreationStartDate: (date: string | undefined) => void
  setCreationEndDate: (date: string | undefined) => void
  handleDateRangeChange: (startDate: string | null, endDate: string | null) => void
  handleCreationDateRangeChange: (startDate: string | null, endDate: string | null) => void
  buildWhereConditions: () => any
  getEmployeeFilters: (searchTerm: string) => { filters: any[]; loading: boolean; error: any }
  getDepartmentFilters: (searchTerm: string) => { filters: any[]; loading: boolean; error: any }
  getFilterGroups: () => any[]
}

interface ParsedSelectedFilters {
  statusFilters: string[]
  groupFilters: string[]
  departmentFilters: string[]
  employeeFilters: string[]
}

const buildInitialSelectedFilters = (
  initialFilters: UseAbsenceFiltersProps['initialFilters'] | undefined
): string[] => {
  const seeds: string[] = []

  if (initialFilters?.status) {
    seeds.push(`status-${String(initialFilters.status).toUpperCase()}`)
  }
  ;(initialFilters?.statusIds ?? []).forEach(statusId => {
    seeds.push(`status-${String(statusId).toUpperCase()}`)
  })
  if (initialFilters?.departmentId) {
    seeds.push(`department-${initialFilters.departmentId}`)
  }
  ;(initialFilters?.departmentIds ?? []).forEach(departmentId => {
    seeds.push(`department-${departmentId}`)
  })
  if (initialFilters?.department === 'NO_DEPARTMENT_SPECIAL') {
    seeds.push('department-no-department')
  }

  return seeds
}

const parseDateString = (dateValue: string): { year: number; month: number; day: number } | null => {
  const [yearRaw, monthRaw, dayRaw] = String(dateValue)
    .split('-')
    .map(part => Number.parseInt(part, 10))

  if (Number.isNaN(yearRaw)) {
    return null
  }

  return {
    year: yearRaw,
    month: monthRaw || 1,
    day: dayRaw || 1
  }
}

const toUtcBoundaryIso = (dateValue: string, endOfDay: boolean): string | null => {
  const parsed = parseDateString(dateValue)
  if (!parsed) {
    return null
  }

  const hours = endOfDay ? 23 : 0
  const minutes = endOfDay ? 59 : 0
  const seconds = endOfDay ? 59 : 0
  const millis = endOfDay ? 999 : 0

  return new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, hours, minutes, seconds, millis)).toISOString()
}

const parseSelectedFilters = (selectedFilters: string[]): ParsedSelectedFilters => {
  const statusFilters = selectedFilters
    .filter(filter => filter.startsWith('status-'))
    .map(filter => filter.replace('status-', ''))
    .map(value => String(value).toUpperCase())
  const groupFilters = selectedFilters
    .filter(filter => filter.startsWith('group-'))
    .map(filter => filter.replace('group-', ''))
  const departmentFilters = selectedFilters
    .filter(filter => filter.startsWith('department-'))
    .map(filter => filter.replace('department-', ''))
  const employeeFilters = selectedFilters.filter(
    filter => !filter.startsWith('status-') && !filter.startsWith('group-') && !filter.startsWith('department-')
  )

  return { statusFilters, groupFilters, departmentFilters, employeeFilters }
}

const setEmployeeCondition = (conditions: any, employeeCondition: any): void => {
  conditions.employee = conditions.employee ? { ...conditions.employee, ...employeeCondition } : employeeCondition
}

const applySearchConditions = (conditions: any, search: string): void => {
  const trimmedSearch = search.trim()
  if (!trimmedSearch) {
    return
  }

  conditions._or = [
    { employee: { firstName: { _ilike: `%${trimmedSearch}%` } } },
    { employee: { lastName: { _ilike: `%${trimmedSearch}%` } } },
    { type: { value: { _ilike: `%${trimmedSearch}%` } } },
    { employee: { employeePosition: { organizationalUnit: { name: { _ilike: `%${trimmedSearch}%` } } } } },
    { status: { _ilike: `%${trimmedSearch}%` } }
  ]
}

const applyStatusFilter = (conditions: any, statusFilters: string[]): void => {
  if (statusFilters.length > 0) {
    conditions.status = { _in: statusFilters }
  }
}

const applyGroupFilter = (conditions: any, groupFilters: string[]): void => {
  if (groupFilters.length > 0) {
    conditions.type = { ...conditions.type, parentEntryId: { _in: groupFilters } }
  }
}

const applyDepartmentFilter = (conditions: any, departmentFilters: string[]): void => {
  if (departmentFilters.length === 0) {
    return
  }

  const hasNoDepartmentFilter = departmentFilters.includes('no-department')
  const regularDepartmentIds = departmentFilters.filter(filter => filter !== 'no-department')
  let departmentCondition: any

  if (hasNoDepartmentFilter && regularDepartmentIds.length > 0) {
    departmentCondition = {
      _or: [{ organizationalUnit: { id: { _in: regularDepartmentIds } } }, { organizationalUnit: { _isNull: true } }]
    }
  } else if (hasNoDepartmentFilter) {
    departmentCondition = { organizationalUnit: { _isNull: true } }
  } else if (regularDepartmentIds.length > 0) {
    departmentCondition = { organizationalUnit: { id: { _in: regularDepartmentIds } } }
  }

  if (departmentCondition) {
    setEmployeeCondition(conditions, { employeePosition: departmentCondition })
  }
}

const applyEmployeeFilter = (conditions: any, employeeFilters: string[]): void => {
  const employeeIds = employeeFilters.filter(filter => filter.trim() !== '')
  if (employeeIds.length > 0) {
    setEmployeeCondition(conditions, { id: { _in: employeeIds } })
  }
}

const applyAbsenceDateRangeFilter = (conditions: any, startDate?: string, endDate?: string): void => {
  const startDateTime = startDate ? toUtcBoundaryIso(startDate, false) : null
  const endDateTime = endDate ? toUtcBoundaryIso(endDate, true) : null

  if (startDateTime && endDateTime) {
    conditions.startDate = { _lte: endDateTime }
    conditions.endDate = { _gte: startDateTime }
    return
  }

  if (startDateTime) {
    conditions.endDate = { _gte: startDateTime }
    return
  }

  if (endDateTime) {
    conditions.startDate = { _lte: endDateTime }
  }
}

const applyCreationDateRangeFilter = (conditions: any, startDate?: string, endDate?: string): void => {
  const startDateTime = startDate ? toUtcBoundaryIso(startDate, false) : null
  const endDateTime = endDate ? toUtcBoundaryIso(endDate, true) : null

  if (startDateTime && endDateTime) {
    conditions.createdAt = { _gte: startDateTime, _lte: endDateTime }
    return
  }

  if (startDateTime) {
    conditions.createdAt = { _gte: startDateTime }
    return
  }

  if (endDateTime) {
    conditions.createdAt = { _lte: endDateTime }
  }
}

const appendAndCondition = (conditions: any, condition: Record<string, unknown>): void => {
  if (!conditions._and) {
    conditions._and = []
  }
  conditions._and.push(condition)
}

const applyGlobalScopeFilters = (
  conditions: any,
  initialFilters: UseAbsenceFiltersProps['initialFilters'] | undefined
): void => {
  if (!initialFilters) {
    return
  }

  if (initialFilters.absenceTypeIds && initialFilters.absenceTypeIds.length > 0) {
    appendAndCondition(conditions, { type: { id: { _in: initialFilters.absenceTypeIds } } })
  }
  if (initialFilters.statusIds && initialFilters.statusIds.length > 0) {
    appendAndCondition(conditions, { status: { _in: initialFilters.statusIds } })
  }
  if (initialFilters.departmentIds && initialFilters.departmentIds.length > 0) {
    appendAndCondition(conditions, {
      employee: { employeePosition: { organizationalUnit: { id: { _in: initialFilters.departmentIds } } } }
    })
  }
  if (initialFilters.locationIds && initialFilters.locationIds.length > 0) {
    appendAndCondition(conditions, {
      employee: { employeePosition: { siteLocationId: { _in: initialFilters.locationIds } } }
    })
  }
  if (initialFilters.legalEntityIds && initialFilters.legalEntityIds.length > 0) {
    const includeMissingLegalEntity = initialFilters.legalEntityIds.includes(LEGAL_ENTITY_NOT_DEFINED_FILTER_ID)
    const definedLegalEntityIds = initialFilters.legalEntityIds.filter(id => id !== LEGAL_ENTITY_NOT_DEFINED_FILTER_ID)

    if (includeMissingLegalEntity && definedLegalEntityIds.length > 0) {
      appendAndCondition(conditions, {
        employee: {
          employeePosition: {
            _or: [{ companyId: { _in: definedLegalEntityIds } }, { companyId: { _isNull: true } }]
          }
        }
      })
    } else if (includeMissingLegalEntity) {
      appendAndCondition(conditions, {
        employee: { employeePosition: { companyId: { _isNull: true } } }
      })
    } else {
      appendAndCondition(conditions, {
        employee: { employeePosition: { companyId: { _in: definedLegalEntityIds } } }
      })
    }
  }
  if (initialFilters.managerIds && initialFilters.managerIds.length > 0) {
    appendAndCondition(conditions, {
      employee: { employeePosition: { supervisorEmployeeId: { _in: initialFilters.managerIds } } }
    })
  }
}

export const useAbsenceFilters = ({ accessToken, initialFilters }: UseAbsenceFiltersProps): UseAbsenceFiltersReturn => {
  const graphQLClient = useGraphQLClient(accessToken)
  const catalogClient = useCatalogManagerClient(accessToken)

  const [search, setSearch] = useState(initialFilters?.employeeQuery ?? '')
  const [selectedFilters, setSelectedFilters] = useState<string[]>(() => buildInitialSelectedFilters(initialFilters))

  const [startDate, setStartDate] = useState<string | undefined>(initialFilters?.startDate)
  const [endDate, setEndDate] = useState<string | undefined>(initialFilters?.endDate)
  const [creationStartDate, setCreationStartDate] = useState<string | undefined>(undefined)
  const [creationEndDate, setCreationEndDate] = useState<string | undefined>(undefined)

  const [teamEmployees, setTeamEmployees] = useState<any[]>([])
  const [organizationalUnits, setOrganizationalUnits] = useState<any[]>([])
  const [absenceGroups, setAbsenceGroups] = useState<Record<string, string>>({})
  const [originalAbsenceGroups, setOriginalAbsenceGroups] = useState<Record<string, string>>({})
  const [employeesLoading, setEmployeesLoading] = useState(false)
  const [orgUnitsLoading, setOrgUnitsLoading] = useState(false)

  const fetchTeamEmployeesAndOrgUnits = useCallback(async () => {
    if (!accessToken) return

    setEmployeesLoading(true)
    setOrgUnitsLoading(true)
    try {
      const result = await graphQLClient.request(GET_TEAM_EMPLOYEES_AND_ORG_UNITS)
      const employeePositions = result.EmployeePosition || []

      // Extract employees
      const employees = employeePositions.map((pos: any) => pos.employee).filter(Boolean)
      setTeamEmployees(employees)

      // Extract and deduplicate organizational units
      const orgUnitsMap = new Map<string, any>()
      employeePositions.forEach((position: any) => {
        if (position.organizationalUnit?.id && position.organizationalUnit?.name) {
          const orgUnitId = position.organizationalUnit.id
          const orgUnitName = position.organizationalUnit.name
          orgUnitsMap.set(orgUnitId, {
            id: orgUnitId,
            name: orgUnitName
          })
        }
      })

      const units = Array.from(orgUnitsMap.values()).sort((a, b) => a.name.localeCompare(b.name))
      setOrganizationalUnits(units)
    } catch (error) {
      console.error('Error fetching team employees and organizational units:', error)
    } finally {
      setEmployeesLoading(false)
      setOrgUnitsLoading(false)
    }
  }, [accessToken, graphQLClient])

  const fetchAbsenceGroups = useCallback(async () => {
    if (!accessToken) return

    try {
      const response = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier: 'AbsenceGroup', version: 'v1' },
        { limit: 1000, offset: 0, returnTotalRecords: true }
      )

      const groups: Record<string, string> = {}
      const originalGroups: Record<string, string> = {}

      response.data.forEach((entry: any) => {
        groups[entry.id] = entry.value
        originalGroups[entry.id] = entry.value
      })

      setAbsenceGroups(groups)
      setOriginalAbsenceGroups(originalGroups)
    } catch (error) {
      console.error('Error fetching absence groups:', error)
    }
  }, [accessToken, catalogClient])

  useEffect(() => {
    fetchTeamEmployeesAndOrgUnits()
    fetchAbsenceGroups()
  }, [accessToken])

  const handleDateRangeChange = useCallback((newStartDate: string | null, newEndDate: string | null) => {
    setStartDate(newStartDate || undefined)
    setEndDate(newEndDate || undefined)
  }, [])

  const handleCreationDateRangeChange = useCallback((newStartDate: string | null, newEndDate: string | null) => {
    setCreationStartDate(newStartDate || undefined)
    setCreationEndDate(newEndDate || undefined)
  }, [])

  const buildWhereConditions = useCallback(() => {
    const conditions: any = {
      isDeleted: { _eq: false }
    }

    const parsedFilters = parseSelectedFilters(selectedFilters)

    applySearchConditions(conditions, search)
    applyStatusFilter(conditions, parsedFilters.statusFilters)
    applyGroupFilter(conditions, parsedFilters.groupFilters)
    applyDepartmentFilter(conditions, parsedFilters.departmentFilters)
    applyEmployeeFilter(conditions, parsedFilters.employeeFilters)
    applyAbsenceDateRangeFilter(conditions, startDate, endDate)
    applyCreationDateRangeFilter(conditions, creationStartDate, creationEndDate)
    applyGlobalScopeFilters(conditions, initialFilters)

    return conditions
  }, [search, selectedFilters, startDate, endDate, creationStartDate, creationEndDate, initialFilters])

  const getEmployeeFilters = useCallback(
    (searchTerm: string) => {
      if (!searchTerm.trim()) {
        return {
          filters: teamEmployees.slice(0, 20).map(employee => ({
            id: employee.id,
            label: `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unknown Employee',
            selected: selectedFilters.includes(employee.id)
          })),
          loading: employeesLoading,
          error: null
        }
      }

      const filtered = teamEmployees.filter(employee => {
        const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.toLowerCase()
        return fullName.includes(searchTerm.toLowerCase())
      })

      return {
        filters: filtered.slice(0, 20).map(employee => ({
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

  const getDepartmentFilters = useCallback(
    (searchTerm: string) => {
      const noDepartmentFilter = {
        id: 'department-no-department',
        label: getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_backoffice.absence_list.no_department',
          'No Department'
        ),
        selected: selectedFilters.includes('department-no-department')
      }

      if (!searchTerm.trim()) {
        const filters = organizationalUnits.slice(0, 19).map(unit => ({
          id: `department-${unit.id}`,
          label: unit.name || 'Unknown Department',
          selected: selectedFilters.includes(`department-${unit.id}`)
        }))
        filters.unshift(noDepartmentFilter)

        return {
          filters,
          loading: orgUnitsLoading,
          error: null
        }
      }

      const normalizedSearchTerm = searchTerm.toLowerCase()
      const filtered = organizationalUnits.filter(unit => unit.name?.toLowerCase().includes(normalizedSearchTerm))

      const filters = filtered.slice(0, 19).map(unit => ({
        id: `department-${unit.id}`,
        label: unit.name || 'Unknown Department',
        selected: selectedFilters.includes(`department-${unit.id}`)
      }))
      filters.unshift(noDepartmentFilter)

      return {
        filters,
        loading: orgUnitsLoading,
        error: null
      }
    },
    [organizationalUnits, selectedFilters, orgUnitsLoading]
  )

  const getFilterGroups = useCallback(() => {
    const dynamicGroups = Object.entries(absenceGroups).map(([id, name]) => ({ id, name }))

    return [
      {
        id: 'absenceDateRange',
        title: `${getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.start_date', 'Start')} - ${getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.end_date', 'End Date')}`,
        customComponent: 'DateRangeFilter',
        hideSearch: true
      },
      {
        id: 'creationDateRange',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:manager_expense_request_list.expense_table.creation_date',
          'Creation Date'
        ),
        customComponent: 'CreationDateFilter',
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
        id: 'group',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.group', 'Group'),
        filters: dynamicGroups.map(group => ({
          id: `group-${group.id}`,
          label: group.name,
          selected: selectedFilters.includes(`group-${group.id}`)
        }))
      }
    ]
  }, [absenceGroups, selectedFilters, getEmployeeFilters, getDepartmentFilters])

  return {
    search,
    selectedFilters,
    startDate,
    endDate,
    creationStartDate,
    creationEndDate,
    teamEmployees,
    organizationalUnits,
    absenceGroups,
    originalAbsenceGroups,
    employeesLoading,
    orgUnitsLoading,
    setSearch,
    setSelectedFilters,
    setStartDate,
    setEndDate,
    setCreationStartDate,
    setCreationEndDate,
    handleDateRangeChange,
    handleCreationDateRangeChange,
    buildWhereConditions,
    getEmployeeFilters,
    getDepartmentFilters,
    getFilterGroups
  }
}

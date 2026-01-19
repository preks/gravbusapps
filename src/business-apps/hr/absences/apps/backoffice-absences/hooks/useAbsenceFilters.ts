import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '../../../../../../common/network/graphql/useGraphQLClient'
import { useCatalogManagerClient } from '../../../../../../common/network/catalogs/useCatalogManagerClient'
import { getTranslationFromI18nKeyAndLabel } from '../../../../../../common/utils/windowUtils'
import { GET_TEAM_EMPLOYEES_AND_ORG_UNITS } from '../queries/absenceQueries'
import dayjs from 'dayjs'

export interface UseAbsenceFiltersProps {
  accessToken: string
  initialFilters?: {
    startDate?: string
    endDate?: string
    status?: string
    department?: string
    departmentId?: string
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

export const useAbsenceFilters = ({ accessToken, initialFilters }: UseAbsenceFiltersProps): UseAbsenceFiltersReturn => {
  const graphQLClient = useGraphQLClient(accessToken)
  const catalogClient = useCatalogManagerClient(accessToken)

  const [search, setSearch] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<string[]>(() => {
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
  })

  const defaultStartOfYear = dayjs().startOf('year').format('YYYY-MM-DD')
  const defaultEndOfYear = dayjs().endOf('year').format('YYYY-MM-DD')
  const [startDate, setStartDate] = useState<string | undefined>(initialFilters?.startDate ?? defaultStartOfYear)
  const [endDate, setEndDate] = useState<string | undefined>(initialFilters?.endDate ?? defaultEndOfYear)
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

    if (search && search.trim()) {
      conditions._or = [
        { employee: { firstName: { _ilike: `%${search.trim()}%` } } },
        { employee: { lastName: { _ilike: `%${search.trim()}%` } } },
        { type: { value: { _ilike: `%${search.trim()}%` } } },
        { employee: { employeePosition: { organizationalUnit: { name: { _ilike: `%${search.trim()}%` } } } } },
        { status: { _ilike: `%${search.trim()}%` } }
      ]
    }

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
      conditions.type = { ...conditions.type, parentEntryId: { _in: groupFilters } }
    }

    if (departmentFilters.length > 0) {
      const hasNoDepartmentFilter = departmentFilters.includes('no-department')
      const regularDepartmentIds = departmentFilters.filter(f => f !== 'no-department')

      let departmentCondition: any = undefined

      if (hasNoDepartmentFilter && regularDepartmentIds.length > 0) {
        departmentCondition = {
          _or: [
            { organizationalUnit: { id: { _in: regularDepartmentIds } } },
            { organizationalUnit: { _isNull: true } }
          ]
        }
      } else if (hasNoDepartmentFilter) {
        departmentCondition = { organizationalUnit: { _isNull: true } }
      } else if (regularDepartmentIds.length > 0) {
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

    if (creationStartDate || creationEndDate) {
      if (creationStartDate && creationEndDate) {
        const [sY, sM, sD] = String(creationStartDate)
          .split('-')
          .map(n => parseInt(n, 10))
        const [eY, eM, eD] = String(creationEndDate)
          .split('-')
          .map(n => parseInt(n, 10))
        const startDateTime = new Date(Date.UTC(sY, (sM || 1) - 1, sD || 1, 0, 0, 0, 0)).toISOString()
        const endDateTime = new Date(Date.UTC(eY, (eM || 1) - 1, eD || 1, 23, 59, 59, 999)).toISOString()
        conditions.createdAt = { _gte: startDateTime, _lte: endDateTime }
      } else if (creationStartDate) {
        const [sY, sM, sD] = String(creationStartDate)
          .split('-')
          .map(n => parseInt(n, 10))
        const startDateTime = new Date(Date.UTC(sY, (sM || 1) - 1, sD || 1, 0, 0, 0, 0)).toISOString()
        conditions.createdAt = { _gte: startDateTime }
      } else if (creationEndDate) {
        const [eY, eM, eD] = String(creationEndDate)
          .split('-')
          .map(n => parseInt(n, 10))
        const endDateTime = new Date(Date.UTC(eY, (eM || 1) - 1, eD || 1, 23, 59, 59, 999)).toISOString()
        conditions.createdAt = { _lte: endDateTime }
      }
    }

    return conditions
  }, [search, selectedFilters, startDate, endDate, creationStartDate, creationEndDate])

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

      const filtered = organizationalUnits.filter(unit => unit.name.toLowerCase().includes(searchTerm.toLowerCase()))

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

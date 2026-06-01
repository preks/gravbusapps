import { useState, useCallback, useEffect, useRef } from 'react'
import { useGraphQLClient } from '../../../../../../common/network/graphql/useGraphQLClient'
import {
  GET_EMPLOYEES_BY_IDS,
  GET_EMPLOYEE_ABSENCES,
  type EmployeeAbsence,
  type GetEmployeesByIdsResponse,
  type GetEmployeeAbsencesVariables,
  type GetEmployeeAbsencesResponse
} from '../queries/absenceQueries'
import { EnhancedAbsence } from '../types'
import { buildCancelEmployeeAbsenceSnapshot } from '@/business-apps/hr/absences/utils/buildCancelEmployeeAbsenceSnapshot'

type SortOrder = 'ASC' | 'DESC' | ''

// Extracted helper to module scope to avoid recreation on each render
const extractColorFromObjectValue = (objectValue: any): string => {
  if (!objectValue || typeof objectValue !== 'object') {
    return 'var(--nw-muted-foreground)'
  }

  const color = objectValue.color
  if (!color) {
    return 'var(--nw-muted-foreground)'
  }

  return color.startsWith('#') ? color : `#${color}`
}

export interface UseAbsenceDataProps {
  accessToken: string
  filters: {
    buildWhereConditions: () => any
    absenceGroups: Record<string, string>
    originalAbsenceGroups: Record<string, string>
    selectedFilters: string[]
    search: string
    startDate?: string
    endDate?: string
    creationStartDate?: string
    creationEndDate?: string
  }
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

export interface UseAbsenceDataReturn {
  absences: EnhancedAbsence[]
  total: number
  loading: boolean
  error: Error | null

  currentPage: number
  pageSize: number
  setCurrentPage: (page: number) => void
  setPageSize: (size: number) => void

  sortField: string
  sortOrder: SortOrder
  setSortField: (field: string) => void
  setSortOrder: (order: SortOrder) => void

  fetchAbsences: () => Promise<void>
  handlePaginationChange: (page: number, newPageSize?: number) => void
  handleSort: (field: string) => void
}

const buildOrderBy = (sortField: string, sortOrder: SortOrder): any[] => {
  if (!sortField || !sortOrder) {
    return [{ createdAt: 'DESC' }]
  }

  const graphqlSortOrder = sortOrder.toUpperCase()

  if (sortField === 'employeeName') {
    return [{ employee: { firstName: graphqlSortOrder } }, { employee: { lastName: graphqlSortOrder } }]
  }

  if (sortField === 'groupName') {
    return [{ type: { value: graphqlSortOrder } }]
  }

  if (sortField === 'typeName') {
    return [{ type: { value: graphqlSortOrder } }]
  }

  return [{ [sortField]: graphqlSortOrder }]
}

const resolveGroupName = (
  groups: Record<string, string> | undefined,
  parentEntryId: string | undefined,
  fallback: string
): string => {
  if (!parentEntryId) {
    return fallback
  }

  return groups?.[parentEntryId] ?? fallback
}

const resolveComment = (absence: EmployeeAbsence): string | undefined => {
  const comment = absence.description || absence.reason || absence.approvalNote
  return comment?.trim() || undefined
}

const getEmployeeDisplayName = (employee: Partial<EmployeeAbsence['employee']>): string => {
  const name = employee.displayName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim()
  return name || 'Unknown Employee'
}

const buildSubstituteNameMap = async (
  graphQLClient: ReturnType<typeof useGraphQLClient>,
  absences: EmployeeAbsence[]
): Promise<Map<string, string>> => {
  const substituteEmployeeIds = Array.from(
    new Set(absences.map(absence => absence.substituteEmployeeId).filter((id): id is string => Boolean(id)))
  )

  if (substituteEmployeeIds.length === 0) {
    return new Map()
  }

  const result = await graphQLClient.request<GetEmployeesByIdsResponse>(GET_EMPLOYEES_BY_IDS, {
    employeeIds: substituteEmployeeIds
  })

  return new Map(
    result.Employee.map(employee => {
      const name =
        employee.displayName || `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() || employee.id
      return [employee.id, name]
    })
  )
}

const mapEnhancedAbsence = (
  absence: EmployeeAbsence,
  filters: UseAbsenceDataProps['filters'],
  substituteNames: Map<string, string>
): EnhancedAbsence => {
  const employee = absence.employee || {}
  const employeeName = getEmployeeDisplayName(employee)
  const parentEntryId = absence.type?.parentEntryId
  const employeeId = absence.employeeId || employee.id || ''

  return {
    ...absence,
    employee: {
      id: employeeId,
      firstName: employee.firstName || '',
      lastName: employee.lastName || '',
      pictureThumbnail: employee.pictureThumbnail || null,
      employeePosition: employee.employeePosition || null
    },
    employeeName,
    groupName: resolveGroupName(filters.absenceGroups, parentEntryId, 'Unknown Group'),
    originalGroupName: resolveGroupName(
      filters.originalAbsenceGroups,
      parentEntryId,
      absence.type?.value || 'Unknown Group'
    ),
    typeName: absence.type?.value || 'Unknown Type',
    comment: resolveComment(absence),
    substituteEmployeeId: absence.substituteEmployeeId,
    substituteEmployeeName: absence.substituteEmployeeId
      ? (substituteNames.get(absence.substituteEmployeeId) ?? null)
      : null,
    color: extractColorFromObjectValue(absence.type?.parentEntry?.objectValue),
    cancelSnapshot: buildCancelEmployeeAbsenceSnapshot(absence)
  }
}

export const useAbsenceData = ({ accessToken, filters, onDataChange }: UseAbsenceDataProps): UseAbsenceDataReturn => {
  const graphQLClient = useGraphQLClient(accessToken)

  const [absences, setAbsences] = useState<EnhancedAbsence[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const [sortField, setSortField] = useState('')
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC')

  const initialLoadDone = useRef(false)

  const filtersRef = useRef(filters)
  const onDataChangeRef = useRef(onDataChange)

  useEffect(() => {
    filtersRef.current = filters
  }, [filters])

  useEffect(() => {
    onDataChangeRef.current = onDataChange
  }, [onDataChange])

  const fetchAbsences = useCallback(async () => {
    if (!accessToken) {
      return
    }

    try {
      if (!initialLoadDone.current) {
        setLoading(true)
      }

      const currentFilters = filtersRef.current
      const conditions: any = currentFilters.buildWhereConditions()
      const orderBy = buildOrderBy(sortField, sortOrder)

      const variables: GetEmployeeAbsencesVariables = {
        where: conditions,
        offset: (currentPage - 1) * pageSize,
        limit: pageSize,
        orderBy
      }

      const result = await graphQLClient.request<GetEmployeeAbsencesResponse>(GET_EMPLOYEE_ABSENCES, variables)
      const substituteNames = await buildSubstituteNameMap(graphQLClient, result.EmployeeAbsence)

      const enhancedAbsences: EnhancedAbsence[] = result.EmployeeAbsence.map(absence =>
        mapEnhancedAbsence(absence, currentFilters, substituteNames)
      )

      setAbsences(enhancedAbsences)
      setTotal(result.EmployeeAbsenceAggregate.aggregate.count)

      if (onDataChangeRef.current) {
        onDataChangeRef.current({
          absences: enhancedAbsences,
          total: result.EmployeeAbsenceAggregate.aggregate.count,
          isFiltered: currentFilters.selectedFilters.length > 0 || !!currentFilters.search,
          appliedFilters: {
            search: currentFilters.search,
            selectedFilters: currentFilters.selectedFilters,
            dateRange:
              currentFilters.startDate || currentFilters.endDate
                ? { startDate: currentFilters.startDate, endDate: currentFilters.endDate }
                : undefined,
            creationDateRange:
              currentFilters.creationStartDate || currentFilters.creationEndDate
                ? { startDate: currentFilters.creationStartDate, endDate: currentFilters.creationEndDate }
                : undefined
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
  }, [accessToken, graphQLClient, currentPage, pageSize, sortField, sortOrder])

  const prevValuesRef = useRef<{
    accessToken: string
    absenceGroups: Record<string, string>
    search: string
    selectedFilters: string[]
    startDate: string
    endDate: string
    creationStartDate: string
    creationEndDate: string
    currentPage: number
    sortField: string
    sortOrder: string
  }>({
    accessToken: '',
    absenceGroups: {},
    search: '',
    selectedFilters: [],
    startDate: '',
    endDate: '',
    creationStartDate: '',
    creationEndDate: '',
    currentPage: 1,
    sortField: '',
    sortOrder: ''
  })

  useEffect(() => {
    if (!accessToken) return

    const currentValues = {
      accessToken,
      absenceGroups: filters.absenceGroups,
      search: filters.search,
      selectedFilters: filters.selectedFilters,
      startDate: filters.startDate || '',
      endDate: filters.endDate || '',
      creationStartDate: filters.creationStartDate || '',
      creationEndDate: filters.creationEndDate || '',
      currentPage,
      sortField,
      sortOrder
    }

    const prevValues = prevValuesRef.current

    if (!initialLoadDone.current) {
      initialLoadDone.current = true
      prevValuesRef.current = currentValues
      fetchAbsences()
      return
    }

    if (Object.keys(filters.absenceGroups).length === 0) return

    const hasChanged =
      prevValues.accessToken !== currentValues.accessToken ||
      JSON.stringify(prevValues.absenceGroups) !== JSON.stringify(currentValues.absenceGroups) ||
      prevValues.search !== currentValues.search ||
      JSON.stringify(prevValues.selectedFilters) !== JSON.stringify(currentValues.selectedFilters) ||
      prevValues.startDate !== currentValues.startDate ||
      prevValues.endDate !== currentValues.endDate ||
      prevValues.creationStartDate !== currentValues.creationStartDate ||
      prevValues.creationEndDate !== currentValues.creationEndDate ||
      prevValues.currentPage !== currentValues.currentPage ||
      prevValues.sortField !== currentValues.sortField ||
      prevValues.sortOrder !== currentValues.sortOrder

    if (!hasChanged) return

    if (
      currentPage !== 1 &&
      (prevValues.search !== currentValues.search ||
        JSON.stringify(prevValues.selectedFilters) !== JSON.stringify(currentValues.selectedFilters) ||
        prevValues.startDate !== currentValues.startDate ||
        prevValues.endDate !== currentValues.endDate ||
        prevValues.creationStartDate !== currentValues.creationStartDate ||
        prevValues.creationEndDate !== currentValues.creationEndDate)
    ) {
      setCurrentPage(1)
      return
    }

    prevValuesRef.current = currentValues
    fetchAbsences()
  }, [
    accessToken,
    filters.absenceGroups,
    filters.search,
    filters.selectedFilters,
    filters.startDate,
    filters.endDate,
    filters.creationStartDate,
    filters.creationEndDate,
    currentPage,
    sortField,
    sortOrder
  ])

  const handlePaginationChange = useCallback(
    (page: number, newPageSize?: number) => {
      const targetPageSize = newPageSize || pageSize
      setCurrentPage(page)
      setPageSize(targetPageSize)
    },
    [pageSize]
  )

  const handleSort = useCallback(
    (field: string) => {
      if (sortField === field) {
        setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')
      } else {
        setSortField(field)
        setSortOrder('ASC')
      }
    },
    [sortField, sortOrder]
  )

  return {
    absences,
    total,
    loading,
    error,

    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize,

    sortField,
    sortOrder,
    setSortField,
    setSortOrder,

    fetchAbsences,
    handlePaginationChange,
    handleSort
  }
}

import { useState, useCallback, useEffect, useRef } from 'react'
import { useGraphQLClient } from '../../../../../../common/network/graphql/useGraphQLClient'
import {
  GET_EMPLOYEE_ABSENCES,
  type GetEmployeeAbsencesVariables,
  type GetEmployeeAbsencesResponse
} from '../queries/absenceQueries'
import { EnhancedAbsence } from '../types'

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
  // Data state
  absences: EnhancedAbsence[]
  total: number
  loading: boolean
  error: Error | null

  // Pagination state
  currentPage: number
  pageSize: number
  setCurrentPage: (page: number) => void
  setPageSize: (size: number) => void

  // Sorting state
  sortField: string
  sortOrder: 'ASC' | 'DESC' | ''
  setSortField: (field: string) => void
  setSortOrder: (order: 'ASC' | 'DESC' | '') => void

  // Actions
  fetchAbsences: () => Promise<void>
  handlePaginationChange: (page: number, newPageSize?: number) => void
  handleSort: (field: string) => void
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
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC' | ''>('DESC')

  const initialLoadDone = useRef(false)

  const extractColorFromObjectValue = (objectValue: any): string => {
    if (!objectValue || typeof objectValue !== 'object') {
      return '#6b7280'
    }

    const color = objectValue.color
    if (!color) {
      return '#6b7280'
    }

    return color.startsWith('#') ? color : `#${color}`
  }

  const fetchAbsences = useCallback(async () => {
    if (!accessToken) {
      return
    }

    try {
      if (!initialLoadDone.current) {
        setLoading(true)
      }

      const conditions: any = filters.buildWhereConditions()

      const orderBy: any[] = []
      if (sortField && sortOrder) {
        const graphqlSortOrder = sortOrder.toUpperCase()
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

      const variables: GetEmployeeAbsencesVariables = {
        where: conditions,
        offset: (currentPage - 1) * pageSize,
        limit: pageSize,
        orderBy: orderBy
      }

      const result = await graphQLClient.request<GetEmployeeAbsencesResponse>(GET_EMPLOYEE_ABSENCES, variables)

      const enhancedAbsences: EnhancedAbsence[] = result.EmployeeAbsence.map((absence: any) => {
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
            absence.type?.parentEntryId && filters.absenceGroups && filters.absenceGroups[absence.type.parentEntryId]
              ? filters.absenceGroups[absence.type.parentEntryId]
              : 'Unknown Group',
          originalGroupName:
            absence.type?.parentEntryId &&
            filters.originalAbsenceGroups &&
            filters.originalAbsenceGroups[absence.type.parentEntryId]
              ? filters.originalAbsenceGroups[absence.type.parentEntryId]
              : absence.type?.value || 'Unknown Group',
          typeName: absence.type?.value || 'Unknown Type',
          color: extractColorFromObjectValue(absence.type?.parentEntry?.objectValue)
        }
      })

      setAbsences(enhancedAbsences)
      setTotal(result.EmployeeAbsenceAggregate.aggregate.count)

      if (onDataChange) {
        onDataChange({
          absences: enhancedAbsences,
          total: result.EmployeeAbsenceAggregate.aggregate.count,
          isFiltered: filters.selectedFilters.length > 0 || !!filters.search,
          appliedFilters: {
            search: filters.search,
            selectedFilters: filters.selectedFilters,
            dateRange:
              filters.startDate || filters.endDate
                ? { startDate: filters.startDate, endDate: filters.endDate }
                : undefined,
            creationDateRange:
              filters.creationStartDate || filters.creationEndDate
                ? { startDate: filters.creationStartDate, endDate: filters.creationEndDate }
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
  }, [
    accessToken,
    graphQLClient,
    filters.absenceGroups,
    filters.originalAbsenceGroups,
    filters.selectedFilters,
    filters.search,
    filters.startDate,
    filters.endDate,
    filters.creationStartDate,
    filters.creationEndDate,
    currentPage,
    pageSize,
    sortField,
    sortOrder,
    onDataChange
  ])

  useEffect(() => {
    if (!accessToken || initialLoadDone.current) return
    initialLoadDone.current = true
    fetchAbsences()
  }, [accessToken])

  useEffect(() => {
    if (!accessToken || Object.keys(filters.absenceGroups).length === 0) return
    if (initialLoadDone.current) {
      fetchAbsences()
    }
  }, [filters.absenceGroups, accessToken])

  useEffect(() => {
    if (!initialLoadDone.current || !accessToken) return
    if (currentPage !== 1) {
      setCurrentPage(1)
      return
    }
    fetchAbsences()
  }, [
    filters.search,
    filters.selectedFilters,
    filters.startDate,
    filters.endDate,
    filters.creationStartDate,
    filters.creationEndDate,
    currentPage,
    accessToken
  ])

  useEffect(() => {
    if (initialLoadDone.current && accessToken) {
      fetchAbsences()
    }
  }, [currentPage, sortField, sortOrder, accessToken])

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

import { useState, useCallback, useEffect, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_ABSENCES } from '../queries/graphql'
import { EnhancedAbsence } from '../types/enhancedAbsence'
import { getCurrentActiveUserLocale, getCatalogValue } from '@/common/utils/windowUtils'

export interface UseAbsenceDataProps {
  accessToken: string
  employeeId: string
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
  sortOrder: 'ASC' | 'DESC' | ''
  setSortField: (field: string) => void
  setSortOrder: (order: 'ASC' | 'DESC' | '') => void
  fetchAbsences: () => Promise<void>
  handlePaginationChange: (page: number, newPageSize?: number) => void
  handleSort: (field: string) => void
}

export const useAbsenceData = ({ accessToken, employeeId, filters }: UseAbsenceDataProps): UseAbsenceDataReturn => {
  const graphQLClient = useGraphQLClient(accessToken)

  const [absences, setAbsences] = useState<EnhancedAbsence[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const [sortField, setSortField] = useState('')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC' | ''>('DESC')
  const [currentLocale, setCurrentLocale] = useState(getCurrentActiveUserLocale())

  const initialLoadDone = useRef(false)
  const filtersRef = useRef(filters)

  useEffect(() => {
    filtersRef.current = filters
  }, [filters])

  useEffect(() => {
    const checkLocale = () => {
      const newLocale = getCurrentActiveUserLocale()
      if (newLocale !== currentLocale) {
        setCurrentLocale(newLocale)
      }
    }

    checkLocale()
    const interval = setInterval(checkLocale, 1000)
    return () => clearInterval(interval)
  }, [currentLocale])

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

  const fetchAbsences = useCallback(async () => {
    if (!accessToken || !employeeId) {
      return
    }

    try {
      if (!initialLoadDone.current) {
        setLoading(true)
      }

      const currentFilters = filtersRef.current
      const conditions: any = currentFilters.buildWhereConditions()

      const orderBy: any[] = []
      if (sortField && sortOrder) {
        const graphqlSortOrder = sortOrder.toUpperCase()
        if (sortField === 'typeName') {
          orderBy.push({ type: { value: graphqlSortOrder } })
        } else {
          orderBy.push({ [sortField]: graphqlSortOrder })
        }
      } else {
        orderBy.push({ createdAt: 'DESC' })
      }

      const variables: any = {
        where: conditions,
        offset: (currentPage - 1) * pageSize,
        limit: pageSize,
        activeUserLocale: getCurrentActiveUserLocale()
      }

      if (orderBy && orderBy.length > 0) {
        variables.orderBy = orderBy
      }

      const result = await graphQLClient.request<any>(GET_EMPLOYEE_ABSENCES, variables)

      const enhancedAbsences: EnhancedAbsence[] = (result.EmployeeAbsence || []).map((absence: any) => {
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
            lastName: employee.lastName || ''
          },
          employeeName,
          groupName:
            absence.type?.parentEntryId &&
            currentFilters.absenceGroups &&
            currentFilters.absenceGroups[absence.type.parentEntryId]
              ? currentFilters.absenceGroups[absence.type.parentEntryId]
              : absence.type?.value || 'Unknown Group',
          originalGroupName:
            absence.type?.parentEntryId &&
            currentFilters.originalAbsenceGroups &&
            currentFilters.originalAbsenceGroups[absence.type.parentEntryId]
              ? currentFilters.originalAbsenceGroups[absence.type.parentEntryId]
              : absence.type?.value || 'Unknown Group',
          typeName: absence.type ? getCatalogValue(absence.type) || 'Unknown Type' : 'Unknown Type',
          color: extractColorFromObjectValue(absence.type?.objectValue),
          effectiveDays: absence.effectiveDays || absence.workingDays || 0
        }
      })

      setAbsences(enhancedAbsences)
      setTotal(result.EmployeeAbsenceAggregate?.aggregate?.count || 0)
    } catch (error) {
      console.error('Error fetching absences:', error)
      setError(error instanceof Error ? error : new Error('Failed to fetch absences'))
      setAbsences([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [accessToken, employeeId, graphQLClient, currentPage, pageSize, sortField, sortOrder])

  const prevValuesRef = useRef<{
    accessToken: string
    employeeId: string
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
    currentLocale: string
  }>({
    accessToken: '',
    employeeId: '',
    absenceGroups: {},
    search: '',
    selectedFilters: [],
    startDate: '',
    endDate: '',
    creationStartDate: '',
    creationEndDate: '',
    currentPage: 1,
    sortField: '',
    sortOrder: '',
    currentLocale: ''
  })

  useEffect(() => {
    if (!accessToken || !employeeId) return

    const currentValues = {
      accessToken,
      employeeId,
      absenceGroups: filters.absenceGroups,
      search: filters.search,
      selectedFilters: filters.selectedFilters,
      startDate: filters.startDate || '',
      endDate: filters.endDate || '',
      creationStartDate: filters.creationStartDate || '',
      creationEndDate: filters.creationEndDate || '',
      currentPage,
      sortField,
      sortOrder,
      currentLocale
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
      prevValues.employeeId !== currentValues.employeeId ||
      JSON.stringify(prevValues.absenceGroups) !== JSON.stringify(currentValues.absenceGroups) ||
      prevValues.search !== currentValues.search ||
      JSON.stringify(prevValues.selectedFilters) !== JSON.stringify(currentValues.selectedFilters) ||
      prevValues.startDate !== currentValues.startDate ||
      prevValues.endDate !== currentValues.endDate ||
      prevValues.creationStartDate !== currentValues.creationStartDate ||
      prevValues.creationEndDate !== currentValues.creationEndDate ||
      prevValues.currentPage !== currentValues.currentPage ||
      prevValues.sortField !== currentValues.sortField ||
      prevValues.sortOrder !== currentValues.sortOrder ||
      prevValues.currentLocale !== currentValues.currentLocale

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
    employeeId,
    filters.absenceGroups,
    filters.search,
    filters.selectedFilters,
    filters.startDate,
    filters.endDate,
    filters.creationStartDate,
    filters.creationEndDate,
    currentPage,
    sortField,
    sortOrder,
    currentLocale,
    fetchAbsences
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

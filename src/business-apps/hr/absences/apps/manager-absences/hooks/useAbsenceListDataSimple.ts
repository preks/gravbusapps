import { useState, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { AbsenceFilters, EmployeeAbsence, EnhancedAbsence } from '../types'
import { enhanceAbsence } from '../utils'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

interface UseAbsenceListDataSimpleProps extends AbsenceFilters {
  sortField?: string
  sortOrder?: 'ASC' | 'DESC'
  accessToken: string
  orgUnitId?: string
  isTeamAwayFilter?: boolean
}

interface UseAbsenceListDataSimpleReturn {
  absences: EnhancedAbsence[]
  total: number
  loading: boolean
  error: Error | null
  hasMore: boolean
  currentPage: number
  pageSize: number
  setCurrentPage: (page: number) => void
  setPageSize: (size: number) => void
  loadMore: () => void
  loadPage: (page: number, pageSize?: number) => Promise<void>
  retry: () => void
}

import { GET_SUPERVISOR_ABSENCES_WITH_FILTERS } from '../queries/AbsenceQueries'

const buildWhereConditions = (filters: {
  search?: string
  statuses?: string[]
  types?: string[]
  groups?: string[]
  employees?: string[]
  startDate?: string
  endDate?: string
  creationStartDate?: string
  creationEndDate?: string
  isTeamAwayFilter?: boolean
}) => {
  const {
    search,
    statuses,
    types,
    groups,
    employees,
    startDate,
    endDate,
    creationStartDate,
    creationEndDate,
    isTeamAwayFilter
  } = filters

  const conditions: any = {}

  if (search && search.trim()) {
    conditions._or = [
      { employee: { firstName: { _ilike: `%${search.trim()}%` } } },
      { employee: { lastName: { _ilike: `%${search.trim()}%` } } },
      { type: { value: { _ilike: `%${search.trim()}%` } } },
      {
        employee: {
          employeePosition: { organizationalUnit: { name: { _ilike: `%${search.trim()}%` } } }
        }
      },
      { status: { _ilike: `%${search.trim()}%` } }
    ]
  }

  if (statuses && statuses.length > 0) {
    conditions.status = { _in: statuses }
  }

  if (types && types.length > 0) {
    conditions.type = { id: { _in: types } }
  }

  if (groups && groups.length > 0) {
    conditions.type = { ...conditions.type, parentEntryId: { _in: groups } }
  }

  if (employees && employees.length > 0) {
    if (conditions.employee) {
      conditions.employee = { ...conditions.employee, id: { _in: employees } }
    } else {
      conditions.employee = { id: { _in: employees } }
    }
  }

  const isValidDateString = (dateStr?: string): boolean => {
    if (!dateStr) return false
    if (dateStr.includes('Invalid')) return false
    const date = new Date(dateStr.split(' ')[0])
    return !isNaN(date.getTime())
  }

  if (startDate && endDate && isValidDateString(startDate) && isValidDateString(endDate)) {
    const startDateTime = startDate.includes(' ') ? startDate : `${startDate} 00:00:00+00`
    const endDateTime = endDate.includes(' ') ? endDate : `${endDate} 23:59:59+00`

    if (isTeamAwayFilter) {
      conditions._or = [
        {
          startDate: { _lte: endDateTime },
          endDate: { _gte: startDateTime }
        },
        {
          startDate: { _gte: startDateTime, _lte: endDateTime }
        }
      ]
    } else {
      conditions.startDate = { _gte: startDateTime }
      conditions.endDate = { _lte: endDateTime }
    }
  } else if (startDate && isValidDateString(startDate)) {
    const startDateTime = startDate.includes(' ') ? startDate : `${startDate} 00:00:00+00`
    conditions.startDate = { _gte: startDateTime }
  } else if (endDate && isValidDateString(endDate)) {
    const endDateTime = endDate.includes(' ') ? endDate : `${endDate} 23:59:59+00`
    conditions.endDate = { _lte: endDateTime }
  }

  if (
    creationStartDate &&
    creationEndDate &&
    isValidDateString(creationStartDate) &&
    isValidDateString(creationEndDate)
  ) {
    const creationStartDateTime = `${creationStartDate} 00:00:00+00`
    const creationEndDateTime = `${creationEndDate} 23:59:59+00`
    conditions.createdAt = {
      _gte: creationStartDateTime,
      _lte: creationEndDateTime
    }
  } else if (creationStartDate && isValidDateString(creationStartDate)) {
    const creationStartDateTime = `${creationStartDate} 00:00:00+00`
    conditions.createdAt = { _gte: creationStartDateTime }
  } else if (creationEndDate && isValidDateString(creationEndDate)) {
    const creationEndDateTime = `${creationEndDate} 23:59:59+00`
    conditions.createdAt = { _lte: creationEndDateTime }
  }

  return conditions
}

export const useAbsenceListDataSimple = ({
  search = '',
  statuses = [],
  types = [],
  groups = [],
  employees = [],
  startDate,
  endDate,
  creationStartDate,
  creationEndDate,
  sortField = 'startDate',
  sortOrder = 'DESC',
  accessToken,
  orgUnitId,
  isTeamAwayFilter = false
}: UseAbsenceListDataSimpleProps): UseAbsenceListDataSimpleReturn => {
  const [absences, setAbsences] = useState<EnhancedAbsence[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [hasMore, setHasMore] = useState(true)
  const [absenceGroups, setAbsenceGroups] = useState<{ [key: string]: string }>({})
  const [originalAbsenceGroups, setOriginalAbsenceGroups] = useState<{ [key: string]: string }>({})

  const graphqlClient = useGraphQLClient(accessToken)
  const catalogClient = useCatalogManagerClient(accessToken)

  const supervisorId = orgUnitId

  const loadAbsenceGroups = useCallback(async () => {
    try {
      const userLocale = getCurrentActiveUserLocale() ?? 'en-US'

      const [translatedData, originalData] = await Promise.all([
        catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier: 'AbsenceGroup',
            version: 'v1'
          },
          {
            limit: 100,
            offset: 0,
            returnTotalRecords: true,
            localeCode: userLocale,
            includeChildCatalogEntries: true
          }
        ),
        catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier: 'AbsenceGroup',
            version: 'v1'
          },
          {
            limit: 100,
            offset: 0,
            returnTotalRecords: true,
            localeCode: 'en-US',
            includeChildCatalogEntries: true
          }
        )
      ])

      const translatedMap: { [key: string]: string } = {}
      const originalMap: { [key: string]: string } = {}

      translatedData.data.forEach((entry: any) => {
        translatedMap[entry.id] = entry.value
        if (entry.catalogEntryLocalId) {
          translatedMap[entry.catalogEntryLocalId] = entry.value
        }
      })

      originalData.data.forEach((entry: any) => {
        originalMap[entry.id] = entry.value
        if (entry.catalogEntryLocalId) {
          originalMap[entry.catalogEntryLocalId] = entry.value
        }
      })

      setAbsenceGroups(translatedMap)
      setOriginalAbsenceGroups(originalMap)
      return { translated: translatedMap, original: originalMap }
    } catch (err) {
      console.error('Error loading absence groups:', err)
      return { translated: {}, original: {} }
    }
  }, [catalogClient])

  const loadPage = useCallback(
    async (targetPage: number, newPageSize: number = pageSize) => {
      if (!supervisorId) {
        setError(new Error('Supervisor ID is required'))
        return
      }

      setLoading(true)
      setError(null)

      try {
        let currentAbsenceGroups = absenceGroups
        let currentOriginalAbsenceGroups = originalAbsenceGroups
        if (Object.keys(currentAbsenceGroups).length === 0) {
          const groupData = await loadAbsenceGroups()
          currentAbsenceGroups = groupData.translated
          currentOriginalAbsenceGroups = groupData.original
        }

        const page = (targetPage - 1) * newPageSize
        const whereConditions = buildWhereConditions({
          search,
          statuses,
          types,
          groups,
          employees,
          startDate,
          endDate,
          creationStartDate,
          creationEndDate,
          isTeamAwayFilter
        })

        const orderBy: any[] = []

        if (sortField && sortOrder) {
          const graphqlSortOrder = sortOrder.toUpperCase()
          if (sortField === 'groupName') {
            orderBy.push({ startDate: 'DESC' })
          } else if (sortField === 'status') {
            orderBy.push({ status: graphqlSortOrder })
          } else if (sortField === 'effectiveDays') {
            orderBy.push({ effectiveDays: graphqlSortOrder })
          } else if (sortField === 'employee' || sortField === 'employee.firstName') {
            orderBy.push({ employee: { firstName: graphqlSortOrder } })
            orderBy.push({ employee: { lastName: graphqlSortOrder } })
          } else if (sortField === 'startDate' || sortField === 'endDate' || sortField === 'createdAt') {
            orderBy.push({ [sortField]: graphqlSortOrder })
          } else {
            orderBy.push({ [sortField]: graphqlSortOrder })
          }
        } else {
          orderBy.push({ startDate: 'DESC' })
        }

        const baseWhere = {
          isDeleted: { _eq: false },
          employee: { employeePosition: { supervisor: { id: { _eq: supervisorId } } } }
        }

        let finalWhereConditions
        if (whereConditions.employee?.id) {
          const employeeIds = whereConditions.employee.id._in
          const otherConditions = { ...whereConditions }
          delete otherConditions.employee

          const employeeAndSupervisorWhere = {
            isDeleted: { _eq: false },
            employee: {
              _and: [{ id: { _in: employeeIds } }, { employeePosition: { supervisor: { id: { _eq: supervisorId } } } }]
            }
          }

          finalWhereConditions =
            Object.keys(otherConditions).length > 0
              ? { _and: [employeeAndSupervisorWhere, otherConditions] }
              : employeeAndSupervisorWhere
        } else {
          finalWhereConditions =
            Object.keys(whereConditions).length > 0 ? { _and: [baseWhere, whereConditions] } : baseWhere
        }

        const shouldFetchAllData = sortField === 'groupName'
        const fetchLimit = shouldFetchAllData ? Math.min(2000, newPageSize) : newPageSize
        const fetchOffset = shouldFetchAllData ? 0 : page

        const query = GET_SUPERVISOR_ABSENCES_WITH_FILTERS()

        try {
          const result = await graphqlClient.request<{
            EmployeeAbsence: EmployeeAbsence[]
            EmployeeAbsenceAggregate: {
              aggregate: {
                count: number
              }
            }
          }>(query, {
            offset: fetchOffset,
            limit: fetchLimit,
            where: finalWhereConditions,
            orderBy
          })

          const rawAbsences = result.EmployeeAbsence || []
          const totalCount = result.EmployeeAbsenceAggregate?.aggregate?.count || 0

          let enhancedAbsences = rawAbsences.map(absence =>
            enhanceAbsence(absence, currentAbsenceGroups, currentOriginalAbsenceGroups)
          )

          if (sortField === 'groupName' && sortOrder) {
            enhancedAbsences = enhancedAbsences.sort((a, b) => {
              const aValue = a.groupName || ''
              const bValue = b.groupName || ''
              const groupComparison = aValue.localeCompare(bValue)
              return sortOrder === 'ASC' ? groupComparison : -groupComparison
            })
          }

          if (shouldFetchAllData) {
            const startIndex = (targetPage - 1) * newPageSize
            const endIndex = startIndex + newPageSize
            const paginatedAbsences = enhancedAbsences.slice(startIndex, endIndex)

            setAbsences(paginatedAbsences)
            setTotal(enhancedAbsences.length)
            setCurrentPage(targetPage)
            setPageSize(newPageSize)
            setHasMore(endIndex < enhancedAbsences.length)
          } else {
            setAbsences(enhancedAbsences)
            setTotal(totalCount)
            setCurrentPage(targetPage)
            setPageSize(newPageSize)
            setHasMore(enhancedAbsences.length === newPageSize)
          }
        } catch (error) {
          console.error('Error fetching absences:', error)
          setError(error instanceof Error ? error : new Error('Unknown error'))
        }
      } catch (err) {
        console.error('Error fetching absences:', err)
        setError(err instanceof Error ? err : new Error('Failed to load absences'))
        setAbsences([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    },
    [
      supervisorId,
      search,
      JSON.stringify(statuses),
      JSON.stringify(types),
      JSON.stringify(groups),
      JSON.stringify(employees),
      startDate,
      endDate,
      creationStartDate,
      creationEndDate,
      sortField,
      sortOrder,
      pageSize,
      graphqlClient,
      absenceGroups,
      loadAbsenceGroups
    ]
  )

  const retry = useCallback(() => {
    loadPage(currentPage, pageSize)
  }, [loadPage, currentPage, pageSize])

  const loadMore = useCallback(() => {
    loadPage(currentPage + 1, pageSize)
  }, [loadPage, currentPage, pageSize])

  return {
    absences,
    total,
    loading,
    error,
    hasMore,
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize,
    loadMore,
    loadPage,
    retry
  }
}

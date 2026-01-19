import { useEffect, useState, useCallback, useRef } from 'react'
import { useQueryExecutionClient } from '@/common/network/dataset/useQueryExecutionClient'
import { Services } from '@/common/types/enums/Services'

/**
 * Employee type definition for the directory.
 */
export interface Employee {
  id: string
  userId?: string
  supervisorEmployeeId?: string
  firstName: string
  lastName: string
  jobTitle: string
  organizationalUnit: string
  organizationalUnitId?: string
  email?: string
  workEmail?: string
  profilePicture: string
  employmentType?: string
  contractType?: string
  matrixTeams?: string[]
  // Availability/status fields
  status?: 'Available' | 'On Leave'
  currentAbsence?: {
    type: string
    parentEntryId?: string // e.g., 'AbsenceGroup:v1:HEALTH' for sick leave
    startDate: string
    endDate: string
    status: string
  }
}

/**
 * Filters for the employee directory query.
 */
export type EmployeeFilters = {
  alpha?: string | null
  search?: string
  organizationalUnits?: string[]
  employmentTypes?: string[]
  contractTypes?: string[]
  matrixTeams?: string[]
  sortField?: string
  sortOrder?: 'ASC' | 'DESC'
}

const EMPLOYEES_PER_PAGE = 20

// (no helpers needed for dataset mapping)

// Dataset query name to replace GraphQL in Employees tab
const DATASET_QUERY_NAME = 'hrActiveEmployees'

// Sorting is currently not applied at the dataset level

/**
 * Custom hook to fetch employee directory data with filters and pagination.
 * @param filters Filters for the employee directory.
 * @returns Employees, total count, loading, error, hasMore, loadMore, loadPage, retry
 */
export function useGetEmployees(filters: EmployeeFilters & { accessToken: string }) {
  const datasetClient = useQueryExecutionClient(filters.accessToken, Services.EMPLOYEE)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [shouldClearData, setShouldClearData] = useState(false)
  const lastParamsRef = useRef<Record<string, string | number | boolean>>({})
  const { alpha, search, organizationalUnits, employmentTypes, contractTypes, matrixTeams, sortField, sortOrder } =
    filters
  const alphaFilter = alpha ? `${alpha}%` : `%`
  const searchFilter = search ? `%${search}%` : `%`

  // Build dataset parameters from current filters
  const buildDatasetParams = useCallback(
    (limitParam: number, offsetParam: number) => {
      const params: Record<string, string | number | boolean> = {
        limit: limitParam,
        offset: offsetParam
      }
      if (alpha && alpha.trim() !== '') {
        params.alpha = alpha
      }
      if (search && search.trim() !== '') {
        params.search = search
      }
      if (organizationalUnits && organizationalUnits.length > 0) {
        params.orgUnitIds = organizationalUnits.join(',')
      }
      if (employmentTypes && employmentTypes.length > 0) {
        params.employmentTypeRefs = employmentTypes.join(',')
      }
      if (matrixTeams && matrixTeams.length > 0) {
        params.matrixTeamIds = matrixTeams.join(',')
      }
      return params
    },
    [alpha, search, organizationalUnits, employmentTypes, matrixTeams]
  )

  // Reset pagination state on filter change
  useEffect(() => {
    setOffset(0)
    setHasMore(true)
    // Mark that data should be cleared on next load (for infinite scroll)
    setShouldClearData(true)
    // Don't show loading for filter changes - only for true initial load
    setIsInitialLoad(false)
    // Capture latest params (without limit/offset) to persist across pagination
    const p = buildDatasetParams(0, 0)
    delete (p as any).limit
    delete (p as any).offset
    lastParamsRef.current = p
  }, [
    alpha,
    search,
    JSON.stringify(organizationalUnits),
    JSON.stringify(employmentTypes),
    JSON.stringify(contractTypes),
    JSON.stringify(matrixTeams),
    sortField,
    sortOrder
  ])

  /**
   * Loads more employees from the API. Guards against undefined client and SSR.
   */
  const loadMore = useCallback(() => {
    if (typeof window === 'undefined') return // Prevent SSR execution
    if (!datasetClient) {
      setError(new Error('Dataset client unavailable'))
      setLoading(false)
      return
    }
    if (loading || !hasMore) return

    // Only show loading for true initial load (when component first mounts)
    if (isInitialLoad && employees.length === 0) {
      setLoading(true)
    }
    // For filter changes and infinite scroll: no loading indicator - seamless UX
    const params = buildDatasetParams(EMPLOYEES_PER_PAGE, offset)
    // Persist last non-empty filter params for pagination
    const persisted = { ...params }
    delete (persisted as any).limit
    delete (persisted as any).offset
    lastParamsRef.current = persisted

    datasetClient
      .executeDatasetQuery(DATASET_QUERY_NAME, params)
      .then(res => {
        if (!res || !Array.isArray((res as any).data)) {
          setError(new Error('No response from dataset query'))
          setLoading(false)
          return
        }
        const rows = (res as any).data as any[]
        // Extract total count from value_label formatted as "index|total"
        if (rows.length > 0 && typeof (rows[0] as any).value_label === 'string') {
          const parts = ((rows[0] as any).value_label as string).split('|')
          const totalParsed = parts.length === 2 ? Number(parts[1]) : NaN
          if (Number.isFinite(totalParsed)) {
            setTotal(totalParsed)
          }
        }
        const newEmployees = rows.map((row: any) => {
          const matrixTeamsValue = row.matrix_teams
          let matrixTeams: string[] = []
          if (Array.isArray(matrixTeamsValue)) {
            matrixTeams = matrixTeamsValue.filter((v: any) => typeof v === 'string')
          } else if (typeof matrixTeamsValue === 'string') {
            try {
              const parsed = JSON.parse(matrixTeamsValue)
              matrixTeams = Array.isArray(parsed) ? parsed.filter((v: any) => typeof v === 'string') : []
            } catch {
              matrixTeams = matrixTeamsValue ? [matrixTeamsValue] : []
            }
          }

          return {
            id: row.employee_id,
            userId: row.user_id,
            supervisorEmployeeId: row.supervisor_employee_id,
            firstName: row.first_name ?? '',
            lastName: row.last_name ?? '',
            jobTitle: row.job_title ?? '',
            organizationalUnit: row.organizational_unit ?? '',
            organizationalUnitId: row.organizational_unit_id,
            workEmail: row.work_email ?? '',
            employmentType: row.employment_type ?? '',
            contractType: undefined,
            matrixTeams,
            profilePicture: row.profile_picture ?? ''
          }
        })
        if (shouldClearData || employees.length === 0) {
          setEmployees(newEmployees)
          setShouldClearData(false)
        } else {
          setEmployees((prev: Employee[]) => [...prev, ...newEmployees])
        }

        setOffset(prev => prev + EMPLOYEES_PER_PAGE)
        setHasMore(newEmployees.length === EMPLOYEES_PER_PAGE)
        setLoading(false)
        if (isInitialLoad) {
          setIsInitialLoad(false)
        }
      })
      .catch((err: any) => {
        setError(err)
        setHasMore(false)
        setLoading(false)
      })
  }, [
    loading,
    hasMore,
    datasetClient,
    offset,
    alpha,
    search,
    organizationalUnits,
    employmentTypes,
    contractTypes,
    matrixTeams,
    alphaFilter,
    searchFilter,
    sortField,
    sortOrder,
    isInitialLoad,
    shouldClearData,
    employees.length
  ])

  const retry = useCallback(() => {
    setError(null)
    setHasMore(true)
    loadMore()
  }, [loadMore])

  /**
   * Loads a specific page of employees. Used for true pagination.
   * @param page Page number (1-based)
   * @param pageSize Number of employees per page
   */
  const loadPage = useCallback(
    (page: number, pageSize: number = EMPLOYEES_PER_PAGE) => {
      if (typeof window === 'undefined') return // Prevent SSR execution
      if (!datasetClient) {
        setError(new Error('Dataset client unavailable'))
        setLoading(false)
        return
      }
      if (loading) return

      const pageOffset = (page - 1) * pageSize

      // Always show loading on explicit page change
      setLoading(true)
      setError(null)

      // Reuse the last known filter params to ensure stable pagination
      const base = lastParamsRef.current || {}
      const pageParams = { ...base, limit: pageSize, offset: pageOffset }

      datasetClient
        .executeDatasetQuery(DATASET_QUERY_NAME, pageParams)
        .then(res => {
          if (!res || !Array.isArray((res as any).data)) {
            setError(new Error('No response from dataset query'))
            setLoading(false)
            return
          }
          const rows = (res as any).data as any[]
          // Extract total count from value_label formatted as "index|total"
          if (rows.length > 0 && typeof (rows[0] as any).value_label === 'string') {
            const parts = ((rows[0] as any).value_label as string).split('|')
            const totalParsed = parts.length === 2 ? Number(parts[1]) : NaN
            if (Number.isFinite(totalParsed)) {
              setTotal(totalParsed)
            } else {
              setTotal(0)
            }
          } else {
            setTotal(0)
          }
          const newEmployees = rows.map((row: any) => {
            const matrixTeamsValue = row.matrix_teams
            let matrixTeams: string[] = []
            if (Array.isArray(matrixTeamsValue)) {
              matrixTeams = matrixTeamsValue.filter((v: any) => typeof v === 'string')
            } else if (typeof matrixTeamsValue === 'string') {
              try {
                const parsed = JSON.parse(matrixTeamsValue)
                matrixTeams = Array.isArray(parsed) ? parsed.filter((v: any) => typeof v === 'string') : []
              } catch {
                matrixTeams = matrixTeamsValue ? [matrixTeamsValue] : []
              }
            }

            return {
              id: row.employee_id,
              userId: row.user_id,
              supervisorEmployeeId: row.supervisor_employee_id,
              firstName: row.first_name ?? '',
              lastName: row.last_name ?? '',
              jobTitle: row.job_title ?? '',
              organizationalUnit: row.organizational_unit ?? '',
              organizationalUnitId: row.organizational_unit_id,
              workEmail: row.work_email ?? '',
              employmentType: row.employment_type ?? '',
              contractType: undefined,
              matrixTeams,
              profilePicture: row.profile_picture ?? ''
            }
          })

          setEmployees(newEmployees)
          setOffset(pageOffset)
          setHasMore(newEmployees.length === pageSize)
          setLoading(false)
          if (isInitialLoad) {
            setIsInitialLoad(false)
          }
        })
        .catch((err: any) => {
          setError(err)
          setHasMore(false)
          setLoading(false)
        })
    },
    [
      loading,
      datasetClient,
      alpha,
      search,
      organizationalUnits,
      employmentTypes,
      contractTypes,
      matrixTeams,
      alphaFilter,
      searchFilter,
      sortField,
      sortOrder,
      isInitialLoad
    ]
  )

  useEffect(() => {
    if (datasetClient && (employees.length === 0 || shouldClearData) && !loading) {
      loadMore()
    }
  }, [datasetClient, shouldClearData, loadMore])

  // Total is now derived from value_label in dataset results; no separate total query

  return { employees, total, loading, error, hasMore, loadMore, loadPage, retry }
}

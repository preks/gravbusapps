'use client'

import { useEffect, useState, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { JOB_POSITION_QUERY } from '../queries/JobPositionQueries'

/**
 * Job Function type definition.
 */
export interface JobFunction {
  id: string
  name: string
  jobFamily: JobFamily | null
}

/**
 * Job Level type definition.
 */
export interface JobLevel {
  id: string
  name: string
}

/**
 * Job Profile type definition.
 */
export interface JobProfile {
  id: string
  name: string
}

/**
 * Job Family translation definition.
 */
export interface JobFamilyTranslation {
  value: string
  localeCode: string
  id: string
}

/**
 * Job Family definition.
 */
export interface JobFamily {
  value: string
  id: string
  code: string
  catalogId: string
  translations: JobFamilyTranslation[]
}

/**
 * Contract Type translation definition.
 */
export interface ContractTypeTranslation {
  value: string
  localeCode: string
  id: string
}

/**
 * Contract Type definition.
 */
export interface ContractType {
  value: string
  id: string
  code: string
  catalogId: string
  translations: ContractTypeTranslation[]
}

/**
 * Employment Type translation definition.
 */
export interface EmploymentTypeTranslation {
  value: string
  localeCode: string
  id: string
}

/**
 * Employment Type definition.
 */
export interface EmploymentType {
  value: string
  id: string
  code: string
  catalogId: string
  translations: EmploymentTypeTranslation[]
}

/**
 * Organizational Unit definition.
 */
export interface OrganizationalUnit {
  name: string
  id: string
}

/**
 * Organizational Unit Employee definition.
 */
export interface OrganizationalUnitEmployee {
  organizationalUnit: OrganizationalUnit
}

/**
 * Employee type definition.
 */
export interface Employee {
  pictureThumbnail: string | null
}

/**
 * Employee Position type definition.
 */
export interface EmployeePosition {
  firstName: string
  lastName: string
  employeeId: string
  employee: Employee
  supervisor?: {
    id: string
    firstName: string
    lastName: string
    pictureThumbnail?: string | null
  }
}

/**
 * Job Position type definition for the list.
 */
export interface JobPosition {
  id: string
  name: string
  activeTo?: string | null
  jobFunction: JobFunction | null
  jobLevel: JobLevel | null
  jobProfile: JobProfile | null
  employeePositions: EmployeePosition[]
  contractType: ContractType | null
  employmentType: EmploymentType | null
  organizationalUnitEmployees: OrganizationalUnitEmployee[]
}

/**
 * Interface for job position list filters
 */
export interface JobPositionListFilters {
  search?: string
  departments?: string[]
  jobProfiles?: string[]
  jobFunctions?: string[]
  vacant?: boolean
  missingJobProfile?: boolean
  sortField?: string
  sortOrder?: 'ASC' | 'DESC'
}

/**
 * Vacancy filter type for the hook.
 */
export type VacancyFilter = 'vacant' | 'filled' | 'all'

const POSITIONS_PER_PAGE = 20

/**
 * Helper function to build sort condition for GraphQL orderBy (matches AccountList pattern)
 */
const buildSortCondition = (sortField: string, sortOrder: 'ASC' | 'DESC', orderBy: any) => {
  const sortDirection = sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'

  switch (sortField) {
    case 'name':
      orderBy.name = sortDirection
      break
    // Department sorting disabled - not supported due to GraphQL schema limitations
    case 'jobFunction':
      orderBy.jobFunction = { name: sortDirection }
      break
    case 'profile':
      orderBy.jobProfile = { name: sortDirection }
      break
    case 'employee':
      // Fixed: Use correct GraphQL path for employee sorting
      orderBy.employeePositionsAggregate = { max: { firstName: sortDirection } }
      break
    case 'markedForTermination':
      // Sort by activeTo with desired null handling:
      // ASC -> NULLS FIRST, DESC -> NULLS LAST
      orderBy.activeTo = sortField && sortOrder === 'ASC' ? 'ASC_NULLS_FIRST' : 'DESC_NULLS_LAST'
      break
  }
}

/**
 * Custom hook to fetch job position list data with filters and pagination.
 * @param filters Filters for the job position list.
 * @returns Job positions, total count, loading, error, hasMore, loadMore, loadPage, retry
 */
export function useJobPositionListData(filters: JobPositionListFilters & { accessToken: string }) {
  const client = useGraphqlClient(filters.accessToken)
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const { search, departments, jobProfiles, jobFunctions, vacant, missingJobProfile, sortField, sortOrder } = filters

  // Get the structureId from the BusinessAppContext
  const structureId = getCurrentActiveStructureId()

  // Reset pagination state on filter change (but keep data visible)
  useEffect(() => {
    setHasMore(true)
    // Note: We intentionally DON'T clear jobPositions to avoid loading flicker
    // The data will be replaced when the new query completes
  }, [
    search,
    JSON.stringify(departments),
    JSON.stringify(jobProfiles),
    JSON.stringify(jobFunctions),
    vacant,
    missingJobProfile,
    sortField,
    sortOrder
  ])

  /**
   * Loads a specific page of job positions. Used for true pagination.
   * @param page Page number (1-based)
   * @param pageSize Number of positions per page
   * @param overrideFilters Optional filters to override the current ones
   */
  const loadPage = useCallback(
    (page: number, pageSize: number = POSITIONS_PER_PAGE, overrideFilters?: JobPositionListFilters) => {
      if (typeof window === 'undefined') return // Prevent SSR execution
      if (!client) {
        setError(new Error('GraphQL client unavailable'))
        setLoading(false)
        return
      }
      if (loading) return

      const pageOffset = (page - 1) * pageSize

      // Only show loading for initial load (no existing data)
      if (jobPositions.length === 0) {
        setLoading(true) // Full loading for initial load only
      }
      // For existing data: no loading indicator - seamless like pagination
      setError(null)

      // Use provided filters or current filters
      const currentFilters = overrideFilters || filters

      // Build filter object for all filter types
      const filterConditions: any[] = []
      // Always show only positions still active: activeTo is null or in the future
      const todayIso = new Date().toISOString()
      filterConditions.push({
        _or: [{ activeTo: { _isNull: true } }, { activeTo: { _gte: todayIso } }]
      })

      // Handle both departments and organizationalUnits (for backward compatibility)
      const orgUnits = currentFilters.departments
      if (orgUnits && orgUnits.length > 0) {
        filterConditions.push({
          organizationalUnitEmployees: {
            organizationalUnit: {
              id: { _in: orgUnits }
            }
          }
        })
      }

      if (currentFilters.jobProfiles && currentFilters.jobProfiles.length > 0) {
        filterConditions.push({
          jobProfile: {
            id: { _in: currentFilters.jobProfiles }
          }
        })
      }

      // Handle missing job profile filter
      if (currentFilters.missingJobProfile === true) {
        filterConditions.push({
          jobProfileId: { _isNull: true }
        })
      }

      if (currentFilters.jobFunctions && currentFilters.jobFunctions.length > 0) {
        filterConditions.push({
          jobFunction: {
            id: { _in: currentFilters.jobFunctions }
          }
        })
      }

      // PERFORMANCE: Use simplified search for initial load if no search term
      const hasActiveSearch = currentFilters.search && currentFilters.search.trim().length > 0

      // Build order by condition (matches AccountList pattern)
      const orderBy: any = {}
      if (currentFilters.sortField && currentFilters.sortField.trim() !== '' && currentFilters.sortOrder) {
        buildSortCondition(currentFilters.sortField, currentFilters.sortOrder, orderBy)
      }

      // Prepare query variables
      const variables: any = {
        structureId,
        limit: pageSize,
        offset: pageOffset,
        filter: filterConditions.length > 0 ? { _and: filterConditions } : {},
        search: hasActiveSearch ? `%${currentFilters.search?.trim()}%` : '%%', // Match all if no search
        // Always provide vacant parameter, but set to undefined to ignore vacancy when filtering by missing job profile
        vacant: currentFilters.missingJobProfile ? undefined : currentFilters.vacant,
        orderBy: Object.keys(orderBy).length > 0 ? [orderBy] : [{ name: 'ASC_NULLS_LAST' }]
      }

      client
        .request?.(JOB_POSITION_QUERY, variables)
        .then((res: any) => {
          if (!res) {
            setError(new Error('No response from GraphQL query'))
            setLoading(false)
            return
          }

          const positions = res.JobPosition ?? []

          // Server-side filtering is now handled in the GraphQL query
          setJobPositions(positions)
          setTotal(res.JobPositionAggregate.aggregate.count)

          // Check if there are more positions to load
          const hasMoreData =
            positions.length === pageSize && pageOffset + pageSize < res.JobPositionAggregate.aggregate.count
          setHasMore(hasMoreData)

          setLoading(false)
        })
        .catch((err: any) => {
          console.error('Error loading job positions:', err)
          setError(err)
          setHasMore(false)
          setLoading(false)
        })
    },
    [client, structureId]
  ) // Removed filters from dependencies to avoid loops

  /**
   * Loads more job positions from the API (for backward compatibility).
   * @deprecated Use loadPage instead for proper pagination
   */
  const loadMore = useCallback(() => {
    loadPage(1, POSITIONS_PER_PAGE)
  }, [loadPage])

  const retry = useCallback(() => {
    setError(null)
    setHasMore(true)
    setJobPositions([])
    setTotal(0)
    loadPage(1)
  }, [loadPage])

  return { jobPositions, total, loading, error, hasMore, loadMore, loadPage, retry }
}

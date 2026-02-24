import { useState, useCallback, useRef, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { Employee } from '../types'

interface UseEmployeeSearchResult {
  employees: Employee[]
  loading: boolean
  error: Error | null
  searchEmployees: (searchTerm: string) => Promise<void>
  initialLoadComplete: boolean
}

interface UseEmployeeSearchOptions {
  accessToken: string
  currentUserId?: string
}

/**
 * Custom hook for searching employees by name
 * Performs async search with debouncing and limits results to 20
 * On initial load (empty search), shows employees from the same structure
 * @param options - Access token and optional current user ID for filtering
 * @returns Object containing employees data, loading state, error state, and search function
 */
const TEAM_MEMBERS_BY_ORG_UNIT_QUERY = `
  query GetTeamMembersByOrgUnit($structureId: uuid!, $orgUnitId: uuid!, $limit: Int) {
    EmployeePosition(
      where: {
        structureId: { _eq: $structureId },
        organizationalUnitId: { _eq: $orgUnitId },
        employee: { isDeleted: { _eq: false } }
      },
      limit: $limit,
      orderBy: { firstName: ASC, lastName: ASC }
    ) {
      id
      employeeId
      firstName
      lastName
      employee {
        id
        displayName
        pictureThumbnail
        userId
        fullName
        code
        communication(where: { typeRef: { _eq: "email" }, isDeleted: { _eq: false } }, limit: 1) {
          value
        }
      }
    }
  }
`

async function fetchEmployeePositions(
  graphqlClient: ReturnType<typeof useGraphQLClient>,
  query: string,
  variables: Record<string, unknown>,
  currentUserId: string | undefined,
  isInitialLoad: boolean
): Promise<any[]> {
  if (currentUserId && isInitialLoad) {
    const orgUnitResponse = await graphqlClient.request<{ currentUserPosition: any[] }>(query, {
      structureId: variables.structureId,
      currentUserId: variables.currentUserId
    })
    const orgUnitId = orgUnitResponse.currentUserPosition[0]?.organizationalUnitId
    if (!orgUnitId) {
      console.warn('[useEmployeeSearch] No org unit found for user, falling back to search')
      return []
    }
    const teamResponse = await graphqlClient.request<{ EmployeePosition: any[] }>(TEAM_MEMBERS_BY_ORG_UNIT_QUERY, {
      structureId: variables.structureId,
      orgUnitId,
      limit: variables.limit
    })
    return teamResponse.EmployeePosition
  }
  const response = await graphqlClient.request<{ EmployeePosition: any[] }>(query, variables)
  return response.EmployeePosition
}

export const useEmployeeSearch = (options: UseEmployeeSearchOptions | string): UseEmployeeSearchResult => {
  // Support both old signature (string) and new signature (object)
  const { accessToken, currentUserId } =
    typeof options === 'string' ? { accessToken: options, currentUserId: undefined } : options
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState<boolean>(true) // Start with true to show initial load
  const [error, setError] = useState<Error | null>(null)
  const [initialLoadComplete, setInitialLoadComplete] = useState<boolean>(false)

  const graphqlClient = useGraphQLClient(accessToken)
  const abortControllerRef = useRef<AbortController | null>(null)
  const lastSearchRef = useRef<string | null>(null) // Track last search to prevent duplicate fetches

  const searchEmployees = useCallback(
    async (searchTerm: string) => {
      // Skip if we've already fetched this exact search term (prevent duplicate fetches)
      if (lastSearchRef.current === searchTerm) {
        return
      }

      // Update last search term
      lastSearchRef.current = searchTerm

      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()

      if (!accessToken) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        // Default: show team members (same org unit)
        // Search: show all structure employees matching search term
        const isInitialLoad = !searchTerm || searchTerm.trim() === ''
        const structureId = getCurrentActiveStructureId()

        // On initial load with currentUserId, get team members from same org unit
        // OPTIMIZED: Filter by organizational unit in GraphQL query (server-side)
        const query =
          currentUserId && isInitialLoad
            ? `
              query GetTeamMembers($structureId: uuid!, $currentUserId: String!) {
                # First, get current user's organizational unit (limit hardcoded to 1)
                currentUserPosition: EmployeePosition(
                  where: {
                    structureId: { _eq: $structureId },
                    employee: { userId: { _eq: $currentUserId } }
                  },
                  limit: 1
                ) {
                  organizationalUnitId
                  organizationalUnit {
                    id
                  }
                }
              }
            `
            : `
              query SearchEmployees($structureId: uuid!, $search: String, $limit: Int) {
                EmployeePosition(
                  where: {
                    structureId: { _eq: $structureId },
                    employee: { isDeleted: { _eq: false } },
                    _or: [
                      { firstName: { _ilike: $search } },
                      { lastName: { _ilike: $search } },
                      { employee: { displayName: { _ilike: $search } } }
                    ]
                  },
                  limit: $limit,
                  orderBy: { firstName: ASC, lastName: ASC }
                ) {
                  id
                  employeeId
                  firstName
                  lastName
                  employee {
                    id
                    displayName
                    pictureThumbnail
                    userId
                    fullName
                    code
                    communication(where: { typeRef: { _eq: "email" }, isDeleted: { _eq: false } }, limit: 1) {
                      value
                    }
                  }
                }
              }
            `

        const variables =
          currentUserId && isInitialLoad
            ? {
                structureId: structureId || '99b1ba64-a4d3-4dd0-8302-b1dc0c4daaaf',
                currentUserId,
                limit: 50 // REDUCED: Only fetch 50 team members max (was 500!)
              }
            : {
                structureId: structureId || '99b1ba64-a4d3-4dd0-8302-b1dc0c4daaaf',
                search: `%${searchTerm}%`,
                limit: 20 // REDUCED: Show top 20 search results (was 50)
              }

        const employeePositions = await fetchEmployeePositions(
          graphqlClient,
          query,
          variables,
          currentUserId,
          isInitialLoad
        )

        const formattedEmployees: Employee[] = employeePositions
          .map((pos: any) => ({
            id: pos.employee?.id || pos.employeeId,
            userId: pos.employee?.userId,
            firstName: pos.firstName,
            lastName: pos.lastName,
            fullName: pos.employee?.fullName || `${pos.firstName} ${pos.lastName}`,
            displayName: pos.employee?.displayName || `${pos.firstName} ${pos.lastName}`,
            pictureThumbnail: pos.employee?.pictureThumbnail,
            email: pos.employee?.communication?.[0]?.value,
            personnelCode: pos.employee?.code
          }))
          // Filter out current user
          .filter((emp: Employee) => !currentUserId || emp.userId !== currentUserId)

        setEmployees(formattedEmployees)

        // Mark initial load as complete only for the first successful load
        if (!initialLoadComplete && isInitialLoad) {
          setInitialLoadComplete(true)
        }
      } catch (err: any) {
        // Ignore abort errors
        if (err.name === 'AbortError') {
          return
        }
        setError(err instanceof Error ? err : new Error('Failed to search employees'))
        console.error('Error searching employees:', err)
      } finally {
        setLoading(false)
      }
    },
    [accessToken, graphqlClient, initialLoadComplete]
  )

  // Cleanup: abort any pending requests when component unmounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    employees,
    loading,
    error,
    searchEmployees,
    initialLoadComplete
  }
}

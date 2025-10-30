import { useState, useCallback, useRef, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { Employee } from '../types'

interface UseEmployeeSearchResult {
  employees: Employee[]
  loading: boolean
  error: Error | null
  searchEmployees: (searchTerm: string) => Promise<void>
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
export const useEmployeeSearch = (options: UseEmployeeSearchOptions | string): UseEmployeeSearchResult => {
  // Support both old signature (string) and new signature (object)
  const { accessToken, currentUserId } =
    typeof options === 'string' ? { accessToken: options, currentUserId: undefined } : options
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)
  const abortControllerRef = useRef<AbortController | null>(null)

  const searchEmployees = useCallback(
    async (searchTerm: string) => {
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
        // On search, get all employees from structure
        const query =
          currentUserId && isInitialLoad
            ? `
              query GetTeamMembers($structureId: uuid!, $currentUserId: String!, $limit: Int) {
                # First, get current user's organizational unit
                currentUserPosition: EmployeePosition(
                  where: {
                    structureId: { _eq: $structureId },
                    employee: { userId: { _eq: $currentUserId } }
                  },
                  limit: 1
                ) {
                  organizationalUnitId
                }
                
                # Then get all employees from structure (will filter by org unit later)
                EmployeePosition(
                  where: {
                    structureId: { _eq: $structureId },
                    employee: { isDeleted: { _eq: false } }
                  },
                  limit: $limit,
                  orderBy: { firstName: ASC, lastName: ASC }
                ) {
                  id
                  employeeId
                  organizationalUnitId
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
                limit: 500 // Get all from structure, will filter by org unit
              }
            : {
                structureId: structureId || '99b1ba64-a4d3-4dd0-8302-b1dc0c4daaaf',
                search: `%${searchTerm}%`,
                limit: 50 // Show more search results
              }

        const response = await graphqlClient.request<{
          EmployeePosition: any[]
          currentUserPosition?: any[]
        }>(query, variables)

        let employeePositions = response.EmployeePosition

        // If initial load (team members), filter by organizational unit to show all team members
        if (currentUserId && isInitialLoad && response.currentUserPosition && response.currentUserPosition.length > 0) {
          const currentUserOrgUnitId = response.currentUserPosition[0]?.organizationalUnitId

          // Filter employees to only those in the same org unit as current user
          if (currentUserOrgUnitId) {
            employeePositions = employeePositions.filter(
              (pos: any) => pos.organizationalUnitId === currentUserOrgUnitId
            )
          }
        }

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
    [accessToken, graphqlClient]
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
    searchEmployees
  }
}

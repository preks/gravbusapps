/**
 * Hook for searching and selecting substitute employees
 * Shows team members first (same organizational unit) on initial load
 * Provides search functionality across all employees
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'

export interface SubstituteEmployee {
  id: string
  employeeId: string
  firstName: string
  lastName: string
  displayName: string
  pictureThumbnail?: string
  userId?: string
}

interface UseSubstituteEmployeeSearchOptions {
  accessToken: string
  currentUserId?: string
}

export const useSubstituteEmployeeSearch = ({ accessToken, currentUserId }: UseSubstituteEmployeeSearchOptions) => {
  const [employees, setEmployees] = useState<SubstituteEmployee[]>([])
  const [loading, setLoading] = useState<boolean>(true) // Start with true to show initial load
  const [error, setError] = useState<Error | null>(null)
  const [initialLoadComplete, setInitialLoadComplete] = useState<boolean>(false)

  const graphqlClient = useGraphQLClient(accessToken)
  const abortControllerRef = useRef<AbortController | null>(null)
  const lastSearchRef = useRef<string | null>(null)

  const searchEmployees = useCallback(
    async (searchTerm: string) => {
      // Skip duplicate searches
      if (lastSearchRef.current === searchTerm) {
        console.log('[useSubstituteEmployeeSearch] Skipping duplicate search:', searchTerm)
        return
      }

      lastSearchRef.current = searchTerm

      // Cancel pending requests
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
        const isInitialLoad = !searchTerm || searchTerm.trim() === ''
        const structureId = getCurrentActiveStructureId()

        console.log('[useSubstituteEmployeeSearch] Fetching employees:', {
          searchTerm,
          isInitialLoad,
          hasCurrentUserId: !!currentUserId,
          structureId
        })

        // On initial load: fetch team members from same org unit
        // On search: fetch all matching employees
        let employeePositions: any[] = []

        if (currentUserId && isInitialLoad) {
          // Step 1: Get current user's organizational unit
          const orgUnitQuery = `
            query GetCurrentUserOrgUnit($structureId: uuid!, $currentUserId: String!) {
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

          const orgUnitResponse = await graphqlClient.request<{
            currentUserPosition: any[]
          }>(orgUnitQuery, {
            structureId,
            currentUserId
          })

          const currentUserOrgUnitId = orgUnitResponse.currentUserPosition[0]?.organizationalUnitId

          console.log('[useSubstituteEmployeeSearch] User org unit:', currentUserOrgUnitId)

          // Step 2: Fetch team members from same organizational unit
          if (currentUserOrgUnitId) {
            const teamMembersQuery = `
              query GetTeamMembers($structureId: uuid!, $orgUnitId: uuid!, $limit: Int) {
                EmployeePosition(
                  where: {
                    structureId: { _eq: $structureId },
                    organizationalUnitId: { _eq: $orgUnitId },
                    employee: { isDeleted: { _eq: false } }
                  },
                  limit: $limit,
                  orderBy: [{ firstName: ASC }, { lastName: ASC }]
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
                  }
                }
              }
            `

            const teamMembersResponse = await graphqlClient.request<{
              EmployeePosition: any[]
            }>(teamMembersQuery, {
              structureId,
              orgUnitId: currentUserOrgUnitId,
              limit: 50
            })

            employeePositions = teamMembersResponse.EmployeePosition
            console.log('[useSubstituteEmployeeSearch] Team members fetched:', employeePositions.length)
          }
        } else {
          // Search all employees
          const searchQuery = `
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
                orderBy: [{ firstName: ASC }, { lastName: ASC }]
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
                }
              }
            }
          `

          const searchResponse = await graphqlClient.request<{
            EmployeePosition: any[]
          }>(searchQuery, {
            structureId,
            search: `%${searchTerm}%`,
            limit: 20
          })

          employeePositions = searchResponse.EmployeePosition
          console.log('[useSubstituteEmployeeSearch] Search results:', employeePositions.length)
        }

        // Transform to consistent format
        const transformedEmployees: SubstituteEmployee[] = employeePositions.map((pos: any) => ({
          id: pos.employeeId, // Use employeeId as the main ID
          employeeId: pos.employeeId,
          firstName: pos.firstName,
          lastName: pos.lastName,
          displayName: pos.employee?.displayName || `${pos.firstName} ${pos.lastName}`,
          pictureThumbnail: pos.employee?.pictureThumbnail,
          userId: pos.employee?.userId
        }))

        setEmployees(transformedEmployees)
        setError(null)

        // Mark initial load as complete only for the first successful load
        if (!initialLoadComplete && isInitialLoad) {
          setInitialLoadComplete(true)
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('[useSubstituteEmployeeSearch] Request aborted')
          return
        }

        const error = err instanceof Error ? err : new Error('Failed to fetch employees')
        setError(error)
        console.error('[useSubstituteEmployeeSearch] Error:', error)
      } finally {
        setLoading(false)
      }
    },
    [accessToken, currentUserId, graphqlClient, initialLoadComplete]
  )

  // Auto-fetch on mount (teammates)
  useEffect(() => {
    if (accessToken) {
      searchEmployees('')
    }
  }, [accessToken, searchEmployees])

  return {
    employees,
    loading,
    error,
    searchEmployees,
    initialLoadComplete
  }
}

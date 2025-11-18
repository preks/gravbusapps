import { useState, useCallback, useRef, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { Employee } from '../types'

interface UseEmployeeSearchResult {
  employees: Employee[]
  loading: boolean
  error: Error | null
  searchEmployees: (searchTerm: string) => Promise<void>
}

// Helper to format employee data from GraphQL response
const formatEmployee = (emp: any): Employee => ({
  id: emp.id,
  userId: emp.userId,
  firstName: emp.firstName,
  lastName: emp.lastName,
  fullName: emp.fullName || `${emp.firstName} ${emp.lastName}`,
  email: emp.communication?.[0]?.value,
  personnelCode: emp.code,
  avatarUrl: emp.pictureThumbnail ? `data:image/jpeg;base64,${emp.pictureThumbnail}` : undefined
})

/**
 * Custom hook for searching employees by name
 * Performs async search with debouncing and limits results to 20
 * Prioritizes teammates in the results (teammates appear first)
 * @param accessToken - Access token for authorization
 * @param employeeId - Current user's employee ID for fetching teammates
 * @returns Object containing employees data, loading state, error state, and search function
 */
export const useEmployeeSearch = (accessToken: string, employeeId?: string): UseEmployeeSearchResult => {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  const [hasSearched, setHasSearched] = useState<boolean>(false)
  const [teammates, setTeammates] = useState<Employee[]>([])
  const [teammatesLoading, setTeammatesLoading] = useState<boolean>(true)

  const graphqlClient = useGraphQLClient(accessToken)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Fetch teammates from organizational unit using GraphQL
  useEffect(() => {
    const fetchTeammates = async () => {
      if (!employeeId || !accessToken) {
        setTeammatesLoading(false)
        return
      }

      setTeammatesLoading(true)
      try {
        // Fetch teammates from the same organizational unit in a single query
        const query = `
          query GetTeammates($employeeId: uuid!) {
            myUnit: EmployeeOrganizationalUnit(
              where: { employeeId: { _eq: $employeeId } }
              limit: 1
            ) {
              organizationalUnitId
            }
            teammates: EmployeeOrganizationalUnit(
              where: {
                employeeId: { _eq: $employeeId }
              }
            ) {
              organizationalUnit {
                organizationalUnitEmployee {
                  employee {
                    id
                    userId
                    firstName
                    lastName
                    fullName
                    code
                    pictureThumbnail
                    communication(where: { typeRef: { _eq: "email" }, isDeleted: { _eq: false } }, limit: 1) {
                      value
                    }
                  }
                }
              }
            }
          }
        `
        const response = await graphqlClient.request<{
          myUnit: Array<{ organizationalUnitId: string }>
          teammates: Array<{ organizationalUnit: { organizationalUnitEmployee: Array<{ employee: any }> } }>
        }>(query, { employeeId })

        if (response.teammates.length === 0 || !response.teammates[0]?.organizationalUnit) {
          setTeammatesLoading(false)
          return
        }

        const formattedTeammates = response.teammates[0].organizationalUnit.organizationalUnitEmployee
          .map(({ employee }) => formatEmployee(employee))
          .filter(emp => emp.userId) // Filter out test accounts

        setTeammates(formattedTeammates)
      } catch (err) {
        console.error('Error fetching teammates:', err)
      } finally {
        setTeammatesLoading(false)
      }
    }

    fetchTeammates()
  }, [employeeId, accessToken, graphqlClient])

  // Initialize employees with teammates when they first load
  useEffect(() => {
    if (teammates.length > 0 && !hasSearched) {
      setEmployees(teammates)
    }
  }, [teammates, hasSearched])

  const searchEmployees = useCallback(
    async (searchTerm: string) => {
      // CRITICAL: Don't allow any search while teammates are still loading
      // This prevents the initial empty search from running before teammates are ready
      if (teammatesLoading) {
        return
      }

      // If search term is empty and we haven't searched yet, just show teammates
      if (!searchTerm && !hasSearched && teammates.length > 0) {
        return
      }

      // Mark that a search has been performed
      setHasSearched(true)

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
        // GraphQL query to search employees by name
        const query = `
          query SearchEmployees($searchTerm: String!) {
            Employee(
              limit: 20,
              orderBy: { firstName: ASC },
              where: {
                isDeleted: { _eq: false },
                _or: [
                  { firstName: { _ilike: $searchTerm } },
                  { lastName: { _ilike: $searchTerm } },
                  { fullName: { _ilike: $searchTerm } }
                ]
              }
            ) {
              id
              userId
              firstName
              lastName
              fullName
              code
              pictureThumbnail
              communication(where: { typeRef: { _eq: "email" }, isDeleted: { _eq: false } }, limit: 1) {
                value
              }
            }
          }
        `

        const variables = {
          searchTerm: `%${searchTerm}%`
        }

        const response = await graphqlClient.request<{ Employee: any[] }>(query, variables)
        const formattedEmployees = response.Employee.map(formatEmployee)

        // Filter teammates that match the search term
        const searchLower = searchTerm.toLowerCase()
        const teammateEmployees = teammates.filter(
          t =>
            !searchTerm ||
            t.fullName.toLowerCase().includes(searchLower) ||
            t.firstName.toLowerCase().includes(searchLower) ||
            t.lastName.toLowerCase().includes(searchLower)
        )

        // Filter out duplicates and combine: teammates first, then others
        const teammateUserIds = new Set(teammateEmployees.map(t => t.userId))
        const nonTeammates = formattedEmployees.filter(emp => !teammateUserIds.has(emp.userId))

        setEmployees([...teammateEmployees, ...nonTeammates])
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
    [accessToken, graphqlClient, teammates, hasSearched, teammatesLoading]
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
    loading: loading || teammatesLoading,
    error,
    searchEmployees
  }
}

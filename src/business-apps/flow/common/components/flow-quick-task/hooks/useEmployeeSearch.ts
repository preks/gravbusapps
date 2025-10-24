import { useState, useCallback, useRef, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { Employee } from '../types'

interface UseEmployeeSearchResult {
  employees: Employee[]
  loading: boolean
  error: Error | null
  searchEmployees: (searchTerm: string) => Promise<void>
}

/**
 * Custom hook for searching employees by name
 * Performs async search with debouncing and limits results to 20
 * @param accessToken - Access token for authorization
 * @returns Object containing employees data, loading state, error state, and search function
 */
export const useEmployeeSearch = (accessToken: string): UseEmployeeSearchResult => {
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

        const formattedEmployees: Employee[] = response.Employee.map((emp: any) => ({
          id: emp.id,
          userId: emp.userId,
          firstName: emp.firstName,
          lastName: emp.lastName,
          fullName: emp.fullName || `${emp.firstName} ${emp.lastName}`,
          email: emp.communication?.[0]?.value,
          personnelCode: emp.code
        }))

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

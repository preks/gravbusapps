import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface Employee {
  id: string
  userId: string
  firstName: string
  lastName: string
  fullName: string
  email?: string
  personnelCode?: string
}

interface UseAllEmployeesResult {
  employees: Employee[]
  loading: boolean
  error: Error | null
}

/**
 * Custom hook for fetching ALL employees
 * @param accessToken - Access token for authorization
 * @returns Object containing all employees data, loading state, and error state
 */
export const useAllEmployees = (accessToken: string): UseAllEmployeesResult => {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchAllEmployees = async () => {
      if (!accessToken) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        // GraphQL query to fetch all employees with communication (email)
        const query = `
          query GetAllEmployees {
            Employee(
              limit: 1000, 
              orderBy: { firstName: ASC },
              where: { isDeleted: { _eq: false } }
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

        const response = await graphqlClient.request<{ Employee: any[] }>(query)

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
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch employees'))
        console.error('Error fetching all employees:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAllEmployees()
  }, [accessToken, graphqlClient])

  return {
    employees,
    loading,
    error
  }
}

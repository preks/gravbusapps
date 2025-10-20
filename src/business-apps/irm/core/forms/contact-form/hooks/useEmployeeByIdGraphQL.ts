import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface EmployeeGraphQLData {
  id: string
  firstName: string
  lastName: string
  displayName: string
  pictureThumbnail?: string
  picture?: string
  userId?: string
}

export interface EmployeePositionGraphQLData {
  employeeId: string
  employee: EmployeeGraphQLData
  jobPosition?: {
    name: string
  }
  organizationalUnit?: {
    name: string
  }
}

// GraphQL query to fetch a specific employee by ID
const GET_EMPLOYEE_BY_ID = `
  query GetEmployeeById($employeeId: uuid!) {
    EmployeePosition(
      where: { 
        employeeId: { _eq: $employeeId }
        employee: { isDeleted: { _eq: false } }
      }
      limit: 1
    ) {
      employeeId
      employee {
        id
        firstName
        lastName
        displayName
        pictureThumbnail
        picture
        userId
      }
      jobPosition {
        name
      }
      organizationalUnit {
        name
      }
    }
  }
`

export const useEmployeeByIdGraphQL = (accessToken: string, employeeId?: string) => {
  const [employeeData, setEmployeeData] = useState<EmployeePositionGraphQLData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  const fetchEmployee = useCallback(
    async (id: string) => {
      if (!id || !accessToken) {
        setEmployeeData(null)
        setError(null)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await graphqlClient.request<{
          EmployeePosition: EmployeePositionGraphQLData[]
        }>(GET_EMPLOYEE_BY_ID, {
          employeeId: id
        })

        const employee = result?.EmployeePosition?.[0]
        if (employee) {
          setEmployeeData(employee)
        } else {
          console.warn('⚠️ No employee found for ID:', id)
          setEmployeeData(null)
        }
      } catch (err) {
        console.error('❌ Error fetching employee by ID:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch employee')
        setEmployeeData(null)
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken, graphqlClient]
  )

  // Automatically fetch when employeeId changes
  useEffect(() => {
    if (employeeId) {
      fetchEmployee(employeeId)
    } else {
      setEmployeeData(null)
      setError(null)
    }
  }, [employeeId, fetchEmployee])

  return {
    employeeData,
    isLoading,
    error,
    refetch: () => (employeeId ? fetchEmployee(employeeId) : Promise.resolve())
  }
}

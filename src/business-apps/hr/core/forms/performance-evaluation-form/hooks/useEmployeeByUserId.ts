import { useState, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface EmployeeByUserIdData {
  id: string
  employeeId: string
  firstName: string
  lastName: string
  hireDate: string | null
  employee: {
    id: string
    displayName: string
    picture: string | null
    pictureThumbnail: string | null
    userId: string | null
  }
  jobPosition: {
    id: string
    name: string
    jobFunction: {
      name: string
    } | null
    jobLevel: {
      name: string
    } | null
  }
  organizationalUnit: {
    id: string
    name: string
    code: string | null
    description: string
  }
}

export interface EmployeeByUserIdResponse {
  EmployeePosition: EmployeeByUserIdData[]
}

export interface UseEmployeeByUserIdProps {
  accessToken: string
  userId?: string
}

export interface UseEmployeeByUserIdReturn {
  employee: EmployeeByUserIdData | null
  employeeId: string | null
  loading: boolean
  error: string | null
  fetchEmployeeByUserId: (userId: string) => Promise<void>
}

export const GET_EMPLOYEE_BY_USER_ID = (userId: string): string => {
  return `
    query GetEmployeeByUserId {
      EmployeePosition(
        where: { employee: { userId: { _eq: "${userId}" } } }
        limit: 1
      ) {
        id
        employeeId
        firstName
        lastName
        hireDate
        employee {
          id
          displayName
          picture
          pictureThumbnail
          userId
        }
        jobPosition {
          id
          name
          jobFunction {
            name
          }
          jobLevel {
            name
          }
        }
        organizationalUnit {
          id
          name
          code
          description
        }
      }
    }
  `
}

/**
 * Custom hook for fetching a single employee by userId
 */
export const useEmployeeByUserId = ({ accessToken }: UseEmployeeByUserIdProps): UseEmployeeByUserIdReturn => {
  const [employee, setEmployee] = useState<EmployeeByUserIdData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  const fetchEmployeeByUserId = useCallback(
    async (targetUserId: string) => {
      if (!accessToken || !targetUserId) {
        return
      }

      setLoading(true)
      setError(null)

      try {
        const query = GET_EMPLOYEE_BY_USER_ID(targetUserId)
        const result = await graphqlClient.request<EmployeeByUserIdResponse>(query)

        if (result.EmployeePosition && result.EmployeePosition.length > 0) {
          setEmployee(result.EmployeePosition[0])
        } else {
          setEmployee(null)
          setError('Employee not found')
        }
      } catch (err) {
        console.error('[useEmployeeByUserId] Error fetching employee by userId:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch employee')
        setEmployee(null)
      } finally {
        setLoading(false)
      }
    },
    [accessToken, graphqlClient]
  )

  return {
    employee,
    employeeId: employee?.employeeId || null,
    loading,
    error,
    fetchEmployeeByUserId
  }
}

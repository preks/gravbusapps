/**
 * Hook to fetch employee avatar data by userId or employeeId
 * Tries userId first (for Kogito tasks), then fallback to employeeId (for CFlow tasks)
 * Fetches pictureThumbnail, firstName, lastName from GraphQL
 */

import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface EmployeeAvatarData {
  id: string
  firstName: string
  lastName: string
  displayName: string
  pictureThumbnail?: string
}

const GET_EMPLOYEE_AVATAR_BY_USER_ID = `
  query GetEmployeeAvatarByUserId($userId: String!) {
    Employee(
      where: { 
        userId: { _eq: $userId }
        isDeleted: { _eq: false }
      }
      limit: 1
    ) {
      id
      firstName
      lastName
      displayName
      pictureThumbnail
    }
  }
`

const GET_EMPLOYEE_AVATAR_BY_EMPLOYEE_ID = `
  query GetEmployeeAvatarByEmployeeId($employeeId: uuid!) {
    EmployeePosition(
      where: { 
        employeeId: { _eq: $employeeId }
        employee: { isDeleted: { _eq: false } }
      }
      limit: 1
    ) {
      employee {
        id
        firstName
        lastName
        displayName
        pictureThumbnail
      }
    }
  }
`

export const useEmployeeAvatar = (accessToken: string, id?: string) => {
  const [employeeData, setEmployeeData] = useState<EmployeeAvatarData | null>(null)
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
        // Try querying by userId first (Kogito tasks use userId)
        const userIdResult = await graphqlClient.request<{
          Employee: EmployeeAvatarData[]
        }>(GET_EMPLOYEE_AVATAR_BY_USER_ID, {
          userId: id
        })

        let employee = userIdResult?.Employee?.[0]

        // If not found by userId, try by employeeId (CFlow might use employeeId)
        if (!employee) {
          const employeeIdResult = await graphqlClient.request<{
            EmployeePosition: Array<{
              employee: EmployeeAvatarData
            }>
          }>(GET_EMPLOYEE_AVATAR_BY_EMPLOYEE_ID, {
            employeeId: id
          })

          employee = employeeIdResult?.EmployeePosition?.[0]?.employee
        }

        if (employee) {
          setEmployeeData(employee)
        } else {
          setEmployeeData(null)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch employee')
        setEmployeeData(null)
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken, graphqlClient]
  )

  useEffect(() => {
    if (id) {
      fetchEmployee(id)
    } else {
      setEmployeeData(null)
      setError(null)
    }
  }, [id, fetchEmployee])

  return {
    employeeData,
    isLoading,
    error,
    refetch: () => (id ? fetchEmployee(id) : Promise.resolve())
  }
}

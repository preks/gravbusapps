/**
 * Hook to fetch employee avatar data by userId or employeeId
 * Runs both queries in parallel for faster resolution.
 * Uses shared employeeCacheStore to prevent redundant API calls across hooks.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCached, addToCache } from './employeeCacheStore'

export interface EmployeeAvatarData {
  id: string
  firstName?: string
  lastName?: string
  displayName: string
  pictureThumbnail?: string
  position?: string
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
      employeePosition {
        jobPosition {
          name
        }
      }
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
        employeePosition {
          jobPosition {
            name
          }
        }
      }
    }
  }
`

export const useEmployeeAvatar = (accessToken: string, id?: string) => {
  const [employeeData, setEmployeeData] = useState<EmployeeAvatarData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  // Use ref to stabilize graphqlClient reference (it may change every render)
  const graphqlClientRef = useRef(graphqlClient)
  graphqlClientRef.current = graphqlClient

  const fetchEmployee = useCallback(
    async (employeeId: string) => {
      if (!employeeId || !accessToken) {
        setEmployeeData(null)
        setError(null)
        return
      }

      // Check shared cache first
      const cached = getCached(employeeId)
      if (cached) {
        setEmployeeData(cached)
        setError(null)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const client = graphqlClientRef.current

        // Run both queries in parallel (instead of sequential fallback)
        const [userIdResult, employeeIdResult] = await Promise.allSettled([
          client.request<{
            Employee: Array<{
              id: string
              firstName: string
              lastName: string
              displayName: string
              pictureThumbnail?: string
              employeePosition?: { jobPosition?: { name?: string } }
            }>
          }>(GET_EMPLOYEE_AVATAR_BY_USER_ID, { userId: employeeId }),
          client.request<{
            EmployeePosition: Array<{
              employee: {
                id: string
                firstName: string
                lastName: string
                displayName: string
                pictureThumbnail?: string
                employeePosition?: { jobPosition?: { name?: string } }
              }
            }>
          }>(GET_EMPLOYEE_AVATAR_BY_EMPLOYEE_ID, { employeeId })
        ])

        let employee: EmployeeAvatarData | null = null

        // Try userId result first
        if (userIdResult.status === 'fulfilled') {
          const raw = userIdResult.value?.Employee?.[0]
          if (raw) {
            employee = {
              id: raw.id,
              firstName: raw.firstName,
              lastName: raw.lastName,
              displayName: raw.displayName,
              pictureThumbnail: raw.pictureThumbnail,
              position: raw.employeePosition?.jobPosition?.name
            }
          }
        }

        // Fall back to employeeId result
        if (!employee && employeeIdResult.status === 'fulfilled') {
          const raw = employeeIdResult.value?.EmployeePosition?.[0]?.employee
          if (raw) {
            employee = {
              id: raw.id,
              firstName: raw.firstName,
              lastName: raw.lastName,
              displayName: raw.displayName,
              pictureThumbnail: raw.pictureThumbnail,
              position: raw.employeePosition?.jobPosition?.name
            }
          }
        }

        if (employee) {
          addToCache(employeeId, employee)
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
    [accessToken]
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

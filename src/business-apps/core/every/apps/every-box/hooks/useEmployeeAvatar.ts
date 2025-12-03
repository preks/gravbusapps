/**
 * Hook to fetch employee avatar data by userId or employeeId
 * Tries userId first (for Kogito tasks), then fallback to employeeId (for CFlow tasks)
 * Fetches pictureThumbnail, firstName, lastName from GraphQL
 *
 * INCLUDES CACHING: Global in-memory cache with 30 min TTL to prevent redundant API calls
 */

import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface EmployeeAvatarData {
  id: string
  firstName: string
  lastName: string
  displayName: string
  pictureThumbnail?: string
  position?: string
}

// Global in-memory cache for employee avatar data
const avatarCache = new Map<string, EmployeeAvatarData>()
const cacheTimestamps = new Map<string, number>()
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

// Check if cache entry is valid
const isCacheValid = (key: string): boolean => {
  const timestamp = cacheTimestamps.get(key)
  if (!timestamp) return false
  return Date.now() - timestamp < CACHE_TTL_MS
}

// Add to cache
const addToCache = (key: string, data: EmployeeAvatarData) => {
  avatarCache.set(key, data)
  cacheTimestamps.set(key, Date.now())
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

  const fetchEmployee = useCallback(
    async (id: string) => {
      if (!id || !accessToken) {
        setEmployeeData(null)
        setError(null)
        return
      }

      // Check cache first
      if (isCacheValid(id) && avatarCache.has(id)) {
        setEmployeeData(avatarCache.get(id)!)
        setError(null)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        // Try querying by userId first (Kogito tasks use userId)
        const userIdResult = await graphqlClient.request<{
          Employee: Array<{
            id: string
            firstName: string
            lastName: string
            displayName: string
            pictureThumbnail?: string
            employeePosition?: {
              jobPosition?: {
                name?: string
              }
            }
          }>
        }>(GET_EMPLOYEE_AVATAR_BY_USER_ID, {
          userId: id
        })

        const rawEmployee = userIdResult?.Employee?.[0]
        let employee: EmployeeAvatarData | null = null

        if (rawEmployee) {
          employee = {
            id: rawEmployee.id,
            firstName: rawEmployee.firstName,
            lastName: rawEmployee.lastName,
            displayName: rawEmployee.displayName,
            pictureThumbnail: rawEmployee.pictureThumbnail,
            position: rawEmployee.employeePosition?.jobPosition?.name
          }
        }

        // If not found by userId, try by employeeId (CFlow might use employeeId)
        if (!employee) {
          const employeeIdResult = await graphqlClient.request<{
            EmployeePosition: Array<{
              employee: {
                id: string
                firstName: string
                lastName: string
                displayName: string
                pictureThumbnail?: string
                employeePosition?: {
                  jobPosition?: {
                    name?: string
                  }
                }
              }
            }>
          }>(GET_EMPLOYEE_AVATAR_BY_EMPLOYEE_ID, {
            employeeId: id
          })

          const rawEmployeeFromPosition = employeeIdResult?.EmployeePosition?.[0]?.employee
          if (rawEmployeeFromPosition) {
            employee = {
              id: rawEmployeeFromPosition.id,
              firstName: rawEmployeeFromPosition.firstName,
              lastName: rawEmployeeFromPosition.lastName,
              displayName: rawEmployeeFromPosition.displayName,
              pictureThumbnail: rawEmployeeFromPosition.pictureThumbnail,
              position: rawEmployeeFromPosition.employeePosition?.jobPosition?.name
            }
          }
        }

        if (employee) {
          // Add to cache
          addToCache(id, employee)
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

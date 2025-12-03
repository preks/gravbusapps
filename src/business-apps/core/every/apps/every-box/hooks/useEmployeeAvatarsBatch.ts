/**
 * Hook to batch fetch employee avatars for multiple users
 * More efficient than individual queries - fetches all employees in one request
 * Includes caching to prevent redundant API calls
 */

import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface EmployeeAvatarData {
  id: string
  userId?: string
  firstName: string
  lastName: string
  displayName: string
  pictureThumbnail?: string
  avatarUrl?: string // Cached Object URL for browser-level caching
}

// Global in-memory cache for employee data (persists during app session)
const employeeCache = new Map<string, EmployeeAvatarData>()

// Cache expiry time (30 minutes)
const CACHE_EXPIRY_MS = 30 * 60 * 1000
const cacheTimestamps = new Map<string, number>()

// Helper to check if cache entry is still valid
const isCacheValid = (key: string): boolean => {
  const timestamp = cacheTimestamps.get(key)
  if (!timestamp) return false
  return Date.now() - timestamp < CACHE_EXPIRY_MS
}

// Helper to convert base64 to Object URL (for browser caching)
const base64ToObjectURL = (base64Data: string): string | undefined => {
  try {
    // Skip if data is JSON or invalid
    if (base64Data.startsWith('{')) return undefined

    // Convert base64 to blob
    const byteCharacters = atob(base64Data)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.codePointAt(i) ?? 0
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: 'image/jpeg' })

    // Create Object URL (this will be cached by the browser!)
    return URL.createObjectURL(blob)
  } catch {
    return undefined
  }
}

// Helper to add to cache
const addToCache = (key: string, data: EmployeeAvatarData) => {
  employeeCache.set(key, data)
  cacheTimestamps.set(key, Date.now())
}

const GET_EMPLOYEES_BY_USER_IDS = `
  query GetEmployeesByUserIds($userIds: [String!]!) {
    Employee(
      where: { 
        userId: { _in: $userIds }
        isDeleted: { _eq: false }
      }
    ) {
      id
      userId
      firstName
      lastName
      displayName
      pictureThumbnail
    }
  }
`

const GET_EMPLOYEES_BY_EMPLOYEE_IDS = `
  query GetEmployeesByEmployeeIds($employeeIds: [uuid!]!) {
    Employee(
      where: { 
        id: { _in: $employeeIds }
        isDeleted: { _eq: false }
      }
    ) {
      id
      userId
      firstName
      lastName
      displayName
      pictureThumbnail
    }
  }
`

export const useEmployeeAvatarsBatch = (accessToken: string, userIds: string[], employeeIds: string[] = []) => {
  const [employeeMap, setEmployeeMap] = useState<Map<string, EmployeeAvatarData>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  const fetchEmployees = useCallback(
    async (uIds: string[], eIds: string[]) => {
      if ((!uIds.length && !eIds.length) || !accessToken) {
        setEmployeeMap(new Map())
        setError(null)
        return
      }

      const uniqueUserIds = [...new Set(uIds)]
      const uniqueEmployeeIds = [...new Set(eIds)]

      // Check cache first and separate cached vs missing IDs
      const cachedMap = new Map<string, EmployeeAvatarData>()
      const missingUserIds: string[] = []
      const missingEmployeeIds: string[] = []

      uniqueUserIds.forEach(userId => {
        if (isCacheValid(userId) && employeeCache.has(userId)) {
          cachedMap.set(userId, employeeCache.get(userId)!)
        } else {
          missingUserIds.push(userId)
        }
      })

      uniqueEmployeeIds.forEach(empId => {
        if (isCacheValid(empId) && employeeCache.has(empId)) {
          cachedMap.set(empId, employeeCache.get(empId)!)
        } else {
          missingEmployeeIds.push(empId)
        }
      })

      // If everything is cached, just update state without loading
      if (missingUserIds.length === 0 && missingEmployeeIds.length === 0) {
        setEmployeeMap(cachedMap)
        setError(null)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        // Only fetch missing employees
        const promises = []
        if (missingUserIds.length > 0) {
          promises.push(
            graphqlClient.request<{ Employee: EmployeeAvatarData[] }>(GET_EMPLOYEES_BY_USER_IDS, {
              userIds: missingUserIds
            })
          )
        }
        if (missingEmployeeIds.length > 0) {
          promises.push(
            graphqlClient.request<{ Employee: EmployeeAvatarData[] }>(GET_EMPLOYEES_BY_EMPLOYEE_IDS, {
              employeeIds: missingEmployeeIds
            })
          )
        }

        // Combine cached data with newly fetched data
        const map = new Map(cachedMap)

        if (promises.length > 0) {
          const results = await Promise.all(promises)
          const allEmployees: EmployeeAvatarData[] = results.flatMap(result => result?.Employee || [])

          allEmployees.forEach(employee => {
            // Convert base64 avatar to Object URL for browser caching
            const enhancedEmployee = { ...employee }
            if (employee.pictureThumbnail && !employee.pictureThumbnail.startsWith('{')) {
              enhancedEmployee.avatarUrl = base64ToObjectURL(employee.pictureThumbnail)
            }

            // Map by userId (for Kogito tasks)
            if (enhancedEmployee.userId) {
              map.set(enhancedEmployee.userId, enhancedEmployee)
              addToCache(enhancedEmployee.userId, enhancedEmployee)
            }
            // Map by employeeId (for CFlow tasks)
            if (enhancedEmployee.id) {
              map.set(enhancedEmployee.id, enhancedEmployee)
              addToCache(enhancedEmployee.id, enhancedEmployee)
            }
          })
        }

        setEmployeeMap(map)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch employees')
        setEmployeeMap(new Map())
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken, graphqlClient]
  )

  useEffect(() => {
    if (userIds.length > 0 || employeeIds.length > 0) {
      fetchEmployees(userIds, employeeIds)
    } else {
      setEmployeeMap(new Map())
      setError(null)
    }
  }, [
    JSON.stringify([...userIds].sort((a, b) => a.localeCompare(b))),
    JSON.stringify([...employeeIds].sort((a, b) => a.localeCompare(b))),
    fetchEmployees
  ])

  return {
    employeeMap,
    isLoading,
    error,
    refetch: () => fetchEmployees(userIds, employeeIds)
  }
}

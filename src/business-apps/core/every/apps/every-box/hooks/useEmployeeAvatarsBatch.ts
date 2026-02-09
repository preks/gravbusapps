/**
 * Hook to batch fetch employee avatars for multiple users
 * More efficient than individual queries - fetches all employees in one request
 * Uses shared employeeCacheStore to prevent redundant API calls across hooks
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { type CachedEmployeeData, getCached, addToCache } from './employeeCacheStore'

// Re-export CachedEmployeeData shape so consumers don't need to import the store
export type EmployeeAvatarData = CachedEmployeeData

// Helper to convert base64 to a data URL (lightweight, no Blob/ObjectURL leak)
const base64ToDataURL = (base64Data: string): string | undefined => {
  try {
    if (base64Data.startsWith('{')) return undefined
    return `data:image/jpeg;base64,${base64Data}`
  } catch {
    return undefined
  }
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
  // PERF: Stabilize graphqlClient via ref to prevent useCallback recreation on every render
  const graphqlClientRef = useRef(graphqlClient)
  graphqlClientRef.current = graphqlClient

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
        const cached = getCached(userId)
        if (cached) {
          cachedMap.set(userId, cached)
        } else {
          missingUserIds.push(userId)
        }
      })

      uniqueEmployeeIds.forEach(empId => {
        const cached = getCached(empId)
        if (cached) {
          cachedMap.set(empId, cached)
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
        const client = graphqlClientRef.current
        if (missingUserIds.length > 0) {
          promises.push(
            client.request<{ Employee: EmployeeAvatarData[] }>(GET_EMPLOYEES_BY_USER_IDS, {
              userIds: missingUserIds
            })
          )
        }
        if (missingEmployeeIds.length > 0) {
          promises.push(
            client.request<{ Employee: EmployeeAvatarData[] }>(GET_EMPLOYEES_BY_EMPLOYEE_IDS, {
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
            // Convert base64 avatar to data URL for efficient rendering
            const enhancedEmployee = { ...employee }
            if (employee.pictureThumbnail && !employee.pictureThumbnail.startsWith('{')) {
              enhancedEmployee.avatarUrl = base64ToDataURL(employee.pictureThumbnail)
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
    [accessToken]
  )

  // Stable keys for dependency tracking (avoids JSON.stringify on every render)
  const userIdsKey = useMemo(() => [...userIds].sort().join(','), [userIds])
  const employeeIdsKey = useMemo(() => [...employeeIds].sort().join(','), [employeeIds])

  useEffect(() => {
    if (userIds.length > 0 || employeeIds.length > 0) {
      fetchEmployees(userIds, employeeIds)
    } else {
      setEmployeeMap(new Map())
      setError(null)
    }
  }, [userIdsKey, employeeIdsKey, fetchEmployees])

  return {
    employeeMap,
    isLoading,
    error,
    refetch: () => fetchEmployees(userIds, employeeIds)
  }
}

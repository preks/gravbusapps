/**
 * useEmployeeData Hook
 *
 * Automatically fetches employee data from GraphQL API.
 * Used by TaskDetailHeader for showing employee avatars and info.
 *
 * Features:
 * - Automatic caching to prevent redundant requests
 * - Support for both employee IDs and user IDs
 * - Base64 image handling for avatars
 * - Loading and error states
 *
 * Usage:
 * ```tsx
 * const { employeeData, isLoading, error } = useEmployeeData(employeeId, accessToken);
 * ```
 */

import { useState, useEffect, useMemo, useRef } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getCached, addToCache, removeFromCache } from './employeeCacheStore'

export interface EmployeeData {
  id: string
  displayName: string
  firstName?: string
  lastName?: string
  avatarUrl?: string
  position?: string
}

interface UseEmployeeDataOptions {
  employeeId?: string
  userId?: string
  accessToken: string
  fallbackName?: string
  skip?: boolean
}

interface UseEmployeeDataResult {
  employeeData: EmployeeData | null
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Convert base64 image string to data URL
 */
const toDataUrl = (raw: string | null | undefined): string | undefined => {
  if (!raw) return undefined
  if (raw.startsWith('data:')) return raw

  // Skip JSON metadata
  try {
    JSON.parse(raw)
    return undefined
  } catch {
    // Not JSON, proceed with base64 conversion
  }

  // Detect image format and add proper prefix
  if (raw.startsWith('/9j/')) return `data:image/jpeg;base64,${raw}`
  if (raw.startsWith('iVBOR')) return `data:image/png;base64,${raw}`
  if (raw.startsWith('R0lGOD')) return `data:image/gif;base64,${raw}`
  return `data:image/gif;base64,${raw}` // Default fallback
}

/**
 * Fetch employee data with automatic caching
 */
export const useEmployeeData = ({
  employeeId,
  userId,
  accessToken,
  fallbackName,
  skip = false
}: UseEmployeeDataOptions): UseEmployeeDataResult => {
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refetchTrigger, setRefetchTrigger] = useState(0)

  const graphqlClient = useGraphqlClient(accessToken)
  // Use ref to avoid endless loop - graphqlClient changes reference on every render
  const graphqlClientRef = useRef(graphqlClient)
  graphqlClientRef.current = graphqlClient

  // Cache key based on ID
  const cacheKey = useMemo(() => {
    return employeeId || userId || null
  }, [employeeId, userId])

  useEffect(() => {
    const fetchEmployeeData = async () => {
      // Skip if no ID provided or skip flag is set
      if (!cacheKey || skip || !accessToken) {
        setEmployeeData(fallbackName ? { id: '', displayName: fallbackName } : null)
        setIsLoading(false)
        return
      }

      // Check shared cache first (with TTL)
      const cached = getCached(cacheKey)
      if (cached) {
        setEmployeeData(cached)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        let query: string
        let variables: any

        if (employeeId) {
          // Fetch by employee ID
          query = `
            query GetEmployee($employeeId: uuid!) {
              Employee(where: {id: {_eq: $employeeId}}, limit: 1) {
                id
                firstName
                lastName
                displayName
                pictureThumbnail
                employeePosition {
                  jobPosition {
                    name
                  }
                  organizationalUnit {
                    name
                  }
                }
              }
            }
          `
          variables = { employeeId }
        } else if (userId) {
          // Fetch by user ID
          query = `
            query GetUserEmployee($userId: uuid!) {
              User(where: {id: {_eq: $userId}}, limit: 1) {
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
                    organizationalUnit {
                      name
                    }
                  }
                }
              }
            }
          `
          variables = { userId }
        } else {
          throw new Error('Either employeeId or userId must be provided')
        }

        const response = await graphqlClientRef.current.request<any>(query, variables)

        let employee: any = null
        if (employeeId && response.Employee && response.Employee.length > 0) {
          employee = response.Employee[0]
        } else if (userId && response.User && response.User.length > 0 && response.User[0].employee) {
          employee = response.User[0].employee
        }

        if (employee) {
          // Construct position string from jobPosition and organizationalUnit
          let position: string | undefined = undefined
          if (employee.employeePosition) {
            const jobPosName = employee.employeePosition.jobPosition?.name
            const orgUnitName = employee.employeePosition.organizationalUnit?.name

            if (jobPosName && orgUnitName) {
              position = `${jobPosName} in ${orgUnitName}`
            } else if (jobPosName) {
              position = jobPosName
            } else if (orgUnitName) {
              position = orgUnitName
            }
          }

          const data: EmployeeData = {
            id: employee.id,
            displayName: employee.displayName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
            firstName: employee.firstName,
            lastName: employee.lastName,
            avatarUrl: toDataUrl(employee.pictureThumbnail),
            position
          }

          // Cache the result (shared cache with TTL + LRU eviction)
          addToCache(cacheKey, data)
          setEmployeeData(data)
        } else {
          // Fallback to name if provided
          setEmployeeData(fallbackName ? { id: '', displayName: fallbackName } : null)
        }
      } catch (err) {
        console.error('Error fetching employee data:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch employee data'
        setError(errorMessage)

        // Fallback to name if provided
        setEmployeeData(fallbackName ? { id: '', displayName: fallbackName } : null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchEmployeeData()
  }, [cacheKey, accessToken, employeeId, userId, fallbackName, skip, refetchTrigger])

  const refetch = () => {
    // Clear cache entry and trigger refetch
    if (cacheKey) {
      removeFromCache(cacheKey)
    }
    setRefetchTrigger(prev => prev + 1)
  }

  return {
    employeeData,
    isLoading,
    error,
    refetch
  }
}

// Re-export clearAllEmployeeCaches for convenience
export { clearAllEmployeeCaches } from './employeeCacheStore'

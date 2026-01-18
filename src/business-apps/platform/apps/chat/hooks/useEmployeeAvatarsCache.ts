import { useState, useCallback, useRef, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface EmployeeAvatarData {
  id: string // employeeId for navigation
  userId: string
  pictureThumbnail: string | null
}

interface EmployeeAvatarResponse {
  Employee: EmployeeAvatarData[]
}

export interface EmployeeAvatarInfo {
  avatarUrl?: string
  employeeId?: string
}

const GET_EMPLOYEE_AVATARS = `
  query GetEmployeeAvatars($userIds: [String!]) {
    Employee(where: {userId: {_in: $userIds}}) {
      id
      userId
      pictureThumbnail
    }
  }
`

// In-memory cache with 5-minute TTL per user
interface CacheEntry {
  data: EmployeeAvatarInfo
  timestamp: number
}

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const avatarCache = new Map<string, CacheEntry>()

// Track in-flight requests to avoid duplicate fetches
const inFlightRequests = new Map<string, Promise<Map<string, EmployeeAvatarInfo>>>()

/**
 * Non-blocking employee avatar cache hook.
 *
 * Features:
 * - In-memory cache with TTL
 * - Deduplicates concurrent requests
 * - Batches requests efficiently
 * - Returns cached data immediately
 * - Fetches missing data in background
 */
export const useEmployeeAvatarsCache = (accessToken: string) => {
  const graphqlClient = useGraphQLClient(accessToken)
  const [cacheVersion, setCacheVersion] = useState(0)
  const fetchTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pendingUserIdsRef = useRef<Set<string>>(new Set())

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (fetchTimerRef.current) {
        clearTimeout(fetchTimerRef.current)
      }
    }
  }, [])

  /**
   * Get cached avatar info for a user (non-blocking)
   */
  const getCachedAvatar = useCallback((userId: string): EmployeeAvatarInfo | null => {
    const entry = avatarCache.get(userId)
    if (!entry) return null

    // Check if cache entry is still valid
    const now = Date.now()
    if (now - entry.timestamp > CACHE_TTL) {
      avatarCache.delete(userId)
      return null
    }

    return entry.data
  }, [])

  /**
   * Batch fetch avatars for multiple users (internal)
   */
  const batchFetchAvatars = useCallback(
    async (userIds: string[]): Promise<Map<string, EmployeeAvatarInfo>> => {
      if (userIds.length === 0) {
        return new Map()
      }

      // Create a cache key for this batch
      const cacheKey = userIds.sort().join(',')

      // Check if there's already a request in flight for this batch
      const existingRequest = inFlightRequests.get(cacheKey)
      if (existingRequest) {
        return existingRequest
      }

      // Start new request
      const requestPromise = (async () => {
        try {
          const result = await graphqlClient.request<EmployeeAvatarResponse>(GET_EMPLOYEE_AVATARS, { userIds })

          const employeeInfoMap = new Map<string, EmployeeAvatarInfo>()
          const now = Date.now()

          if (result?.Employee) {
            result.Employee.forEach(employee => {
              const info: EmployeeAvatarInfo = {
                employeeId: employee.id
              }
              if (employee.pictureThumbnail) {
                info.avatarUrl = `data:image/png;base64,${employee.pictureThumbnail}`
              }
              employeeInfoMap.set(employee.userId, info)

              // Update cache
              avatarCache.set(employee.userId, { data: info, timestamp: now })
            })

            // For users not found, cache empty result to avoid repeated lookups
            userIds.forEach(userId => {
              if (!employeeInfoMap.has(userId)) {
                avatarCache.set(userId, { data: {}, timestamp: now })
              }
            })
          }

          return employeeInfoMap
        } catch (error) {
          console.error('Error fetching employee avatars:', error)
          return new Map()
        } finally {
          // Clean up in-flight request
          inFlightRequests.delete(cacheKey)
        }
      })()

      // Store in-flight request
      inFlightRequests.set(cacheKey, requestPromise)

      return requestPromise
    },
    [graphqlClient]
  )

  /**
   * Request avatars (non-blocking, batched)
   * Returns cached data immediately and fetches missing data in background
   */
  const requestAvatars = useCallback(
    (userIds: string[]): Map<string, EmployeeAvatarInfo> => {
      if (userIds.length === 0) {
        return new Map()
      }

      const result = new Map<string, EmployeeAvatarInfo>()
      const missingUserIds: string[] = []

      // Collect cached data and identify missing users
      userIds.forEach(userId => {
        const cached = getCachedAvatar(userId)
        if (cached !== null) {
          result.set(userId, cached)
        } else {
          missingUserIds.push(userId)
        }
      })

      // If there are missing users, batch fetch them
      if (missingUserIds.length > 0) {
        // Add to pending queue
        missingUserIds.forEach(id => pendingUserIdsRef.current.add(id))

        // Clear existing timer and set new one for batching
        if (fetchTimerRef.current) {
          clearTimeout(fetchTimerRef.current)
        }

        fetchTimerRef.current = setTimeout(() => {
          const toFetch = Array.from(pendingUserIdsRef.current)
          pendingUserIdsRef.current.clear()

          if (toFetch.length > 0) {
            // Fetch in background
            batchFetchAvatars(toFetch).then(() => {
              // Trigger re-render to show newly loaded avatars
              setCacheVersion(v => v + 1)
            })
          }
        }, 50) // 50ms debounce for batching
      }

      return result
    },
    [getCachedAvatar, batchFetchAvatars]
  )

  /**
   * Prefetch avatars (non-blocking, batched)
   * Use this when you know you'll need avatars soon
   */
  const prefetchAvatars = useCallback(
    (userIds: string[]) => {
      const missingUserIds = userIds.filter(id => getCachedAvatar(id) === null)

      if (missingUserIds.length > 0) {
        // Add to pending queue
        missingUserIds.forEach(id => pendingUserIdsRef.current.add(id))

        // Batch fetch after short delay
        if (fetchTimerRef.current) {
          clearTimeout(fetchTimerRef.current)
        }

        fetchTimerRef.current = setTimeout(() => {
          const toFetch = Array.from(pendingUserIdsRef.current)
          pendingUserIdsRef.current.clear()

          if (toFetch.length > 0) {
            batchFetchAvatars(toFetch).then(() => {
              setCacheVersion(v => v + 1)
            })
          }
        }, 50)
      }
    },
    [getCachedAvatar, batchFetchAvatars]
  )

  /**
   * Force fetch avatars (blocks until complete)
   * Only use when you absolutely need the data synchronously
   */
  const fetchAvatarsSync = useCallback(
    async (userIds: string[]): Promise<Map<string, EmployeeAvatarInfo>> => {
      return batchFetchAvatars(userIds)
    },
    [batchFetchAvatars]
  )

  return {
    requestAvatars, // Non-blocking, returns cached + triggers background fetch
    prefetchAvatars, // Non-blocking, prefetches for later use
    fetchAvatarsSync, // Blocking, only use when necessary
    getCachedAvatar, // Get single cached avatar
    cacheVersion // Use as dependency to trigger re-renders when cache updates
  }
}

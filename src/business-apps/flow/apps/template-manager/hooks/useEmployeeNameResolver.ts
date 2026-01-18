/**
 * Hook for resolving user IDs to employee names
 */

import { useState, useCallback } from 'react'
import { OrgDirectoryClient } from '@/common/network/org-directory/OrgDirectoryClient'

export interface EmployeeNameCache {
  [userId: string]: string
}

export const useEmployeeNameResolver = (accessToken: string) => {
  const [nameCache, setNameCache] = useState<EmployeeNameCache>({})
  const [loading, setLoading] = useState(false)

  const resolveEmployeeName = useCallback(
    async (userId: string): Promise<string> => {
      // Check cache first
      if (nameCache[userId]) {
        return nameCache[userId]
      }

      // If it's 'system', return as-is
      if (userId.toLowerCase() === 'system') {
        return 'System'
      }

      try {
        setLoading(true)
        const orgClient = new OrgDirectoryClient(accessToken)
        const user = await orgClient.getUserById(userId)

        const displayName = user?.name || userId

        // Cache the result
        setNameCache(prev => ({ ...prev, [userId]: displayName }))

        return displayName
      } catch (error) {
        console.error(`Failed to resolve employee name for userId: ${userId}`, error)
        // Return userId as fallback
        return userId
      } finally {
        setLoading(false)
      }
    },
    [accessToken, nameCache]
  )

  const resolveMultipleNames = useCallback(
    async (userIds: string[]): Promise<EmployeeNameCache> => {
      const uniqueIds = [...new Set(userIds)]
      const uncachedIds = uniqueIds.filter(id => !nameCache[id] && id.toLowerCase() !== 'system')

      if (uncachedIds.length === 0) {
        return nameCache
      }

      try {
        setLoading(true)
        const orgClient = new OrgDirectoryClient(accessToken)

        const results = await Promise.all(
          uncachedIds.map(async userId => {
            try {
              const user = await orgClient.getUserById(userId)
              return { userId, name: user?.name || userId }
            } catch (error) {
              console.error(`Failed to resolve name for userId: ${userId}`, error)
              return { userId, name: userId }
            }
          })
        )

        const newCache: EmployeeNameCache = { ...nameCache }
        results.forEach(({ userId, name }) => {
          newCache[userId] = name
        })

        // Add 'system' to cache
        if (userIds.some(id => id.toLowerCase() === 'system')) {
          newCache['system'] = 'System'
        }

        setNameCache(newCache)
        return newCache
      } catch (error) {
        console.error('Failed to resolve multiple employee names:', error)
        return nameCache
      } finally {
        setLoading(false)
      }
    },
    [accessToken, nameCache]
  )

  return {
    resolveEmployeeName,
    resolveMultipleNames,
    nameCache,
    loading
  }
}

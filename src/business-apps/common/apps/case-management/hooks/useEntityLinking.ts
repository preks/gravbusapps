/**
 * useEntityLinking Hook
 *
 * Hook for managing entity linking (users, employees, org units)
 */

import { useState, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/business-apps/types'
import { OrgDirectoryClient, OrgUser } from '@/common/network/org-directory/OrgDirectoryClient'

export interface EntityOption {
  id: string
  name: string
  type: 'user' | 'employee' | 'organizationalUnit'
  metadata?: any
}

export const useEntityLinking = (context: BusinessAppContextProps) => {
  const [searchResults, setSearchResults] = useState<EntityOption[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Cache for users and org units to avoid repeated API calls
  const usersCache = useRef<OrgUser[] | null>(null)
  const orgUnitsCache = useRef<Array<{ id: string; name: string; type: string }> | null>(null)

  const orgClient = new OrgDirectoryClient(context.accessToken)

  /**
   * Search for entities (users, employees, org units)
   */
  const searchEntities = useCallback(
    async (
      query: string,
      entityTypes: ('user' | 'employee' | 'organizationalUnit')[] = ['user', 'employee', 'organizationalUnit']
    ) => {
      if (!query.trim() || query.length < 2) {
        setSearchResults([])
        return
      }

      try {
        setIsSearching(true)
        setError(null)

        const results: EntityOption[] = []
        const queryLower = query.toLowerCase()

        // Search employees (primary entity type - users with employee records)
        if (entityTypes.includes('employee')) {
          try {
            // Use cache if available, otherwise fetch
            if (!usersCache.current) {
              usersCache.current = await orgClient.getAllUsers()
            }

            const filteredUsers = usersCache.current.filter(user => {
              const name = user.name?.toLowerCase() || ''
              const email = user.email?.toLowerCase() || ''
              return name.includes(queryLower) || email.includes(queryLower)
            })

            results.push(
              ...filteredUsers.slice(0, 10).map(user => ({
                id: user.id,
                name: user.name || user.email || 'Unknown Employee',
                type: 'employee' as const,
                metadata: {
                  email: user.email,
                  avatarUrl: user.avatarUrl,
                  organizationalUnits: user.organizationalUnits
                }
              }))
            )
          } catch (err) {
            console.warn('Failed to search employees:', err)
          }
        }

        // Search organizational units
        if (entityTypes.includes('organizationalUnit')) {
          try {
            // Use cache if available, otherwise fetch
            if (!orgUnitsCache.current) {
              orgUnitsCache.current = await orgClient.getOrganizationalUnits()
            }

            const filteredOrgUnits = orgUnitsCache.current.filter(ou => ou.name?.toLowerCase().includes(queryLower))

            results.push(
              ...filteredOrgUnits.slice(0, 10).map(ou => ({
                id: ou.id,
                name: ou.name || 'Unknown Unit',
                type: 'organizationalUnit' as const,
                metadata: { type: ou.type }
              }))
            )
          } catch (err) {
            console.warn('Failed to search organizational units:', err)
          }
        }

        setSearchResults(results)
      } catch (err) {
        console.error('Error searching entities:', err)
        setError(err instanceof Error ? err : new Error('Failed to search entities'))
      } finally {
        setIsSearching(false)
      }
    },
    [context.accessToken]
  )

  /**
   * Get entity by ID
   */
  const getEntityById = useCallback(
    async (entityId: string, entityType: 'user' | 'employee' | 'organizationalUnit'): Promise<EntityOption | null> => {
      try {
        switch (entityType) {
          case 'user':
          case 'employee': {
            const user = await orgClient.getUserById(entityId)
            if (user) {
              return {
                id: user.id,
                name: user.name || user.email || 'Unknown',
                type: entityType,
                metadata: user
              }
            }
            break
          }
          case 'organizationalUnit': {
            const orgUnits = await orgClient.getOrganizationalUnits()
            const orgUnit = orgUnits.find(ou => ou.id === entityId)
            if (orgUnit) {
              return {
                id: orgUnit.id,
                name: orgUnit.name || 'Unknown Unit',
                type: 'organizationalUnit',
                metadata: orgUnit
              }
            }
            break
          }
        }
        return null
      } catch (err) {
        console.error('Error getting entity by ID:', err)
        return null
      }
    },
    [context.accessToken]
  )

  /**
   * Clear the cache (useful when context changes)
   */
  const clearCache = useCallback(() => {
    usersCache.current = null
    orgUnitsCache.current = null
  }, [])

  return {
    searchResults,
    isSearching,
    error,
    searchEntities,
    getEntityById,
    clearCache
  }
}

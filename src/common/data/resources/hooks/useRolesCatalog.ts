import { useState, useCallback } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'

export interface RoleOption {
  id: string
  name: string
}

export interface UseRolesCatalogResult {
  roles: RoleOption[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook to fetch roles/groups from User Management Service
 * (Not from catalog - roles come from user-management service)
 */
export const useRolesCatalog = (context: BusinessAppContextProps): UseRolesCatalogResult => {
  const resourceClient = useResourceClient(context.accessToken)
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasError, setHasError] = useState(false)

  const fetchRoles = useCallback(async () => {
    if (!context.accessToken) {
      setError('No access token available')
      setIsLoading(false)
      return
    }

    // Don't refetch if we have a persistent error
    if (hasError) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const rolesData = await resourceClient.action.getRoles({ limit: 200, offset: 0 })

      if (rolesData && Array.isArray(rolesData) && rolesData.length > 0) {
        const processedRoles = rolesData
          .map((role: any) => ({
            id: role.id || role.code || role.name,
            name: role.name || role.code || role.id
          }))
          .toSorted((a, b) => a.name.localeCompare(b.name))
        setRoles(processedRoles)
        setHasError(false)
      } else {
        setRoles([])
      }
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch roles'
      setError(errorMessage)
      setRoles([])
      // Set hasError to prevent recursive retries
      setHasError(true)
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, resourceClient, hasError])

  const refetch = useCallback(async () => {
    setHasError(false)
    await fetchRoles()
  }, [fetchRoles])

  return {
    roles,
    isLoading,
    error,
    refetch
  }
}

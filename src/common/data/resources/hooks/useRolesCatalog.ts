import { useState, useCallback, useRef } from 'react'
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
  onSearch: (searchTerm: string) => void
  loadMore: () => Promise<void>
  hasMore: boolean
  totalCount: number
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
  const [totalCount, setTotalCount] = useState<number>(0)
  const currentOffsetRef = useRef(0)
  const isFetchingRef = useRef(false)
  const searchTermRef = useRef('')

  const fetchRoles = useCallback(
    async (append = false, searchValue?: string) => {
      if (!context.accessToken) {
        setError('No access token available')
        setIsLoading(false)
        return
      }

      // Don't refetch if we have a persistent error
      if (hasError) {
        return
      }

      // Prevent concurrent requests
      if (isFetchingRef.current) {
        return
      }

      isFetchingRef.current = true
      setIsLoading(true)
      setError(null)

      const searchToUse = searchValue !== undefined ? searchValue : searchTermRef.current

      try {
        const response = await resourceClient.action.getRoles({
          limit: 50,
          offset: append ? currentOffsetRef.current : 0,
          name: searchToUse || undefined
        })

        const rolesData = response.data || []
        const processedRoles = rolesData
          .map((role: any) => ({
            id: role.id || role.code || role.name,
            name: role.name || role.code || role.id
          }))
          .toSorted((a, b) => a.name.localeCompare(b.name))

        if (append) {
          setRoles(prev => [...prev, ...processedRoles])
          currentOffsetRef.current += processedRoles.length
        } else {
          setRoles(processedRoles)
          currentOffsetRef.current = processedRoles.length
        }

        setTotalCount(response.paging?.totalRecords ?? processedRoles.length)
        setHasError(false)
      } catch (err: any) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch roles'
        setError(errorMessage)
        if (!append) {
          setRoles([])
        }
        // Set hasError to prevent recursive retries
        setHasError(true)
      } finally {
        setIsLoading(false)
        isFetchingRef.current = false
      }
    },
    [context.accessToken, resourceClient, hasError]
  )

  const refetch = useCallback(async () => {
    setHasError(false)
    currentOffsetRef.current = 0
    await fetchRoles(false, searchTermRef.current)
  }, [fetchRoles])

  const onSearch = useCallback(
    (newSearchTerm: string) => {
      searchTermRef.current = newSearchTerm
      currentOffsetRef.current = 0
      setHasError(false)
      fetchRoles(false, newSearchTerm)
    },
    [fetchRoles]
  )

  const refetch = useCallback(async () => {
    setHasError(false)
    currentOffsetRef.current = 0
    await fetchRoles(false, searchTermRef.current)
  }, [fetchRoles])

  const loadMore = useCallback(async () => {
    if (roles.length < totalCount && !isLoading) {
      await fetchRoles(true)
    }
  }, [fetchRoles, roles.length, totalCount, isLoading])

  const hasMore = roles.length < totalCount

  return {
    roles,
    isLoading,
    error,
    refetch,
    onSearch,
    loadMore,
    hasMore,
    totalCount
  }
}

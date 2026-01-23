import { useState, useCallback, useEffect, useMemo } from 'react'
import { Component } from '../types/component.types'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'

interface UseComponentResourcesParams {
  searchParameter?: string
  filter?: {
    appId?: string
    screenKey?: string
    builderType?: 'LOWCODER' | 'FORMIO' | 'NATIVE_SCREEN'
  }
  sort?: {
    field: string
    order: 'ASC' | 'DESC'
  }
  limit?: number
  offset?: number
}

interface UseComponentResourcesResult {
  components: Component[]
  totalCount: number
  isLoading: boolean
  error: string | null
  refetch: (params?: UseComponentResourcesParams, isInitial?: boolean) => Promise<void>
}

/**
 * Hook for Components View - fetches component data from Screen Management API
 * Does NOT fetch Azure Storage data - that's handled by ResourceManagerContext
 * Supports pagination with limit/offset
 */
export const useComponentResources = (
  context: BusinessAppContextProps,
  params?: UseComponentResourcesParams
): UseComponentResourcesResult => {
  const [components, setComponents] = useState<Component[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const resourceClient = useResourceClient(context.accessToken)

  // Memoize params to prevent infinite loops
  const memoizedParams = useMemo(
    () => params,
    [
      params?.limit,
      params?.offset,
      params?.searchParameter,
      params?.sort?.field,
      params?.sort?.order,
      params?.filter?.appId,
      params?.filter?.screenKey,
      params?.filter?.builderType
    ]
  )

  const fetchComponents = useCallback(
    async (fetchParams?: UseComponentResourcesParams, showLoading = true) => {
      if (!context.accessToken) {
        setError('No access token available')
        setIsLoading(false)
        return
      }

      if (showLoading) {
        setIsLoading(true)
      }
      setError(null)

      try {
        // Use provided params or memoized params
        const limit = fetchParams?.limit ?? memoizedParams?.limit ?? 20
        const offset = fetchParams?.offset ?? memoizedParams?.offset ?? 0
        const searchParameter = fetchParams?.searchParameter ?? memoizedParams?.searchParameter
        const filter = fetchParams?.filter ?? memoizedParams?.filter
        const sort = fetchParams?.sort ?? memoizedParams?.sort

        // Build request params according to OpenAPI spec
        const requestParams: {
          searchParameter?: string
          filter?: {
            appId?: string
            screenKey?: string
            builderType?: 'LOWCODER' | 'FORMIO' | 'NATIVE_SCREEN'
          }
          sort?: {
            field: string
            order: 'ASC' | 'DESC'
          }
          limit: number
          offset: number
          returnTotalRecords: boolean
        } = {
          limit: limit,
          offset: offset,
          returnTotalRecords: true // Always request total count for pagination
        }

        // Add search parameter if provided
        if (searchParameter?.trim()) {
          requestParams.searchParameter = searchParameter.trim()
        }

        // Add filter if provided (optional)
        if (filter) {
          requestParams.filter = filter
        }

        // Add sort if provided (defaults to name ASC in ComponentClient)
        if (sort) {
          requestParams.sort = sort
        }

        // Single request with pagination, search, filter, and sort
        const response = await resourceClient.component.getComponents(requestParams)

        if (response?.data && Array.isArray(response.data)) {
          setComponents(response.data)
          // Extract total count from paging
          setTotalCount(response.paging?.totalRecords ?? response.data.length)
        } else {
          setComponents([])
          setTotalCount(0)
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch components'
        setError(errorMessage)
        setComponents([])
        setTotalCount(0)
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken, memoizedParams, resourceClient]
  )

  // Auto-fetch when params change
  useEffect(() => {
    fetchComponents(undefined, true)
  }, [fetchComponents])

  const refetch = useCallback(
    async (fetchParams?: UseComponentResourcesParams, showLoading = false) => {
      await fetchComponents(fetchParams, showLoading)
    },
    [fetchComponents]
  )

  return {
    components,
    totalCount,
    isLoading,
    error,
    refetch
  }
}

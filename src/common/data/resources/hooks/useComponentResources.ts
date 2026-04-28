import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
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
  loadMore: () => Promise<void>
  hasMore: boolean
  removeComponent: (id: string) => void
}

/**
 * Hook for Components View - fetches component data from Screen Management API
 * Does NOT fetch Azure Storage data - that's handled by ResourceManagerContext
 * Supports pagination with limit/offset
 */
const DEFAULT_LIMIT = 20

export const useComponentResources = (
  context: BusinessAppContextProps,
  params?: UseComponentResourcesParams
): UseComponentResourcesResult => {
  const [components, setComponents] = useState<Component[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const resourceClient = useResourceClient(context.accessToken)
  const currentOffsetRef = useRef(0)
  const isFetchingRef = useRef(false)

  const memoizedParams = useMemo(
    () => ({ ...params, offset: undefined }) as UseComponentResourcesParams | undefined,
    [
      params?.limit,
      params?.searchParameter,
      params?.sort?.field,
      params?.sort?.order,
      params?.filter?.appId,
      params?.filter?.screenKey,
      params?.filter?.builderType
    ]
  )

  const fetchComponents = useCallback(
    async (append = false, showLoading = true) => {
      if (isFetchingRef.current) return
      if (!context.accessToken) {
        setError('No access token available')
        setIsLoading(false)
        return
      }

      isFetchingRef.current = true
      if (showLoading) setIsLoading(true)
      setError(null)

      const limit = memoizedParams?.limit ?? DEFAULT_LIMIT
      const offset = append ? currentOffsetRef.current : 0
      const searchParameter = memoizedParams?.searchParameter
      const filter = memoizedParams?.filter
      const sort = memoizedParams?.sort

      const requestParams = {
        limit,
        offset,
        returnTotalRecords: true as const,
        ...(searchParameter?.trim() && { searchParameter: searchParameter.trim() }),
        ...(filter && { filter }),
        ...(sort && { sort })
      }

      try {
        const response = await resourceClient.component.getComponents(requestParams)
        const data = response?.data && Array.isArray(response.data) ? response.data : []
        const total = response?.paging?.totalRecords ?? data.length

        if (append) {
          currentOffsetRef.current += data.length
          setComponents(prev => [...prev, ...data])
        } else {
          currentOffsetRef.current = data.length
          setComponents(data)
        }
        setTotalCount(total)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch components'
        setError(errorMessage)
        if (!append) currentOffsetRef.current = 0
      } finally {
        setIsLoading(false)
        isFetchingRef.current = false
      }
    },
    [context.accessToken, memoizedParams, resourceClient]
  )

  const refetch = useCallback(
    async (_fetchParams?: UseComponentResourcesParams, showLoading = false) => {
      // Wait for any in-flight fetch (e.g. loadMore) to complete so refetch is not silently dropped
      while (isFetchingRef.current) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      currentOffsetRef.current = 0
      await fetchComponents(false, showLoading)
    },
    [fetchComponents]
  )

  useEffect(() => {
    refetch(undefined, true).catch(() => {})
  }, [refetch])

  const loadMore = useCallback(() => {
    if (components.length < totalCount) {
      return fetchComponents(true, false)
    }
    return Promise.resolve()
  }, [fetchComponents, components.length, totalCount])

  const removeComponent = useCallback((id: string) => {
    setComponents(prev => prev.filter(item => item.id !== id))
    setTotalCount(count => Math.max(0, count - 1))
    currentOffsetRef.current = Math.max(0, currentOffsetRef.current - 1)
  }, [])

  const hasMore = components.length < totalCount

  return {
    components,
    totalCount,
    isLoading,
    error,
    refetch,
    loadMore,
    hasMore,
    removeComponent
  }
}

import { useState, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'
import type { Component } from '../types/component.types'

interface UseComponentsResult {
  components: Component[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  onSearch: (searchTerm: string) => void
  loadMore: () => Promise<void>
  hasMore: boolean
  totalCount: number
}

/**
 * Hook to fetch components from Screen Management Service
 * Uses ResourceClient.component.getComponents()
 */
export const useComponents = (context: BusinessAppContextProps): UseComponentsResult => {
  const [components, setComponents] = useState<Component[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState<number>(0)
  const resourceClient = useResourceClient(context.accessToken)
  const currentOffsetRef = useRef(0)
  const isFetchingRef = useRef(false)
  const searchTermRef = useRef('')

  const fetchComponents = useCallback(
    async (append = false, searchValue?: string) => {
      if (!context.accessToken) {
        setError('No access token available')
        setIsLoading(false)
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
        const response = await resourceClient.component.getComponents({
          limit: 50,
          offset: append ? currentOffsetRef.current : 0,
          searchParameter: searchToUse || undefined,
          returnTotalRecords: true
        })

        if (response?.data && Array.isArray(response.data)) {
          if (append) {
            setComponents(prev => [...prev, ...response.data])
            currentOffsetRef.current += response.data.length
          } else {
            setComponents(response.data)
            currentOffsetRef.current = response.data.length
          }
          setTotalCount(response.paging?.totalRecords ?? response.data.length)
        } else if (!append) {
          setComponents([])
          setTotalCount(0)
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch components'
        setError(errorMessage)
        console.error('Error fetching components from Screen Management:', err)
      } finally {
        setIsLoading(false)
        isFetchingRef.current = false
      }
    },
    [context.accessToken, resourceClient]
  )

  const refetch = useCallback(async () => {
    // Wait for any in-flight fetch (e.g. loadMore) to complete so refetch is not silently dropped
    while (isFetchingRef.current) {
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    currentOffsetRef.current = 0
    await fetchComponents(false, searchTermRef.current)
  }, [fetchComponents])

  const onSearch = useCallback(
    (newSearchTerm: string) => {
      searchTermRef.current = newSearchTerm
      currentOffsetRef.current = 0
      fetchComponents(false, newSearchTerm)
    },
    [fetchComponents]
  )

  const loadMore = useCallback(async () => {
    if (components.length < totalCount && !isLoading) {
      await fetchComponents(true)
    }
  }, [fetchComponents, components.length, totalCount, isLoading])

  const hasMore = components.length < totalCount

  // Don't load automatically - only when refetch() is called
  // This enables lazy loading for comboboxes

  return {
    components,
    isLoading,
    error,
    refetch,
    onSearch,
    loadMore,
    hasMore,
    totalCount
  }
}

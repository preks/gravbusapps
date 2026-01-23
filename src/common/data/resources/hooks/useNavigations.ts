import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'
import type { NavigationDTO, GetNavigationsParams } from '../types/navigation.types'

interface UseNavigationsResult {
  navigations: NavigationDTO[]
  totalCount: number
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  loadMore: () => Promise<void>
  hasMore: boolean
  reset: () => void
}

export const useNavigations = (
  context: BusinessAppContextProps,
  params?: GetNavigationsParams
): UseNavigationsResult => {
  const [navigations, setNavigations] = useState<NavigationDTO[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resourceClient = useResourceClient(context.accessToken)
  const has401Error = useRef(false)
  const paramsRef = useRef(params)
  const currentOffsetRef = useRef(0)
  const lastSearchSortRef = useRef<string>('')
  const isFetchingRef = useRef(false)

  // Update params ref when params change
  useEffect(() => {
    paramsRef.current = params
  }, [params])

  // Check if search/sort params changed (requires reset)
  useEffect(() => {
    const searchSortKey = `${params?.search || ''}-${params?.sort || ''}`
    if (searchSortKey !== lastSearchSortRef.current) {
      lastSearchSortRef.current = searchSortKey
      // Reset offset when search/sort changes
      currentOffsetRef.current = 0
      setNavigations([])
    }
  }, [params?.search, params?.sort])

  const fetchNavigations = useCallback(
    async (append = false) => {
      // Prevent concurrent requests
      if (isFetchingRef.current) return

      if (!context.accessToken) {
        setError('Access token not available')
        setIsLoading(false)
        return
      }

      // Don't refetch if we have a 401 error
      if (has401Error.current) {
        return
      }

      isFetchingRef.current = true
      setIsLoading(true)
      setError(null)

      try {
        const { ...restParams } = paramsRef.current || {}
        const fetchParams = {
          ...restParams,
          offset: append ? currentOffsetRef.current : 0,
          limit: paramsRef.current?.limit || 20
        }

        const result = await resourceClient.navigation.getNavigations(fetchParams)
        has401Error.current = false

        // Update offset IMMEDIATELY before setState to prevent race conditions with IntersectionObserver
        if (append) {
          currentOffsetRef.current += result.data.length
          setNavigations(prev => [...prev, ...result.data])
        } else {
          currentOffsetRef.current = result.data.length
          setNavigations(result.data)
        }

        setTotalCount(result.totalCount)
      } catch (err: any) {
        // Check if it's a 401 error
        if (err?.response?.status === 401 || err?.status === 401 || (err?.message && err.message.includes('401'))) {
          has401Error.current = true
        }

        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch navigations'
        setError(errorMessage)
        console.error('Error fetching navigations:', err)

        if (!append) {
          setNavigations([])
          setTotalCount(0)
        }
      } finally {
        setIsLoading(false)
        isFetchingRef.current = false
      }
    },
    [context.accessToken, resourceClient]
  )

  // Don't load automatically - only when refetch() is called
  // This enables lazy loading based on active view

  const refetch = useCallback(async () => {
    has401Error.current = false
    currentOffsetRef.current = 0
    await fetchNavigations(false)
  }, [fetchNavigations])

  const loadMore = useCallback(async () => {
    if (navigations.length < totalCount) {
      await fetchNavigations(true)
    }
  }, [fetchNavigations, navigations.length, totalCount])

  const reset = useCallback(() => {
    setNavigations([])
    setTotalCount(0)
    setError(null)
    currentOffsetRef.current = 0
    has401Error.current = false
    isFetchingRef.current = false
  }, [])

  const hasMore = navigations.length < totalCount

  return {
    navigations,
    totalCount,
    isLoading,
    error,
    refetch,
    loadMore,
    hasMore,
    reset
  }
}

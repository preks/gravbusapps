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

  // Update params ref when params change
  useEffect(() => {
    paramsRef.current = params
  }, [params])

  const fetchNavigations = useCallback(async () => {
    if (!context.accessToken) {
      setError('Access token not available')
      setIsLoading(false)
      return
    }

    // Don't refetch if we have a 401 error
    if (has401Error.current) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await resourceClient.navigation.getNavigations(paramsRef.current)
      has401Error.current = false
      setNavigations(result.data)
      setTotalCount(result.totalCount)
    } catch (err: any) {
      // Check if it's a 401 error
      if (err?.response?.status === 401 || err?.status === 401 || (err?.message && err.message.includes('401'))) {
        has401Error.current = true
      }

      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch navigations'
      setError(errorMessage)
      console.error('Error fetching navigations:', err)
      setNavigations([])
      setTotalCount(0)
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, resourceClient])

  // Don't load automatically - only when refetch() is called
  // This enables lazy loading based on active view

  const refetch = useCallback(async () => {
    has401Error.current = false
    await fetchNavigations()
  }, [fetchNavigations])

  return {
    navigations,
    totalCount,
    isLoading,
    error,
    refetch
  }
}

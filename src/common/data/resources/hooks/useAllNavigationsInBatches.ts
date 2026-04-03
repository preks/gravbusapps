import { useState, useCallback } from 'react'
import type { NavigationDTO } from '../types/navigation.types'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'

const BATCH_SIZE = 100

export interface UseAllNavigationsInBatchesResult {
  navigations: NavigationDTO[]
  isLoading: boolean
  error: string | null
  loadAll: () => Promise<void>
}

/**
 * Fetches all navigations in batches (limit 100 per request) until no more pages.
 */
export const useAllNavigationsInBatches = (
  context: BusinessAppContextProps
): UseAllNavigationsInBatchesResult => {
  const [navigations, setNavigations] = useState<NavigationDTO[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resourceClient = useResourceClient(context.accessToken)

  const loadAll = useCallback(async () => {
    if (!context.accessToken) {
      setError('No access token available')
      return
    }
    setIsLoading(true)
    setError(null)
    const accumulated: NavigationDTO[] = []
    let offset = 0
    let totalCount = BATCH_SIZE

    try {
      while (offset < totalCount) {
        const result = await resourceClient.navigation.getNavigations({
          limit: BATCH_SIZE,
          offset
        })
        const data = result?.data ?? []
        totalCount = result?.totalCount ?? data.length
        accumulated.push(...data)
        offset += data.length
        if (data.length < BATCH_SIZE) break
      }
      setNavigations(accumulated)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch navigations'
      setError(errorMessage)
      setNavigations([])
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, resourceClient])

  return { navigations, isLoading, error, loadAll }
}

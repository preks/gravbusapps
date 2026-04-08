import { useState, useCallback } from 'react'
import type { Component } from '../types/component.types'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'

const BATCH_SIZE = 100

export interface UseAllComponentsInBatchesResult {
  components: Component[]
  isLoading: boolean
  error: string | null
  loadAll: () => Promise<void>
}

/**
 * Fetches all components in batches (limit 100 per request) until no more pages.
 * Call loadAll() when the Bundles section is active to populate data.
 */
export const useAllComponentsInBatches = (
  context: BusinessAppContextProps
): UseAllComponentsInBatchesResult => {
  const [components, setComponents] = useState<Component[]>([])
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
    const accumulated: Component[] = []
    let offset = 0
    let totalRecords = BATCH_SIZE

    try {
      while (offset < totalRecords) {
        const response = await resourceClient.component.getComponents({
          limit: BATCH_SIZE,
          offset,
          returnTotalRecords: true,
          filter: {},
          sort: { field: 'name', order: 'ASC' }
        })
        const data = response?.data ?? []
        const total = response?.paging?.totalRecords ?? data.length
        totalRecords = total
        accumulated.push(...data)
        offset += data.length
        if (data.length < BATCH_SIZE) break
      }
      setComponents(accumulated)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch components'
      setError(errorMessage)
      setComponents([])
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, resourceClient])

  return { components, isLoading, error, loadAll }
}

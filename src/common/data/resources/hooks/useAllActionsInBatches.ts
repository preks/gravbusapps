import { useState, useCallback } from 'react'
import type { ActionDTO } from '../types/action.types'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'

const BATCH_SIZE = 100

export interface UseAllActionsInBatchesResult {
  actions: ActionDTO[]
  isLoading: boolean
  error: string | null
  loadAll: () => Promise<void>
}

/**
 * Fetches all actions (flow items) in batches (limit 100 per request) until no more pages.
 */
export const useAllActionsInBatches = (
  context: BusinessAppContextProps
): UseAllActionsInBatchesResult => {
  const [actions, setActions] = useState<ActionDTO[]>([])
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
    const accumulated: ActionDTO[] = []
    let offset = 0
    let totalRecords = BATCH_SIZE

    try {
      while (offset < totalRecords) {
        const response = await resourceClient.action.getActions({
          limit: BATCH_SIZE,
          offset,
          returnTotalRecords: true
        })
        const data = response?.data ?? []
        const total = response?.paging?.totalRecords ?? data.length
        totalRecords = total
        accumulated.push(...data)
        offset += data.length
        if (data.length < BATCH_SIZE) break
      }
      setActions(accumulated)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch actions'
      setError(errorMessage)
      setActions([])
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, resourceClient])

  return { actions, isLoading, error, loadAll }
}

import { useState, useCallback } from 'react'
import type { ContextDTO } from '../types/context.types'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'

const BATCH_SIZE = 100

export interface UseAllContextsInBatchesResult {
  contexts: ContextDTO[]
  isLoading: boolean
  error: string | null
  loadAll: () => Promise<void>
}

export const useAllContextsInBatches = (
  context: BusinessAppContextProps
): UseAllContextsInBatchesResult => {
  const [contexts, setContexts] = useState<ContextDTO[]>([])
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
    const accumulated: ContextDTO[] = []
    let offset = 0
    let totalRecords = BATCH_SIZE

    try {
      while (offset < totalRecords) {
        const response = await resourceClient.action.getContexts({
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
      setContexts(accumulated)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch contexts'
      setError(errorMessage)
      setContexts([])
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, resourceClient])

  return { contexts, isLoading, error, loadAll }
}

import { useCallback, useEffect, useState } from 'react'
import { useCustomDataClient } from './useCustomDataClient'
import type { NamespaceAggregate } from '../types'

interface UseNamespaceAggregateResult {
  aggregate: NamespaceAggregate | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useNamespaceAggregate(accessToken: string, namespace?: string): UseNamespaceAggregateResult {
  const client = useCustomDataClient(accessToken)
  const [aggregate, setAggregate] = useState<NamespaceAggregate | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAggregate = useCallback(async () => {
    if (!accessToken || !namespace) {
      setAggregate(null)
      setError(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const nextAggregate = await client.getNamespaceAggregate(namespace, 'service')
      setAggregate(nextAggregate)
    } catch (fetchError) {
      setAggregate(null)
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load namespace aggregate')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, client, namespace])

  useEffect(() => {
    void fetchAggregate()
  }, [fetchAggregate])

  return {
    aggregate,
    isLoading,
    error,
    refetch: fetchAggregate
  }
}

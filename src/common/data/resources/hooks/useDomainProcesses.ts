import { useState, useCallback } from 'react'
import { useResourceClient } from '@/common/network/resources/useResourceClient'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface UseDomainProcessesResult {
  isLoading: boolean
  error: string | null
  refetch: (domain: string) => Promise<Array<{ id: string; name: string }>>
  getProcessesForDomain: (domain: string) => Array<{ id: string; name: string }>
}

export const useDomainProcesses = (context: BusinessAppContextProps): UseDomainProcessesResult => {
  const resourceClient = useResourceClient(context.accessToken)
  const [loadedProcesses, setLoadedProcesses] = useState<Map<string, Array<{ id: string; name: string }>>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDomainProcesses = useCallback(
    async (domain: string): Promise<Array<{ id: string; name: string }>> => {
      if (!context.accessToken) {
        setError('No access token available')
        setIsLoading(false)
        return []
      }

      setIsLoading(true)
      setError(null)

      try {
        // Fetch processes for specific domain only
        const processes = await resourceClient.getProcessesForDomain(domain)

        // Cache the result
        setLoadedProcesses(prev => {
          // Don't reload if already cached
          if (prev.has(domain)) {
            return prev
          }
          return new Map(prev).set(domain, processes)
        })

        return processes
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        setError(errorMessage)
        return []
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken, resourceClient]
  )

  const getProcessesForDomain = useCallback(
    (domain: string): Array<{ id: string; name: string }> => {
      if (!domain) {
        return []
      }

      // Return cached processes if available
      return loadedProcesses.get(domain) || []
    },
    [loadedProcesses]
  )

  return {
    isLoading,
    error,
    refetch: fetchDomainProcesses,
    getProcessesForDomain
  }
}

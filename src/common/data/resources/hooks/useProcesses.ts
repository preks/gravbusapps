import { useState, useEffect, useCallback } from 'react'
import { useResourceClient } from '@/common/network/resources/useResourceClient'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface ProcessOption {
  id: string
  name: string
}

export interface UseProcessesResult {
  processes: ProcessOption[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  search: (searchTerm: string) => Promise<void>
}

export const useProcesses = (
  context: BusinessAppContextProps,
  domain: string | null | undefined
): UseProcessesResult => {
  const resourceClient = useResourceClient(context.accessToken)
  const [processes, setProcesses] = useState<ProcessOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProcesses = useCallback(async () => {
    if (!context.accessToken || !domain) {
      setProcesses([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await resourceClient.action.getProcessesForDomain(domain)
      setProcesses(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error fetching processes:', err)
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, domain, resourceClient])

  const search = useCallback(
    async (searchTerm: string) => {
      if (!context.accessToken || !domain) return

      setIsLoading(true)
      setError(null)

      try {
        const allProcesses = await resourceClient.action.getProcessesForDomain(domain)
        const filtered = allProcesses.filter(process => process.name.toLowerCase().includes(searchTerm.toLowerCase()))
        setProcesses(filtered)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        setError(errorMessage)
        console.error('Error searching processes:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken, domain, resourceClient]
  )

  useEffect(() => {
    if (context.accessToken && domain) {
      fetchProcesses()
    } else {
      setProcesses([])
    }
  }, [context.accessToken, domain, fetchProcesses])

  return {
    processes,
    isLoading,
    error,
    refetch: fetchProcesses,
    search
  }
}

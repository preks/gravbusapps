import { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useWorkflowEngine } from '../services'

export interface UseMyRequestsCountResult {
  count: number
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Hook to get the count of user's requests
 * Used for displaying badge count on "My Requests" button
 */
export function useMyRequestsCount(contextProps: BusinessAppContextProps): UseMyRequestsCountResult {
  const [count, setCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const workflowEngine = useWorkflowEngine(contextProps)

  const fetchRequestsCount = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Use optimized count method instead of fetching full request details
      // Type assertion needed until TypeScript picks up the updated interface
      const requestsCount = await (workflowEngine as any).getMyRequestsCount()
      setCount(requestsCount)

      console.log('🔢 [useMyRequestsCount] Fetched requests count (optimized):', {
        totalRequests: requestsCount,
        method: 'getMyRequestsCount (filtered by Services app tag)'
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load requests count'
      console.error('🔢 [useMyRequestsCount] Error fetching requests count:', err)
      setError(errorMessage)
      setCount(0) // Reset count on error
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRequestsCount()
  }, [workflowEngine])

  return {
    count,
    isLoading,
    error,
    refetch: fetchRequestsCount
  }
}

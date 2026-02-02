import { useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'

interface UseDeleteContextResult {
  deleteContext: (id: string) => Promise<boolean>
  isLoading: boolean
  error: string | null
}

export const useDeleteContext = (context: BusinessAppContextProps): UseDeleteContextResult => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resourceClient = useResourceClient(context.accessToken)

  const deleteContext = useCallback(
    async (id: string): Promise<boolean> => {
      if (!context.accessToken) {
        setError('Access token not available')
        return false
      }

      if (!id) {
        setError('Context ID is required')
        return false
      }

      setIsLoading(true)
      setError(null)

      try {
        await resourceClient.action.deleteContext(id)
        return true
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete context'
        setError(errorMessage)
        console.error('Error deleting context:', err)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken, resourceClient]
  )

  return {
    deleteContext,
    isLoading,
    error
  }
}

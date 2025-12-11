import { useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'

interface UseDeleteActionResult {
  deleteAction: (id: string) => Promise<boolean>
  isLoading: boolean
  error: string | null
}

export const useDeleteAction = (context: BusinessAppContextProps): UseDeleteActionResult => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resourceClient = useResourceClient(context.accessToken)

  const deleteAction = useCallback(
    async (id: string): Promise<boolean> => {
      if (!context.accessToken) {
        setError('Access token not available')
        return false
      }

      if (!id) {
        setError('Action ID is required')
        return false
      }

      setIsLoading(true)
      setError(null)

      try {
        await resourceClient.deleteAction(id)
        return true
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete action'
        setError(errorMessage)
        console.error('Error deleting action:', err)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken, resourceClient]
  )

  return {
    deleteAction,
    isLoading,
    error
  }
}

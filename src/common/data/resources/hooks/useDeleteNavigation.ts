import { useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'

interface UseDeleteNavigationResult {
  deleteNavigation: (id: string) => Promise<boolean>
  isLoading: boolean
  error: string | null
}

export const useDeleteNavigation = (context: BusinessAppContextProps): UseDeleteNavigationResult => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resourceClient = useResourceClient(context.accessToken)

  const deleteNavigation = useCallback(
    async (id: string): Promise<boolean> => {
      if (!context.accessToken) {
        setError('Access token not available')
        return false
      }

      if (!id) {
        setError('Navigation ID is required')
        return false
      }

      setIsLoading(true)
      setError(null)

      try {
        await resourceClient.navigation.deleteNavigation(id)
        return true
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete navigation'
        setError(errorMessage)
        console.error('Error deleting navigation:', err)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken, resourceClient]
  )

  return {
    deleteNavigation,
    isLoading,
    error
  }
}

import { useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'

interface UseDeleteMenuItemResult {
  deleteMenuItem: (id: string, isHub: boolean) => Promise<boolean>
  isLoading: boolean
  error: string | null
}

export const useDeleteMenuItem = (context: BusinessAppContextProps): UseDeleteMenuItemResult => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resourceClient = useResourceClient(context.accessToken)

  const deleteMenuItem = useCallback(
    async (id: string, isHub: boolean): Promise<boolean> => {
      if (!context.accessToken) {
        setError('Access token not available')
        return false
      }

      setIsLoading(true)
      setError(null)

      try {
        await resourceClient.navigation.deleteMenuItem(id, isHub)
        return true
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete menu item'
        setError(errorMessage)
        console.error('Error deleting menu item:', err)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken, resourceClient]
  )

  return {
    deleteMenuItem,
    isLoading,
    error
  }
}

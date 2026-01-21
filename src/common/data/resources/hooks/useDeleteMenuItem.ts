import { useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'

interface UseDeleteMenuItemResult {
  deleteMenuItem: (id: string, isHub: boolean) => Promise<void>
  isDeleting: boolean
  error: string | null
}

export const useDeleteMenuItem = (context: BusinessAppContextProps): UseDeleteMenuItemResult => {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resourceClient = useResourceClient(context.accessToken)

  const deleteMenuItem = useCallback(
    async (id: string, isHub: boolean): Promise<void> => {
      if (!context.accessToken) {
        const err = 'Access token not available'
        setError(err)
        throw new Error(err)
      }

      setIsDeleting(true)
      setError(null)

      try {
        await resourceClient.navigation.deleteMenuItem(id, isHub)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete menu item'
        setError(errorMessage)
        console.error('Error deleting menu item:', err)
        throw err
      } finally {
        setIsDeleting(false)
      }
    },
    [context.accessToken, resourceClient]
  )

  return {
    deleteMenuItem,
    isDeleting,
    error
  }
}

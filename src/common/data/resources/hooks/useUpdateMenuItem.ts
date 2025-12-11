import { useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'
import type { MenuItemDTO, MenuItemUpsertRequestDTO } from '../types/menuItem.types'

interface UseUpdateMenuItemResult {
  updateMenuItem: (id: string, data: Partial<MenuItemUpsertRequestDTO>, isHub: boolean) => Promise<MenuItemDTO | null>
  isLoading: boolean
  error: string | null
}

export const useUpdateMenuItem = (context: BusinessAppContextProps): UseUpdateMenuItemResult => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resourceClient = useResourceClient(context.accessToken)

  const updateMenuItem = useCallback(
    async (id: string, data: Partial<MenuItemUpsertRequestDTO>, isHub: boolean): Promise<MenuItemDTO | null> => {
      if (!context.accessToken) {
        setError('Access token not available')
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await resourceClient.navigation.updateMenuItem(id, data, isHub)
        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update menu item'
        setError(errorMessage)
        console.error('Error updating menu item:', err)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken, resourceClient]
  )

  return {
    updateMenuItem,
    isLoading,
    error
  }
}

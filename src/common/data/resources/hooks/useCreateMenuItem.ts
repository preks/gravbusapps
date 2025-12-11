import { useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'
import type { MenuItemDTO, MenuItemUpsertRequestDTO } from '../types/menuItem.types'

interface UseCreateMenuItemResult {
  createMenuItem: (data: MenuItemUpsertRequestDTO, isHub: boolean) => Promise<MenuItemDTO | null>
  isLoading: boolean
  error: string | null
}

export const useCreateMenuItem = (context: BusinessAppContextProps): UseCreateMenuItemResult => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resourceClient = useResourceClient(context.accessToken)

  const createMenuItem = useCallback(
    async (data: MenuItemUpsertRequestDTO, isHub: boolean): Promise<MenuItemDTO | null> => {
      if (!context.accessToken) {
        setError('Access token not available')
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await resourceClient.navigation.createMenuItem(data, isHub)
        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create menu item'
        setError(errorMessage)
        console.error('Error creating menu item:', err)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken, resourceClient]
  )

  return {
    createMenuItem,
    isLoading,
    error
  }
}

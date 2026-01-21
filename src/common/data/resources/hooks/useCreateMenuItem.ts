import { useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'
import type { MenuItemDTO, MenuItemUpsertRequestDTO } from '../types/menuItem.types'

interface UseCreateMenuItemResult {
  createMenuItem: (data: MenuItemUpsertRequestDTO, isHub: boolean) => Promise<MenuItemDTO>
  isCreating: boolean
  error: string | null
}

export const useCreateMenuItem = (context: BusinessAppContextProps): UseCreateMenuItemResult => {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resourceClient = useResourceClient(context.accessToken)

  const createMenuItem = useCallback(
    async (data: MenuItemUpsertRequestDTO, isHub: boolean): Promise<MenuItemDTO> => {
      if (!context.accessToken) {
        const err = 'Access token not available'
        setError(err)
        throw new Error(err)
      }

      setIsCreating(true)
      setError(null)

      try {
        const result = await resourceClient.navigation.createMenuItem(data, isHub)
        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create menu item'
        setError(errorMessage)
        console.error('Error creating menu item:', err)
        throw err
      } finally {
        setIsCreating(false)
      }
    },
    [context.accessToken, resourceClient]
  )

  return {
    createMenuItem,
    isCreating,
    error
  }
}

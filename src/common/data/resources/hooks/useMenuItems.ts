import { useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'
import type { MenuItemDTO } from '../types/menuItem.types'

interface UseMenuItemsResult {
  menuItems: MenuItemDTO[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useMenuItems = (
  context: BusinessAppContextProps,
  params?: { hubType?: 'USE' | 'CREATE' | 'MANAGE' }
): UseMenuItemsResult => {
  const [menuItems, setMenuItems] = useState<MenuItemDTO[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resourceClient = useResourceClient(context.accessToken)

  const fetchMenuItems = useCallback(async () => {
    if (!context.accessToken) {
      setError('Access token not available')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const data = await resourceClient.navigation.getMenuItems(params)
      setMenuItems(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch menu items'
      setError(errorMessage)
      console.error('Error fetching menu items:', err)
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, resourceClient, params])

  // Don't load automatically - only when refetch() is called
  // This enables lazy loading based on active view

  return {
    menuItems,
    isLoading,
    error,
    refetch: fetchMenuItems
  }
}

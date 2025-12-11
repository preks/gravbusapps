import { useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'
import type { NavigationDTO } from '../types/navigation.types'

interface UseUpdateNavigationResult {
  updateNavigation: (id: string, data: Partial<NavigationDTO>) => Promise<NavigationDTO | null>
  isLoading: boolean
  error: string | null
}

export const useUpdateNavigation = (context: BusinessAppContextProps): UseUpdateNavigationResult => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resourceClient = useResourceClient(context.accessToken)

  const updateNavigation = useCallback(
    async (id: string, data: Partial<NavigationDTO>): Promise<NavigationDTO | null> => {
      if (!context.accessToken) {
        setError('Access token not available')
        return null
      }

      if (!id) {
        setError('Navigation ID is required')
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await resourceClient.navigation.updateNavigation(id, data)
        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update navigation'
        setError(errorMessage)
        console.error('Error updating navigation:', err)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken, resourceClient]
  )

  return {
    updateNavigation,
    isLoading,
    error
  }
}

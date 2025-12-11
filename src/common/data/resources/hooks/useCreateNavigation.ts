import { useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'
import type { NavigationDTO } from '../types/navigation.types'

interface UseCreateNavigationResult {
  createNavigation: (data: Omit<NavigationDTO, 'id'>) => Promise<NavigationDTO | null>
  isLoading: boolean
  error: string | null
}

export const useCreateNavigation = (context: BusinessAppContextProps): UseCreateNavigationResult => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resourceClient = useResourceClient(context.accessToken)

  const createNavigation = useCallback(
    async (data: Omit<NavigationDTO, 'id'>): Promise<NavigationDTO | null> => {
      if (!context.accessToken) {
        setError('Access token not available')
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await resourceClient.navigation.createNavigation(data)
        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create navigation'
        setError(errorMessage)
        console.error('Error creating navigation:', err)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken, resourceClient]
  )

  return {
    createNavigation,
    isLoading,
    error
  }
}

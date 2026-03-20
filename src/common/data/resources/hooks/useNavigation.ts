import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'
import type { NavigationDTO } from '../types/navigation.types'

interface UseNavigationResult {
  navigation: NavigationDTO | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useNavigation = (context: BusinessAppContextProps, id: string): UseNavigationResult => {
  const [navigation, setNavigation] = useState<NavigationDTO | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const resourceClient = useResourceClient(context.accessToken)

  const fetchNavigation = useCallback(async () => {
    if (!context.accessToken) {
      setError('Access token not available')
      setIsLoading(false)
      return
    }

    if (!id) {
      setError('Navigation ID is required')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const data = await resourceClient.getNavigation(id)
      setNavigation(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch navigation'
      setError(errorMessage)
      console.error('Error fetching navigation:', err)
      setNavigation(null)
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, resourceClient, id])

  useEffect(() => {
    if (context.accessToken && id) {
      fetchNavigation()
    }
  }, [context.accessToken, id, fetchNavigation])

  return {
    navigation,
    isLoading,
    error,
    refetch: fetchNavigation
  }
}

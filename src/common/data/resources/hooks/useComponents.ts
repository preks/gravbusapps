import { useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'
import type { Component } from '../types/component.types'

interface UseComponentsResult {
  components: Component[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook to fetch components from Screen Management Service
 * Uses ResourceClient.component.getComponents()
 */
export const useComponents = (context: BusinessAppContextProps): UseComponentsResult => {
  const [components, setComponents] = useState<Component[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resourceClient = useResourceClient(context.accessToken)

  const fetchComponents = useCallback(async () => {
    if (!context.accessToken) {
      setError('No access token available')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Load only first page - no pagination loop
      const limit = 100
      const response = await resourceClient.component.getComponents({
        limit: limit,
        offset: 0,
        returnTotalRecords: false
      })

      if (response?.data && Array.isArray(response.data)) {
        setComponents(response.data)
      } else {
        setComponents([])
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch components'
      setError(errorMessage)
      console.error('Error fetching components from Screen Management:', err)
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, resourceClient])

  // Don't load automatically - only when refetch() is called
  // This enables lazy loading for comboboxes

  return {
    components,
    isLoading,
    error,
    refetch: fetchComponents
  }
}

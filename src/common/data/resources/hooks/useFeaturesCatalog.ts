import { useState, useCallback } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'

export interface FeatureOption {
  id: string
  name: string
}

export interface UseFeaturesCatalogResult {
  features: FeatureOption[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook to fetch features from Flow Registry Service
 * (Not from catalog - features come from flow-registry service)
 */
export const useFeaturesCatalog = (context: BusinessAppContextProps): UseFeaturesCatalogResult => {
  const resourceClient = useResourceClient(context.accessToken)
  const [features, setFeatures] = useState<FeatureOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasError, setHasError] = useState(false)

  const fetchFeatures = useCallback(async () => {
    if (!context.accessToken) {
      setError('No access token available')
      setIsLoading(false)
      return
    }

    // Don't refetch if we have a persistent error
    if (hasError) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const featuresData = await resourceClient.action.getFeatures()

      if (featuresData && Array.isArray(featuresData) && featuresData.length > 0) {
        const processedFeatures = featuresData.map((feature: string) => ({
          id: feature,
          name: feature
        }))
        setFeatures(processedFeatures)
        setHasError(false)
      } else {
        setFeatures([])
      }
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch features'
      setError(errorMessage)
      setFeatures([])
      // Set hasError to prevent recursive retries
      setHasError(true)
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, resourceClient, hasError])

  const refetch = useCallback(async () => {
    setHasError(false)
    await fetchFeatures()
  }, [fetchFeatures])

  return {
    features,
    isLoading,
    error,
    refetch
  }
}

import { useState, useEffect, useCallback } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

export interface Pipeline {
  id: string
  name: string
  value: string
}

/**
 * Hook to fetch sales pipelines from the catalog
 */
export const usePipelines = (accessToken: string) => {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const catalogClient = useCatalogManagerClient(accessToken)
  const userLocale = getCurrentActiveUserLocale() ?? 'en-US'

  const loadPipelines = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: 'SalesPipeline',
          version: 'v1'
        },
        {
          limit: 50,
          offset: 0,
          returnTotalRecords: true,
          localeCode: userLocale
        }
      )

      if (response?.data) {
        const processedPipelines = response.data.map((entry: any) => ({
          id: entry.id,
          name: entry.value || entry.code || entry.id,
          value: entry.value || entry.code || entry.id
        }))

        setPipelines(processedPipelines)
      } else {
        setPipelines([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pipelines')
      setPipelines([])
    } finally {
      setIsLoading(false)
    }
  }, [catalogClient, accessToken, userLocale])

  useEffect(() => {
    loadPipelines()
  }, [loadPipelines])

  return {
    pipelines,
    isLoading,
    error,
    refetch: loadPipelines
  }
}

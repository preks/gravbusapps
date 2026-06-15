import { useState, useEffect, useCallback } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

export interface Pipeline {
  id: string
  name: string
  value: string
}

type CatalogClient = ReturnType<typeof useCatalogManagerClient>

// The sales pipeline catalog is global/static data. Several charts need it at
// once (e.g. forecast + open-pipeline-by-stage), so we cache the result and
// share a single in-flight request per locale instead of fetching it per hook.
const pipelinesCache = new Map<string, Pipeline[]>()
const inFlightRequests = new Map<string, Promise<Pipeline[]>>()

const mapCatalogEntries = (data: any[]): Pipeline[] =>
  data.map((entry: any) => ({
    id: entry.id,
    name: entry.value || entry.code || entry.id,
    value: entry.value || entry.code || entry.id
  }))

const requestPipelines = (catalogClient: CatalogClient, userLocale: string, force: boolean): Promise<Pipeline[]> => {
  if (!force) {
    const cached = pipelinesCache.get(userLocale)
    if (cached) {
      return Promise.resolve(cached)
    }

    const existing = inFlightRequests.get(userLocale)
    if (existing) {
      return existing
    }
  }

  const request = (async () => {
    const response = await catalogClient.getCatalogEntriesList(
      { catalogIdentifier: 'SalesPipeline', version: 'v1' },
      { limit: 50, offset: 0, returnTotalRecords: true, localeCode: userLocale }
    )

    const processed = response?.data ? mapCatalogEntries(response.data) : []
    pipelinesCache.set(userLocale, processed)
    return processed
  })()

  inFlightRequests.set(userLocale, request)
  request.finally(() => {
    if (inFlightRequests.get(userLocale) === request) {
      inFlightRequests.delete(userLocale)
    }
  })

  return request
}

/**
 * Hook to fetch sales pipelines from the catalog.
 *
 * Results are cached and deduplicated at the module level, so mounting several
 * pipeline-dependent charts at once triggers only a single catalog request.
 */
export const usePipelines = (accessToken: string) => {
  const catalogClient = useCatalogManagerClient(accessToken)
  const userLocale = getCurrentActiveUserLocale() ?? 'en-US'

  const [pipelines, setPipelines] = useState<Pipeline[]>(() => pipelinesCache.get(userLocale) ?? [])
  const [isLoading, setIsLoading] = useState(() => !pipelinesCache.has(userLocale))
  const [error, setError] = useState<string | null>(null)

  const loadPipelines = useCallback(
    async (force = false) => {
      if (!accessToken) {
        setIsLoading(false)
        return
      }

      if (!force && pipelinesCache.has(userLocale)) {
        setPipelines(pipelinesCache.get(userLocale) ?? [])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await requestPipelines(catalogClient, userLocale, force)
        setPipelines(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load pipelines')
        setPipelines([])
      } finally {
        setIsLoading(false)
      }
    },
    [catalogClient, accessToken, userLocale]
  )

  useEffect(() => {
    loadPipelines().catch(() => undefined)
  }, [loadPipelines])

  return {
    pipelines,
    isLoading,
    error,
    refetch: () => {
      loadPipelines(true).catch(() => undefined)
    }
  }
}

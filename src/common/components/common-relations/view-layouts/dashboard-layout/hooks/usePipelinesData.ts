import { useState, useEffect, useCallback } from 'react'
import { useCatalogEntries } from '@/common/data/catalog/hooks/useCatalogEntries'

/**
 * Configuration for pipeline queries (module-agnostic)
 * Each module (CRM, IRM, etc.) provides its specific catalog identifier
 */
export interface PipelinesConfig {
  catalogIdentifier: string
  version?: string
}

export interface Pipeline {
  id: string
  code: string
  value: string
  additionalValue1?: string
  additionalValue2?: string
  additionalValue3?: string
  catalog: {
    id: string
    identifier: string
    name: string
  }
}

export interface UsePipelinesDataProps {
  accessToken: string
  config: PipelinesConfig
  enabled?: boolean
}

export interface UsePipelinesDataReturn {
  pipelines: Pipeline[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Module-agnostic hook for fetching pipelines from catalog
 * Uses the standardized catalog entries system from common/data/catalog
 *
 * @example CRM
 * const { pipelines, isLoading } = usePipelinesData({
 *   accessToken,
 *   config: crmPipelinesConfig
 * })
 *
 * @example IRM
 * const { pipelines, isLoading } = usePipelinesData({
 *   accessToken,
 *   config: irmPipelinesConfig
 * })
 */
export const usePipelinesData = ({
  accessToken,
  config,
  enabled = true
}: UsePipelinesDataProps): UsePipelinesDataReturn => {
  const { fetchCatalogEntriesByIdentifier } = useCatalogEntries({ accessToken })

  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [isLoading, setIsLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const fetchPipelines = useCallback(async () => {
    if (!accessToken || !enabled) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { entries } = await fetchCatalogEntriesByIdentifier(config.catalogIdentifier, {
        version: config.version || 'v1',
        orderBy: [{ field: 'value', direction: 'ASC' }]
      })

      // Map to Pipeline format
      const mappedPipelines: Pipeline[] = entries.map(entry => ({
        id: entry.id,
        code: entry.code || '',
        value: entry.value || '',
        additionalValue1: entry.additionalValue1,
        additionalValue2: entry.additionalValue2,
        additionalValue3: entry.additionalValue3,
        catalog: {
          id: entry.catalog?.id || '',
          identifier: entry.catalog?.identifier || config.catalogIdentifier,
          name: entry.catalog?.name || config.catalogIdentifier
        }
      }))

      setPipelines(mappedPipelines)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch pipelines'
      console.error(`❌ Error fetching pipelines from ${config.catalogIdentifier}:`, err)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, config, enabled, fetchCatalogEntriesByIdentifier])

  useEffect(() => {
    if (enabled) {
      fetchPipelines()
    }
  }, [enabled, fetchPipelines])

  return {
    pipelines,
    isLoading,
    error,
    refetch: fetchPipelines
  }
}

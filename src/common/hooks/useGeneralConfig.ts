import { useState, useEffect, useCallback, useRef } from 'react'
import { useCatalogEntry } from '@/common/data/catalog/hooks/useCatalogEntry'

export interface GeneralConfigResult<T = any> {
  /**
   * Configuration data from catalog entry's objectValue field
   * @example { showScreen: true, maxRecords: 100 }
   */
  data: T | null
  /**
   * Config code identifier
   * @example "CUSTOMER_PIPELINE_DETAILS_SCREEN"
   */
  code: string | null
  /**
   * Human-readable display name from catalog
   * @example "Customer Pipeline Details Screen Configuration"
   */
  displayName: string | null
  /**
   * Optional description for documentation
   */
  description: string | null
  /**
   * Loading state
   */
  isLoading: boolean
  /**
   * Error message if fetch failed
   */
  error: string | null
  /**
   * Refetch the config
   */
  refetch: () => Promise<void>
}

export interface UseGeneralConfigOptions {
  /**
   * The code of the config entry to fetch (e.g., 'INVESTMENT_PIPELINE_DETAILS_SCREEN')
   */
  code: string
  /**
   * Access token for authentication
   */
  accessToken: string
  /**
   * Default value to return if config not found or on error
   */
  defaultValue?: any
  /**
   * Whether to fetch immediately on mount (default: true)
   */
  enabled?: boolean
}

/**
 * Generic hook to fetch configuration from GeneralConfig catalog
 *
 * @description
 * Fetches a config entry from the GeneralConfig catalog and extracts:
 * - `data`: The JSON configuration data (catalog entry's objectValue field)
 * - `code`: The config identifier (catalog entry's code field)
 * - `displayName`: Human-readable name (catalog entry's value field)
 * - `description`: Optional description (catalog entry's description field)
 *
 * @example
 * // Simple usage - get objectValue data
 * const { data, isLoading } = useGeneralConfig({
 *   code: 'CUSTOMER_PIPELINE_DETAILS_SCREEN',
 *   accessToken: context.accessToken
 * })
 * const showScreen = data?.showScreen === true
 *
 * @example
 * // With typed config and default value
 * interface PipelineConfig {
 *   showScreen: boolean
 *   maxRecords?: number
 * }
 * const { data, displayName } = useGeneralConfig<PipelineConfig>({
 *   code: 'CUSTOMER_PIPELINE_DETAILS_SCREEN',
 *   accessToken: context.accessToken,
 *   defaultValue: { showScreen: true }
 * })
 *
 * @example
 * // Access metadata
 * const { data, code, displayName, description } = useGeneralConfig({
 *   code: 'MY_FEATURE_CONFIG',
 *   accessToken: context.accessToken
 * })
 * console.log(`[${code}] ${displayName}: enabled=${data?.enabled}`)
 */
export const useGeneralConfig = <T = any>({
  code,
  accessToken,
  defaultValue = null,
  enabled = true
}: UseGeneralConfigOptions): GeneralConfigResult<T> => {
  // Use ref to store default value to avoid it causing re-renders
  const defaultValueRef = useRef(defaultValue)

  const [data, setData] = useState<T | null>(defaultValue)
  const [catalogCode, setCatalogCode] = useState<string | null>(null)
  const [catalogDisplayName, setCatalogDisplayName] = useState<string | null>(null)
  const [catalogDescription, setCatalogDescription] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  // Use GraphQL-based catalog hook (reads only, follows architectural pattern)
  const { fetchCatalogEntryById } = useCatalogEntry(accessToken)

  const fetchConfig = useCallback(async () => {
    if (!accessToken || !code || !enabled) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Fetch entry using GraphQL: GeneralConfig:v1:CODE
      const entryId = `GeneralConfig:v1:${code}`
      const foundEntry = await fetchCatalogEntryById(entryId)

      if (foundEntry) {
        setData(foundEntry.objectValue || defaultValueRef.current)
        setCatalogCode(foundEntry.code || null)
        setCatalogDisplayName(foundEntry.value || null)
        setCatalogDescription(foundEntry.description || null)
      } else {
        console.warn(`[useGeneralConfig] Config entry not found: ${code}`)
        setData(defaultValueRef.current)
        setCatalogCode(null)
        setCatalogDisplayName(null)
        setCatalogDescription(null)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch general config'
      console.error(`[useGeneralConfig] Error fetching config for ${code}:`, err)
      setError(errorMessage)
      // On error, use default value to avoid breaking functionality
      setData(defaultValueRef.current)
      setCatalogCode(null)
      setCatalogDisplayName(null)
      setCatalogDescription(null)
    } finally {
      setIsLoading(false)
    }
  }, [fetchCatalogEntryById, code, enabled, accessToken])

  useEffect(() => {
    void fetchConfig()
  }, [fetchConfig])

  return {
    data,
    code: catalogCode,
    displayName: catalogDisplayName,
    description: catalogDescription,
    isLoading,
    error,
    refetch: fetchConfig
  }
}

export default useGeneralConfig

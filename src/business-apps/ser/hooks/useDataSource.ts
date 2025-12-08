/**
 * useDataSource Hook
 *
 * Provides dynamic data fetching from custom-flow-engine datasource endpoint
 * for SELECT and MULTISELECT form fields with dataSource configuration.
 *
 * Supports:
 * - ENTITY type: fetches from /api/datasource/:entityType
 * - CATALOG type: fetches from /api/datasource/:catalogIdentifier (via backend)
 * - Search functionality with debouncing
 * - Pagination for large datasets
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { env } from '@/common/env/EnvUtils'
import { DataSourceConfig } from '../types/flowTemplate'

// API Base URL for custom-flow-engine
const getApiBase = (): string => {
  return (env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || env('NEXT_PUBLIC_BASE_URL') + '/flow-engine') + '/api'
}

// Response option format
export interface DataSourceOption {
  value: string | number
  label: string
  metadata?: Record<string, any>
}

// Hook response
export interface UseDataSourceResult {
  options: DataSourceOption[]
  isLoading: boolean
  error: string | null
  search: (searchTerm: string) => void
  loadMore: () => void
  hasMore: boolean
  totalCount: number
  refetch: () => void
}

// API response format
interface DataSourceApiResponse {
  entities: Array<Record<string, any>>
  meta: {
    total: number
    limit: number
    offset: number
    entity: string
    search: string | null
  }
}

/**
 * Check if dataSource configuration is valid for fetching
 */
const isValidDataSource = (dataSource: DataSourceConfig | undefined): boolean => {
  if (!dataSource) return false

  // Must be ENTITY or CATALOG type
  if (dataSource.type !== 'ENTITY' && dataSource.type !== 'CATALOG') {
    return false
  }

  // ENTITY type requires entity field
  if (dataSource.type === 'ENTITY' && !dataSource.entity) {
    return false
  }

  // CATALOG type requires catalog or catalogIdentifier field
  if (dataSource.type === 'CATALOG' && !dataSource.catalog && !dataSource.catalogIdentifier) {
    return false
  }

  return true
}

/**
 * useDataSource Hook
 * Fetches options from custom-flow-engine datasource endpoint
 * Only fetches when dataSource is valid (ENTITY with entity, or CATALOG with catalog)
 */
export const useDataSource = (
  dataSource: DataSourceConfig | undefined,
  accessToken: string,
  initialSearch?: string
): UseDataSourceResult => {
  const [options, setOptions] = useState<DataSourceOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState(initialSearch || '')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)

  const abortControllerRef = useRef<AbortController | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Check if this dataSource is valid for API fetching
  const shouldFetch = isValidDataSource(dataSource)
  const limit = dataSource?.limit || 20

  // Build the API URL based on dataSource type
  const buildApiUrl = useCallback(
    (search: string, currentOffset: number): string | null => {
      // Don't build URL if dataSource is not valid
      if (!shouldFetch || !dataSource) return null

      const apiBase = getApiBase()
      let entityType: string | undefined

      switch (dataSource.type) {
        case 'ENTITY':
          entityType = dataSource.entity
          break
        case 'CATALOG':
          entityType = dataSource.catalog || dataSource.catalogIdentifier
          break
        default:
          return null
      }

      if (!entityType) return null

      const url = new URL(`${apiBase}/datasource/${entityType.toLowerCase()}`)
      url.searchParams.set('limit', String(limit))
      url.searchParams.set('offset', String(currentOffset))

      if (search.trim()) {
        url.searchParams.set('search', search.trim())
      }

      // Add any filters from dataSource config
      if (dataSource.filters && Object.keys(dataSource.filters).length > 0) {
        const filterArray = Object.entries(dataSource.filters).map(([field, value]) => ({
          field,
          operator: 'eq',
          value
        }))
        url.searchParams.set('filters', JSON.stringify(filterArray))
      }

      return url.toString()
    },
    [dataSource, limit, shouldFetch]
  )

  // Transform API response to options
  const transformToOptions = useCallback(
    (entities: Array<Record<string, any>>): DataSourceOption[] => {
      if (!dataSource) return []

      const valueField = dataSource.valueField || 'id'
      const labelField = dataSource.labelField || 'displayName'

      return entities.map(entity => ({
        value: entity[valueField] ?? entity.id,
        label: entity[labelField] ?? entity.displayName ?? entity.code ?? String(entity[valueField] || entity.id),
        metadata: {
          id: entity.id,
          code: entity.code,
          displayName: entity.displayName,
          type: entity.type,
          ...entity
        }
      }))
    },
    [dataSource]
  )

  // Fetch data from API
  const fetchData = useCallback(
    async (search: string, currentOffset: number, append: boolean = false) => {
      const url = buildApiUrl(search, currentOffset)
      if (!url || !accessToken) {
        return
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          signal: abortControllerRef.current.signal
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`)
        }

        const data: DataSourceApiResponse = await response.json()
        const newOptions = transformToOptions(data.entities)

        if (append) {
          setOptions(prev => [...prev, ...newOptions])
        } else {
          setOptions(newOptions)
        }

        // Use consistent fallback logic for total count and hasMore
        const fetchedCount = data.entities.length
        const total = data.meta.total ?? fetchedCount
        setTotalCount(total)

        // Determine if more data is available
        const hasTotal = typeof data.meta.total === 'number' && data.meta.total > 0

        if (hasTotal) {
          // Use server total if available
          const totalLoaded = append ? currentOffset + fetchedCount : fetchedCount
          setHasMore(totalLoaded < data.meta.total)
        } else {
          // Without total count from API:
          // - If we got fewer than limit items, we've reached the end
          // - If appending and got 0 items, we've reached the end
          // - Otherwise, there might be more data
          if (fetchedCount < limit || (append && fetchedCount === 0)) {
            setHasMore(false)
          } else {
            setHasMore(true)
          }
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          // Request was cancelled, ignore
          return
        }
        console.error('[useDataSource] Fetch error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load options')
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken, buildApiUrl, transformToOptions, limit]
  )

  // Initial load when dataSource changes
  useEffect(() => {
    // Only fetch if dataSource is valid and we have an access token
    if (!shouldFetch || !accessToken) {
      // Reset state when dataSource is not valid
      setOptions([])
      setError(null)
      setHasMore(false)
      setTotalCount(0)
      return
    }

    setOffset(0)
    fetchData(searchTerm, 0, false)

    // Cleanup
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [shouldFetch, accessToken, fetchData, searchTerm])

  // Search handler with debouncing
  const search = useCallback(
    (term: string) => {
      setSearchTerm(term)

      // Don't search if dataSource is not valid
      if (!shouldFetch) return

      // Clear previous debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      // Debounce search requests
      debounceTimerRef.current = setTimeout(() => {
        setOffset(0)
        fetchData(term, 0, false)
      }, 300)
    },
    [fetchData, shouldFetch]
  )

  // Load more handler for pagination
  const loadMore = useCallback(() => {
    if (!shouldFetch || isLoading || !hasMore) return

    const newOffset = offset + limit
    setOffset(newOffset)
    fetchData(searchTerm, newOffset, true)
  }, [shouldFetch, isLoading, hasMore, offset, limit, searchTerm, fetchData])

  // Refetch handler
  const refetch = useCallback(() => {
    if (!shouldFetch) return
    setOffset(0)
    fetchData(searchTerm, 0, false)
  }, [searchTerm, fetchData, shouldFetch])

  return {
    options,
    isLoading,
    error,
    search,
    loadMore,
    hasMore,
    totalCount,
    refetch
  }
}

export default useDataSource

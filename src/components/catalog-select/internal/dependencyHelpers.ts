import { toOptions } from './catalogSelectUtils'
import { buildMetaByValue } from './catalogSelectUtils'
import { CatalogSelectConfig } from '../types'

/**
 * Shared helper functions for catalog select dependencies
 * to reduce code duplication between bi-directional and uni-directional dependencies
 */

// Helper: Fetch filtered options with parent filter
export const fetchFilteredOptionsWithParent = async ({
  id,
  parentValue,
  config,
  defaultPageSize,
  setFor,
  fetchCatalogEntriesByIdentifier,
  locale,
  errorContext
}: {
  id: string
  parentValue: string
  config: CatalogSelectConfig
  defaultPageSize: number
  setFor: (id: string, updater: (prev: any) => any) => void
  fetchCatalogEntriesByIdentifier: any
  locale?: string
  errorContext: string
}) => {
  setFor(id, (prev: any) =>
    prev
      ? {
          ...prev,
          options: [],
          loading: true,
          offset: 0,
          lastFiltersSig: undefined
        }
      : prev
  )

  try {
    const res = await fetchCatalogEntriesByIdentifier(id, {
      limit: config.pageSize ?? defaultPageSize,
      offset: 0,
      parentEntryId: parentValue
    })

    const metaByValue = buildMetaByValue(res.entries)
    setFor(id, (prev: any) =>
      prev
        ? {
            ...prev,
            loading: false,
            options: toOptions(res.entries, locale),
            total: res.totalCount,
            offset: res.entries.length,
            metaByValue: { ...prev.metaByValue, ...metaByValue }
          }
        : prev
    )
  } catch (error) {
    console.error(`[${errorContext}] Failed to fetch filtered options for ${id}:`, error)
    setFor(id, (prev: any) => (prev ? { ...prev, loading: false } : prev))
  }
}

// Helper: Reset to prefetched options
export const resetToPrefetchedOptions = ({
  id,
  setFor
}: {
  id: string
  setFor: (id: string, updater: (prev: any) => any) => void
}) => {
  setFor(id, (prev: any) =>
    prev
      ? {
          ...prev,
          options: prev.prefetchedOptions || [],
          offset: (prev.prefetchedOptions || []).length,
          loading: false,
          lastFiltersSig: undefined
        }
      : prev
  )
}

// Helper: Clear child value
export const clearChildValue = ({
  id,
  setFor
}: {
  id: string
  setFor: (id: string, updater: (prev: any) => any) => void
}) => {
  setFor(id, (prev: any) => (prev ? { ...prev, value: '', search: undefined } : prev))
}

/**
 * Uni-Directional Catalog Select Dependencies
 *
 * Handles Parent → Child relationships (one-way only)
 * Example: investmentGroup → investmentType
 *
 * Rules:
 * 1. Initial Load with both values: KEEP child value, filter options
 * 2. User changes parent: CLEAR child, filter options
 * 3. User clears parent: CLEAR child, reset to prefetched options
 * 4. Child has no effect on parent (one-way only)
 */

import { useEffect, useMemo, useRef } from 'react'
import type { CatalogEntry } from '@/common/data/catalog/types/catalogTypes'
import type { CatalogSelectConfig } from './useCatalogSelect'
import { toOptions } from './catalogSelectUtils'

// Helper: Build metadata from entries
const buildMetaByValue = (entries: CatalogEntry[]): Record<string, { parentEntryId?: string; type?: string }> => {
  const meta: Record<string, { parentEntryId?: string; type?: string }> = {}
  for (const entry of entries) {
    meta[entry.id] = {
      parentEntryId: entry.parentEntryId,
      type: entry.type
    }
  }
  return meta
}

type State = {
  value: string
  loading: boolean
  options: Array<{ value: string; label: string }>
  prefetchedOptions?: Array<{ value: string; label: string }>
  total: number
  fullTotal?: number
  limit: number
  offset: number
  search?: string
  variant: 'select' | 'combobox'
  metaByValue?: Record<string, { parentEntryId?: string; type?: string }>
  lastFiltersSig?: string
  manuallyCleared?: boolean
}

export interface UseUniDirectionalDependenciesParams {
  configs: CatalogSelectConfig[]
  stateById: Record<string, State>
  setFor: (id: string, updater: (prev: State) => State) => void
  fetchCatalogEntriesByIdentifier: (
    identifier: string,
    params: {
      limit?: number
      offset?: number
      search?: string
      parentEntryId?: string
      typeEquals?: string
      entryId?: string
    }
  ) => Promise<{ entries: CatalogEntry[]; totalCount: number }>
  defaultPageSize: number
  locale?: string
}

export const useUniDirectionalDependencies = ({
  configs,
  stateById,
  setFor,
  fetchCatalogEntriesByIdentifier,
  defaultPageSize,
  locale
}: UseUniDirectionalDependenciesParams) => {
  // Track last parent values to detect changes (only for uni-directional)
  const lastParentValuesRef = useRef<Map<string, string | null>>(new Map())

  // Memoize dependency signature to prevent unnecessary effect re-runs
  const dependencySignature = useMemo(
    () =>
      configs
        .filter(c => {
          if (!c.parentField) return false
          const parentConfig = configs.find(p => p.id === c.parentField)
          return parentConfig?.childField !== c.id
        })
        .map(c => {
          const parentValue = c.parentField ? stateById[c.parentField]?.value : 'none'
          const ownValue = stateById[c.id]?.value
          return `${c.id}:${ownValue}:${parentValue}`
        })
        .join('|'),
    [configs, stateById]
  )

  useEffect(() => {
    // Filter for uni-directional configs (has parent, but parent doesn't have childField pointing back)
    const uniDirectionalConfigs = configs.filter(config => {
      if (!config.parentField) return false

      const parentConfig = configs.find(c => c.id === config.parentField)
      const isBiDirectional = parentConfig?.childField === config.id

      return !isBiDirectional // Only uni-directional
    })

    for (const config of uniDirectionalConfigs) {
      const { id, parentField } = config
      if (!parentField) continue

      const parentValue = stateById[parentField]?.value || ''
      const lastParentValue = lastParentValuesRef.current.get(id)
      const childValue = stateById[id]?.value || ''

      // Detect parent change
      if (lastParentValue !== parentValue) {
        // Update tracked value ONLY if parent has a value (don't track empty states)
        if (parentValue) {
          lastParentValuesRef.current.set(id, parentValue)
        }

        // Determine if this is initial load: first time seeing non-empty parent AND child has value
        const isInitialLoad = lastParentValue === undefined && parentValue && childValue

        if (isInitialLoad) {
          // Just filter options, keep child value
        } else if (childValue) {
          // User changed parent or parent was cleared - clear child in both cases
          setFor(id, prev => {
            if (!prev) return prev
            return { ...prev, value: '', search: undefined }
          })
        }

        // Refetch child options with new parent filter
        if (parentValue) {
          setFor(id, prev => {
            if (!prev) return prev
            return {
              ...prev,
              options: [],
              loading: true,
              offset: 0,
              lastFiltersSig: undefined
            }
          })

          fetchCatalogEntriesByIdentifier(id, {
            limit: config.pageSize ?? defaultPageSize,
            offset: 0,
            parentEntryId: parentValue
          })
            .then(res => {
              const metaByValue = buildMetaByValue(res.entries)
              setFor(id, prev => {
                if (!prev) return prev
                return {
                  ...prev,
                  loading: false,
                  options: toOptions(res.entries, locale),
                  total: res.totalCount,
                  offset: res.entries.length,
                  metaByValue: { ...prev.metaByValue, ...metaByValue }
                }
              })
            })
            .catch(error => {
              console.error(`[useUniDirectionalDependencies] Failed to fetch filtered options for ${id}:`, error)
              setFor(id, prev => {
                if (!prev) return prev
                return { ...prev, loading: false }
              })
            })
        } else {
          // Parent cleared - reset to prefetched
          setFor(id, prev => {
            if (!prev) return prev
            return {
              ...prev,
              options: prev.prefetchedOptions || [],
              offset: (prev.prefetchedOptions || []).length,
              loading: false,
              lastFiltersSig: undefined
            }
          })
        }
      }
    }
  }, [dependencySignature, setFor, fetchCatalogEntriesByIdentifier, defaultPageSize, locale])
}

export default useUniDirectionalDependencies

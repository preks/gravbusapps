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

import { useEffect, useRef } from 'react'
import type { CatalogEntry } from '@/common/data/catalog/types/catalogTypes'
import type { CatalogSelectConfig } from './useCatalogSelect'

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
}

export const useUniDirectionalDependencies = ({
  configs,
  stateById,
  setFor,
  fetchCatalogEntriesByIdentifier,
  defaultPageSize
}: UseUniDirectionalDependenciesParams) => {
  // Track last parent values to detect changes (only for uni-directional)
  const lastParentValuesRef = useRef<Map<string, string | null>>(new Map())

  useEffect(() => {
    // Filter for uni-directional configs (has parent, but parent doesn't have childField pointing back)
    const uniDirectionalConfigs = configs.filter(config => {
      if (!config.parentField) return false

      const parentConfig = configs.find(c => c.id === config.parentField)
      const isBiDirectional = parentConfig?.childField === config.id

      return !isBiDirectional // Only uni-directional
    })

    uniDirectionalConfigs.forEach(config => {
      const { id, parentField } = config
      if (!parentField) return

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
        } else if (parentValue && childValue) {
          // User changed parent - clear child
          setFor(id, prev => {
            if (!prev) return prev
            return { ...prev, value: '', search: undefined }
          })
        } else if (!parentValue && childValue) {
          // Parent was cleared - clear child too
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

          const fetchFiltered = async () => {
            try {
              const res = await fetchCatalogEntriesByIdentifier(id, {
                limit: config.pageSize ?? defaultPageSize,
                offset: 0,
                parentEntryId: parentValue
              })

              const metaByValue: Record<string, { parentEntryId?: string; type?: string }> = {}
              res.entries.forEach(entry => {
                metaByValue[entry.id] = {
                  parentEntryId: entry.parentEntryId,
                  type: entry.type
                }
              })

              setFor(id, prev => {
                if (!prev) return prev
                return {
                  ...prev,
                  loading: false,
                  options: res.entries.map(e => ({ value: e.id, label: e.value || e.id })),
                  total: res.totalCount,
                  offset: res.entries.length,
                  metaByValue: { ...(prev.metaByValue || {}), ...metaByValue }
                }
              })
            } catch {
              setFor(id, prev => {
                if (!prev) return prev
                return { ...prev, loading: false }
              })
            }
          }

          fetchFiltered()
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
    })
  }, [
    configs
      .filter(c => {
        if (!c.parentField) return false
        const parentConfig = configs.find(p => p.id === c.parentField)
        return parentConfig?.childField !== c.id // Only uni-directional
      })
      .map(c => {
        const parentValue = c.parentField ? stateById[c.parentField]?.value : 'none'
        const ownValue = stateById[c.id]?.value
        return `${c.id}:${ownValue}:${parentValue}`
      })
      .join('|')
  ])
}

export default useUniDirectionalDependencies

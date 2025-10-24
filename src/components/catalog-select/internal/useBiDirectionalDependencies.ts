/**
 * Bi-Directional Catalog Select Dependencies
 *
 * Handles Parent ↔ Child relationships (two-way)
 * Example: birthCountry ↔ birthRegion
 *
 * Rules:
 * 1. Initial Load with both values: KEEP both, filter options
 * 2. User changes parent: CLEAR child (unless child matches), filter options
 * 3. User selects child FIRST: Auto-select parent from child metadata
 * 4. User manually clears parent: Set manuallyCleared flag (prevent auto-select)
 * 5. User selects new child after manual clear: Reset flag, allow auto-select again
 */

import { useEffect, useMemo, useRef } from 'react'
import type { CatalogEntry } from '@/common/data/catalog/types/catalogTypes'
import type { CatalogSelectConfig } from './useCatalogSelect'
import { toOptions, getLocalizedValue } from './catalogSelectUtils'

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

export interface UseBiDirectionalDependenciesParams {
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

export const useBiDirectionalDependencies = ({
  configs,
  stateById,
  setFor,
  fetchCatalogEntriesByIdentifier,
  defaultPageSize,
  locale
}: UseBiDirectionalDependenciesParams) => {
  // Track parent values to detect changes
  const lastParentValuesRef = useRef<Map<string, string | null>>(new Map())
  // Track auto-selected parents to handle them specially
  const autoSelectedParentsRef = useRef<Set<string>>(new Set())

  // Memoize dependency signature to prevent unnecessary effect re-runs
  const dependencySignature = useMemo(
    () =>
      configs
        .filter(c => {
          if (!c.parentField) return false
          const parentConfig = configs.find(p => p.id === c.parentField)
          return parentConfig?.childField === c.id
        })
        .map(c => {
          const parentValue = c.parentField ? stateById[c.parentField]?.value : 'none'
          const ownValue = stateById[c.id]?.value
          const manuallyCleared = c.parentField ? stateById[c.parentField]?.manuallyCleared : false
          return `${c.id}:${ownValue}:${parentValue}:${manuallyCleared}`
        })
        .join('|'),
    [configs, stateById]
  )

  useEffect(() => {
    const autoSelectedToCleanup = new Set<string>()

    // Filter for bi-directional configs
    const biDirectionalConfigs = configs.filter(config => {
      if (!config.parentField) return false

      const parentConfig = configs.find(c => c.id === config.parentField)
      const isBiDirectional = parentConfig?.childField === config.id

      return isBiDirectional
    })

    biDirectionalConfigs.forEach(config => {
      const { id, parentField } = config
      if (!parentField) return

      const parentValue = stateById[parentField]?.value || ''
      const childValue = stateById[id]?.value || ''
      const lastParentValue = lastParentValuesRef.current.get(id)

      // PART 1: Handle parent changes (Parent → Child filtering)
      if (lastParentValue !== parentValue) {
        // Update tracked value ONLY if parent has a value (don't track empty states)
        if (parentValue) {
          lastParentValuesRef.current.set(id, parentValue)
        }

        const wasAutoSelected = autoSelectedParentsRef.current.has(parentField)
        // Check if this is initial load: first time seeing non-empty parent AND child has value
        const isInitialLoad = lastParentValue === undefined && parentValue && childValue

        if (wasAutoSelected) {
          // Parent was auto-selected by this child - don't clear child, just refetch options
          autoSelectedToCleanup.add(parentField)
        } else {
          if (isInitialLoad) {
            // Keep both, just filter options
          } else if (parentValue && childValue) {
            // Both have values but parent changed - clear child
            setFor(id, prev => {
              if (!prev) return prev
              return { ...prev, value: '', search: undefined }
            })
          } else if (!parentValue && childValue) {
            // Parent is empty but child has value
            // Check if child can auto-select parent (if so, DON'T clear - let auto-select handle it)
            const childMeta = stateById[id]?.metaByValue?.[childValue]
            const canAutoSelect = childMeta?.parentEntryId || !childMeta // Has parent OR metadata missing (will be fetched)

            if (!canAutoSelect) {
              // Parent was cleared and no auto-select possible - clear child too
              setFor(id, prev => {
                if (!prev) return prev
                return { ...prev, value: '', search: undefined }
              })
            }
          }
        }

        // Refetch child options with new parent filter (ONLY if parent actually changed, not on initial load)
        if (parentValue && !isInitialLoad) {
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
                  options: toOptions(res.entries, locale),
                  total: res.totalCount,
                  offset: res.entries.length,
                  metaByValue: { ...(prev.metaByValue || {}), ...metaByValue }
                }
              })
            } catch (error) {
              console.error(`[useBiDirectionalDependencies] Failed to fetch filtered options for ${id}:`, error)
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

      // PART 2: Handle child changes (Child → Parent auto-selection)
      const parentState = stateById[parentField]

      if (childValue && !parentValue && !parentState?.manuallyCleared) {
        const childMeta = stateById[id]?.metaByValue?.[childValue]

        if (childMeta?.parentEntryId) {
          autoSelectedParentsRef.current.add(parentField)
          setFor(parentField, prev => {
            if (!prev) return prev
            return {
              ...prev,
              value: childMeta.parentEntryId || '',
              manuallyCleared: false
            }
          })

          // Ensure parent has the option
          const parentHasOption = stateById[parentField]?.options?.some(opt => opt.value === childMeta.parentEntryId)
          if (!parentHasOption) {
            const fetchParentOption = async () => {
              try {
                const res = await fetchCatalogEntriesByIdentifier(parentField, {
                  limit: 1,
                  offset: 0,
                  entryId: childMeta.parentEntryId!
                })

                if (res.entries.length > 0) {
                  const parentOption = { value: res.entries[0].id, label: getLocalizedValue(res.entries[0], locale) }
                  setFor(parentField, prev => {
                    if (!prev) return prev
                    // Avoid duplicates
                    const optionExists = prev.options.some(opt => opt.value === parentOption.value)
                    return {
                      ...prev,
                      options: optionExists ? prev.options : [...prev.options, parentOption]
                    }
                  })
                }
              } catch (error) {
                console.error(`[useBiDirectionalDependencies] Failed to fetch parent option for ${parentField}:`, error)
              }
            }
            fetchParentOption()
          }
        }
      }

      // Reset manuallyCleared when user actively selects child
      if (childValue && parentState?.manuallyCleared) {
        setFor(parentField, prev => {
          if (!prev) return prev
          return { ...prev, manuallyCleared: false }
        })
      }
    })

    // Cleanup auto-selected parents
    autoSelectedToCleanup.forEach(parentId => {
      autoSelectedParentsRef.current.delete(parentId)
    })
  }, [dependencySignature, setFor, fetchCatalogEntriesByIdentifier, defaultPageSize, locale])
}

export default useBiDirectionalDependencies

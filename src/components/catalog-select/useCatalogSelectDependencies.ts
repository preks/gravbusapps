import { useEffect, useRef } from 'react'
import type { CatalogEntry } from '@/common/data/catalog/types/catalogTypes'
import type { CatalogSelectConfig } from './useCatalogSelect'

type State = {
  value: string | null
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
  fetchedByEntryId?: Record<string, boolean>
  inFlightByEntryId?: Record<string, boolean>
  lastParentValue?: string | null
  manuallyCleared?: boolean
}

export interface UseCatalogSelectDependenciesParams {
  configs: CatalogSelectConfig[]
  stateById: Record<string, State>
  setFor: (id: string, updater: (prev: State) => State) => void
  getActiveFilters: (id: string) => any
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
  externalValues?: Record<string, string | null>
}

/**
 * Simplified catalog select dependencies hook.
 *
 * Rules:
 * 1. When parent changes, clear child immediately and refetch child options
 * 2. When child gets a value in bi-directional mode, auto-select parent
 * 3. Track manual clears to prevent auto-selection loops
 */
export const useCatalogSelectDependencies = ({
  configs,
  stateById,
  setFor,
  fetchCatalogEntriesByIdentifier,
  defaultPageSize,
  externalValues
}: UseCatalogSelectDependenciesParams) => {
  // Track last parent values to detect changes
  const lastParentValuesRef = useRef<Map<string, string | null>>(new Map())
  // Track auto-selections to prevent immediate clearing
  const autoSelectedParentsRef = useRef<Set<string>>(new Set())
  // Track recently cleared children to prevent immediate bi-directional re-selection
  const recentlyClearedChildrenRef = useRef<Set<string>>(new Set())

  // Single unified effect for all dependency logic
  useEffect(() => {
    configs.forEach(config => {
      const { id, parentConfigId: parentId, externalEqualsFilters } = config

      // Handle external filter dependencies (e.g., pipelineType filtering pipelineStage)
      if (externalEqualsFilters) {
        externalEqualsFilters.forEach(filter => {
          const externalValue = externalValues?.[filter.externalKey] || null
          const lastExternalValue = lastParentValuesRef.current.get(`${id}_external_${filter.externalKey}`)
          if (lastExternalValue !== externalValue) {
            lastParentValuesRef.current.set(`${id}_external_${filter.externalKey}`, externalValue)

            // Clear child when external filter changes
            const childState = stateById[id]
            if (childState?.value !== null) {
              setFor(id, prev => ({ ...prev, value: null, search: undefined }))
            }

            // Refetch with new external filter
            if (externalValue) {
              setFor(id, prev => ({
                ...prev,
                options: [],
                loading: true,
                offset: 0,
                lastFiltersSig: undefined
              }))

              const fetchWithExternalFilter = async () => {
                try {
                  const res = await fetchCatalogEntriesByIdentifier(id, {
                    limit: config.pageSize ?? defaultPageSize,
                    offset: 0,
                    [filter.field === 'type' ? 'typeEquals' : filter.field]: externalValue
                  })

                  setFor(id, prev => ({
                    ...prev,
                    loading: false,
                    options: res.entries.map(e => ({ value: e.id, label: e.value || e.id })),
                    total: res.totalCount,
                    offset: res.entries.length
                  }))
                } catch (error) {
                  console.error(`[CatalogSelectDeps] Error fetching options with external filter:`, error)
                  setFor(id, prev => ({ ...prev, loading: false }))
                }
              }

              fetchWithExternalFilter()
            } else {
              // External filter cleared, reset to prefetched options
              setFor(id, prev => ({
                ...prev,
                options: prev.prefetchedOptions || [],
                offset: (prev.prefetchedOptions || []).length,
                loading: false,
                lastFiltersSig: undefined
              }))
            }
          }
        })

        // Note: External filter enabling/disabling is handled by the main hook's disabled logic
      }

      // Handle parent-child dependencies
      if (parentId) {
        const parentValue = stateById[parentId]?.value || null
        const lastParentValue = lastParentValuesRef.current.get(id)

        // Check if parent changed
        if (lastParentValue !== parentValue) {
          // Update tracked parent value
          lastParentValuesRef.current.set(id, parentValue)

          // Check if this parent was auto-selected by this child
          const wasAutoSelected = autoSelectedParentsRef.current.has(parentId)

          if (wasAutoSelected) {
            // Remove from auto-selected set and don't clear child, don't refetch (avoid flashing)
            autoSelectedParentsRef.current.delete(parentId)
          } else {
            // Normal parent change - clear child value and refetch
            const childState = stateById[id]
            if (childState?.value !== null) {
              // Track that this child was recently cleared to prevent bi-directional re-selection
              recentlyClearedChildrenRef.current.add(id)
              setFor(id, prev => ({ ...prev, value: null, search: undefined }))
            }

            // Refetch child options with new parent filter
            if (parentValue) {
              setFor(id, prev => ({
                ...prev,
                options: [],
                loading: true,
                offset: 0,
                lastFiltersSig: undefined
              }))

              // Actually fetch the filtered options
              const fetchFiltered = async () => {
                try {
                  const res = await fetchCatalogEntriesByIdentifier(id, {
                    limit: config.pageSize ?? defaultPageSize,
                    offset: 0,
                    parentEntryId: parentValue
                  })

                  // Build metadata for the fetched entries
                  const metaByValue: Record<string, { parentEntryId?: string; type?: string }> = {}
                  res.entries.forEach(entry => {
                    metaByValue[entry.id] = {
                      parentEntryId: entry.parentEntryId,
                      type: entry.type
                    }
                  })

                  setFor(id, prev => ({
                    ...prev,
                    loading: false,
                    options: res.entries.map(e => ({ value: e.id, label: e.value || e.id })),
                    total: res.totalCount,
                    offset: res.entries.length,
                    metaByValue: { ...(prev.metaByValue || {}), ...metaByValue }
                  }))
                } catch (error) {
                  console.error(`[CatalogSelectDeps] Error fetching options for ${id}:`, error)
                  setFor(id, prev => ({ ...prev, loading: false }))
                }
              }

              fetchFiltered()
            } else {
              // Parent was cleared, reset to prefetched options
              setFor(id, prev => ({
                ...prev,
                options: prev.prefetchedOptions || [],
                offset: (prev.prefetchedOptions || []).length,
                loading: false,
                lastFiltersSig: undefined
              }))
            }
          }
        }
      }

      // Handle bi-directional auto-selection
      // Logic: When a child config (has parentConfigId) gets a value, auto-select its parent
      // But only if the parent config has childConfigId pointing back to this child (bi-directional)
      //
      // Example: birthRegion (parentConfigId: "birthCountry") selects "US_AL"
      //          -> auto-select birthCountry (childConfigId: "birthRegion") with "US"
      if (parentId) {
        const parentConfig = configs.find(c => c.id === parentId)
        const isBiDirectional = parentConfig?.childConfigId === id
        const childValue = stateById[id]?.value
        const parentValue = stateById[parentId]?.value
        const parentState = stateById[parentId]

        // Only proceed with bi-directional auto-selection if parent config has childConfigId pointing to this child
        if (isBiDirectional) {
          // Check if the parent just changed (was cleared or changed)
          const parentJustChanged = lastParentValuesRef.current.get(id) !== parentValue

          // Reset manuallyCleared flag when user actively selects a child (allowing auto-selection)
          if (childValue && parentState?.manuallyCleared) {
            setFor(parentId, prev => ({ ...prev, manuallyCleared: false }))
          }

          // If child has value but parent doesn't, auto-select parent
          // BUT NOT if:
          // 1. Parent was manually cleared (manuallyCleared flag is true), OR
          // 2. Parent just changed in this effect run (avoid race conditions), OR
          // 3. This child was recently cleared due to parent change
          const wasRecentlyCleared = recentlyClearedChildrenRef.current.has(id)
          if (
            childValue &&
            !parentValue &&
            !parentState?.manuallyCleared &&
            !parentJustChanged &&
            !wasRecentlyCleared
          ) {
            const childMeta = stateById[id]?.metaByValue?.[childValue]

            if (childMeta?.parentEntryId) {
              const targetParentId = childMeta.parentEntryId
              // Mark parent as auto-selected to prevent child clearing
              autoSelectedParentsRef.current.add(parentId)
              setFor(parentId, prev => ({
                ...prev,
                value: targetParentId,
                // Reset manuallyCleared flag when auto-selecting
                manuallyCleared: false
              }))

              // Ensure parent has the option available for display
              const parentHasOption = stateById[parentId]?.options?.some(opt => opt.value === targetParentId)
              if (!parentHasOption) {
                const fetchParentOption = async () => {
                  try {
                    const res = await fetchCatalogEntriesByIdentifier(parentId, {
                      limit: 1,
                      offset: 0,
                      entryId: targetParentId
                    })

                    if (res.entries.length > 0) {
                      const parentOption = {
                        value: res.entries[0].id,
                        label: res.entries[0].value || res.entries[0].id
                      }
                      setFor(parentId, prev => ({
                        ...prev,
                        options: [...prev.options, parentOption]
                      }))
                    }
                  } catch (error) {
                    console.error(`[CatalogSelectDeps] Error fetching parent option:`, error)
                  }
                }

                fetchParentOption()
              }
            } else if (!childMeta) {
              // Metadata missing - fetch it
              const fetchMeta = async () => {
                try {
                  const res = await fetchCatalogEntriesByIdentifier(id, {
                    limit: 1,
                    offset: 0,
                    entryId: childValue
                  })

                  if (res.entries.length > 0) {
                    const entry = res.entries[0]
                    const newMeta = { parentEntryId: entry.parentEntryId, type: entry.type }

                    setFor(id, prev => ({
                      ...prev,
                      metaByValue: { ...(prev.metaByValue || {}), [childValue]: newMeta }
                    }))

                    // Now auto-select parent if we got the parentEntryId
                    if (entry.parentEntryId) {
                      // Mark parent as auto-selected to prevent child clearing
                      autoSelectedParentsRef.current.add(parentId)
                      setFor(parentId, prev => ({
                        ...prev,
                        value: entry.parentEntryId || null,
                        // Reset manuallyCleared flag when auto-selecting
                        manuallyCleared: false
                      }))

                      // Ensure parent has the option available for display
                      const parentHasOption = stateById[parentId]?.options?.some(
                        opt => opt.value === entry.parentEntryId
                      )
                      if (!parentHasOption && entry.parentEntryId) {
                        const fetchParentOption = async () => {
                          try {
                            const res = await fetchCatalogEntriesByIdentifier(parentId, {
                              limit: 1,
                              offset: 0,
                              entryId: entry.parentEntryId!
                            })

                            if (res.entries.length > 0) {
                              const parentOption = {
                                value: res.entries[0].id,
                                label: res.entries[0].value || res.entries[0].id
                              }
                              setFor(parentId, prev => ({
                                ...prev,
                                options: [...prev.options, parentOption]
                              }))
                            }
                          } catch (error) {
                            console.error(`[CatalogSelectDeps] Error fetching parent option:`, error)
                          }
                        }

                        fetchParentOption()
                      }
                    }
                  }
                } catch (error) {
                  console.error(`[CatalogSelectDeps] Error fetching metadata for ${id}:`, error)
                }
              }

              fetchMeta()
            }
          }
        } // Close isBiDirectional block
      }
    })

    // Clear recently cleared children set at the end of effect
    recentlyClearedChildrenRef.current.clear()
  }, [
    configs
      .map(c => {
        const parentValue = c.parentConfigId ? stateById[c.parentConfigId]?.value : 'none'
        const ownValue = stateById[c.id]?.value
        const manuallyCleared = c.parentConfigId ? stateById[c.parentConfigId]?.manuallyCleared : false

        // Include external values in dependency tracking
        const externalDeps =
          c.externalEqualsFilters
            ?.map(filter => `${filter.externalKey}:${externalValues?.[filter.externalKey] || 'null'}`)
            .join(',') || 'none'

        return `${c.id}:${ownValue}:${parentValue}:${manuallyCleared}:${externalDeps}`
      })
      .join('|')
  ])
}

export default useCatalogSelectDependencies

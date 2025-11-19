/**
 * Unified Catalog Select Dependencies
 *
 * Handles all dependency types with clear case-based logic:
 * - Bi-Directional: Parent ↔ Child (e.g., Country ↔ Region)
 * - Uni-Directional: Parent → Child (e.g., InvestmentGroup → InvestmentType)
 * - External Filters: External form field → Catalog (e.g., PipelineType → PipelineStage)
 *
 * Key improvements:
 * - Clear case definitions with switch-case structure
 * - Proper handling of bi-directional child selection (child not cleared)
 * - Single source of truth for parent values: externalValues (form) → stateById (internal)
 */

import { useEffect, useMemo, useRef } from 'react'
import type { CatalogEntry } from '@/common/data/catalog/types/catalogTypes'
import type { CatalogSelectConfig, CatalogSelectOption } from './useCatalogSelect'
import { toOptions, buildEntryMeta, getLocalizedValue, buildFiltersSignature } from './catalogSelectUtils'

type State = {
  value: string
  loading: boolean
  options: CatalogSelectOption[]
  prefetchedOptions?: CatalogSelectOption[]
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

export interface UseCatalogDependenciesParams {
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
  externalValues?: Record<string, string | null>
  locale?: string
}

// Helper: Get parent value from externalValues (form) or stateById (internal)
const getParentValue = (
  parentField: string,
  externalValues?: Record<string, string | null>,
  stateById?: Record<string, State>
): string => {
  return externalValues?.[parentField] || stateById?.[parentField]?.value || ''
}

// Helper: Fetch filtered options with parent filter
const fetchFilteredOptionsWithParent = async ({
  id,
  parentValue,
  config,
  defaultPageSize,
  setFor,
  fetchCatalogEntriesByIdentifier,
  locale
}: {
  id: string
  parentValue: string
  config: CatalogSelectConfig
  defaultPageSize: number
  setFor: (id: string, updater: (prev: State) => State) => void
  fetchCatalogEntriesByIdentifier: any
  locale?: string
}) => {
  const filtersSig = buildFiltersSignature({ parentEntryId: parentValue })

  setFor(id, prev =>
    prev
      ? {
          ...prev,
          options: [],
          loading: true,
          offset: 0,
          lastFiltersSig: filtersSig
        }
      : prev
  )

  try {
    const res = await fetchCatalogEntriesByIdentifier(id, {
      limit: config.pageSize ?? defaultPageSize,
      offset: 0,
      parentEntryId: parentValue
    })

    const metaByValue = buildEntryMeta(res.entries)

    setFor(id, prev =>
      prev
        ? {
            ...prev,
            loading: false,
            options: toOptions(res.entries, locale),
            total: res.totalCount,
            offset: res.entries.length,
            metaByValue: { ...prev.metaByValue, ...metaByValue },
            lastFiltersSig: filtersSig
          }
        : prev
    )
  } catch (error) {
    console.error(`[useCatalogDependencies] Failed to fetch filtered options for ${id}:`, error)
    setFor(id, prev => (prev ? { ...prev, loading: false, lastFiltersSig: filtersSig } : prev))
  }
}

// Helper: Reset to prefetched options
const resetToPrefetchedOptions = ({
  id,
  setFor
}: {
  id: string
  setFor: (id: string, updater: (prev: State) => State) => void
}) => {
  setFor(id, prev =>
    prev
      ? {
          ...prev,
          options: prev.prefetchedOptions || [],
          offset: (prev.prefetchedOptions || []).length,
          loading: false,
          lastFiltersSig: undefined,
          // FIX: Setze total und fullTotal zurück, damit Options angezeigt werden
          total: prev.fullTotal ?? prev.total ?? 0,
          fullTotal: prev.fullTotal ?? prev.total ?? 0
        }
      : prev
  )
}

// Helper: Clear child value
const clearChildValue = ({
  id,
  setFor
}: {
  id: string
  setFor: (id: string, updater: (prev: State) => State) => void
}) => {
  setFor(id, prev => (prev ? { ...prev, value: '', search: undefined } : prev))
}

// Case definitions for parent-child dependencies
type DependencyCase =
  | 'initial-load' // Both values exist on initial load
  | 'parent-selected' // User manually selected parent
  | 'child-selected-bi' // User selected child in bi-directional (auto-select parent, keep child)
  | 'child-selected-uni' // User selected child in uni-directional (no parent change)
  | 'parent-cleared' // User cleared parent
  | 'child-cleared' // User cleared child
  | 'no-change' // No relevant change detected

// Helper: Determine the current case/scenario
const determineCase = (
  parentValue: string,
  childValue: string,
  lastParentValue: string | undefined,
  lastChildValue: string | undefined,
  isBiDirectional: boolean,
  wasAutoSelected: boolean
): DependencyCase => {
  // Case 1: Initial Load - both values exist
  if (lastParentValue === undefined && parentValue && childValue) {
    return 'initial-load'
  }

  // Case 2: Parent was manually selected (changed from empty or different value, not auto-selected)
  if (lastParentValue !== parentValue && parentValue && !wasAutoSelected) {
    return 'parent-selected'
  }

  // Case 3: Child was selected in bi-directional relationship (parent empty, child changed)
  // FIX: Prüfe !lastParentValue statt === undefined, da lastParentValue auch "" sein kann
  const isChildSelectedBi =
    isBiDirectional && childValue && lastChildValue !== childValue && !parentValue && !lastParentValue
  if (isChildSelectedBi) {
    return 'child-selected-bi'
  }

  // Case 4: Child was selected in uni-directional relationship
  if (!isBiDirectional && childValue && lastChildValue !== childValue) {
    return 'child-selected-uni'
  }

  // Case 5: Parent was cleared
  if (lastParentValue && !parentValue) {
    return 'parent-cleared'
  }

  // Case 6: Child was cleared
  if (lastChildValue && !childValue) {
    return 'child-cleared'
  }

  return 'no-change'
}

export const useCatalogDependencies = ({
  configs,
  stateById,
  setFor,
  fetchCatalogEntriesByIdentifier,
  defaultPageSize,
  externalValues,
  locale
}: UseCatalogDependenciesParams) => {
  // Track last parent values to detect changes
  const lastParentValuesRef = useRef<Map<string, string>>(new Map())
  // Track last child values to detect child changes
  const lastChildValuesRef = useRef<Map<string, string>>(new Map())
  // Track auto-selected parents for bi-directional relationships
  const autoSelectedParentsRef = useRef<Set<string>>(new Set())

  // Sync parent values from externalValues (form) to stateById (internal)
  useEffect(() => {
    if (!externalValues) return

    for (const cfg of configs) {
      if (!cfg.parentField) continue

      const parentValueFromForm = externalValues[cfg.parentField] || ''
      const parentValueInState = stateById[cfg.parentField]?.value || ''

      // Update state if form value exists and differs from state
      if (parentValueFromForm && parentValueFromForm !== parentValueInState) {
        const parentConfig = configs.find(c => c.id === cfg.parentField)
        if (!stateById[cfg.parentField]) {
          setFor(cfg.parentField, () => ({
            value: parentValueFromForm,
            loading: false,
            options: [],
            total: 0,
            limit: parentConfig?.pageSize ?? defaultPageSize,
            offset: 0,
            variant: 'combobox'
          }))
        } else {
          setFor(cfg.parentField, prev => (prev ? { ...prev, value: parentValueFromForm } : prev))
        }
      }

      // FIX: Wenn Parent-Wert existiert, aber Child-State noch nicht initialisiert ist,
      // trigger sofort eine Fetch für Child-Options (z.B. beim Accordion-Wechsel oder Account-Öffnen)
      const childConfigs = configs.filter(c => c.parentField === cfg.parentField)
      for (const childConfig of childConfigs) {
        const childState = stateById[childConfig.id]
        const effectiveParentValue = parentValueFromForm || parentValueInState

        if (!effectiveParentValue) continue

        // Prüfe ob bereits ein Fetch mit diesem Parent-Wert durchgeführt wurde
        const expectedFiltersSig = buildFiltersSignature({ parentEntryId: effectiveParentValue })
        const hasAlreadyFetched = childState?.lastFiltersSig === expectedFiltersSig

        // Nur fetchen wenn:
        // 1. Child-State existiert nicht ODER
        // 2. Child-State existiert, ist nicht loading, hat keine Options, total ist 0, und noch kein Fetch mit diesem Parent durchgeführt
        if (
          !childState ||
          (!childState.loading && childState.options.length === 0 && childState.total === 0 && !hasAlreadyFetched)
        ) {
          // Trigger fetch for child options immediately
          fetchFilteredOptionsWithParent({
            id: childConfig.id,
            parentValue: effectiveParentValue,
            config: childConfig,
            defaultPageSize,
            setFor,
            fetchCatalogEntriesByIdentifier,
            locale
          })
        }
      }
    }
  }, [configs, externalValues, stateById, setFor, defaultPageSize, fetchCatalogEntriesByIdentifier, locale])

  // Unified dependency signature for all dependency types
  const dependencySignature = useMemo(
    () =>
      configs
        .filter(c => c.parentField || c.filterField)
        .map(c => {
          const parentValue = c.parentField ? getParentValue(c.parentField, externalValues, stateById) : 'none'
          const ownValue = stateById[c.id]?.value || ''
          const manuallyCleared = c.parentField ? stateById[c.parentField]?.manuallyCleared : false
          const externalFilterValues =
            c.filterField?.map(f => `${f.from}:${externalValues?.[f.from] || 'null'}`).join(',') || 'none'
          return `${c.id}:${ownValue}:${parentValue}:${manuallyCleared}:${externalFilterValues}`
        })
        .join('|'),
    [configs, externalValues, stateById]
  )

  // Unified dependency handling with case-based logic
  useEffect(() => {
    const autoSelectedToCleanup = new Set<string>()

    for (const config of configs) {
      const { id, parentField, filterField } = config
      if (!parentField && !filterField) continue

      // Handle parent-child dependencies
      if (parentField) {
        const parentConfig = configs.find(c => c.id === parentField)
        const isBiDirectional = parentConfig?.childField === id
        const parentValue = getParentValue(parentField, externalValues, stateById)
        const childValue = stateById[id]?.value || ''
        const lastParentValue = lastParentValuesRef.current.get(id)
        const lastChildValue = lastChildValuesRef.current.get(id)
        const parentState = stateById[parentField]
        const wasAutoSelected = autoSelectedParentsRef.current.has(parentField)

        // Determine the current case
        const currentCase = determineCase(
          parentValue,
          childValue,
          lastParentValue,
          lastChildValue,
          isBiDirectional,
          wasAutoSelected
        )

        // Handle case with switch statement
        switch (currentCase) {
          case 'initial-load': {
            // Case 1: Initial Load - keep both values, filter child options
            if (parentValue) {
              fetchFilteredOptionsWithParent({
                id,
                parentValue,
                config,
                defaultPageSize,
                setFor,
                fetchCatalogEntriesByIdentifier,
                locale
              })
            }
            // Update tracking
            if (parentValue) lastParentValuesRef.current.set(id, parentValue)
            if (childValue) lastChildValuesRef.current.set(id, childValue)
            break
          }

          case 'parent-selected': {
            // Case 2: User manually selected parent - clear child if needed, filter options
            const childMeta = childValue ? stateById[id]?.metaByValue?.[childValue] : undefined
            const shouldKeepChild = isBiDirectional && childMeta?.parentEntryId === parentValue

            if (childValue && !shouldKeepChild) {
              clearChildValue({ id, setFor })
            }

            // Refetch child options with new parent filter
            if (parentValue) {
              fetchFilteredOptionsWithParent({
                id,
                parentValue,
                config,
                defaultPageSize,
                setFor,
                fetchCatalogEntriesByIdentifier,
                locale
              })
            }

            // Update tracking
            lastParentValuesRef.current.set(id, parentValue)
            if (childValue && !shouldKeepChild) {
              lastChildValuesRef.current.set(id, '')
            }
            break
          }

          case 'child-selected-bi': {
            // Case 3: User selected child in bi-directional - auto-select parent, KEEP child, filter options
            const childState = stateById[id]
            const childMeta = childState?.metaByValue?.[childValue]

            // FIX: Wenn metaByValue fehlt, fetche den Child-Wert, um parentEntryId zu bekommen
            if (!childMeta && childValue) {
              fetchCatalogEntriesByIdentifier(id, {
                limit: 1,
                offset: 0,
                entryId: childValue
              })
                .then(res => {
                  if (res.entries.length > 0) {
                    const entry = res.entries[0]
                    const meta = { parentEntryId: entry.parentEntryId, type: entry.type }

                    // Update metaByValue
                    setFor(id, prev => {
                      if (!prev) return prev
                      return {
                        ...prev,
                        metaByValue: { ...prev.metaByValue, [entry.id]: meta }
                      }
                    })

                    // Jetzt Parent setzen
                    if (meta.parentEntryId) {
                      autoSelectedParentsRef.current.add(parentField)
                      setFor(parentField, prev =>
                        prev
                          ? {
                              ...prev,
                              value: meta.parentEntryId || '',
                              manuallyCleared: false
                            }
                          : prev
                      )

                      // Ensure parent has the option
                      const parentState = stateById[parentField]
                      const parentHasOption = parentState?.options?.some(opt => opt.value === meta.parentEntryId)
                      if (!parentHasOption && meta.parentEntryId) {
                        fetchCatalogEntriesByIdentifier(parentField, {
                          limit: 1,
                          offset: 0,
                          entryId: meta.parentEntryId
                        })
                          .then(res => {
                            if (res.entries.length > 0) {
                              const parentOption = {
                                value: res.entries[0].id,
                                label: getLocalizedValue(res.entries[0], locale)
                              }
                              setFor(parentField, prev => {
                                if (!prev) return prev
                                const optionExists = prev.options.some(opt => opt.value === parentOption.value)
                                return {
                                  ...prev,
                                  options: optionExists ? prev.options : [...prev.options, parentOption]
                                }
                              })
                            }
                          })
                          .catch(error => {
                            console.error(
                              `[useCatalogDependencies] Failed to fetch parent option for ${parentField}:`,
                              error
                            )
                          })
                      }

                      // After auto-selecting parent, filter child options (but KEEP child value)
                      fetchFilteredOptionsWithParent({
                        id,
                        parentValue: meta.parentEntryId,
                        config,
                        defaultPageSize,
                        setFor,
                        fetchCatalogEntriesByIdentifier,
                        locale
                      })
                    }
                  }
                })
                .catch(error => {
                  console.error(`[useCatalogDependencies] Failed to fetch child entry for ${id}:`, error)
                })
            } else if (childMeta?.parentEntryId) {
              autoSelectedParentsRef.current.add(parentField)

              setFor(parentField, prev =>
                prev
                  ? {
                      ...prev,
                      value: childMeta.parentEntryId || '',
                      manuallyCleared: false
                    }
                  : prev
              )

              // Ensure parent has the option
              const parentHasOption = stateById[parentField]?.options?.some(
                opt => opt.value === childMeta.parentEntryId
              )
              if (!parentHasOption && childMeta.parentEntryId) {
                fetchCatalogEntriesByIdentifier(parentField, {
                  limit: 1,
                  offset: 0,
                  entryId: childMeta.parentEntryId
                })
                  .then(res => {
                    if (res.entries.length > 0) {
                      const parentOption = {
                        value: res.entries[0].id,
                        label: getLocalizedValue(res.entries[0], locale)
                      }
                      setFor(parentField, prev => {
                        if (!prev) return prev
                        const optionExists = prev.options.some(opt => opt.value === parentOption.value)
                        return {
                          ...prev,
                          options: optionExists ? prev.options : [...prev.options, parentOption]
                        }
                      })
                    }
                  })
                  .catch(error => {
                    console.error(`[useCatalogDependencies] Failed to fetch parent option for ${parentField}:`, error)
                  })
              }

              // After auto-selecting parent, filter child options (but KEEP child value)
              fetchFilteredOptionsWithParent({
                id,
                parentValue: childMeta.parentEntryId,
                config,
                defaultPageSize,
                setFor,
                fetchCatalogEntriesByIdentifier,
                locale
              })
            }

            // Update tracking - IMPORTANT: Track child first, then parent will be tracked in next cycle
            lastChildValuesRef.current.set(id, childValue)
            break
          }

          case 'child-selected-uni': {
            // Case 4: User selected child in uni-directional - no parent change needed
            // Just update tracking
            lastChildValuesRef.current.set(id, childValue)
            break
          }

          case 'parent-cleared': {
            // Case 5: User cleared parent - clear child if invalid, reset options
            if (childValue) {
              const childMeta = stateById[id]?.metaByValue?.[childValue]
              if (childMeta?.parentEntryId) {
                clearChildValue({ id, setFor })
                lastChildValuesRef.current.set(id, '')
              }
            }

            const childState = stateById[id]
            // FIX: Wenn prefetchedOptions leer ist, fetche ungefilterte Options
            if (!childState?.prefetchedOptions || childState.prefetchedOptions.length === 0) {
              // Fetche ungefilterte Options
              setFor(id, prev =>
                prev ? { ...prev, loading: true, options: [], offset: 0, lastFiltersSig: undefined } : prev
              )
              fetchCatalogEntriesByIdentifier(id, {
                limit: config.pageSize ?? defaultPageSize,
                offset: 0
              })
                .then(res => {
                  const options = toOptions(res.entries, locale)
                  setFor(id, prev =>
                    prev
                      ? {
                          ...prev,
                          loading: false,
                          options,
                          prefetchedOptions: options,
                          total: res.totalCount,
                          fullTotal: res.totalCount,
                          offset: options.length,
                          lastFiltersSig: undefined
                        }
                      : prev
                  )
                })
                .catch(() => {
                  setFor(id, prev => (prev ? { ...prev, loading: false } : prev))
                })
            } else {
              // Verwende vorhandene prefetchedOptions
              resetToPrefetchedOptions({ id, setFor })
            }

            lastParentValuesRef.current.set(id, '')
            break
          }

          case 'child-cleared': {
            // Case 6: User cleared child - just update tracking
            lastChildValuesRef.current.set(id, '')
            // Reset manuallyCleared flag if parent was auto-selected
            if (isBiDirectional && wasAutoSelected) {
              // Parent was auto-selected, might want to clear it too
              // But for now, just reset the flag
              setFor(parentField, prev => (prev ? { ...prev, manuallyCleared: false } : prev))
            }
            break
          }

          case 'no-change': {
            // No action needed, but update tracking if values exist
            if (parentValue) lastParentValuesRef.current.set(id, parentValue)
            if (childValue) lastChildValuesRef.current.set(id, childValue)
            break
          }
        }

        // Handle auto-selected parent cleanup (after parent was set by child selection)
        if (wasAutoSelected && parentValue) {
          // Check if this was the auto-selection cycle - if so, mark for cleanup
          const currentParentValue = getParentValue(parentField, externalValues, stateById)
          if (currentParentValue === parentValue) {
            // Parent is set, now we can clean up the flag in next cycle
            autoSelectedToCleanup.add(parentField)
          }
        }

        // Reset manuallyCleared when user actively selects child (after auto-selection)
        if (childValue && parentState?.manuallyCleared && !wasAutoSelected) {
          setFor(parentField, prev => (prev ? { ...prev, manuallyCleared: false } : prev))
        }
      }

      // Handle external filter dependencies
      if (filterField) {
        for (const filter of filterField) {
          const externalValue = externalValues?.[filter.from] || null
          const lastExternalValue = lastExternalValuesRef.current.get(`${id}_${filter.from}`)

          if (lastExternalValue !== externalValue) {
            lastExternalValuesRef.current.set(`${id}_${filter.from}`, externalValue)

            // Clear child when external filter changes
            const childState = stateById[id]
            if (childState?.value !== '') {
              clearChildValue({ id, setFor })
            }

            // Refetch with new external filter
            if (externalValue) {
              setFor(id, prev =>
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

              fetchCatalogEntriesByIdentifier(id, {
                limit: config.pageSize ?? defaultPageSize,
                offset: 0,
                [filter.on === 'type' ? 'typeEquals' : filter.on]: externalValue
              })
                .then(res => {
                  setFor(id, prev =>
                    prev
                      ? {
                          ...prev,
                          loading: false,
                          options: toOptions(res.entries, locale),
                          total: res.totalCount,
                          offset: res.entries.length
                        }
                      : prev
                  )
                })
                .catch(() => {
                  setFor(id, prev => (prev ? { ...prev, loading: false } : prev))
                })
            } else {
              // External filter cleared - reset to prefetched
              resetToPrefetchedOptions({ id, setFor })
            }
          }
        }
      }
    }

    // Cleanup auto-selected parents
    for (const parentId of autoSelectedToCleanup) {
      autoSelectedParentsRef.current.delete(parentId)
    }
  }, [
    dependencySignature,
    configs,
    stateById,
    externalValues,
    setFor,
    fetchCatalogEntriesByIdentifier,
    defaultPageSize,
    locale
  ])
}

export default useCatalogDependencies

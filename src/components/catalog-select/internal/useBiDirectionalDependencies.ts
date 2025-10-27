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

// Helper: Handle parent value changes and child clearing logic
const handleParentChange = ({
  config,
  id,
  parentField,
  parentValue,
  childValue,
  lastParentValue,
  wasAutoSelected,
  autoSelectedToCleanup,
  stateById,
  setFor,
  fetchCatalogEntriesByIdentifier,
  defaultPageSize,
  locale
}: any) => {
  const isInitialLoad = lastParentValue === undefined && parentValue && childValue

  if (wasAutoSelected) {
    autoSelectedToCleanup.add(parentField)
    return
  }

  if (isInitialLoad) {
    return // Keep both, just filter options
  }

  if (parentValue && childValue) {
    // Both have values but parent changed - clear child
    setFor(id, (prev: any) => (prev ? { ...prev, value: '', search: undefined } : prev))
  } else if (!parentValue && childValue) {
    // Parent is empty but child has value
    const childMeta = stateById[id]?.metaByValue?.[childValue]
    const canAutoSelect = childMeta?.parentEntryId || !childMeta

    if (!canAutoSelect) {
      setFor(id, (prev: any) => (prev ? { ...prev, value: '', search: undefined } : prev))
    }
  }

  // Refetch child options with new parent filter
  if (parentValue && !isInitialLoad) {
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

    fetchCatalogEntriesByIdentifier(id, {
      limit: config.pageSize ?? defaultPageSize,
      offset: 0,
      parentEntryId: parentValue
    })
      .then((res: any) => {
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
      })
      .catch((error: any) => {
        console.error(`[useBiDirectionalDependencies] Failed to fetch filtered options for ${id}:`, error)
        setFor(id, (prev: any) => (prev ? { ...prev, loading: false } : prev))
      })
  } else if (!parentValue) {
    // Parent cleared - reset to prefetched
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
}

// Helper: Handle child-to-parent auto-selection
const handleChildToParentAutoSelection = ({
  id,
  parentField,
  childValue,
  parentValue,
  parentState,
  stateById,
  setFor,
  fetchCatalogEntriesByIdentifier,
  autoSelectedParentsRef,
  locale
}: any) => {
  if (!childValue || parentValue || parentState?.manuallyCleared) return

  const childMeta = stateById[id]?.metaByValue?.[childValue]
  if (!childMeta?.parentEntryId) return

  autoSelectedParentsRef.current.add(parentField)
  setFor(parentField, (prev: any) =>
    prev
      ? {
          ...prev,
          value: childMeta.parentEntryId || '',
          manuallyCleared: false
        }
      : prev
  )

  // Ensure parent has the option
  const parentHasOption = stateById[parentField]?.options?.some((opt: any) => opt.value === childMeta.parentEntryId)
  if (!parentHasOption && childMeta.parentEntryId) {
    fetchCatalogEntriesByIdentifier(parentField, {
      limit: 1,
      offset: 0,
      entryId: childMeta.parentEntryId
    })
      .then((res: any) => {
        if (res.entries.length > 0) {
          const parentOption = { value: res.entries[0].id, label: getLocalizedValue(res.entries[0], locale) }
          setFor(parentField, (prev: any) => {
            if (!prev) return prev
            const optionExists = prev.options.some((opt: any) => opt.value === parentOption.value)
            return {
              ...prev,
              options: optionExists ? prev.options : [...prev.options, parentOption]
            }
          })
        }
      })
      .catch((error: any) => {
        console.error(`[useBiDirectionalDependencies] Failed to fetch parent option for ${parentField}:`, error)
      })
  }
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

    for (const config of biDirectionalConfigs) {
      const { id, parentField } = config
      if (!parentField) continue

      const parentValue = stateById[parentField]?.value || ''
      const childValue = stateById[id]?.value || ''
      const lastParentValue = lastParentValuesRef.current.get(id)
      const parentState = stateById[parentField]

      // PART 1: Handle parent changes (Parent → Child filtering)
      if (lastParentValue !== parentValue) {
        // Update tracked value ONLY if parent has a value (don't track empty states)
        if (parentValue) {
          lastParentValuesRef.current.set(id, parentValue)
        }

        const wasAutoSelected = autoSelectedParentsRef.current.has(parentField)

        handleParentChange({
          config,
          id,
          parentField,
          parentValue,
          childValue,
          lastParentValue,
          wasAutoSelected,
          autoSelectedToCleanup,
          stateById,
          setFor,
          fetchCatalogEntriesByIdentifier,
          defaultPageSize,
          locale
        })
      }

      // PART 2: Handle child changes (Child → Parent auto-selection)
      handleChildToParentAutoSelection({
        id,
        parentField,
        childValue,
        parentValue,
        parentState,
        stateById,
        setFor,
        fetchCatalogEntriesByIdentifier,
        autoSelectedParentsRef,
        locale
      })

      // Reset manuallyCleared when user actively selects child
      if (childValue && parentState?.manuallyCleared) {
        setFor(parentField, prev => {
          if (!prev) return prev
          return { ...prev, manuallyCleared: false }
        })
      }
    }

    // Cleanup auto-selected parents
    for (const parentId of autoSelectedToCleanup) {
      autoSelectedParentsRef.current.delete(parentId)
    }
  }, [dependencySignature, setFor, fetchCatalogEntriesByIdentifier, defaultPageSize, locale])
}

export default useBiDirectionalDependencies

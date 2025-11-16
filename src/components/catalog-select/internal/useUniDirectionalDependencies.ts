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
import type { CatalogSelectConfig, CatalogSelectOption } from './useCatalogSelect'
import { fetchFilteredOptionsWithParent, resetToPrefetchedOptions, clearChildValue } from './dependencyHelpers'

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

// Helper: Handle uni-directional parent-child dependency
const handleUniDirectionalParentChange = ({
  config,
  id,
  parentValue,
  childValue,
  lastParentValue,
  setFor,
  fetchCatalogEntriesByIdentifier,
  defaultPageSize,
  locale
}: any) => {
  const isInitialLoad = lastParentValue === undefined && parentValue && childValue

  if (isInitialLoad) {
    return // Just filter options, keep child value
  }

  if (childValue) {
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
      locale,
      errorContext: 'useUniDirectionalDependencies'
    })
  } else {
    resetToPrefetchedOptions({ id, setFor })
  }
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

        handleUniDirectionalParentChange({
          config,
          id,
          parentValue,
          childValue,
          lastParentValue,
          setFor,
          fetchCatalogEntriesByIdentifier,
          defaultPageSize,
          locale
        })
      }
    }
  }, [dependencySignature, setFor, fetchCatalogEntriesByIdentifier, defaultPageSize, locale])
}

export default useUniDirectionalDependencies

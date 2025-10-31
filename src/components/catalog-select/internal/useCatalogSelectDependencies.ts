/**
 * Catalog Select Dependencies - Orchestrator
 *
 * Delegates to specialized hooks based on dependency type:
 * - Standalone: No dependencies
 * - Uni-Directional: Parent → Child (one-way)
 * - Bi-Directional: Parent ↔ Child (two-way with auto-selection)
 * - External Filters: Pipeline type filters pipeline stage
 */

import { useEffect, useRef } from 'react'
import type { CatalogEntry } from '@/common/data/catalog/types/catalogTypes'
import type { CatalogSelectConfig } from './useCatalogSelect'
import { toOptions } from './catalogSelectUtils'
import useStandaloneDependencies from './useStandaloneDependencies'
import useUniDirectionalDependencies from './useUniDirectionalDependencies'
import useBiDirectionalDependencies from './useBiDirectionalDependencies'

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

export interface UseCatalogSelectDependenciesParams {
  configs: CatalogSelectConfig[]
  stateById: Record<string, State>
  setFor: (id: string, updater: (prev: State) => State) => void
  getActiveFilters: (id: string) => { parentEntryId?: string; typeEquals?: string }
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

// Helper: Handle external filter change for a single config
const handleExternalFilterChange = async ({
  id,
  filter,
  externalValue,
  config,
  stateById,
  setFor,
  fetchCatalogEntriesByIdentifier,
  defaultPageSize,
  locale
}: {
  id: string
  filter: { from: string; on: string }
  externalValue: string | null
  config: CatalogSelectConfig
  stateById: Record<string, any>
  setFor: (id: string, updater: (prev: any) => any) => void
  fetchCatalogEntriesByIdentifier: any
  defaultPageSize: number
  locale?: string
}) => {
  // Clear child when external filter changes
  const childState = stateById[id]
  if (childState?.value !== '') {
    setFor(id, prev => (prev ? { ...prev, value: '', search: undefined } : prev))
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

    try {
      const res = await fetchCatalogEntriesByIdentifier(id, {
        limit: config.pageSize ?? defaultPageSize,
        offset: 0,
        [filter.on === 'type' ? 'typeEquals' : filter.on]: externalValue
      })

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
    } catch {
      setFor(id, prev => (prev ? { ...prev, loading: false } : prev))
    }
  } else {
    // External filter cleared - reset to prefetched
    setFor(id, prev =>
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

export const useCatalogSelectDependencies = ({
  configs,
  stateById,
  setFor,
  fetchCatalogEntriesByIdentifier,
  defaultPageSize,
  externalValues,
  locale
}: UseCatalogSelectDependenciesParams) => {
  // Track last external values for external filter changes
  const lastExternalValuesRef = useRef<Map<string, string | null>>(new Map())

  // Delegate to specialized hooks
  useStandaloneDependencies({ configs })

  useUniDirectionalDependencies({
    configs,
    stateById,
    setFor,
    fetchCatalogEntriesByIdentifier,
    defaultPageSize,
    locale
  })

  useBiDirectionalDependencies({
    configs,
    stateById,
    setFor,
    fetchCatalogEntriesByIdentifier,
    defaultPageSize,
    locale
  })

  // Handle external filter dependencies (e.g., pipelineType → pipelineStage)
  useEffect(() => {
    for (const config of configs) {
      const { id, filterField } = config

      if (!filterField) continue

      for (const filter of filterField) {
        const externalValue = externalValues?.[filter.from] || null
        const lastExternalValue = lastExternalValuesRef.current.get(`${id}_${filter.from}`)

        if (lastExternalValue !== externalValue) {
          lastExternalValuesRef.current.set(`${id}_${filter.from}`, externalValue)

          handleExternalFilterChange({
            id,
            filter,
            externalValue,
            config,
            stateById,
            setFor,
            fetchCatalogEntriesByIdentifier,
            defaultPageSize,
            locale
          })
        }
      }
    }
  }, [
    configs
      .filter(c => c.filterField)
      .map(c => {
        const externalDeps =
          c.filterField?.map(filter => `${filter.from}:${externalValues?.[filter.from] || 'null'}`).join(',') || 'none'
        return `${c.id}:${externalDeps}`
      })
      .join('|')
  ])
}

export default useCatalogSelectDependencies

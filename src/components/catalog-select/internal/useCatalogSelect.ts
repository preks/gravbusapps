import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogs } from '@/common/data/catalog/hooks/useCatalogs'
import { useCatalogEntries } from '@/common/data/catalog/hooks/useCatalogEntries'
import useCatalog from '@/common/data/catalog/hooks/useCatalog'
import {
  ActiveFilters,
  EntryMeta,
  buildEntryMeta,
  buildFiltersSignature,
  toOptions,
  getLocalizedValue
} from './catalogSelectUtils'
import useCatalogSelectDependencies from './useCatalogSelectDependencies'
import { useLocalizationContext } from '@newwork/nw-design-system'

// Utility function to parse catalogIdentifier with version
const parseCatalogIdentifier = (catalogIdentifier: string): { identifier: string; version: string } => {
  const [identifier, version = 'v1'] = catalogIdentifier.split(':')
  return { identifier, version }
}

/**
 * Enhanced catalog select configuration supporting multiple instances and versioning.
 *
 * Key improvements:
 * - Separates instance identity (id) from catalog data (catalogIdentifier)
 * - Supports catalog versioning via "identifier:version" format
 * - Enables multiple instances of the same catalog with different configurations
 * - Maintains dependency relationships using instance IDs
 *
 * @example
 * ```typescript
 * const configs = [
 *   {
 *     id: 'birthCountry',
 *     catalogIdentifier: 'Country:v2',     // Specific version
 *     prefetch: true,
 *     childField: 'birthRegion'         // Bi-directional with birth region
 *   },
 *   {
 *     id: 'birthRegion',
 *     catalogIdentifier: 'CountryRegion:v1',
 *     parentField: 'birthCountry'       // Depends on birth country
 *   },
 *   {
 *     id: 'residenceCountry',
 *     catalogIdentifier: 'Country:v1',     // Defaults to v1
 *     prefetch: false
 *   }
 * ];
 * ```
 */
export interface CatalogSelectConfig {
  id: string // unique instance identifier (for dependencies and state management)
  catalogIdentifier: string // catalog identifier with optional version ("Country:v2" or "Country")
  prefetch?: boolean // include in initial batched prefetch (default: true)
  pageSize?: number // default 25
  // Dependency config
  parentField?: string // this instance depends on (filters by) the selected value of parent instance
  childField?: string // this instance has a bi-directional relationship with child instance
  requireSourceForEnable?: boolean // disable until source has a value
  filterField?: Array<{ from: string; on: string }> // external filtering: from form field, filter on catalog field
}

export interface CatalogSelectController {
  value: string
  setValue: (v: string | null | undefined) => void // ✅ Accepts null/undefined but normalizes to ''
  options: Array<{ value: string; label: string }>
  loading: boolean
  total: number
  limit: number
  offset: number
  search?: string
  hasMore: boolean
  variant: 'select' | 'combobox'
  onSearch: (q: string) => Promise<void>
  onLoadMore: () => Promise<void>
  disabled: boolean
  hasOptions: boolean
  filterSignature?: string
}

export const useCatalogSelect = (
  context: BusinessAppContextProps,
  configs: CatalogSelectConfig[],
  externalValues?: Record<string, string | null>
) => {
  const { fetchCatalogs } = useCatalogs(context)
  const { fetchCatalogEntriesByIdentifier: baseFetchCatalogEntries } = useCatalogEntries({
    accessToken: context.accessToken
  })

  // Get locale from LocalizationProvider for translations
  const { locale } = useLocalizationContext()

  // Wrapper function that converts instance id to catalog identifier
  const fetchCatalogEntriesByIdentifier = useCallback(
    async (instanceId: string, params: Parameters<typeof baseFetchCatalogEntries>[1]) => {
      const config = configs.find(c => c.id === instanceId)
      if (!config) {
        throw new Error(`No config found for instance id: ${instanceId}`)
      }
      const { identifier, version } = parseCatalogIdentifier(config.catalogIdentifier)
      return baseFetchCatalogEntries(identifier, { ...params, version })
    },
    [baseFetchCatalogEntries, configs]
  )

  const defaultPageSize = 25
  const defaultThreshold = 7

  type State = {
    value: string // ✅ Use empty string instead of null for React Hook Form compatibility
    loading: boolean
    options: Array<{ value: string; label: string }>
    prefetchedOptions?: Array<{ value: string; label: string }>
    total: number
    fullTotal?: number
    limit: number
    offset: number
    search?: string
    variant: 'select' | 'combobox'
    metaByValue?: Record<string, EntryMeta>
    lastFiltersSig?: string
    manuallyCleared?: boolean // Flag to prevent bi-directional auto-select after manual clear
  }

  const [stateById, setStateById] = useState<Record<string, State>>(() => {
    const initial: Record<string, State> = {}
    for (const c of configs) {
      initial[c.id] = {
        value: '',
        loading: true,
        options: [],
        prefetchedOptions: [],
        total: 0,
        fullTotal: 0,
        limit: c.pageSize ?? defaultPageSize,
        offset: 0,
        search: undefined,
        variant: 'combobox'
      }
    }
    return initial
  })

  const setFor = useCallback((id: string, updater: (prev: State) => State) => {
    setStateById(prev => ({ ...prev, [id]: updater(prev[id]) }))
  }, [])

  const getActiveFilters = useCallback(
    (id: string): ActiveFilters => {
      const cfg = configs.find(c => c.id === id)
      const filters: ActiveFilters = {}
      if (!cfg) return filters
      // Parent filter
      if (cfg.parentField) {
        const source = stateById[cfg.parentField]
        if (source?.value) filters.parentEntryId = source.value
      }
      // External filters
      if (cfg.filterField && externalValues) {
        for (const map of cfg.filterField) {
          const v = externalValues[map.from]
          if (v && map.on === 'type') {
            filters.typeEquals = v
          }
        }
      }
      return filters
    },
    [configs, stateById, externalValues]
  )

  const preload = useCallback(async () => {
    const allIdentifiers = configs.filter(c => c.prefetch !== false).map(c => c.catalogIdentifier)
    // Deduplicate catalog identifiers - multiple instances might use the same catalog
    const identifiers = [...new Set(allIdentifiers)]
    if (identifiers.length === 0) return

    const largestPageSize = Math.max(...configs.map(c => c.pageSize ?? defaultPageSize))
    const list = await fetchCatalogs({
      catalogIdentifiers: identifiers,
      includeCatalogEntries: true,
      entriesLimit: largestPageSize,
      entriesOffset: 0,
      limit: identifiers.length
    })
    const items = list.items || []
    for (const cat of items) {
      // Find ALL configs that match this catalog identifier:version
      const catalogIdentifierWithVersion = `${cat.identifier}:${cat.version || 'v1'}`
      const matchingConfigs = configs.filter(
        c =>
          c.catalogIdentifier === catalogIdentifierWithVersion ||
          (c.catalogIdentifier === cat.identifier && (cat.version || 'v1') === 'v1')
      )
      if (matchingConfigs.length === 0) continue

      // Apply data to ALL matching instances
      for (const cfg of matchingConfigs) {
        const limit = cfg.pageSize ?? defaultPageSize
        const total = cat.total ?? cat.entriesCount ?? 0
        const initialEntries = (cat.entries || []).slice(0, limit)
        const metaByValue = buildEntryMeta(initialEntries)

        setFor(cfg.id, prev => ({
          ...prev,
          loading: false,
          options: toOptions(initialEntries, locale),
          prefetchedOptions: toOptions(initialEntries, locale),
          total,
          fullTotal: total,
          limit,
          offset: initialEntries.length,
          variant: total <= defaultThreshold ? 'select' : 'combobox',
          metaByValue
        }))
      }
    }
  }, [configs, fetchCatalogs, locale])

  // Initialize non-prefetch catalogs with a tiny call to decide variant and, if small, load all options
  const { fetchCatalog } = useCatalog(context)
  const primeNonPrefetch = useCallback(async () => {
    const nonPrefetch = configs.filter(c => c.prefetch === false)
    await Promise.all(
      nonPrefetch.map(async cfg => {
        const { identifier, version } = parseCatalogIdentifier(cfg.catalogIdentifier)
        try {
          const full = await fetchCatalog(
            {
              identifier,
              version,
              entriesLimit: defaultThreshold,
              entriesOffset: 0
            },
            { includeCatalogEntries: true }
          )
          const total = full?.total ?? full?.entriesCount ?? 0
          const entries = full?.entries || []
          setFor(cfg.id, prev => ({
            ...prev,
            loading: false,
            options: total <= defaultThreshold ? toOptions(entries, locale) : [],
            prefetchedOptions: total <= defaultThreshold ? toOptions(entries, locale) : [],
            total,
            fullTotal: total,
            limit: cfg.pageSize ?? defaultPageSize,
            offset: total <= defaultThreshold ? entries.length : 0,
            variant: total <= defaultThreshold ? 'select' : 'combobox'
          }))
        } catch {
          setFor(cfg.id, prev => ({ ...prev, loading: false }))
        }
      })
    )
  }, [configs, fetchCatalog, locale])

  // Prime non-prefetch catalogs once
  const initOnce = useCallback(async () => {
    await Promise.all([preload(), primeNonPrefetch()])
  }, [preload, primeNonPrefetch])

  // Fetch missing options for initial values (batched, run once after preload)
  const missingOptionsFetchedRef = useRef(false)
  useEffect(() => {
    const fetchMissingOptions = async () => {
      // Only run once
      if (missingOptionsFetchedRef.current) return

      // Wait for configs to be registered
      if (configs.length === 0) return

      // Wait for preload to finish (all configs have finished loading, regardless of whether initial values exist)
      const allReady = configs.every(cfg => {
        const state = stateById[cfg.id]
        return state && !state.loading
      })
      if (!allReady) return

      // Mark as fetched to prevent re-runs
      missingOptionsFetchedRef.current = true

      // Collect all missing options in ONE go
      const missing: Array<{ cfg: (typeof configs)[0]; value: string }> = []
      for (const cfg of configs) {
        const state = stateById[cfg.id]
        if (!state?.value || !state?.options) continue
        const hasOption = state.options.some(opt => opt.value === state.value)
        if (!hasOption) {
          missing.push({ cfg, value: state.value })
        }
      }

      if (missing.length === 0) return

      // Batch all fetches in parallel
      const fetchMissingOption = async ({ cfg, value }: { cfg: CatalogSelectConfig; value: string }) => {
        try {
          const res = await fetchCatalogEntriesByIdentifier(cfg.id, {
            limit: 1,
            offset: 0,
            entryId: value
          })

          if (res.entries.length > 0) {
            const entry = res.entries[0]
            const option = { value: entry.id, label: getLocalizedValue(entry, locale) }
            const meta = { parentEntryId: entry.parentEntryId, type: entry.type }

            setFor(cfg.id, prev => {
              if (!prev) return prev
              const optionExists = prev.options.some(opt => opt.value === option.value)
              return {
                ...prev,
                options: optionExists ? prev.options : [...prev.options, option],
                metaByValue: { ...prev.metaByValue, [entry.id]: meta }
              }
            })
          }
        } catch {
          // Ignore fetch errors
        }
      }

      await Promise.all(missing.map(fetchMissingOption))
    }

    fetchMissingOptions()
  }, [configs, stateById, fetchCatalogEntriesByIdentifier, locale])

  // Extract handler functions to reduce nesting
  const createOnSearch = useCallback(
    (id: string, cfg: CatalogSelectConfig) => async (q: string) => {
      const trimmed = (q || '').trim()
      const activeFilters: ActiveFilters = getActiveFilters(id)
      const filtersSig = buildFiltersSignature(activeFilters)

      // If search is cleared, reset to prefetched options without extra request
      if (trimmed === '' && !activeFilters.parentEntryId && !activeFilters.typeEquals) {
        setFor(id, prev => ({
          ...prev,
          loading: false,
          options: prev.prefetchedOptions || [],
          search: undefined,
          offset: (prev.prefetchedOptions || []).length,
          total: prev.fullTotal ?? prev.total
        }))
        return
      }

      setFor(id, prev => ({ ...prev, loading: true, search: trimmed, lastFiltersSig: filtersSig }))

      try {
        const res = await fetchCatalogEntriesByIdentifier(id, {
          limit: cfg.pageSize ?? defaultPageSize,
          offset: 0,
          search: trimmed,
          parentEntryId: activeFilters.parentEntryId,
          typeEquals: activeFilters.typeEquals
        })
        const options = toOptions(res.entries, locale)

        setFor(id, prev => ({
          ...prev,
          loading: false,
          options,
          total: res.totalCount,
          limit: cfg.pageSize ?? defaultPageSize,
          offset: res.entries.length,
          search: trimmed,
          metaByValue: { ...prev.metaByValue, ...buildEntryMeta(res.entries) },
          lastFiltersSig: filtersSig
        }))
      } catch {
        setFor(id, prev => ({ ...prev, loading: false }))
      }
    },
    [getActiveFilters, setFor, fetchCatalogEntriesByIdentifier, defaultPageSize, locale]
  )

  const createOnLoadMore = useCallback(
    (id: string, cfg: CatalogSelectConfig, current: State) => async () => {
      const limit = cfg.pageSize ?? defaultPageSize
      const startOffset = current.offset
      if (startOffset >= current.total || current.loading) return
      setFor(id, prev => ({ ...prev, loading: true }))
      const activeFilters: ActiveFilters = getActiveFilters(id)
      const res = await fetchCatalogEntriesByIdentifier(id, {
        limit,
        offset: startOffset,
        search: current.search,
        parentEntryId: activeFilters.parentEntryId,
        typeEquals: activeFilters.typeEquals
      })
      const appended = toOptions(res.entries, locale)
      setFor(id, prev => ({
        ...prev,
        loading: false,
        options: [...prev.options, ...appended],
        total: res.totalCount,
        limit,
        offset: startOffset + appended.length,
        metaByValue: { ...prev.metaByValue, ...buildEntryMeta(res.entries) }
      }))
    },
    [getActiveFilters, setFor, fetchCatalogEntriesByIdentifier, defaultPageSize, locale]
  )

  const controllers = useMemo<Record<string, CatalogSelectController>>(() => {
    const record: Record<string, CatalogSelectController> = {}
    for (const cfg of configs) {
      const id = cfg.id
      const current = stateById[id]

      const onSearch = createOnSearch(id, cfg)
      const onLoadMore = createOnLoadMore(id, cfg, current)

      // disabled rules: requireSourceForEnable when missing source (parent or external), or no options available under active filters
      const hasParentSelected = Boolean(cfg.parentField && stateById[cfg.parentField || '']?.value)
      const hasExternalFilterValue = Boolean(cfg.filterField?.some(m => Boolean(externalValues?.[m.from])))

      // Check if this is a bi-directional relationship (not strict dependency)
      const parentConfig = configs.find(c => c.id === cfg.parentField)
      const isBiDirectional = parentConfig?.childField === id

      const disabledRequire = Boolean(
        cfg.requireSourceForEnable &&
          ((cfg.parentField && !hasParentSelected) || (cfg.filterField && !hasExternalFilterValue))
      )
      const hasAnyFilterActive = Boolean(
        (cfg.parentField && hasParentSelected) || (cfg.filterField && hasExternalFilterValue)
      )
      // Don't disable bi-directional children during loading (they keep their value during filtering)
      const disabledWhileLoading = Boolean(hasAnyFilterActive && current?.loading && !isBiDirectional)
      // Disable when loading is complete and no options found
      const disabledNoOptions = Boolean(
        hasAnyFilterActive && !current?.loading && (current?.options?.length || 0) === 0
      )
      const disabled = disabledRequire || disabledWhileLoading || disabledNoOptions

      // ✅ hasOptions logic for validation:
      // - Strict dependencies (requireSourceForEnable: true): only valid when parent is selected
      // - Bi-directional dependencies (no requireSourceForEnable): valid whenever options exist
      // - Standalone fields (no parentField): valid whenever options exist
      const hasOptionsInState = (current?.options?.length || 0) > 0

      // Only strict dependencies require parent selection for validation
      const requiresParentForValidation = cfg.requireSourceForEnable && cfg.parentField && !hasParentSelected
      const hasOptions = hasOptionsInState && !requiresParentForValidation

      record[id] = {
        value: current?.value ?? '',
        setValue: v => {
          const normalized = v?.length ? v : ''
          setFor(id, prev => ({
            ...prev,
            value: normalized,
            manuallyCleared: normalized === '' && prev.value !== ''
          }))
        },
        options: current?.options ?? [],
        loading: current?.loading ?? false,
        total: current?.total ?? 0,
        limit: current?.limit ?? cfg.pageSize ?? defaultPageSize,
        offset: current?.offset ?? 0,
        search: current?.search,
        hasMore: (current?.offset ?? 0) < (current?.total ?? 0),
        variant: current?.variant ?? 'combobox',
        onSearch,
        onLoadMore,
        disabled,
        hasOptions,
        filterSignature: current?.lastFiltersSig
      }
    }
    return record
  }, [configs, stateById, externalValues, createOnSearch, createOnLoadMore])

  // Use extracted dependency management hook (filters and bi-directional behavior)
  useCatalogSelectDependencies({
    configs,
    stateById,
    setFor,
    getActiveFilters,
    fetchCatalogEntriesByIdentifier,
    defaultPageSize,
    externalValues,
    locale
  })

  return { controllers, preload: initOnce }
}

export default useCatalogSelect

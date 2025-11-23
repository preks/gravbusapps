import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogs } from '@/common/data/catalog/hooks/useCatalogs'
import { useCatalogEntries } from '@/common/data/catalog/hooks/useCatalogEntries'
import useCatalog from '@/common/data/catalog/hooks/useCatalog'
import {
  ActiveFilters,
  buildEntryMeta,
  buildFiltersSignature,
  toOptions,
  getLocalizedValue
} from './catalogSelectUtils'
import useCatalogDependencies from './useCatalogDependencies'
import { useLocalizationContext } from '@newwork/nw-design-system'

const parseCatalogIdentifier = (catalogIdentifier: string): { identifier: string; version: string } => {
  const [identifier, version = 'v1'] = catalogIdentifier.split(':')
  return { identifier, version }
}

export interface CatalogSelectConfig {
  id: string
  catalogIdentifier: string
  prefetch?: boolean
  pageSize?: number
  parentField?: string
  childField?: string
  requireSourceForEnable?: boolean
  filterField?: Array<{ from: string; on: string }>
}

export interface CatalogSelectOption {
  value: string
  label: string
  icon?: string
}

export interface CatalogSelectController {
  value: string
  setValue: (v: string | null | undefined) => void
  options: CatalogSelectOption[]
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

export const useCatalogSelect = (
  context: BusinessAppContextProps,
  configs: CatalogSelectConfig[],
  externalValues?: Record<string, string | null>
) => {
  const { fetchCatalogs } = useCatalogs(context)
  const { fetchCatalogEntriesByIdentifier: baseFetchCatalogEntries } = useCatalogEntries({
    accessToken: context.accessToken
  })
  const { locale } = useLocalizationContext()

  const fetchCatalogEntriesByIdentifier = useCallback(
    async (instanceId: string, params: Parameters<typeof baseFetchCatalogEntries>[1]) => {
      const config = configs.find(c => c.id === instanceId)
      if (!config) throw new Error(`No config found for instance id: ${instanceId}`)
      const { identifier, version } = parseCatalogIdentifier(config.catalogIdentifier)
      return baseFetchCatalogEntries(identifier, { ...params, version })
    },
    [baseFetchCatalogEntries, configs]
  )

  const defaultPageSize = 25
  const defaultThreshold = 7

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
    setStateById(prev => {
      const currentState = prev[id] || {
        value: '',
        loading: true,
        options: [],
        prefetchedOptions: [],
        total: 0,
        fullTotal: 0,
        limit: defaultPageSize,
        offset: 0,
        search: undefined,
        variant: 'combobox'
      }
      return { ...prev, [id]: updater(currentState) }
    })
  }, [])

  const getActiveFilters = useCallback(
    (id: string): ActiveFilters => {
      const cfg = configs.find(c => c.id === id)
      const filters: ActiveFilters = {}
      if (!cfg) return filters
      if (cfg.parentField) {
        const parentValue = externalValues?.[cfg.parentField] || stateById[cfg.parentField]?.value
        if (parentValue) filters.parentEntryId = parentValue
      }
      if (cfg.filterField && externalValues) {
        for (const map of cfg.filterField) {
          const v = externalValues[map.from]
          if (v && map.on === 'type') filters.typeEquals = v
        }
      }

      return filters
    },
    [configs, stateById, externalValues]
  )

  const preload = useCallback(async () => {
    const allIdentifiers = configs.filter(c => c.prefetch !== false).map(c => c.catalogIdentifier)
    const identifiers = [...new Set(allIdentifiers)]
    if (identifiers.length === 0) return

    // Find configs that need data vs can reuse existing data
    const configsNeedingData = new Set<string>()
    const configsToReuse = new Map<string, string>() // newConfigId -> sourceConfigId

    for (const cfg of configs.filter(c => c.prefetch !== false)) {
      // Check if this config already has data
      const currentState = stateById[cfg.id]
      if (currentState && currentState.prefetchedOptions && currentState.prefetchedOptions.length > 0) {
        continue // Already has data
      }

      // Check if another config with same catalogIdentifier has data we can reuse
      // Only if no parentField or filterField (those would filter the data)
      if (!cfg.parentField && !cfg.filterField) {
        const sourceConfig = configs.find(
          c =>
            c.id !== cfg.id &&
            c.catalogIdentifier === cfg.catalogIdentifier &&
            stateById[c.id]?.prefetchedOptions &&
            stateById[c.id].prefetchedOptions.length > 0
        )

        if (sourceConfig) {
          // Reuse data from source config
          const sourceState = stateById[sourceConfig.id]
          setFor(cfg.id, prev => ({
            ...prev,
            loading: false,
            options: sourceState.prefetchedOptions || [],
            prefetchedOptions: sourceState.prefetchedOptions || [],
            total: sourceState.fullTotal || sourceState.total || 0,
            fullTotal: sourceState.fullTotal || sourceState.total || 0,
            limit: cfg.pageSize ?? defaultPageSize,
            offset: (sourceState.prefetchedOptions || []).length,
            variant: sourceState.variant || 'combobox',
            metaByValue: sourceState.metaByValue || {}
          }))
          configsToReuse.set(cfg.id, sourceConfig.id)
          continue // Skip API call for this config
        }
      }

      // Need to fetch data for this config
      configsNeedingData.add(cfg.catalogIdentifier)
    }

    // Only fetch data for identifiers that don't have cached data
    const identifiersToFetch = identifiers.filter(id => configsNeedingData.has(id))
    if (identifiersToFetch.length === 0) return

    const largestPageSize = Math.max(...configs.map(c => c.pageSize ?? defaultPageSize))
    const list = await fetchCatalogs({
      catalogIdentifiers: identifiersToFetch,
      includeCatalogEntries: true,
      entriesLimit: largestPageSize,
      entriesOffset: 0,
      limit: identifiersToFetch.length
    })

    for (const cat of list.items || []) {
      const catalogIdentifierWithVersion = `${cat.identifier}:${cat.version || 'v1'}`
      const matchingConfigs = configs.filter(
        c =>
          (c.catalogIdentifier === catalogIdentifierWithVersion ||
            (c.catalogIdentifier === cat.identifier && (cat.version || 'v1') === 'v1')) &&
          !configsToReuse.has(c.id) // Skip configs that already reused data
      )
      if (matchingConfigs.length === 0) continue

      for (const cfg of matchingConfigs) {
        const limit = cfg.pageSize ?? defaultPageSize
        const total = cat.total ?? cat.entriesCount ?? 0
        const initialEntries = (cat.entries || []).slice(0, limit)
        const metaByValue = buildEntryMeta(initialEntries)
        const hasParentWithValue =
          cfg.parentField && (externalValues?.[cfg.parentField] || stateById[cfg.parentField]?.value)
        const prefetchedOptions = toOptions(initialEntries, locale)

        setFor(cfg.id, prev => {
          if (prev?.lastFiltersSig) {
            return prev
          }

          return {
            ...prev,
            loading: false,
            options: hasParentWithValue ? [] : prefetchedOptions,
            prefetchedOptions,
            total: hasParentWithValue ? 0 : total,
            fullTotal: total,
            limit,
            offset: hasParentWithValue ? 0 : initialEntries.length,
            variant: total <= defaultThreshold ? 'select' : 'combobox',
            metaByValue
          }
        })
      }
    }
  }, [configs, fetchCatalogs, locale, stateById, externalValues, setFor])

  const { fetchCatalog } = useCatalog(context)
  const primeNonPrefetch = useCallback(async () => {
    const nonPrefetch = configs.filter(c => c.prefetch === false)
    if (nonPrefetch.length === 0) return

    await Promise.all(
      nonPrefetch.map(async cfg => {
        const { identifier, version } = parseCatalogIdentifier(cfg.catalogIdentifier)
        try {
          const full = await fetchCatalog(
            { identifier, version, entriesLimit: defaultThreshold, entriesOffset: 0 },
            { includeCatalogEntries: true }
          )
          const total = full?.total ?? full?.entriesCount ?? 0
          const entries = full?.entries || []
          const hasParentWithValue =
            cfg.parentField && (externalValues?.[cfg.parentField] || stateById[cfg.parentField]?.value)
          setFor(cfg.id, prev => {
            if (prev?.lastFiltersSig) {
              return prev
            }

            return {
              ...prev,
              loading: false,
              options: hasParentWithValue ? [] : total <= defaultThreshold ? toOptions(entries, locale) : [],
              prefetchedOptions: total <= defaultThreshold ? toOptions(entries, locale) : [],
              total: hasParentWithValue ? 0 : total,
              fullTotal: total,
              limit: cfg.pageSize ?? defaultPageSize,
              offset: hasParentWithValue ? 0 : total <= defaultThreshold ? entries.length : 0,
              variant: total <= defaultThreshold ? 'select' : 'combobox'
            }
          })
        } catch {
          setFor(cfg.id, prev => ({ ...prev, loading: false }))
        }
      })
    )
  }, [configs, fetchCatalog, locale, stateById, externalValues, setFor])

  const initOnce = useCallback(async () => {
    await Promise.all([preload(), primeNonPrefetch()])

    for (const cfg of configs) {
      setFor(cfg.id, prev => {
        if (
          prev &&
          prev.loading &&
          !prev.lastFiltersSig &&
          prev.options.length === 0 &&
          (prev.prefetchedOptions?.length || 0) === 0
        ) {
          return { ...prev, loading: false }
        }
        return prev
      })
    }
  }, [preload, primeNonPrefetch, configs, setFor])

  // Fetch missing options for initial values after preload (run once)
  const missingOptionsFetchedRef = useRef(false)
  useEffect(() => {
    const fetchMissingOptions = async () => {
      // Only run once
      if (missingOptionsFetchedRef.current) return

      // Wait for configs to be registered
      if (configs.length === 0) return

      // Wait for preload to finish (all configs have finished loading)
      const allReady = configs.every(cfg => {
        const state = stateById[cfg.id]
        return state && !state.loading
      })
      if (!allReady) return

      // Mark as fetched to prevent re-runs
      missingOptionsFetchedRef.current = true

      // Collect all missing options
      const missing: Array<{ cfg: CatalogSelectConfig; value: string }> = []
      configs.forEach(cfg => {
        const state = stateById[cfg.id]
        const externalValue = externalValues?.[cfg.id] || ''
        const stateValue = state?.value || ''
        const effectiveValue = externalValue || stateValue

        if (!effectiveValue || !state?.options) return

        const hasOption = state.options.some(opt => opt.value === effectiveValue)
        if (!hasOption) {
          missing.push({ cfg, value: effectiveValue })
        }
      })

      if (missing.length === 0) return

      // Fetch all missing options in parallel
      await Promise.all(
        missing.map(async ({ cfg, value }) => {
          try {
            const res = await fetchCatalogEntriesByIdentifier(cfg.id, { limit: 1, offset: 0, entryId: value })
            if (res.entries.length === 0) return

            const entry = res.entries[0]
            const option = { value: entry.id, label: getLocalizedValue(entry, locale) }
            const meta = { parentEntryId: entry.parentEntryId, type: entry.type }

            setFor(cfg.id, prev => {
              if (!prev) return prev
              const optionExists = prev.options.some(opt => opt.value === option.value)
              return {
                ...prev,
                options: optionExists ? prev.options : [option, ...prev.options],
                metaByValue: { ...prev.metaByValue, [entry.id]: meta }
              }
            })
          } catch {
            // Ignore fetch errors
          }
        })
      )
    }

    fetchMissingOptions()
  }, [configs, stateById, externalValues, fetchCatalogEntriesByIdentifier, locale, setFor])

  const createOnSearch = useCallback(
    (id: string, cfg: CatalogSelectConfig) => async (q: string) => {
      const trimmed = (q || '').trim()
      const activeFilters: ActiveFilters = getActiveFilters(id)
      const filtersSig = buildFiltersSignature(activeFilters)

      if (trimmed === '' && !activeFilters.parentEntryId && !activeFilters.typeEquals) {
        setFor(id, prev => ({
          ...prev,
          loading: false,
          options: prev.prefetchedOptions || [],
          search: undefined,
          offset: (prev.prefetchedOptions || []).length,
          total: prev.fullTotal ?? prev.total,
          lastFiltersSig: undefined
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

      // Get parent value from externalValues (form) or stateById (internal)
      const parentValue = cfg.parentField
        ? externalValues?.[cfg.parentField] || stateById[cfg.parentField]?.value || ''
        : ''
      const hasParentSelected = Boolean(cfg.parentField && parentValue)
      const hasExternalFilterValue = Boolean(cfg.filterField?.some(m => Boolean(externalValues?.[m.from])))
      const parentConfig = configs.find(c => c.id === cfg.parentField)
      const isBiDirectional = parentConfig?.childField === id

      const disabledRequire = Boolean(
        cfg.requireSourceForEnable &&
          ((cfg.parentField && !hasParentSelected) || (cfg.filterField && !hasExternalFilterValue))
      )
      const hasAnyFilterActive = Boolean(
        (cfg.parentField && hasParentSelected) || (cfg.filterField && hasExternalFilterValue)
      )
      // FIX: Wenn Parent-Wert existiert, aber Child-State noch nicht existiert → disabled
      const childStateNotInitialized = Boolean(hasAnyFilterActive && !current)
      // FIX: Wenn Parent-Wert existiert und Child-State existiert, aber noch loading → disabled (außer bi-directional)
      const disabledWhileLoading = Boolean(hasAnyFilterActive && current?.loading && !isBiDirectional)
      // FIX: Wenn Parent-Wert existiert und Child-State geladen ist, aber keine Options → disabled
      // WICHTIG: total === 0 bedeutet, dass wirklich keine Options existieren (nicht nur noch nicht geladen)
      const disabledNoOptions = Boolean(
        hasAnyFilterActive && current && !current.loading && (current.options?.length || 0) === 0 && current.total === 0
      )
      const disabled = disabledRequire || childStateNotInitialized || disabledWhileLoading || disabledNoOptions

      const hasOptionsInState = (current?.options?.length || 0) > 0
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
  }, [configs, stateById, externalValues, createOnSearch, createOnLoadMore, setFor, defaultPageSize])

  // Handle all dependencies in unified hook
  useCatalogDependencies({
    configs,
    stateById,
    setFor,
    fetchCatalogEntriesByIdentifier,
    defaultPageSize,
    externalValues,
    locale
  })

  return { controllers, preload: initOnce }
}

export default useCatalogSelect

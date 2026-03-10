import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocale } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import useCatalog from '@/common/data/catalog/hooks/useCatalog'
import { useCatalogEntries } from '@/common/data/catalog/hooks/useCatalogEntries'
import { useCatalogs } from '@/common/data/catalog/hooks/useCatalogs'
import type { ListFilter } from '../CatalogSelect'
import {
  getChangedDebugKeys,
  getDebugCallerLabel,
  logCatalogSelectDebug,
  summarizeCatalogSelectState
} from './catalogSelectDebug'
import {
  ActiveFilters,
  buildEntryMeta,
  buildFiltersSignature,
  CatalogSelectExternalValue,
  resolveCatalogSelectFieldValue,
  resolveCatalogSelectFieldValues,
  toOptions
} from './catalogSelectUtils'
import {
  preloadCatalogSelectData,
  primeNonPrefetchCatalogs,
  finalizeInitialLoading,
  fetchMissingCatalogOptions
} from './catalogSelectBootstrap'
import { useCatalogSelectControllers } from './catalogSelectControllers'
import { buildListFilterParams, parseCatalogIdentifier } from './catalogSelectQueryHelpers'
import useCatalogDependencies from './useCatalogDependencies'

export interface CatalogSelectConfig {
  id: string
  catalogIdentifier: string
  prefetch?: boolean
  pageSize?: number
  parentField?: string
  childField?: string
  requireSourceForEnable?: boolean
  filterField?: Array<{ from: string; on: string }>
  // Business logic filtering (applied at query level)
  codeFilter?: ListFilter<string>
  typeFilter?: ListFilter<string>
  orderBy?: Array<{
    field: string
    direction: 'ASC' | 'DESC' | 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST' | 'ASC_NULLS_FIRST' | 'DESC_NULLS_FIRST'
  }>
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

export type CatalogSelectState = {
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

const createInitialState = (limit: number): CatalogSelectState => ({
  value: '',
  loading: true,
  options: [],
  prefetchedOptions: [],
  total: 0,
  fullTotal: 0,
  limit,
  offset: 0,
  search: undefined,
  variant: 'combobox',
  manuallyCleared: false
})

export const useCatalogSelect = (
  context: BusinessAppContextProps,
  configs: CatalogSelectConfig[],
  externalValues?: Record<string, CatalogSelectExternalValue>
) => {
  const { fetchCatalogs } = useCatalogs(context)
  const { fetchCatalogEntriesByIdentifier: baseFetchCatalogEntries } = useCatalogEntries({
    accessToken: context.accessToken
  })
  const { locale } = useLocale()

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

  // Per-field request version counter to discard stale async responses
  const requestVersionRef = useRef<Map<string, number>>(new Map())

  const nextVersion = (id: string): number => {
    const next = (requestVersionRef.current.get(id) ?? 0) + 1
    requestVersionRef.current.set(id, next)
    return next
  }

  const isCurrentVersion = (id: string, version: number): boolean => requestVersionRef.current.get(id) === version

  const [stateById, setStateById] = useState<Record<string, CatalogSelectState>>(() => {
    const initial: Record<string, CatalogSelectState> = {}
    for (const c of configs) {
      initial[c.id] = createInitialState(c.pageSize ?? defaultPageSize)
    }
    return initial
  })

  const stateByIdRef = useRef(stateById)
  useEffect(() => {
    stateByIdRef.current = stateById
  }, [stateById])

  const setFor = useCallback(
    (id: string, updater: (prev: CatalogSelectState) => CatalogSelectState, reason?: string) => {
      setStateById(prev => {
        const currentState = prev[id] || createInitialState(defaultPageSize)
        const nextState = updater(currentState)
        if (nextState === currentState) {
          return prev
        }

        logCatalogSelectDebug('state:update', {
          fieldId: id,
          reason: reason || getDebugCallerLabel() || 'unknown',
          changedKeys: getChangedDebugKeys(
            summarizeCatalogSelectState(currentState),
            summarizeCatalogSelectState(nextState)
          ),
          nextState: summarizeCatalogSelectState(nextState)
        })

        return { ...prev, [id]: nextState }
      })
    },
    [defaultPageSize]
  )

  const getActiveFilters = useCallback(
    (id: string): ActiveFilters => {
      const cfg = configs.find(c => c.id === id)
      const filters: ActiveFilters = {}
      if (!cfg) return filters
      if (cfg.parentField) {
        const parentValue = resolveCatalogSelectFieldValue(cfg.parentField, externalValues, stateById)
        if (parentValue) filters.parentEntryId = parentValue
      }
      if (cfg.filterField && externalValues) {
        for (const map of cfg.filterField) {
          const v = externalValues[map.from]
          if (typeof v === 'string' && v && map.on === 'type') filters.typeEquals = v
        }
      }

      return filters
    },
    [configs, stateById, externalValues]
  )

  useEffect(() => {
    if (!externalValues) return

    for (const config of configs) {
      const externalValue = externalValues[config.id]
      if (externalValue === undefined) continue
      if (Array.isArray(externalValue)) continue

      const normalizedExternalValue = externalValue || ''
      setFor(
        config.id,
        previousState => {
          const nextManuallyCleared = normalizedExternalValue === '' && previousState.value !== ''
          if (
            previousState.value === normalizedExternalValue &&
            Boolean(previousState.manuallyCleared) === nextManuallyCleared
          ) {
            return previousState
          }

          return {
            ...previousState,
            value: normalizedExternalValue,
            manuallyCleared: nextManuallyCleared
          }
        },
        'externalValues:sync'
      )
    }
  }, [configs, externalValues, setFor])

  const preload = useCallback(async () => {
    await preloadCatalogSelectData({
      configs,
      stateById,
      externalValues,
      defaultPageSize,
      defaultThreshold,
      locale,
      fetchCatalogs,
      setFor
    })
  }, [configs, fetchCatalogs, locale, stateById, externalValues, setFor])

  const { fetchCatalog } = useCatalog(context)
  const primeNonPrefetch = useCallback(async () => {
    await primeNonPrefetchCatalogs({
      configs,
      defaultPageSize,
      defaultThreshold,
      locale,
      externalValues,
      stateById,
      fetchCatalog,
      setFor
    })
  }, [configs, defaultPageSize, defaultThreshold, locale, externalValues, stateById, fetchCatalog, setFor])

  const initOnce = useCallback(async () => {
    await Promise.all([preload(), primeNonPrefetch()])
    finalizeInitialLoading({ configs, setFor })
  }, [preload, primeNonPrefetch, configs, setFor])

  const areAllConfigsReady = useCallback((): boolean => {
    return configs.every(cfg => {
      const currentState = stateById[cfg.id]
      return currentState && !currentState.loading
    })
  }, [configs, stateById])

  const fetchMissingOptions = useCallback(async (): Promise<void> => {
    if (configs.length === 0) return
    if (!areAllConfigsReady()) return
    await fetchMissingCatalogOptions({
      configs,
      stateById,
      externalValues,
      locale,
      fetchCatalogEntriesByIdentifier,
      setFor
    })
  }, [configs, areAllConfigsReady, stateById, externalValues, locale, fetchCatalogEntriesByIdentifier, setFor])

  const missingOptionSignature = useMemo(
    () =>
      configs
        .flatMap(config => {
          const currentState = stateById[config.id]
          const effectiveValues = resolveCatalogSelectFieldValues(config.id, externalValues, stateById)
          if (effectiveValues.length === 0 || !currentState?.options) return []
          const optionValueSet = new Set(currentState.options.map(option => option.value))
          return effectiveValues
            .filter(effectiveValue => !optionValueSet.has(effectiveValue))
            .map(effectiveValue => `${config.id}:${effectiveValue}`)
        })
        .join('|'),
    [configs, stateById, externalValues]
  )

  useEffect(() => {
    if (!missingOptionSignature) return
    fetchMissingOptions().catch(() => {
      // Ignore errors
    })
  }, [fetchMissingOptions, missingOptionSignature])

  const configById = useMemo(() => new Map(configs.map(config => [config.id, config])), [configs])

  const createSetValue = useCallback(
    (id: string) => (v: string | null | undefined) => {
      const normalized = v?.length ? v : ''
      setFor(
        id,
        prev => {
          const nextManuallyCleared = normalized === '' && prev.value !== ''
          if (prev.value === normalized && Boolean(prev.manuallyCleared) === nextManuallyCleared) {
            return prev
          }
          return {
            ...prev,
            value: normalized,
            manuallyCleared: nextManuallyCleared
          }
        },
        'setValue'
      )
    },
    [setFor]
  )

  const createOnSearch = useCallback(
    (id: string, cfg: CatalogSelectConfig) => async (q: string) => {
      const trimmed = (q || '').trim()
      const activeFilters: ActiveFilters = getActiveFilters(id)
      const filtersSig = buildFiltersSignature(activeFilters)

      const hasFilters = !!(
        (cfg.codeFilter && cfg.codeFilter.mode !== 'all') ||
        (cfg.typeFilter && cfg.typeFilter.mode !== 'all')
      )

      if (trimmed === '' && !activeFilters.parentEntryId && !activeFilters.typeEquals && !hasFilters) {
        setFor(
          id,
          prev => {
            const nextOptions = prev.prefetchedOptions || []
            const nextOffset = nextOptions.length
            const nextTotal = prev.fullTotal ?? prev.total
            if (
              prev.loading === false &&
              prev.options === nextOptions &&
              prev.search === undefined &&
              prev.offset === nextOffset &&
              prev.total === nextTotal &&
              prev.lastFiltersSig === undefined
            ) {
              return prev
            }
            return {
              ...prev,
              loading: false,
              options: nextOptions,
              search: undefined,
              offset: nextOffset,
              total: nextTotal,
              lastFiltersSig: undefined
            }
          },
          'search:clear'
        )
        return
      }

      const version = nextVersion(id)
      setFor(
        id,
        prev =>
          prev.loading && prev.search === trimmed && prev.lastFiltersSig === filtersSig
            ? prev
            : { ...prev, loading: true, search: trimmed, lastFiltersSig: filtersSig },
        'search:start'
      )

      try {
        const res = await fetchCatalogEntriesByIdentifier(id, {
          limit: cfg.pageSize ?? defaultPageSize,
          offset: 0,
          search: trimmed,
          parentEntryId: activeFilters.parentEntryId,
          typeEquals: activeFilters.typeEquals,
          ...buildListFilterParams(cfg.codeFilter, cfg.typeFilter),
          orderBy: cfg.orderBy
        })
        if (!isCurrentVersion(id, version)) return
        const options = toOptions(res.entries, locale)
        setFor(
          id,
          prev => ({
            ...prev,
            loading: false,
            options,
            total: res.totalCount,
            limit: cfg.pageSize ?? defaultPageSize,
            offset: res.entries.length,
            search: trimmed,
            metaByValue: { ...prev.metaByValue, ...buildEntryMeta(res.entries) },
            lastFiltersSig: filtersSig
          }),
          'search:success'
        )
      } catch {
        if (isCurrentVersion(id, version)) {
          setFor(id, prev => (prev.loading ? { ...prev, loading: false } : prev), 'search:error')
        }
      }
    },
    [getActiveFilters, setFor, fetchCatalogEntriesByIdentifier, defaultPageSize, locale]
  )

  const createOnLoadMore = useCallback(
    (id: string, cfg: CatalogSelectConfig) => async () => {
      const limit = cfg.pageSize ?? defaultPageSize
      const snapshot = stateByIdRef.current[id]
      if (!snapshot || snapshot.offset >= snapshot.total || snapshot.loading) return
      const startOffset = snapshot.offset
      const version = nextVersion(id)
      setFor(id, prev => (prev.loading ? prev : { ...prev, loading: true }), 'loadMore:start')
      const activeFilters: ActiveFilters = getActiveFilters(id)
      try {
        const res = await fetchCatalogEntriesByIdentifier(id, {
          limit,
          offset: startOffset,
          search: snapshot.search,
          parentEntryId: activeFilters.parentEntryId,
          typeEquals: activeFilters.typeEquals,
          ...buildListFilterParams(cfg.codeFilter, cfg.typeFilter),
          orderBy: cfg.orderBy
        })
        if (!isCurrentVersion(id, version)) return
        const appended = toOptions(res.entries, locale)
        setFor(
          id,
          prev => ({
            ...prev,
            loading: false,
            options: [...prev.options, ...appended],
            total: res.totalCount,
            limit,
            offset: startOffset + appended.length,
            metaByValue: { ...prev.metaByValue, ...buildEntryMeta(res.entries) }
          }),
          'loadMore:success'
        )
      } catch {
        if (isCurrentVersion(id, version)) {
          setFor(id, prev => (prev.loading ? { ...prev, loading: false } : prev), 'loadMore:error')
        }
      }
    },
    [getActiveFilters, setFor, fetchCatalogEntriesByIdentifier, defaultPageSize, locale]
  )

  const controllers = useCatalogSelectControllers({
    configs,
    stateById,
    externalValues,
    configById,
    defaultPageSize,
    createSetValue,
    createOnSearch,
    createOnLoadMore
  })

  // Handle all dependencies in unified hook
  useCatalogDependencies({
    configs,
    stateById,
    setFor,
    fetchCatalogEntriesByIdentifier,
    defaultPageSize,
    externalValues,
    locale,
    requestVersionRef,
    nextVersion,
    isCurrentVersion
  })

  return { controllers, preload: initOnce }
}

export default useCatalogSelect

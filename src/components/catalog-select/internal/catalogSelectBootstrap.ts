import {
  buildEntryMeta,
  CatalogSelectExternalValue,
  getLocalizedValue,
  resolveCatalogSelectFieldValue,
  resolveCatalogSelectFieldValues,
  toOptions
} from './catalogSelectUtils'
import { buildListFilterParams, parseCatalogIdentifier } from './catalogSelectQueryHelpers'
import type { CatalogSelectConfig, CatalogSelectState } from './useCatalogSelect'

type SetFor = (id: string, updater: (prev: CatalogSelectState) => CatalogSelectState) => void

const hasPrefetchedData = (config: CatalogSelectConfig, stateById: Record<string, CatalogSelectState>): boolean => {
  const currentState = stateById[config.id]
  return Boolean(currentState?.prefetchedOptions && currentState.prefetchedOptions.length > 0)
}

const findReusableSourceConfig = (
  config: CatalogSelectConfig,
  configs: CatalogSelectConfig[],
  stateById: Record<string, CatalogSelectState>
): CatalogSelectConfig | undefined => {
  if (config.parentField || config.filterField) {
    return undefined
  }

  return configs.find(
    currentConfig =>
      currentConfig.id !== config.id &&
      currentConfig.catalogIdentifier === config.catalogIdentifier &&
      hasPrefetchedData(currentConfig, stateById)
  )
}

const reuseConfigData = ({
  targetConfig,
  sourceConfig,
  stateById,
  defaultPageSize,
  setFor
}: {
  targetConfig: CatalogSelectConfig
  sourceConfig: CatalogSelectConfig
  stateById: Record<string, CatalogSelectState>
  defaultPageSize: number
  setFor: SetFor
}) => {
  const sourceState = stateById[sourceConfig.id]
  const nextOptions = sourceState.prefetchedOptions || []
  const nextTotal = sourceState.fullTotal || sourceState.total || 0
  const nextLimit = targetConfig.pageSize ?? defaultPageSize
  const nextOffset = nextOptions.length
  const nextVariant = sourceState.variant || 'combobox'
  const nextMetaByValue = sourceState.metaByValue || {}

  setFor(targetConfig.id, previousState => {
    if (
      previousState.loading === false &&
      previousState.options === nextOptions &&
      previousState.prefetchedOptions === nextOptions &&
      previousState.total === nextTotal &&
      previousState.fullTotal === nextTotal &&
      previousState.limit === nextLimit &&
      previousState.offset === nextOffset &&
      previousState.variant === nextVariant &&
      previousState.metaByValue === nextMetaByValue
    ) {
      return previousState
    }

    return {
      ...previousState,
      loading: false,
      options: nextOptions,
      prefetchedOptions: nextOptions,
      total: nextTotal,
      fullTotal: nextTotal,
      limit: nextLimit,
      offset: nextOffset,
      variant: nextVariant,
      metaByValue: nextMetaByValue
    }
  })
}

const processCatalogEntries = ({
  catalog,
  configs,
  configsToReuse,
  defaultPageSize,
  defaultThreshold,
  externalValues,
  stateById,
  locale,
  setFor
}: {
  catalog: any
  configs: CatalogSelectConfig[]
  configsToReuse: Map<string, string>
  defaultPageSize: number
  defaultThreshold: number
  externalValues?: Record<string, CatalogSelectExternalValue>
  stateById: Record<string, CatalogSelectState>
  locale?: string
  setFor: SetFor
}) => {
  const catalogIdentifierWithVersion = `${catalog.identifier}:${catalog.version || 'v1'}`
  const matchingConfigs = configs.filter(
    config =>
      (config.catalogIdentifier === catalogIdentifierWithVersion ||
        (config.catalogIdentifier === catalog.identifier && (catalog.version || 'v1') === 'v1')) &&
      !configsToReuse.has(config.id)
  )

  for (const config of matchingConfigs) {
    const limit = config.pageSize ?? defaultPageSize
    const total = catalog.total ?? catalog.entriesCount ?? 0
    const initialEntries = (catalog.entries || []).slice(0, limit)
    const metaByValue = buildEntryMeta(initialEntries)
    const hasParentWithValue = config.parentField
      ? resolveCatalogSelectFieldValue(config.parentField, externalValues, stateById)
      : ''
    const prefetchedOptions = toOptions(initialEntries, locale)

    setFor(config.id, previousState => {
      if (previousState.lastFiltersSig) {
        return previousState
      }

      const nextOptions = hasParentWithValue ? [] : prefetchedOptions
      const nextTotal = hasParentWithValue ? 0 : total
      const nextOffset = hasParentWithValue ? 0 : initialEntries.length
      const nextVariant = total <= defaultThreshold ? 'select' : 'combobox'

      if (
        previousState.loading === false &&
        previousState.options === nextOptions &&
        previousState.prefetchedOptions === prefetchedOptions &&
        previousState.total === nextTotal &&
        previousState.fullTotal === total &&
        previousState.limit === limit &&
        previousState.offset === nextOffset &&
        previousState.variant === nextVariant &&
        previousState.metaByValue === metaByValue
      ) {
        return previousState
      }

      return {
        ...previousState,
        loading: false,
        options: nextOptions,
        prefetchedOptions,
        total: nextTotal,
        fullTotal: total,
        limit,
        offset: nextOffset,
        variant: nextVariant,
        metaByValue
      }
    })
  }
}

export const preloadCatalogSelectData = async ({
  configs,
  stateById,
  externalValues,
  defaultPageSize,
  defaultThreshold,
  locale,
  fetchCatalogs,
  fetchCatalogEntriesByIdentifier,
  setFor
}: {
  configs: CatalogSelectConfig[]
  stateById: Record<string, CatalogSelectState>
  externalValues?: Record<string, CatalogSelectExternalValue>
  defaultPageSize: number
  defaultThreshold: number
  locale?: string
  fetchCatalogs: (params: any) => Promise<{ items?: any[] }>
  // When provided, selected values not covered by the batch preload are fetched in parallel,
  // so missingOptionSignature never has to fire a separate network call for them.
  fetchCatalogEntriesByIdentifier?: (instanceId: string, params: any) => Promise<{ entries: any[]; totalCount: number }>
  setFor: SetFor
}) => {
  const allIdentifiers = configs.filter(config => config.prefetch !== false).map(config => config.catalogIdentifier)
  const identifiers = [...new Set(allIdentifiers)]
  if (identifiers.length === 0) return

  const configsNeedingData = new Set<string>()
  const configsToReuse = new Map<string, string>()

  for (const config of configs.filter(currentConfig => currentConfig.prefetch !== false)) {
    if (hasPrefetchedData(config, stateById)) continue

    const sourceConfig = findReusableSourceConfig(config, configs, stateById)
    if (sourceConfig) {
      reuseConfigData({ targetConfig: config, sourceConfig, stateById, defaultPageSize, setFor })
      configsToReuse.set(config.id, sourceConfig.id)
      continue
    }

    configsNeedingData.add(config.catalogIdentifier)
  }

  const identifiersToFetch = identifiers.filter(identifier => configsNeedingData.has(identifier))
  if (identifiersToFetch.length === 0) return

  // Identify non-child, non-reused configs that have a known selected value in externalValues.
  // These will be fetched in parallel with the batch so that missingOptionSignature never needs
  // to trigger a separate network round-trip after the preload completes.
  const preemptiveFetches: Array<{ configId: string; values: string[] }> = []
  if (fetchCatalogEntriesByIdentifier && externalValues) {
    for (const config of configs.filter(
      c => c.prefetch !== false && !c.parentField && !c.filterField && !configsToReuse.has(c.id)
    )) {
      if (!configsNeedingData.has(config.catalogIdentifier)) continue
      const values = resolveCatalogSelectFieldValues(config.id, externalValues, stateById)
      if (values.length > 0) {
        preemptiveFetches.push({ configId: config.id, values })
      }
    }
  }

  const largestPageSize = Math.max(...configs.map(config => config.pageSize ?? defaultPageSize))

  // Run the batch catalog fetch AND any preemptive entry fetches IN PARALLEL.
  // The preemptive fetches retrieve the currently-selected entries that are unlikely to appear
  // in the alphabetically-ordered first page of the batch (e.g. "Romania" in a 195-country list).
  const [list, ...preemptiveResults] = await Promise.all([
    fetchCatalogs({
      catalogIdentifiers: identifiersToFetch,
      includeCatalogEntries: true,
      entriesLimit: largestPageSize,
      entriesOffset: 0,
      limit: identifiersToFetch.length
    }),
    ...preemptiveFetches.map(({ configId, values }) =>
      fetchCatalogEntriesByIdentifier!(configId, {
        limit: values.length,
        offset: 0,
        entryId: values,
        orderBy: configs.find(c => c.id === configId)?.orderBy
      }).catch(() => ({ entries: [], totalCount: 0 }))
    )
  ])

  // Track which entry IDs were returned by the batch so we can skip duplicates below.
  const batchEntryIdsByCatalogId = new Map<string, Set<string>>()
  for (const catalog of list.items || []) {
    processCatalogEntries({
      catalog,
      configs,
      configsToReuse,
      defaultPageSize,
      defaultThreshold,
      externalValues,
      stateById,
      locale,
      setFor
    })

    const catalogId = `${catalog.identifier}:${catalog.version || 'v1'}`
    batchEntryIdsByCatalogId.set(catalogId, new Set((catalog.entries || []).map((e: any) => e.id as string)))
  }

  // Merge preemptive results: add entries that were not already returned by the batch.
  for (let i = 0; i < preemptiveFetches.length; i++) {
    const { configId } = preemptiveFetches[i]
    const result = preemptiveResults[i]
    if (!result || result.entries.length === 0) continue

    const config = configs.find(c => c.id === configId)
    if (!config) continue

    const batchIds = batchEntryIdsByCatalogId.get(config.catalogIdentifier)
    const newEntries = result.entries.filter((e: any) => !batchIds?.has(e.id))
    if (newEntries.length === 0) continue

    setFor(configId, previousState => {
      const nextOptions = [...previousState.options]
      const nextMetaByValue = { ...(previousState.metaByValue || {}) }
      let hasChanges = false

      for (const entry of newEntries) {
        if (!nextOptions.some(o => o.value === entry.id)) {
          nextOptions.unshift({ value: entry.id, label: getLocalizedValue(entry, locale) })
          hasChanges = true
        }
        const nextMeta = { parentEntryId: entry.parentEntryId, type: entry.type }
        const existingMeta = nextMetaByValue[entry.id]
        if (existingMeta?.parentEntryId !== nextMeta.parentEntryId || existingMeta?.type !== nextMeta.type) {
          nextMetaByValue[entry.id] = nextMeta
          hasChanges = true
        }
      }

      return hasChanges ? { ...previousState, options: nextOptions, metaByValue: nextMetaByValue } : previousState
    })
  }
}

export const primeNonPrefetchCatalogs = async ({
  configs,
  defaultPageSize,
  defaultThreshold,
  locale,
  externalValues,
  stateById,
  fetchCatalog,
  setFor
}: {
  configs: CatalogSelectConfig[]
  defaultPageSize: number
  defaultThreshold: number
  locale?: string
  externalValues?: Record<string, CatalogSelectExternalValue>
  stateById: Record<string, CatalogSelectState>
  fetchCatalog: (params: any, options?: any) => Promise<any>
  setFor: SetFor
}) => {
  const nonPrefetchConfigs = configs.filter(config => {
    if (config.prefetch !== false) return false
    const hasFilters =
      (config.codeFilter && config.codeFilter.mode !== 'all') || (config.typeFilter && config.typeFilter.mode !== 'all')
    return !hasFilters
  })

  await Promise.all(
    nonPrefetchConfigs.map(async config => {
      const { identifier, version } = parseCatalogIdentifier(config.catalogIdentifier)
      try {
        const fullCatalog = await fetchCatalog(
          { identifier, version, entriesLimit: defaultThreshold, entriesOffset: 0, orderBy: config.orderBy },
          { includeCatalogEntries: true }
        )
        const total = fullCatalog?.total ?? fullCatalog?.entriesCount ?? 0
        const entries = fullCatalog?.entries || []
        const hasParentWithValue = config.parentField
          ? resolveCatalogSelectFieldValue(config.parentField, externalValues, stateById)
          : ''
        const options = hasParentWithValue ? [] : total <= defaultThreshold ? toOptions(entries, locale) : []
        const offset = hasParentWithValue ? 0 : total <= defaultThreshold ? entries.length : 0

        setFor(config.id, previousState => {
          if (previousState.lastFiltersSig) {
            return previousState
          }

          const nextPrefetchedOptions = total <= defaultThreshold ? toOptions(entries, locale) : []
          const nextTotal = hasParentWithValue ? 0 : total
          const nextVariant = total <= defaultThreshold ? 'select' : 'combobox'

          if (
            previousState.loading === false &&
            previousState.options === options &&
            previousState.prefetchedOptions === nextPrefetchedOptions &&
            previousState.total === nextTotal &&
            previousState.fullTotal === total &&
            previousState.limit === (config.pageSize ?? defaultPageSize) &&
            previousState.offset === offset &&
            previousState.variant === nextVariant
          ) {
            return previousState
          }

          return {
            ...previousState,
            loading: false,
            options,
            prefetchedOptions: nextPrefetchedOptions,
            total: nextTotal,
            fullTotal: total,
            limit: config.pageSize ?? defaultPageSize,
            offset,
            variant: nextVariant
          }
        })
      } catch {
        setFor(config.id, previousState =>
          previousState.loading ? { ...previousState, loading: false } : previousState
        )
      }
    })
  )
}

export const finalizeInitialLoading = ({ configs, setFor }: { configs: CatalogSelectConfig[]; setFor: SetFor }) => {
  for (const config of configs) {
    setFor(config.id, previousState =>
      previousState.loading &&
      !previousState.lastFiltersSig &&
      previousState.options.length === 0 &&
      (previousState.prefetchedOptions?.length || 0) === 0
        ? { ...previousState, loading: false }
        : previousState
    )
  }
}

export const fetchMissingCatalogOptions = async ({
  configs,
  stateById,
  externalValues,
  locale,
  fetchCatalogEntriesByIdentifier,
  setFor
}: {
  configs: CatalogSelectConfig[]
  stateById: Record<string, CatalogSelectState>
  externalValues?: Record<string, CatalogSelectExternalValue>
  locale?: string
  fetchCatalogEntriesByIdentifier: (instanceId: string, params: any) => Promise<{ entries: any[]; totalCount: number }>
  setFor: SetFor
}) => {
  const missingOptions = configs.flatMap(config => {
    const currentState = stateById[config.id]
    const effectiveValues = resolveCatalogSelectFieldValues(config.id, externalValues, stateById)
    if (effectiveValues.length === 0 || !currentState?.options) return []

    const optionValueSet = new Set(currentState.options.map(option => option.value))
    const missingValues = effectiveValues.filter(effectiveValue => !optionValueSet.has(effectiveValue))
    return missingValues.length > 0 ? [{ config, values: missingValues }] : []
  })

  await Promise.all(
    missingOptions.map(async ({ config, values }) => {
      try {
        const result = await fetchCatalogEntriesByIdentifier(config.id, {
          limit: values.length,
          offset: 0,
          entryId: values,
          ...buildListFilterParams(config.codeFilter, config.typeFilter),
          orderBy: config.orderBy
        })
        if (result.entries.length === 0) return

        setFor(config.id, previousState => {
          const nextOptions = [...previousState.options]
          const nextMetaByValue = { ...previousState.metaByValue }
          let hasChanges = false

          for (const entry of result.entries) {
            const optionExists = nextOptions.some(currentOption => currentOption.value === entry.id)
            if (!optionExists) {
              nextOptions.unshift({ value: entry.id, label: getLocalizedValue(entry, locale) })
              hasChanges = true
            }

            const nextMeta = { parentEntryId: entry.parentEntryId, type: entry.type }
            const existingMeta = nextMetaByValue[entry.id]
            const metaIsUnchanged =
              existingMeta?.parentEntryId === nextMeta.parentEntryId && existingMeta?.type === nextMeta.type

            if (!metaIsUnchanged) {
              nextMetaByValue[entry.id] = nextMeta
              hasChanges = true
            }
          }

          if (!hasChanges) {
            return previousState
          }

          return {
            ...previousState,
            options: nextOptions,
            metaByValue: nextMetaByValue
          }
        })
      } catch {
        return
      }
    })
  )
}

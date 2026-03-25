import type { CatalogSelectConfig } from './useCatalogSelect'
import { clearChildValue, resetToPrefetchedOptions } from './catalogSelectDependencyShared'
import { buildFiltersSignature, CatalogSelectExternalValue, toOptions } from './catalogSelectUtils'
import type {
  CatalogSelectDependencyFetcher,
  CatalogSelectDependencySetter,
  CatalogSelectDependencyState
} from './catalogSelectDependencyTypes'

type FetchFilteredEntriesOptions = {
  id: string
  config: CatalogSelectConfig
  filter: NonNullable<CatalogSelectConfig['filterField']>[0]
  externalValue: string
  fetchCatalogEntriesByIdentifier: CatalogSelectDependencyFetcher
  defaultPageSize: number
  locale: string | undefined
  setFor: CatalogSelectDependencySetter
  nextVersion: (id: string) => number
  isCurrentVersion: (id: string, version: number) => boolean
}

const fetchFilteredEntries = async ({
  id,
  config,
  filter,
  externalValue,
  fetchCatalogEntriesByIdentifier,
  defaultPageSize,
  locale,
  setFor,
  nextVersion,
  isCurrentVersion
}: FetchFilteredEntriesOptions): Promise<void> => {
  const filtersSig = buildFiltersSignature({
    ...(filter.on === 'type' && externalValue ? { typeEquals: externalValue } : {})
  })
  const version = nextVersion(id)

  setFor(id, previousState =>
    previousState.loading &&
    previousState.options.length === 0 &&
    previousState.offset === 0 &&
    previousState.lastFiltersSig === filtersSig
      ? previousState
      : { ...previousState, options: [], loading: true, offset: 0, lastFiltersSig: filtersSig }
  )

  try {
    const result = await fetchCatalogEntriesByIdentifier(id, {
      limit: config.pageSize ?? defaultPageSize,
      offset: 0,
      [filter.on === 'type' ? 'typeEquals' : filter.on]: externalValue
    })

    if (!isCurrentVersion(id, version)) return

    setFor(id, previousState => ({
      ...previousState,
      loading: false,
      options: toOptions(result.entries, locale),
      total: result.totalCount,
      offset: result.entries.length,
      lastFiltersSig: filtersSig
    }))
  } catch {
    if (isCurrentVersion(id, version)) {
      setFor(id, previousState =>
        previousState.loading || previousState.lastFiltersSig !== filtersSig
          ? { ...previousState, loading: false, lastFiltersSig: filtersSig }
          : previousState
      )
    }
  }
}

const handleSingleExternalFilter = async ({
  id,
  filter,
  config,
  stateById,
  setFor,
  fetchCatalogEntriesByIdentifier,
  defaultPageSize,
  locale,
  externalValues,
  lastExternalValuesRef,
  nextVersion,
  isCurrentVersion
}: {
  id: string
  filter: NonNullable<CatalogSelectConfig['filterField']>[0]
  config: CatalogSelectConfig
  stateById: Record<string, CatalogSelectDependencyState>
  setFor: CatalogSelectDependencySetter
  fetchCatalogEntriesByIdentifier: CatalogSelectDependencyFetcher
  defaultPageSize: number
  locale: string | undefined
  externalValues: Record<string, CatalogSelectExternalValue> | undefined
  lastExternalValuesRef: React.MutableRefObject<Map<string, string | null>>
  nextVersion: (id: string) => number
  isCurrentVersion: (id: string, version: number) => boolean
}): Promise<void> => {
  const rawExternalValue = externalValues?.[filter.from]
  const externalValue = typeof rawExternalValue === 'string' ? rawExternalValue : null
  const lastExternalValue = lastExternalValuesRef.current.get(`${id}_${filter.from}`)

  if (lastExternalValue === externalValue) return

  lastExternalValuesRef.current.set(`${id}_${filter.from}`, externalValue)

  if (stateById[id]?.value !== '') {
    clearChildValue({ id, setFor })
  }

  if (externalValue) {
    await fetchFilteredEntries({
      id,
      config,
      filter,
      externalValue,
      fetchCatalogEntriesByIdentifier,
      defaultPageSize,
      locale,
      setFor,
      nextVersion,
      isCurrentVersion
    })
    return
  }

  resetToPrefetchedOptions({ id, setFor })
}

export const handleExternalFilters = async ({
  id,
  filterField,
  config,
  stateById,
  setFor,
  fetchCatalogEntriesByIdentifier,
  defaultPageSize,
  locale,
  externalValues,
  lastExternalValuesRef,
  nextVersion,
  isCurrentVersion
}: {
  id: string
  filterField: CatalogSelectConfig['filterField']
  config: CatalogSelectConfig
  stateById: Record<string, CatalogSelectDependencyState>
  setFor: CatalogSelectDependencySetter
  fetchCatalogEntriesByIdentifier: CatalogSelectDependencyFetcher
  defaultPageSize: number
  locale?: string
  externalValues?: Record<string, CatalogSelectExternalValue>
  lastExternalValuesRef: React.MutableRefObject<Map<string, string | null>>
  nextVersion: (id: string) => number
  isCurrentVersion: (id: string, version: number) => boolean
}) => {
  if (!filterField) return

  for (const filter of filterField) {
    await handleSingleExternalFilter({
      id,
      filter,
      config,
      stateById,
      setFor,
      fetchCatalogEntriesByIdentifier,
      defaultPageSize,
      locale,
      externalValues,
      lastExternalValuesRef,
      nextVersion,
      isCurrentVersion
    })
  }
}

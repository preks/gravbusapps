import type { CatalogSelectConfig } from './useCatalogSelect'
import {
  toOptions,
  buildEntryMeta,
  CatalogSelectExternalValue,
  buildFiltersSignature,
  resolveCatalogSelectFieldValue
} from './catalogSelectUtils'
import type {
  CatalogSelectDependencyFetcher,
  CatalogSelectDependencySetter,
  CatalogSelectDependencyState
} from './catalogSelectDependencyTypes'

export const getParentValue = (
  parentField: string,
  externalValues?: Record<string, CatalogSelectExternalValue>,
  stateById?: Record<string, CatalogSelectDependencyState>
): string => resolveCatalogSelectFieldValue(parentField, externalValues, stateById)

export const getFieldValue = (
  fieldId: string,
  externalValues?: Record<string, CatalogSelectExternalValue>,
  stateById?: Record<string, CatalogSelectDependencyState>
): string => resolveCatalogSelectFieldValue(fieldId, externalValues, stateById)

const hasSameMeta = (
  currentMeta: { parentEntryId?: string; type?: string } | undefined,
  nextMeta: { parentEntryId?: string; type?: string }
): boolean => currentMeta?.parentEntryId === nextMeta.parentEntryId && currentMeta?.type === nextMeta.type

export const fetchFilteredOptionsWithParent = async ({
  id,
  parentValue,
  config,
  defaultPageSize,
  setFor,
  fetchCatalogEntriesByIdentifier,
  locale,
  nextVersion,
  isCurrentVersion
}: {
  id: string
  parentValue: string
  config: CatalogSelectConfig
  defaultPageSize: number
  setFor: CatalogSelectDependencySetter
  fetchCatalogEntriesByIdentifier: CatalogSelectDependencyFetcher
  locale?: string
  nextVersion: (id: string) => number
  isCurrentVersion: (id: string, version: number) => boolean
}) => {
  const filtersSig = buildFiltersSignature({ parentEntryId: parentValue })
  const version = nextVersion(id)

  setFor(id, previousState =>
    previousState.loading &&
    previousState.options.length === 0 &&
    previousState.offset === 0 &&
    previousState.lastFiltersSig === filtersSig
      ? previousState
      : {
          ...previousState,
          options: [],
          loading: true,
          offset: 0,
          lastFiltersSig: filtersSig
        }
  )

  try {
    const result = await fetchCatalogEntriesByIdentifier(id, {
      limit: config.pageSize ?? defaultPageSize,
      offset: 0,
      parentEntryId: parentValue
    })

    if (!isCurrentVersion(id, version)) return

    const nextMetaByValue = buildEntryMeta(result.entries)
    setFor(id, previousState => ({
      ...previousState,
      loading: false,
      options: toOptions(result.entries, locale),
      total: result.totalCount,
      offset: result.entries.length,
      metaByValue: { ...previousState.metaByValue, ...nextMetaByValue },
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

export const resetToPrefetchedOptions = ({ id, setFor }: { id: string; setFor: CatalogSelectDependencySetter }) => {
  setFor(id, previousState => {
    const nextOptions = previousState.prefetchedOptions || []
    const nextOffset = nextOptions.length
    const nextTotal = previousState.fullTotal ?? previousState.total ?? 0

    if (
      previousState.options === nextOptions &&
      previousState.offset === nextOffset &&
      previousState.loading === false &&
      previousState.search === undefined &&
      previousState.lastFiltersSig === undefined &&
      previousState.total === nextTotal &&
      previousState.fullTotal === nextTotal
    ) {
      return previousState
    }

    return {
      ...previousState,
      options: nextOptions,
      offset: nextOffset,
      loading: false,
      search: undefined,
      lastFiltersSig: undefined,
      total: nextTotal,
      fullTotal: nextTotal
    }
  })
}

export const clearChildValue = ({ id, setFor }: { id: string; setFor: CatalogSelectDependencySetter }) => {
  setFor(id, previousState =>
    previousState.value === '' && previousState.search === undefined
      ? previousState
      : { ...previousState, value: '', search: undefined }
  )
}

export const resolveChildMeta = async ({
  id,
  childValue,
  stateById,
  setFor,
  fetchCatalogEntriesByIdentifier
}: {
  id: string
  childValue: string
  stateById: Record<string, CatalogSelectDependencyState>
  setFor: CatalogSelectDependencySetter
  fetchCatalogEntriesByIdentifier: CatalogSelectDependencyFetcher
}): Promise<{ parentEntryId?: string; type?: string } | undefined> => {
  if (!childValue) return undefined

  const cachedMeta = stateById[id]?.metaByValue?.[childValue]
  if (cachedMeta?.parentEntryId || cachedMeta?.type) {
    return cachedMeta
  }

  const result = await fetchCatalogEntriesByIdentifier(id, {
    limit: 1,
    offset: 0,
    entryId: childValue
  })

  if (result.entries.length === 0) return cachedMeta

  const entry = result.entries[0]
  const resolvedMeta = { parentEntryId: entry.parentEntryId, type: entry.type }

  setFor(id, previousState => {
    const existingMeta = previousState.metaByValue?.[entry.id]
    if (hasSameMeta(existingMeta, resolvedMeta)) {
      return previousState
    }

    return {
      ...previousState,
      metaByValue: { ...previousState.metaByValue, [entry.id]: resolvedMeta }
    }
  })

  return resolvedMeta
}

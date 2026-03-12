import type React from 'react'
import type { CatalogSelectConfig } from './useCatalogSelect'
import {
  clearChildValue,
  fetchFilteredOptionsWithParent,
  getParentValue,
  resolveChildMeta,
  resetToPrefetchedOptions
} from './catalogSelectDependencyShared'
import type {
  CatalogSelectDependencyFetcher,
  CatalogSelectDependencySetter,
  CatalogSelectDependencyState
} from './catalogSelectDependencyTypes'
import { CatalogSelectExternalValue, toOptions } from './catalogSelectUtils'

export type DependencyCase =
  | 'initial-load'
  | 'parent-selected'
  | 'child-selected-bi'
  | 'child-selected-uni'
  | 'parent-cleared'
  | 'child-cleared'
  | 'no-change'

export type CaseHandlerParams = {
  id: string
  config: CatalogSelectConfig
  parentField: string
  parentValue: string
  childValue: string
  isBiDirectional: boolean
  stateById: Record<string, CatalogSelectDependencyState>
  setFor: CatalogSelectDependencySetter
  fetchCatalogEntriesByIdentifier: CatalogSelectDependencyFetcher
  defaultPageSize: number
  locale?: string
  lastParentValuesRef: React.MutableRefObject<Map<string, string>>
  lastChildValuesRef: React.MutableRefObject<Map<string, string>>
  autoSelectedParentsRef: React.MutableRefObject<Set<string>>
  externalValues?: Record<string, CatalogSelectExternalValue>
  configs: CatalogSelectConfig[]
  nextVersion: (id: string) => number
  isCurrentVersion: (id: string, version: number) => boolean
}

export const determineCase = (
  parentValue: string,
  childValue: string,
  lastParentValue: string | undefined,
  lastChildValue: string | undefined,
  isBiDirectional: boolean,
  wasAutoSelected: boolean,
  parentManuallyCleared: boolean
): DependencyCase => {
  if (lastParentValue === undefined && parentValue && childValue) return 'initial-load'
  if (lastParentValue !== parentValue && parentValue && !wasAutoSelected) return 'parent-selected'
  if (
    isBiDirectional &&
    childValue &&
    lastChildValue !== childValue &&
    !parentValue &&
    !lastParentValue &&
    !parentManuallyCleared
  ) {
    return 'child-selected-bi'
  }
  if (!isBiDirectional && childValue && lastChildValue !== childValue) return 'child-selected-uni'
  if (lastParentValue && !parentValue) return 'parent-cleared'
  if (lastChildValue && !childValue) return 'child-cleared'
  return 'no-change'
}

const setParentValueAndFetchOptions = async ({
  parentField,
  parentValue,
  id,
  config,
  setFor,
  fetchCatalogEntriesByIdentifier,
  defaultPageSize,
  locale,
  autoSelectedParentsRef,
  nextVersion,
  isCurrentVersion
}: {
  parentField: string
  parentValue: string
  id: string
  config: CatalogSelectConfig
  setFor: CatalogSelectDependencySetter
  fetchCatalogEntriesByIdentifier: CatalogSelectDependencyFetcher
  defaultPageSize: number
  locale?: string
  autoSelectedParentsRef: React.MutableRefObject<Set<string>>
  nextVersion: (id: string) => number
  isCurrentVersion: (id: string, version: number) => boolean
}) => {
  autoSelectedParentsRef.current.add(parentField)

  setFor(parentField, previousState =>
    previousState.value === parentValue && previousState.manuallyCleared === false
      ? previousState
      : { ...previousState, value: parentValue, manuallyCleared: false }
  )

  fetchFilteredOptionsWithParent({
    id,
    parentValue,
    config,
    defaultPageSize,
    setFor,
    fetchCatalogEntriesByIdentifier,
    locale,
    nextVersion,
    isCurrentVersion
  })
}

export const handleInitialLoad = async ({
  id,
  parentField,
  parentValue,
  childValue,
  config,
  configs,
  defaultPageSize,
  setFor,
  fetchCatalogEntriesByIdentifier,
  locale,
  lastParentValuesRef,
  lastChildValuesRef,
  stateById,
  nextVersion,
  isCurrentVersion
}: CaseHandlerParams) => {
  // Set refs synchronously first to prevent re-entrant calls.
  // The effect that calls this handler depends on handleParentChildDependency which
  // changes reference on every stateById update. Without this early commit, the effect
  // re-runs while this async function is still running, sees lastParentValue===undefined,
  // and calls handleInitialLoad again causing duplicate fetches.
  if (parentValue) lastParentValuesRef.current.set(parentField, parentValue)
  if (childValue) lastChildValuesRef.current.set(id, childValue)

  if (parentValue) {
    const currentParentValue = stateById[parentField]?.value
    if (!currentParentValue || currentParentValue !== parentValue) {
      const parentConfig = configs.find(currentConfig => currentConfig.id === parentField)
      setFor(parentField, previousState =>
        previousState
          ? { ...previousState, value: parentValue }
          : {
              value: parentValue,
              loading: false,
              options: [],
              total: 0,
              limit: parentConfig?.pageSize ?? defaultPageSize,
              offset: 0,
              variant: 'combobox'
            }
      )
    }

    // Parent label (if missing from options) is handled by fetchMissingCatalogOptions,
    // which runs after all configs finish loading. Fetching it here would duplicate that
    // request and also delay fetchFilteredOptionsWithParent (which was awaiting it).
    fetchFilteredOptionsWithParent({
      id,
      parentValue,
      config,
      defaultPageSize,
      setFor,
      fetchCatalogEntriesByIdentifier,
      locale,
      nextVersion,
      isCurrentVersion
    })
  }
}

export const handleParentSelected = async ({
  id,
  parentField,
  parentValue,
  childValue,
  isBiDirectional,
  config,
  stateById,
  setFor,
  fetchCatalogEntriesByIdentifier,
  defaultPageSize,
  locale,
  lastParentValuesRef,
  lastChildValuesRef,
  nextVersion,
  isCurrentVersion
}: CaseHandlerParams) => {
  // Commit the new parent value synchronously before any async work to prevent
  // re-entrant calls from the dependency effect that fires on every stateById update.
  lastParentValuesRef.current.set(parentField, parentValue)

  const childMeta = childValue
    ? await resolveChildMeta({
        id,
        childValue,
        stateById,
        setFor,
        fetchCatalogEntriesByIdentifier
      }).catch(() => stateById[id]?.metaByValue?.[childValue])
    : undefined

  const shouldKeepChild = isBiDirectional && childMeta?.parentEntryId === parentValue

  if (childValue && !shouldKeepChild) {
    clearChildValue({ id, setFor })
    lastChildValuesRef.current.set(id, '')
  }

  if (parentValue) {
    fetchFilteredOptionsWithParent({
      id,
      parentValue,
      config,
      defaultPageSize,
      setFor,
      fetchCatalogEntriesByIdentifier,
      locale,
      nextVersion,
      isCurrentVersion
    })
  }
}

const autoSelectParentFromChild = async ({
  id,
  parentField,
  childValue,
  childMeta,
  config,
  stateById,
  setFor,
  fetchCatalogEntriesByIdentifier,
  defaultPageSize,
  locale,
  autoSelectedParentsRef,
  lastParentValuesRef,
  nextVersion,
  isCurrentVersion
}: CaseHandlerParams & { childMeta?: { parentEntryId?: string; type?: string } }) => {
  const resolvedChildMeta =
    childMeta?.parentEntryId || childMeta?.type
      ? childMeta
      : await resolveChildMeta({
          id,
          childValue,
          stateById,
          setFor,
          fetchCatalogEntriesByIdentifier
        }).catch(() => childMeta)

  if (!resolvedChildMeta?.parentEntryId) return undefined

  // Commit the resolved parent value synchronously before setParentValueAndFetchOptions
  // triggers a state update (setFor → re-render). Without this, the dependency effect
  // re-fires while the async work is still in progress and sees lastParentValue===undefined,
  // causing determineCase to return 'initial-load' and firing a duplicate
  // fetchFilteredOptionsWithParent call.
  lastParentValuesRef.current.set(parentField, resolvedChildMeta.parentEntryId)

  await setParentValueAndFetchOptions({
    parentField,
    parentValue: resolvedChildMeta.parentEntryId,
    id,
    config,
    stateById,
    setFor,
    fetchCatalogEntriesByIdentifier,
    defaultPageSize,
    locale,
    autoSelectedParentsRef,
    nextVersion,
    isCurrentVersion
  })

  return resolvedChildMeta.parentEntryId
}

export const handleChildSelectedBi = async (params: CaseHandlerParams) => {
  // Commit synchronously before any async work to prevent the dependency effect from
  // re-firing with lastChildValue===undefined while autoSelectParentFromChild is still
  // running. Without this, a mid-async re-render sees the unchanged lastChildValue and
  // determineCase can return 'child-selected-bi' again, causing duplicate requests.
  params.lastChildValuesRef.current.set(params.id, params.childValue)

  const childMeta = params.stateById[params.id]?.metaByValue?.[params.childValue]

  if (!childMeta && params.childValue) {
    await autoSelectParentFromChild({ ...params, childMeta: undefined }).catch(() => undefined)
  } else if (childMeta?.parentEntryId) {
    await autoSelectParentFromChild({ ...params, childMeta })
  }
}

export const handleChildSelectedUni = ({ childValue, id, lastChildValuesRef }: CaseHandlerParams) => {
  lastChildValuesRef.current.set(id, childValue)
}

export const handleParentCleared = async ({
  id,
  parentField,
  childValue,
  config,
  stateById,
  setFor,
  fetchCatalogEntriesByIdentifier,
  defaultPageSize,
  locale,
  lastParentValuesRef,
  lastChildValuesRef
}: CaseHandlerParams) => {
  if (childValue) {
    clearChildValue({ id, setFor })
    lastChildValuesRef.current.set(id, '')
  }

  const childState = stateById[id]
  if (!childState?.prefetchedOptions || childState.prefetchedOptions.length === 0) {
    setFor(id, previousState =>
      previousState.loading &&
      previousState.options.length === 0 &&
      previousState.offset === 0 &&
      previousState.lastFiltersSig === undefined
        ? previousState
        : { ...previousState, loading: true, options: [], offset: 0, lastFiltersSig: undefined }
    )

    try {
      const result = await fetchCatalogEntriesByIdentifier(id, {
        limit: config.pageSize ?? defaultPageSize,
        offset: 0
      })

      const nextOptions = toOptions(result.entries, locale)
      setFor(id, previousState => ({
        ...previousState,
        loading: false,
        options: nextOptions,
        prefetchedOptions: nextOptions,
        search: undefined,
        total: result.totalCount,
        fullTotal: result.totalCount,
        offset: nextOptions.length,
        lastFiltersSig: undefined
      }))
    } catch {
      setFor(id, previousState => (previousState.loading ? { ...previousState, loading: false } : previousState))
    }
  } else {
    resetToPrefetchedOptions({ id, setFor })
  }

  lastParentValuesRef.current.set(parentField, '')
}

export const handleChildCleared = ({
  id,
  isBiDirectional,
  wasAutoSelected,
  parentField,
  setFor,
  lastChildValuesRef
}: CaseHandlerParams & { wasAutoSelected: boolean; parentState?: CatalogSelectDependencyState }) => {
  lastChildValuesRef.current.set(id, '')
  if (isBiDirectional && wasAutoSelected) {
    setFor(parentField, previousState =>
      previousState.manuallyCleared === false ? previousState : { ...previousState, manuallyCleared: false }
    )
  }
}

export { getParentValue }

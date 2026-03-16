import { useCallback, useMemo, useRef } from 'react'
import { getChangedDebugKeys, logCatalogSelectDebug, summarizeCatalogSelectState } from './catalogSelectDebug'
import type { CatalogSelectConfig, CatalogSelectController, CatalogSelectState } from './useCatalogSelect'
import {
  ActiveFilters,
  buildFiltersSignature,
  CatalogSelectExternalValue,
  isValueValidForFilters,
  resolveCatalogSelectFieldValue
} from './catalogSelectUtils'

const EMPTY_OPTIONS: CatalogSelectController['options'] = []

const getActiveFilters = (
  config: CatalogSelectConfig,
  externalValues: Record<string, CatalogSelectExternalValue> | undefined,
  stateById: Record<string, CatalogSelectState>
): ActiveFilters => {
  const activeFilters: ActiveFilters = {}

  if (config.parentField) {
    const parentValue = resolveCatalogSelectFieldValue(config.parentField, externalValues, stateById)
    if (parentValue) {
      activeFilters.parentEntryId = parentValue
    }
  }

  if (config.filterField && externalValues) {
    for (const filter of config.filterField) {
      const rawExternalValue = externalValues[filter.from]
      if (filter.on === 'type' && typeof rawExternalValue === 'string' && rawExternalValue.length > 0) {
        activeFilters.typeEquals = rawExternalValue
      }
    }
  }

  return activeFilters
}

const resolveVisibleOptions = ({
  currentState,
  activeFilters,
  hideOptionsUntilSourceSelected,
  waitingForFilteredOptions
}: {
  currentState: CatalogSelectState | undefined
  activeFilters: ActiveFilters
  hideOptionsUntilSourceSelected: boolean
  waitingForFilteredOptions: boolean
}): CatalogSelectController['options'] => {
  const storedOptions = currentState?.options ?? EMPTY_OPTIONS
  if (storedOptions.length === 0) {
    return storedOptions
  }

  if (hideOptionsUntilSourceSelected) {
    return EMPTY_OPTIONS
  }

  if (!waitingForFilteredOptions) {
    return storedOptions
  }

  const selectedValue = currentState?.value ?? ''
  if (!selectedValue || !isValueValidForFilters(selectedValue, currentState?.metaByValue, activeFilters)) {
    return EMPTY_OPTIONS
  }

  const selectedOption = storedOptions.find(option => option.value === selectedValue)
  return selectedOption ? [selectedOption] : EMPTY_OPTIONS
}

export const useCatalogSelectControllers = ({
  configs,
  stateById,
  externalValues,
  defaultPageSize,
  createSetValue,
  createOnSearch,
  createOnLoadMore
}: {
  configs: CatalogSelectConfig[]
  stateById: Record<string, CatalogSelectState>
  externalValues?: Record<string, CatalogSelectExternalValue>
  defaultPageSize: number
  createSetValue: (id: string) => CatalogSelectController['setValue']
  createOnSearch: (id: string, config: CatalogSelectConfig) => CatalogSelectController['onSearch']
  createOnLoadMore: (id: string, config: CatalogSelectConfig) => CatalogSelectController['onLoadMore']
}) => {
  const setValueImplByIdRef = useRef<Record<string, CatalogSelectController['setValue']>>({})
  const searchImplByIdRef = useRef<Record<string, CatalogSelectController['onSearch']>>({})
  const loadMoreImplByIdRef = useRef<Record<string, CatalogSelectController['onLoadMore']>>({})
  const stableSetValueByIdRef = useRef<Record<string, CatalogSelectController['setValue']>>({})
  const stableSearchByIdRef = useRef<Record<string, CatalogSelectController['onSearch']>>({})
  const stableLoadMoreByIdRef = useRef<Record<string, CatalogSelectController['onLoadMore']>>({})
  const controllerCacheRef = useRef<Record<string, CatalogSelectController>>({})

  const getStableSetValue = useCallback((id: string): CatalogSelectController['setValue'] => {
    if (!stableSetValueByIdRef.current[id]) {
      stableSetValueByIdRef.current[id] = value => {
        setValueImplByIdRef.current[id]?.(value)
      }
    }
    return stableSetValueByIdRef.current[id]
  }, [])

  const getStableOnSearch = useCallback((id: string): CatalogSelectController['onSearch'] => {
    if (!stableSearchByIdRef.current[id]) {
      stableSearchByIdRef.current[id] = async query => {
        await searchImplByIdRef.current[id]?.(query)
      }
    }
    return stableSearchByIdRef.current[id]
  }, [])

  const getStableOnLoadMore = useCallback((id: string): CatalogSelectController['onLoadMore'] => {
    if (!stableLoadMoreByIdRef.current[id]) {
      stableLoadMoreByIdRef.current[id] = async () => {
        await loadMoreImplByIdRef.current[id]?.()
      }
    }
    return stableLoadMoreByIdRef.current[id]
  }, [])

  return useMemo<Record<string, CatalogSelectController>>(() => {
    const record: Record<string, CatalogSelectController> = {}
    const activeIds = new Set<string>()

    for (const config of configs) {
      const id = config.id
      activeIds.add(id)

      const currentState = stateById[id]
      setValueImplByIdRef.current[id] = createSetValue(id)
      searchImplByIdRef.current[id] = createOnSearch(id, config)
      loadMoreImplByIdRef.current[id] = createOnLoadMore(id, config)

      const activeFilters = getActiveFilters(config, externalValues, stateById)
      const hasParentSelected = Boolean(config.parentField && activeFilters.parentEntryId)
      const hasExternalFilterValue = Boolean(
        config.filterField?.some(filter => filter.on === 'type' && activeFilters.typeEquals)
      )
      const hasAnyFilterActive = Boolean(
        (config.parentField && hasParentSelected) || (config.filterField && hasExternalFilterValue)
      )

      const disabledRequire = Boolean(
        config.requireSourceForEnable &&
          ((config.parentField && !hasParentSelected) || (config.filterField && !hasExternalFilterValue))
      )
      const expectedFilterSignature = hasAnyFilterActive ? buildFiltersSignature(activeFilters) : undefined
      const waitingForFilteredOptions = Boolean(
        hasAnyFilterActive && expectedFilterSignature && currentState?.lastFiltersSig !== expectedFilterSignature
      )
      const visibleOptions = resolveVisibleOptions({
        currentState,
        activeFilters,
        hideOptionsUntilSourceSelected: disabledRequire,
        waitingForFilteredOptions
      })
      const visibleLoading = Boolean(currentState?.loading || waitingForFilteredOptions)
      const visibleTotal =
        waitingForFilteredOptions || disabledRequire ? visibleOptions.length : (currentState?.total ?? 0)
      const visibleOffset =
        waitingForFilteredOptions || disabledRequire ? visibleOptions.length : (currentState?.offset ?? 0)
      const disabledNoOptions = Boolean(
        hasAnyFilterActive && currentState && !visibleLoading && visibleOptions.length === 0 && visibleTotal === 0
      )
      const disabled = disabledRequire || Boolean(hasAnyFilterActive && !currentState) || disabledNoOptions

      const hasOptionsInState = visibleOptions.length > 0
      const requiresParentForValidation = config.requireSourceForEnable && config.parentField && !hasParentSelected
      const nextController: CatalogSelectController = {
        value: currentState?.value ?? '',
        setValue: getStableSetValue(id),
        options: visibleOptions,
        loading: visibleLoading,
        total: visibleTotal,
        limit: currentState?.limit ?? config.pageSize ?? defaultPageSize,
        offset: visibleOffset,
        search: currentState?.search,
        hasMore:
          !waitingForFilteredOptions && !disabledRequire && (currentState?.offset ?? 0) < (currentState?.total ?? 0),
        variant: currentState?.variant ?? 'combobox',
        onSearch: getStableOnSearch(id),
        onLoadMore: getStableOnLoadMore(id),
        disabled,
        hasOptions: hasOptionsInState && !requiresParentForValidation,
        filterSignature: expectedFilterSignature ?? currentState?.lastFiltersSig
      }

      const previousController = controllerCacheRef.current[id]
      if (
        previousController &&
        previousController.value === nextController.value &&
        previousController.options === nextController.options &&
        previousController.loading === nextController.loading &&
        previousController.total === nextController.total &&
        previousController.limit === nextController.limit &&
        previousController.offset === nextController.offset &&
        previousController.search === nextController.search &&
        previousController.hasMore === nextController.hasMore &&
        previousController.variant === nextController.variant &&
        previousController.disabled === nextController.disabled &&
        previousController.hasOptions === nextController.hasOptions &&
        previousController.filterSignature === nextController.filterSignature
      ) {
        record[id] = previousController
      } else {
        logCatalogSelectDebug('controller:update', {
          fieldId: id,
          changedKeys: getChangedDebugKeys(
            previousController ? summarizeCatalogSelectState(previousController) : undefined,
            summarizeCatalogSelectState(nextController)
          ),
          nextController: summarizeCatalogSelectState(nextController)
        })
        record[id] = nextController
        controllerCacheRef.current[id] = nextController
      }
    }

    for (const cachedId of Object.keys(controllerCacheRef.current)) {
      if (!activeIds.has(cachedId)) {
        delete controllerCacheRef.current[cachedId]
        delete setValueImplByIdRef.current[cachedId]
        delete searchImplByIdRef.current[cachedId]
        delete loadMoreImplByIdRef.current[cachedId]
        delete stableSetValueByIdRef.current[cachedId]
        delete stableSearchByIdRef.current[cachedId]
        delete stableLoadMoreByIdRef.current[cachedId]
      }
    }

    return record
  }, [
    configs,
    stateById,
    externalValues,
    defaultPageSize,
    createSetValue,
    createOnSearch,
    createOnLoadMore,
    getStableSetValue,
    getStableOnSearch,
    getStableOnLoadMore
  ])
}

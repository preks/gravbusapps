import { useCallback, useMemo, useRef } from 'react'
import { getChangedDebugKeys, logCatalogSelectDebug, summarizeCatalogSelectState } from './catalogSelectDebug'
import type { CatalogSelectConfig, CatalogSelectController, CatalogSelectState } from './useCatalogSelect'
import { CatalogSelectExternalValue, resolveCatalogSelectFieldValue } from './catalogSelectUtils'

export const useCatalogSelectControllers = ({
  configs,
  stateById,
  externalValues,
  configById,
  defaultPageSize,
  createSetValue,
  createOnSearch,
  createOnLoadMore
}: {
  configs: CatalogSelectConfig[]
  stateById: Record<string, CatalogSelectState>
  externalValues?: Record<string, CatalogSelectExternalValue>
  configById: Map<string, CatalogSelectConfig>
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

      const parentValue = config.parentField
        ? resolveCatalogSelectFieldValue(config.parentField, externalValues, stateById)
        : ''
      const hasParentSelected = Boolean(config.parentField && parentValue)
      const hasExternalFilterValue = Boolean(config.filterField?.some(filter => Boolean(externalValues?.[filter.from])))
      const parentConfig = configById.get(config.parentField ?? '')
      const isBiDirectional = parentConfig?.childField === id
      const hasAnyFilterActive = Boolean(
        (config.parentField && hasParentSelected) || (config.filterField && hasExternalFilterValue)
      )

      const disabledRequire = Boolean(
        config.requireSourceForEnable &&
          ((config.parentField && !hasParentSelected) || (config.filterField && !hasExternalFilterValue))
      )
      const disabledWhileLoading = Boolean(hasAnyFilterActive && currentState?.loading && !isBiDirectional)
      const disabledNoOptions = Boolean(
        hasAnyFilterActive &&
          currentState &&
          !currentState.loading &&
          (currentState.options?.length || 0) === 0 &&
          currentState.total === 0
      )
      const disabled =
        disabledRequire || Boolean(hasAnyFilterActive && !currentState) || disabledWhileLoading || disabledNoOptions

      const hasOptionsInState = (currentState?.options?.length || 0) > 0
      const requiresParentForValidation = config.requireSourceForEnable && config.parentField && !hasParentSelected
      const nextController: CatalogSelectController = {
        value: currentState?.value ?? '',
        setValue: getStableSetValue(id),
        options: currentState?.options ?? [],
        loading: currentState?.loading ?? false,
        total: currentState?.total ?? 0,
        limit: currentState?.limit ?? config.pageSize ?? defaultPageSize,
        offset: currentState?.offset ?? 0,
        search: currentState?.search,
        hasMore: (currentState?.offset ?? 0) < (currentState?.total ?? 0),
        variant: currentState?.variant ?? 'combobox',
        onSearch: getStableOnSearch(id),
        onLoadMore: getStableOnLoadMore(id),
        disabled,
        hasOptions: hasOptionsInState && !requiresParentForValidation,
        filterSignature: currentState?.lastFiltersSig
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
    configById,
    defaultPageSize,
    createSetValue,
    createOnSearch,
    createOnLoadMore,
    getStableSetValue,
    getStableOnSearch,
    getStableOnLoadMore
  ])
}

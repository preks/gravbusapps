import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { CatalogSelectConfig } from './useCatalogSelect'
import { handleExternalFilters } from './catalogSelectDependencyExternalFilters'
import {
  determineCase,
  getParentValue,
  handleChildCleared,
  handleChildSelectedBi,
  handleChildSelectedUni,
  handleInitialLoad,
  handleParentCleared,
  handleParentSelected
} from './catalogSelectDependencyParentChild'
import { getFieldValue } from './catalogSelectDependencyShared'
import { CatalogSelectExternalValue } from './catalogSelectUtils'
import type {
  CatalogSelectDependencyFetcher,
  CatalogSelectDependencySetter,
  CatalogSelectDependencyState,
  CatalogSelectRequestVersionRef
} from './catalogSelectDependencyTypes'

export interface UseCatalogDependenciesParams {
  configs: CatalogSelectConfig[]
  stateById: Record<string, CatalogSelectDependencyState>
  setFor: CatalogSelectDependencySetter
  fetchCatalogEntriesByIdentifier: CatalogSelectDependencyFetcher
  defaultPageSize: number
  externalValues?: Record<string, CatalogSelectExternalValue>
  locale?: string
  requestVersionRef: CatalogSelectRequestVersionRef
  nextVersion: (id: string) => number
  isCurrentVersion: (id: string, version: number) => boolean
}

export const useCatalogDependencies = ({
  configs,
  stateById,
  setFor,
  fetchCatalogEntriesByIdentifier,
  defaultPageSize,
  externalValues,
  locale,
  nextVersion,
  isCurrentVersion
}: UseCatalogDependenciesParams) => {
  const stateByIdRef = useRef(stateById)
  const lastParentValuesRef = useRef<Map<string, string>>(new Map())
  const lastChildValuesRef = useRef<Map<string, string>>(new Map())
  const autoSelectedParentsRef = useRef<Set<string>>(new Set())
  const lastExternalValuesRef = useRef<Map<string, string | null>>(new Map())
  const dependencyExternalValues = externalValues as Record<string, string | null> | undefined

  useEffect(() => {
    stateByIdRef.current = stateById
  }, [stateById])

  const configById = useMemo(() => new Map(configs.map(config => [config.id, config])), [configs])
  const childConfigsByParentField = useMemo(() => {
    const nextMap = new Map<string, CatalogSelectConfig[]>()
    for (const config of configs) {
      if (!config.parentField) continue
      const groupedConfigs = nextMap.get(config.parentField) ?? []
      groupedConfigs.push(config)
      nextMap.set(config.parentField, groupedConfigs)
    }
    return nextMap
  }, [configs])

  const parentDependencyConfigs = useMemo(() => configs.filter(config => Boolean(config.parentField)), [configs])
  const externalFilterConfigs = useMemo(() => configs.filter(config => Boolean(config.filterField)), [configs])
  const parentFieldIds = useMemo(() => Array.from(childConfigsByParentField.keys()), [childConfigsByParentField])

  const updateParentStateFromForm = useCallback(
    (parentField: string, parentValueFromForm: string) => {
      if (!parentField || !parentValueFromForm) return

      const parentConfig = configById.get(parentField)
      const parentState = stateByIdRef.current[parentField]
      const parentValueInState = parentState?.value || ''

      if (parentValueFromForm === parentValueInState) return

      if (parentState) {
        setFor(parentField, previousState =>
          previousState.value === parentValueFromForm ? previousState : { ...previousState, value: parentValueFromForm }
        )
        return
      }

      setFor(parentField, () => ({
        value: parentValueFromForm,
        loading: false,
        options: [],
        total: 0,
        limit: parentConfig?.pageSize ?? defaultPageSize,
        offset: 0,
        variant: 'combobox'
      }))
    },
    [configById, setFor, defaultPageSize]
  )

  // Sync parent field values into catalog state when external form values change.
  // Child fetches are NOT triggered here — the parentDependencySignature effect below
  // handles those via handleInitialLoad / handleParentSelected.
  // Triggering child fetches from both places caused duplicate CountryRegion queries:
  // both effects fire in the same render cycle and React-batched setFor updates aren't
  // yet reflected in stateByIdRef, so the loading guard in shouldFetchChild is bypassed.
  useEffect(() => {
    if (!externalValues) return

    for (const parentField of parentFieldIds) {
      const parentValueFromForm = getParentValue(parentField, dependencyExternalValues, stateByIdRef.current)
      updateParentStateFromForm(parentField, parentValueFromForm)
    }
  }, [dependencyExternalValues, externalValues, parentFieldIds, updateParentStateFromForm])

  const parentDependencySignature = useMemo(
    () =>
      parentDependencyConfigs
        .map(config => {
          const parentValue = config.parentField
            ? getParentValue(config.parentField, dependencyExternalValues, stateById)
            : 'none'
          const ownValue = getFieldValue(config.id, dependencyExternalValues, stateById)
          const manuallyCleared = config.parentField ? stateById[config.parentField]?.manuallyCleared : false
          return `${config.id}:${ownValue}:${parentValue}:${manuallyCleared}`
        })
        .join('|'),
    [dependencyExternalValues, parentDependencyConfigs, stateById]
  )

  const externalFilterSignature = useMemo(
    () =>
      externalFilterConfigs
        .map(config => {
          const externalFilterValues =
            config.filterField?.map(filter => `${filter.from}:${externalValues?.[filter.from] || 'null'}`).join(',') ||
            'none'
          return `${config.id}:${externalFilterValues}`
        })
        .join('|'),
    [externalFilterConfigs, externalValues]
  )

  const handleParentChildDependency = useCallback(
    (config: CatalogSelectConfig, autoSelectedToCleanup: Set<string>) => {
      const { id, parentField } = config
      if (!parentField) return

      const parentConfig = configById.get(parentField)
      const isBiDirectional = parentConfig?.childField === id
      const parentValue = getParentValue(parentField, dependencyExternalValues, stateById)
      const childValue = getFieldValue(id, dependencyExternalValues, stateById)
      const lastParentValue = lastParentValuesRef.current.get(parentField)
      const lastChildValue = lastChildValuesRef.current.get(id)
      const parentState = stateById[parentField]
      const wasAutoSelected = autoSelectedParentsRef.current.has(parentField)
      const parentManuallyCleared = Boolean(parentState?.manuallyCleared)

      const handlerParams = {
        id,
        config,
        parentField,
        parentValue,
        childValue,
        isBiDirectional,
        stateById,
        setFor,
        fetchCatalogEntriesByIdentifier,
        defaultPageSize,
        locale,
        lastParentValuesRef,
        lastChildValuesRef,
        autoSelectedParentsRef,
        externalValues: dependencyExternalValues,
        configs,
        nextVersion,
        isCurrentVersion
      }

      switch (
        determineCase(
          parentValue,
          childValue,
          lastParentValue,
          lastChildValue,
          isBiDirectional,
          wasAutoSelected,
          parentManuallyCleared
        )
      ) {
        case 'initial-load':
          handleInitialLoad(handlerParams).catch(() => undefined)
          break
        case 'parent-selected':
          handleParentSelected(handlerParams).catch(() => undefined)
          break
        case 'child-selected-bi':
          handleChildSelectedBi(handlerParams).catch(() => undefined)
          break
        case 'child-selected-uni':
          handleChildSelectedUni(handlerParams)
          break
        case 'parent-cleared':
          handleParentCleared(handlerParams).catch(() => undefined)
          break
        case 'child-cleared':
          handleChildCleared({ ...handlerParams, wasAutoSelected, parentState })
          break
        case 'no-change':
          if (parentValue) lastParentValuesRef.current.set(parentField, parentValue)
          if (childValue) lastChildValuesRef.current.set(id, childValue)
          break
      }

      if (
        wasAutoSelected &&
        parentValue &&
        getParentValue(parentField, dependencyExternalValues, stateById) === parentValue
      ) {
        autoSelectedToCleanup.add(parentField)
      }

      if (childValue && parentState?.manuallyCleared && !wasAutoSelected) {
        setFor(parentField, previousState => ({ ...previousState, manuallyCleared: false }))
      }
    },
    [
      configById,
      stateById,
      dependencyExternalValues,
      setFor,
      fetchCatalogEntriesByIdentifier,
      defaultPageSize,
      locale,
      configs,
      nextVersion,
      isCurrentVersion
    ]
  )

  const handleExternalFilterDependency = useCallback(
    (config: CatalogSelectConfig) => {
      if (!config.filterField) return

      handleExternalFilters({
        id: config.id,
        filterField: config.filterField,
        config,
        stateById,
        setFor,
        fetchCatalogEntriesByIdentifier,
        defaultPageSize,
        locale,
        externalValues: dependencyExternalValues,
        lastExternalValuesRef,
        nextVersion,
        isCurrentVersion
      }).catch(() => undefined)
    },
    [
      stateById,
      setFor,
      fetchCatalogEntriesByIdentifier,
      defaultPageSize,
      locale,
      dependencyExternalValues,
      nextVersion,
      isCurrentVersion
    ]
  )

  useEffect(() => {
    const autoSelectedToCleanup = new Set<string>()
    for (const config of parentDependencyConfigs) {
      handleParentChildDependency(config, autoSelectedToCleanup)
    }
    for (const parentId of autoSelectedToCleanup) {
      autoSelectedParentsRef.current.delete(parentId)
    }
  }, [parentDependencySignature, parentDependencyConfigs, handleParentChildDependency])

  useEffect(() => {
    for (const config of externalFilterConfigs) {
      handleExternalFilterDependency(config)
    }
  }, [externalFilterSignature, externalFilterConfigs, handleExternalFilterDependency])
}

export default useCatalogDependencies

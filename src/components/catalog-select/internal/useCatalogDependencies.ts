/**
 * Unified Catalog Select Dependencies
 *
 * Handles all dependency types with clear case-based logic:
 * - Bi-Directional: Parent ↔ Child (e.g., Country ↔ Region)
 * - Uni-Directional: Parent → Child (e.g., InvestmentGroup → InvestmentType)
 * - External Filters: External form field → Catalog (e.g., PipelineType → PipelineStage)
 *
 * Key improvements:
 * - Clear case definitions with switch-case structure
 * - Proper handling of bi-directional child selection (child not cleared)
 * - Single source of truth for parent values: externalValues (form) → stateById (internal)
 */

import React, { useEffect, useMemo, useRef } from 'react'
import type { CatalogEntry } from '@/common/data/catalog/types/catalogTypes'
import type { CatalogSelectConfig, CatalogSelectOption } from './useCatalogSelect'
import { toOptions, buildEntryMeta, getLocalizedValue, buildFiltersSignature } from './catalogSelectUtils'

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

export interface UseCatalogDependenciesParams {
  configs: CatalogSelectConfig[]
  stateById: Record<string, State>
  setFor: (id: string, updater: (prev: State) => State) => void
  fetchCatalogEntriesByIdentifier: (
    identifier: string,
    params: {
      limit?: number
      offset?: number
      search?: string
      parentEntryId?: string
      typeEquals?: string
      entryId?: string
    }
  ) => Promise<{ entries: CatalogEntry[]; totalCount: number }>
  defaultPageSize: number
  externalValues?: Record<string, string | null>
  locale?: string
  /**
   * Shared set tracking "{configId}:{entryId}" pairs that have been fetched or are
   * in-flight via fetchSingleMissingOption in useCatalogSelect. handleInitialLoad
   * checks this before performing its own parent-option entryId fetch so that both
   * paths never fire GetCatalogEntries for the same entry twice.
   */
  fetchedEntryIdsRef?: React.MutableRefObject<Set<string>>
}

// Helper: Get parent value from externalValues (form) or stateById (internal)
const getParentValue = (
  parentField: string,
  externalValues?: Record<string, string | null>,
  stateById?: Record<string, State>
): string => {
  return externalValues?.[parentField] || stateById?.[parentField]?.value || ''
}

// Helper: Fetch filtered options with parent filter
const fetchFilteredOptionsWithParent = async ({
  id,
  parentValue,
  config,
  defaultPageSize,
  setFor,
  fetchCatalogEntriesByIdentifier,
  locale
}: {
  id: string
  parentValue: string
  config: CatalogSelectConfig
  defaultPageSize: number
  setFor: (id: string, updater: (prev: State) => State) => void
  fetchCatalogEntriesByIdentifier: any
  locale?: string
}) => {
  const filtersSig = buildFiltersSignature({ parentEntryId: parentValue })

  setFor(id, prev =>
    prev
      ? {
          ...prev,
          options: [],
          loading: true,
          offset: 0,
          lastFiltersSig: filtersSig
        }
      : prev
  )

  try {
    const res = await fetchCatalogEntriesByIdentifier(id, {
      limit: config.pageSize ?? defaultPageSize,
      offset: 0,
      parentEntryId: parentValue
    })

    const metaByValue = buildEntryMeta(res.entries)

    setFor(id, prev =>
      prev
        ? {
            ...prev,
            loading: false,
            options: toOptions(res.entries, locale),
            total: res.totalCount,
            offset: res.entries.length,
            metaByValue: { ...prev.metaByValue, ...metaByValue },
            lastFiltersSig: filtersSig
          }
        : prev
    )
  } catch {
    setFor(id, prev => (prev ? { ...prev, loading: false, lastFiltersSig: filtersSig } : prev))
  }
}

// Helper: Reset to prefetched options
const resetToPrefetchedOptions = ({
  id,
  setFor
}: {
  id: string
  setFor: (id: string, updater: (prev: State) => State) => void
}) => {
  setFor(id, prev =>
    prev
      ? {
          ...prev,
          options: prev.prefetchedOptions || [],
          offset: (prev.prefetchedOptions || []).length,
          loading: false,
          lastFiltersSig: undefined,
          // FIX: Setze total und fullTotal zurück, damit Options angezeigt werden
          total: prev.fullTotal ?? prev.total ?? 0,
          fullTotal: prev.fullTotal ?? prev.total ?? 0
        }
      : prev
  )
}

// Helper: Clear child value
const clearChildValue = ({
  id,
  setFor
}: {
  id: string
  setFor: (id: string, updater: (prev: State) => State) => void
}) => {
  setFor(id, prev => (prev ? { ...prev, value: '', search: undefined } : prev))
}

// Case definitions for parent-child dependencies
type DependencyCase =
  | 'initial-load' // Both values exist on initial load
  | 'parent-selected' // User manually selected parent
  | 'child-selected-bi' // User selected child in bi-directional (auto-select parent, keep child)
  | 'child-selected-uni' // User selected child in uni-directional (no parent change)
  | 'parent-cleared' // User cleared parent
  | 'child-cleared' // User cleared child
  | 'no-change' // No relevant change detected

// Helper: Determine the current case/scenario
const determineCase = (
  parentValue: string,
  childValue: string,
  lastParentValue: string | undefined,
  lastChildValue: string | undefined,
  isBiDirectional: boolean,
  wasAutoSelected: boolean
): DependencyCase => {
  // Case 1: Initial Load - both values exist
  if (lastParentValue === undefined && parentValue && childValue) {
    return 'initial-load'
  }

  // Case 2: Parent was manually selected (changed from empty or different value, not auto-selected)
  if (lastParentValue !== parentValue && parentValue && !wasAutoSelected) {
    return 'parent-selected'
  }

  // Case 3: Child was selected in bi-directional relationship (parent empty, child changed)
  // FIX: Prüfe !lastParentValue statt === undefined, da lastParentValue auch "" sein kann
  const isChildSelectedBi =
    isBiDirectional && childValue && lastChildValue !== childValue && !parentValue && !lastParentValue
  if (isChildSelectedBi) {
    return 'child-selected-bi'
  }

  // Case 4: Child was selected in uni-directional relationship
  if (!isBiDirectional && childValue && lastChildValue !== childValue) {
    return 'child-selected-uni'
  }

  // Case 5: Parent was cleared
  if (lastParentValue && !parentValue) {
    return 'parent-cleared'
  }

  // Case 6: Child was cleared
  if (lastChildValue && !childValue) {
    return 'child-cleared'
  }

  return 'no-change'
}

// Case handler functions to reduce complexity
type CaseHandlerParams = {
  id: string
  config: CatalogSelectConfig
  parentField: string
  parentValue: string
  childValue: string
  isBiDirectional: boolean
  stateById: Record<string, State>
  setFor: (id: string, updater: (prev: State) => State) => void
  fetchCatalogEntriesByIdentifier: any
  defaultPageSize: number
  locale?: string
  lastParentValuesRef: React.MutableRefObject<Map<string, string>>
  lastChildValuesRef: React.MutableRefObject<Map<string, string>>
  autoSelectedParentsRef: React.MutableRefObject<Set<string>>
  externalValues?: Record<string, string | null>
  getParentValue: (
    parentField: string,
    externalValues?: Record<string, string | null>,
    stateById?: Record<string, State>
  ) => string
  configs: CatalogSelectConfig[]
  fetchedEntryIdsRef?: React.MutableRefObject<Set<string>>
}

// Handle initial load case
const handleInitialLoad = async ({
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
  fetchedEntryIdsRef
}: CaseHandlerParams) => {
  // Set parent value in state if it exists but is not yet set, OR if it differs from current state
  if (parentValue) {
    const currentParentValue = stateById[parentField]?.value
    if (!currentParentValue || currentParentValue !== parentValue) {
      const parentConfig = configs.find(c => c.id === parentField)
      setFor(parentField, prev => {
        if (prev) {
          return { ...prev, value: parentValue }
        }
        return {
          value: parentValue,
          loading: false,
          options: [],
          total: 0,
          limit: parentConfig?.pageSize ?? defaultPageSize,
          offset: 0,
          variant: 'combobox'
        }
      })
    }

    // Ensure parent option is visible in the UI — but only if fetchSingleMissingOption
    // (in useCatalogSelect) has not already fetched or started fetching this entry.
    // The shared fetchedEntryIdsRef prevents both paths from issuing the same
    // GetCatalogEntries(entryId) call for the same parent entry.
    const parentState = stateById[parentField]
    const parentHasOption = parentState?.options?.some(opt => opt.value === parentValue)
    if (!parentHasOption && Boolean(parentValue)) {
      const fetchKey = `${parentField}:${parentValue}`
      if (!fetchedEntryIdsRef?.current.has(fetchKey)) {
        fetchedEntryIdsRef?.current.add(fetchKey)
        try {
          const res = await fetchCatalogEntriesByIdentifier(parentField, {
            limit: 1,
            offset: 0,
            entryId: parentValue
          })
          if (res.entries.length > 0) {
            const parentOption = {
              value: res.entries[0].id,
              label: getLocalizedValue(res.entries[0], locale)
            }
            setFor(parentField, prev => {
              if (!prev) return prev
              const optionExists = prev.options.some(opt => opt.value === parentOption.value)
              return {
                ...prev,
                options: optionExists ? prev.options : [parentOption, ...prev.options]
              }
            })
          }
        } catch {
          // Allow retry on next interaction
          fetchedEntryIdsRef?.current.delete(fetchKey)
        }
      }
    }
  }

  // Fetch child options filtered by parent — but only if triggerChildFetchIfNeeded
  // (from the updateParentStateFromForm effect) has not already started this fetch.
  // Checking loading and lastFiltersSig mirrors the shouldFetchChild guard used there.
  if (parentValue) {
    const childState = stateById[id]
    const expectedFiltersSig = buildFiltersSignature({ parentEntryId: parentValue })
    const alreadyFetchingChild = childState?.loading || childState?.lastFiltersSig === expectedFiltersSig
    if (!alreadyFetchingChild) {
      fetchFilteredOptionsWithParent({
        id,
        parentValue,
        config,
        defaultPageSize,
        setFor,
        fetchCatalogEntriesByIdentifier,
        locale
      })
    }
  }

  // Use parentField instead of id for tracking parent value
  if (parentValue) {
    lastParentValuesRef.current.set(parentField, parentValue)
  }
  if (childValue) {
    lastChildValuesRef.current.set(id, childValue)
  }
}

// Handle parent selected case
const handleParentSelected = ({
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
  lastChildValuesRef
}: CaseHandlerParams) => {
  const childMeta = childValue ? stateById[id]?.metaByValue?.[childValue] : undefined
  const shouldKeepChild = isBiDirectional && childMeta?.parentEntryId === parentValue

  if (childValue && !shouldKeepChild) {
    clearChildValue({ id, setFor })
  }

  if (parentValue) {
    fetchFilteredOptionsWithParent({
      id,
      parentValue,
      config,
      defaultPageSize,
      setFor,
      fetchCatalogEntriesByIdentifier,
      locale
    })
  }

  // FIX: Use parentField instead of id for tracking parent value
  lastParentValuesRef.current.set(parentField, parentValue)
  if (childValue && !shouldKeepChild) {
    lastChildValuesRef.current.set(id, '')
  }
}

// Helper: Auto-select parent from child metadata
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
  autoSelectedParentsRef
}: CaseHandlerParams & { childMeta?: { parentEntryId?: string; type?: string } }) => {
  if (!childMeta?.parentEntryId && childValue) {
    // Fetch child entry to get parentEntryId
    const res = await fetchCatalogEntriesByIdentifier(id, {
      limit: 1,
      offset: 0,
      entryId: childValue
    })
    if (res.entries.length > 0) {
      const entry = res.entries[0]
      const meta = { parentEntryId: entry.parentEntryId, type: entry.type }
      setFor(id, prev => {
        if (!prev) return prev
        return {
          ...prev,
          metaByValue: { ...prev.metaByValue, [entry.id]: meta }
        }
      })
      if (meta.parentEntryId) {
        await setParentValueAndFetchOptions({
          parentField,
          parentValue: meta.parentEntryId,
          id,
          config,
          stateById,
          setFor,
          fetchCatalogEntriesByIdentifier,
          defaultPageSize,
          locale,
          autoSelectedParentsRef
        })
      }
      return meta.parentEntryId
    }
  } else if (childMeta?.parentEntryId) {
    await setParentValueAndFetchOptions({
      parentField,
      parentValue: childMeta.parentEntryId,
      id,
      config,
      stateById,
      setFor,
      fetchCatalogEntriesByIdentifier,
      defaultPageSize,
      locale,
      autoSelectedParentsRef
    })
    return childMeta.parentEntryId
  }
  return undefined
}

// Helper: Set parent value and fetch options
const setParentValueAndFetchOptions = async ({
  parentField,
  parentValue,
  id,
  config,
  stateById,
  setFor,
  fetchCatalogEntriesByIdentifier,
  defaultPageSize,
  locale,
  autoSelectedParentsRef
}: {
  parentField: string
  parentValue: string
  id: string
  config: CatalogSelectConfig
  stateById: Record<string, State>
  setFor: (id: string, updater: (prev: State) => State) => void
  fetchCatalogEntriesByIdentifier: any
  defaultPageSize: number
  locale?: string
  autoSelectedParentsRef: React.MutableRefObject<Set<string>>
}) => {
  autoSelectedParentsRef.current.add(parentField)
  setFor(parentField, prev =>
    prev
      ? {
          ...prev,
          value: parentValue,
          manuallyCleared: false
        }
      : prev
  )

  const parentHasOption = stateById[parentField]?.options?.some(opt => opt.value === parentValue)
  if (!parentHasOption && parentValue) {
    const res = await fetchCatalogEntriesByIdentifier(parentField, {
      limit: 1,
      offset: 0,
      entryId: parentValue
    })
    if (res.entries.length > 0) {
      const parentOption = {
        value: res.entries[0].id,
        label: getLocalizedValue(res.entries[0], locale)
      }
      setFor(parentField, prev => {
        if (!prev) return prev
        const optionExists = prev.options.some(opt => opt.value === parentOption.value)
        return {
          ...prev,
          options: optionExists ? prev.options : [...prev.options, parentOption]
        }
      })
    }
  }

  fetchFilteredOptionsWithParent({
    id,
    parentValue,
    config,
    defaultPageSize,
    setFor,
    fetchCatalogEntriesByIdentifier,
    locale
  })
}

// Handle child selected in bi-directional case
const handleChildSelectedBi = async (params: CaseHandlerParams) => {
  const { id, childValue, lastChildValuesRef } = params
  const childState = params.stateById[id]
  const childMeta = childState?.metaByValue?.[childValue]

  if (!childMeta && childValue) {
    try {
      await autoSelectParentFromChild({ ...params, childMeta: undefined })
    } catch {
      // Silently fail - will retry on next interaction
    }
  } else if (childMeta?.parentEntryId) {
    await autoSelectParentFromChild({ ...params, childMeta })
  }

  lastChildValuesRef.current.set(id, childValue)
}

// Handle child selected in uni-directional case
const handleChildSelectedUni = ({ childValue, id, lastChildValuesRef }: CaseHandlerParams) => {
  lastChildValuesRef.current.set(id, childValue)
}

// Handle parent cleared case
const handleParentCleared = async ({
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
    const childMeta = stateById[id]?.metaByValue?.[childValue]
    if (childMeta?.parentEntryId) {
      clearChildValue({ id, setFor })
      lastChildValuesRef.current.set(id, '')
    }
  }

  const childState = stateById[id]
  if (!childState?.prefetchedOptions || childState.prefetchedOptions.length === 0) {
    setFor(id, prev => (prev ? { ...prev, loading: true, options: [], offset: 0, lastFiltersSig: undefined } : prev))
    try {
      const res = await fetchCatalogEntriesByIdentifier(id, {
        limit: config.pageSize ?? defaultPageSize,
        offset: 0
      })
      const options = toOptions(res.entries, locale)
      setFor(id, prev =>
        prev
          ? {
              ...prev,
              loading: false,
              options,
              prefetchedOptions: options,
              total: res.totalCount,
              fullTotal: res.totalCount,
              offset: options.length,
              lastFiltersSig: undefined
            }
          : prev
      )
    } catch {
      setFor(id, prev => (prev ? { ...prev, loading: false } : prev))
    }
  } else {
    resetToPrefetchedOptions({ id, setFor })
  }

  // FIX: Use parentField instead of id for tracking parent value
  lastParentValuesRef.current.set(parentField, '')
}

// Handle child cleared case
const handleChildCleared = ({
  id,
  isBiDirectional,
  wasAutoSelected,
  parentField,
  setFor,
  lastChildValuesRef
}: CaseHandlerParams & { wasAutoSelected: boolean; parentState?: State }) => {
  lastChildValuesRef.current.set(id, '')
  if (isBiDirectional && wasAutoSelected) {
    setFor(parentField, prev => (prev ? { ...prev, manuallyCleared: false } : prev))
  }
}

// Handle external filter dependencies
interface FetchFilteredEntriesOptions {
  id: string
  config: CatalogSelectConfig
  filter: NonNullable<CatalogSelectConfig['filterField']>[0]
  externalValue: string
  fetchCatalogEntriesByIdentifier: any
  defaultPageSize: number
  locale: string | undefined
  setFor: (id: string, updater: (prev: State) => State) => void
}

/**
 * Handles fetching filtered catalog entries
 */
const fetchFilteredEntries = async (options: FetchFilteredEntriesOptions): Promise<void> => {
  const { id, config, filter, externalValue, fetchCatalogEntriesByIdentifier, defaultPageSize, locale, setFor } =
    options
  setFor(id, prev =>
    prev
      ? {
          ...prev,
          options: [],
          loading: true,
          offset: 0,
          lastFiltersSig: undefined
        }
      : prev
  )

  try {
    const res = await fetchCatalogEntriesByIdentifier(id, {
      limit: config.pageSize ?? defaultPageSize,
      offset: 0,
      [filter.on === 'type' ? 'typeEquals' : filter.on]: externalValue
    })
    setFor(id, prev =>
      prev
        ? {
            ...prev,
            loading: false,
            options: toOptions(res.entries, locale),
            total: res.totalCount,
            offset: res.entries.length
          }
        : prev
    )
  } catch {
    setFor(id, prev => (prev ? { ...prev, loading: false } : prev))
  }
}

interface HandleSingleExternalFilterOptions {
  id: string
  filter: NonNullable<CatalogSelectConfig['filterField']>[0]
  config: CatalogSelectConfig
  stateById: Record<string, State>
  setFor: (id: string, updater: (prev: State) => State) => void
  fetchCatalogEntriesByIdentifier: any
  defaultPageSize: number
  locale: string | undefined
  externalValues: Record<string, string | null> | undefined
  lastExternalValuesRef: React.MutableRefObject<Map<string, string | null>>
}

/**
 * Handles a single external filter change
 */
const handleSingleExternalFilter = async (options: HandleSingleExternalFilterOptions): Promise<void> => {
  const {
    id,
    filter,
    config,
    stateById,
    setFor,
    fetchCatalogEntriesByIdentifier,
    defaultPageSize,
    locale,
    externalValues,
    lastExternalValuesRef
  } = options
  const externalValue = externalValues?.[filter.from] || null
  const lastExternalValue = lastExternalValuesRef.current.get(`${id}_${filter.from}`)

  if (lastExternalValue === externalValue) return

  lastExternalValuesRef.current.set(`${id}_${filter.from}`, externalValue)

  const childState = stateById[id]
  if (childState?.value !== '') {
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
      setFor
    })
  } else {
    resetToPrefetchedOptions({ id, setFor })
  }
}

const handleExternalFilters = async ({
  id,
  filterField,
  config,
  stateById,
  setFor,
  fetchCatalogEntriesByIdentifier,
  defaultPageSize,
  locale,
  externalValues,
  lastExternalValuesRef
}: {
  id: string
  filterField: CatalogSelectConfig['filterField']
  config: CatalogSelectConfig
  stateById: Record<string, State>
  setFor: (id: string, updater: (prev: State) => State) => void
  fetchCatalogEntriesByIdentifier: any
  defaultPageSize: number
  locale?: string
  externalValues?: Record<string, string | null>
  lastExternalValuesRef: React.MutableRefObject<Map<string, string | null>>
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
      lastExternalValuesRef
    })
  }
}

export const useCatalogDependencies = ({
  configs,
  stateById,
  setFor,
  fetchCatalogEntriesByIdentifier,
  defaultPageSize,
  externalValues,
  locale,
  fetchedEntryIdsRef
}: UseCatalogDependenciesParams) => {
  // Track last parent values to detect changes
  const lastParentValuesRef = useRef<Map<string, string>>(new Map())
  // Track last child values to detect child changes
  const lastChildValuesRef = useRef<Map<string, string>>(new Map())
  // Track auto-selected parents for bi-directional relationships
  const autoSelectedParentsRef = useRef<Set<string>>(new Set())
  // Track last external filter values
  const lastExternalValuesRef = useRef<Map<string, string | null>>(new Map())

  /**
   * Updates parent state from external form values
   */
  const updateParentStateFromForm = (
    cfg: CatalogSelectConfig,
    parentValueFromForm: string,
    parentValueInState: string
  ): void => {
    if (!cfg.parentField || !parentValueFromForm || parentValueFromForm === parentValueInState) return

    const parentConfig = configs.find(c => c.id === cfg.parentField)
    const parentState = stateById[cfg.parentField]
    if (parentState) {
      setFor(cfg.parentField, prev => (prev ? { ...prev, value: parentValueFromForm } : prev))
    } else {
      setFor(cfg.parentField, () => ({
        value: parentValueFromForm,
        loading: false,
        options: [],
        total: 0,
        limit: parentConfig?.pageSize ?? defaultPageSize,
        offset: 0,
        variant: 'combobox'
      }))
    }
  }

  /**
   * Checks if child needs to be fetched
   */
  const shouldFetchChild = (childState: State | undefined, expectedFiltersSig: string): boolean => {
    if (!childState) return true
    if (childState.loading) return false
    if ((childState.options?.length || 0) > 0) return false
    if (childState.total > 0) return false
    return childState.lastFiltersSig !== expectedFiltersSig
  }

  /**
   * Triggers child fetch if parent value exists but child not initialized
   */
  const triggerChildFetchIfNeeded = (cfg: CatalogSelectConfig, effectiveParentValue: string): void => {
    if (!cfg.parentField || !effectiveParentValue) return

    const childConfigs = configs.filter(c => c.parentField === cfg.parentField)
    const expectedFiltersSig = buildFiltersSignature({ parentEntryId: effectiveParentValue })

    for (const childConfig of childConfigs) {
      const childState = stateById[childConfig.id]
      if (!shouldFetchChild(childState, expectedFiltersSig)) continue

      // Trigger fetch for child options immediately
      fetchFilteredOptionsWithParent({
        id: childConfig.id,
        parentValue: effectiveParentValue,
        config: childConfig,
        defaultPageSize,
        setFor,
        fetchCatalogEntriesByIdentifier,
        locale
      })
    }
  }

  // Sync parent values from externalValues (form) to stateById (internal)
  useEffect(() => {
    if (!externalValues) return

    for (const cfg of configs) {
      if (!cfg.parentField) continue

      const parentValueFromForm = externalValues[cfg.parentField] || ''
      const parentValueInState = stateById[cfg.parentField]?.value || ''

      // Update state if form value exists and differs from state
      updateParentStateFromForm(cfg, parentValueFromForm, parentValueInState)

      // FIX: Wenn Parent-Wert existiert, aber Child-State noch nicht initialisiert ist,
      // trigger sofort eine Fetch für Child-Options (z.B. beim Accordion-Wechsel oder Account-Öffnen)
      const effectiveParentValue = parentValueFromForm || parentValueInState
      triggerChildFetchIfNeeded(cfg, effectiveParentValue)
    }
    // FIX: Remove stateById from dependencies to prevent infinite loops
  }, [
    configs,
    externalValues,
    setFor,
    defaultPageSize,
    fetchCatalogEntriesByIdentifier,
    locale,
    triggerChildFetchIfNeeded,
    updateParentStateFromForm
  ])

  // Unified dependency signature for all dependency types
  const dependencySignature = useMemo(
    () =>
      configs
        .filter(c => c.parentField || c.filterField)
        .map(c => {
          const parentValue = c.parentField ? getParentValue(c.parentField, externalValues, stateById) : 'none'
          const ownValue = stateById[c.id]?.value || ''
          const manuallyCleared = c.parentField ? stateById[c.parentField]?.manuallyCleared : false
          const externalFilterValues =
            c.filterField?.map(f => `${f.from}:${externalValues?.[f.from] || 'null'}`).join(',') || 'none'
          return `${c.id}:${ownValue}:${parentValue}:${manuallyCleared}:${externalFilterValues}`
        })
        .join('|'),
    [configs, externalValues, stateById]
  )

  /**
   * Handles parent-child dependency for a single config
   */
  const handleParentChildDependency = (config: CatalogSelectConfig, autoSelectedToCleanup: Set<string>): void => {
    const { id, parentField } = config
    if (!parentField) return

    const parentConfig = configs.find(c => c.id === parentField)
    const isBiDirectional = parentConfig?.childField === id
    const parentValue = getParentValue(parentField, externalValues, stateById)
    const childValue = stateById[id]?.value || ''
    // Use parentField instead of id for tracking parent value
    const lastParentValue = lastParentValuesRef.current.get(parentField)
    const lastChildValue = lastChildValuesRef.current.get(id)
    const parentState = stateById[parentField]
    const wasAutoSelected = autoSelectedParentsRef.current.has(parentField)

    // Determine the current case
    const currentCase = determineCase(
      parentValue,
      childValue,
      lastParentValue,
      lastChildValue,
      isBiDirectional,
      wasAutoSelected
    )

    // Handle case with switch statement using extracted handlers
    const handlerParams: CaseHandlerParams = {
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
      externalValues,
      getParentValue,
      configs,
      fetchedEntryIdsRef
    }

    switch (currentCase) {
      case 'initial-load': {
        handleInitialLoad(handlerParams).catch(() => {
          // Silently fail - will retry on next interaction
        })
        break
      }

      case 'parent-selected': {
        handleParentSelected(handlerParams)
        break
      }

      case 'child-selected-bi': {
        handleChildSelectedBi(handlerParams)
        break
      }

      case 'child-selected-uni': {
        handleChildSelectedUni(handlerParams)
        break
      }

      case 'parent-cleared': {
        handleParentCleared(handlerParams).catch(() => {
          // Silently fail - will retry on next interaction
        })
        break
      }

      case 'child-cleared': {
        handleChildCleared({ ...handlerParams, wasAutoSelected, parentState })
        break
      }

      case 'no-change': {
        // No action needed, but update tracking if values exist
        // FIX: Use parentField instead of id for tracking parent value
        if (parentValue) lastParentValuesRef.current.set(parentField, parentValue)
        if (childValue) lastChildValuesRef.current.set(id, childValue)
        break
      }
    }

    // Handle auto-selected parent cleanup (after parent was set by child selection)
    if (wasAutoSelected && parentValue) {
      // Check if this was the auto-selection cycle - if so, mark for cleanup
      const currentParentValue = getParentValue(parentField, externalValues, stateById)
      if (currentParentValue === parentValue) {
        // Parent is set, now we can clean up the flag in next cycle
        autoSelectedToCleanup.add(parentField)
      }
    }

    // Reset manuallyCleared when user actively selects child (after auto-selection)
    if (childValue && parentState?.manuallyCleared && !wasAutoSelected) {
      setFor(parentField, prev => (prev ? { ...prev, manuallyCleared: false } : prev))
    }
  }

  /**
   * Handles external filter dependency for a single config
   */
  const handleExternalFilterDependency = (config: CatalogSelectConfig): void => {
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
      externalValues,
      lastExternalValuesRef
    }).catch(() => {
      // Silently fail - will retry on next interaction
    })
  }

  // Unified dependency handling with case-based logic
  useEffect(() => {
    const autoSelectedToCleanup = new Set<string>()

    for (const config of configs) {
      const { parentField, filterField } = config
      if (!parentField && !filterField) continue

      // Handle parent-child dependencies
      if (parentField) {
        handleParentChildDependency(config, autoSelectedToCleanup)
      }

      // Handle external filter dependencies
      if (filterField) {
        handleExternalFilterDependency(config)
      }
    }

    // Cleanup auto-selected parents
    for (const parentId of autoSelectedToCleanup) {
      autoSelectedParentsRef.current.delete(parentId)
    }
    // FIX: Remove stateById from dependencies to prevent infinite loops - dependencySignature already captures state changes
  }, [
    dependencySignature,
    configs,
    externalValues,
    setFor,
    fetchCatalogEntriesByIdentifier,
    defaultPageSize,
    locale,
    handleParentChildDependency,
    handleExternalFilterDependency
  ])
}

export default useCatalogDependencies

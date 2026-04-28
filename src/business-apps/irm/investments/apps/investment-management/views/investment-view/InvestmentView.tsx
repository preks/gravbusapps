import React, { useState, useCallback, useMemo, useRef } from 'react'
import { DataDisplay, Button } from '@newwork/nw-design-system'
import type { FilterConfiguration } from '@newwork/nw-design-system'
import { DownloadIcon, FileXlsIcon } from '@phosphor-icons/react'
import { AppAction } from '@/components/app-action/AppAction'
import { useInvestmentExport } from './hooks/useInvestmentExport'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useAvailableCurrencies } from '@/common/data/common/hooks/useAvailableCurrencies'
import { InvestmentKPICards } from '@/common/components/investment-kpi-cards'
import { INVESTMENT_VIEW_KPI_CONFIG } from '@/common/data/investment/kpis'
import { useInvestmentViewKPIIntegration } from '@/common/data/investment/hooks/useInvestmentViewKPIIntegration'
import type { InvestmentViewKPIScope } from '@/common/data/investment/hooks/useInvestmentViewKPIIntegration'
import AllInvestmentsList from './data/investment-data/AllInvestmentsList'
import GenericInvestmentsList from './data/shared/GenericInvestmentsList'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { useFilterGroups } from '@/common/data/common/hooks/useFilterGroups'
import { buildDynamicFilterConfig } from '@/common/components/common-relations/view-layouts/account-layout/utils/filterHelpers'
import { INVESTMENT_DESCRIPTORS } from '@/common/data/investment/types/investmentTypes.new'
import {
  readViewPreferences,
  writeViewPreferences,
  type StoredPreferences
} from '@/common/hooks/useViewPreferencesStorage'
import { baseInvestmentFilterConfig, overviewInvestmentFilterConfig } from './data/investmentFilterConfig'
import { useInvestmentSectionState } from './data/investment-data/useInvestmentSectionState'
import { useGenericInvestmentSectionState } from './hooks/useGenericInvestmentSectionState'
import {
  useInvestmentGroups,
  type InvestmentCatalogEntry,
  type InvestmentGroup,
  type InvestmentListCatalogData
} from './hooks/useInvestmentGroups'
import { useAllInvestmentCounts } from './hooks/useAllInvestmentCounts'
import { useInvestmentTabsInitialization } from './hooks/useInvestmentTabsInitialization'
import { aggregateDynamicStates } from './utils/kpiAggregation'
import {
  buildAggregatedInvestmentListColumnConfiguration,
  type InvestmentListColumnConfiguration
} from './utils/investmentListColumnTransformer'
import {
  findCurrencyByCode,
  buildFilterWithCurrency,
  buildCurrencyFilter,
  isAllCurrencySelection
} from './utils/filterHandlers'
import { useInvestmentAccountFilter } from './hooks/useInvestmentAccountFilter'
import { CurrencyFilter } from '../analytics-view/shared/components/CurrencyFilter'

// Stable empty object to prevent infinite loops
const EMPTY_FILTERS = {}
const MAX_DYNAMIC_GROUP_SLOTS = 10
const INVESTMENT_OVERVIEW_PREFERENCES_KEY = 'irm:investment-view:overview-preferences:v1'
const OVERVIEW_DEFAULT_VISIBLE_COLUMNS = [
  'name',
  'investmentGroup',
  'investmentType',
  'totalInvestmentAmount',
  'ownerEmployee',
  'investmentStatus',
  'createdAt',
  'actions'
]
const OVERVIEW_AVAILABLE_COLUMN_IDS = [
  'name',
  'investmentGroup',
  'investmentType',
  'totalInvestmentAmount',
  'securityQuantity',
  'timeWeightedPerformance',
  'maturityDate',
  'ownerEmployee',
  'investmentStatus',
  'createdAt',
  'actions'
]
const BASE_FILTER_ALIASES: Record<string, string[]> = {
  acquisitionDateRange: ['acquisitionDate'],
  plannedExitDateRange: ['plannedExitDate'],
  exitDateRange: ['exitDate']
}

const mergeFilterConfigurations = (
  baseConfig: FilterConfiguration,
  dynamicConfig?: FilterConfiguration
): FilterConfiguration => {
  if (!dynamicConfig?.groups?.length) {
    return baseConfig
  }

  const existingFilterIds = new Set(
    baseConfig.groups.flatMap(group =>
      group.filters.flatMap(filter => {
        const filterId = filter.field || filter.id
        return [filterId, ...(BASE_FILTER_ALIASES[filterId] || [])]
      })
    )
  )
  const dynamicGroups = dynamicConfig.groups
    .map(group => ({
      ...group,
      filters: group.filters.filter(filter => !existingFilterIds.has(filter.field || filter.id))
    }))
    .filter(group => group.filters.length > 0)

  if (dynamicGroups.length === 0) {
    return baseConfig
  }

  return {
    ...baseConfig,
    groups: [...baseConfig.groups, ...dynamicGroups]
  }
}

const belongsToInvestmentGroup = (entry: InvestmentCatalogEntry, group: InvestmentGroup): boolean => {
  return (
    entry.parentEntryId === group.id ||
    entry.parentEntryId === group.code ||
    entry.parentEntry?.id === group.id ||
    entry.parentEntry?.code === group.code
  )
}

const getInvestmentTypeFilterOptions = (
  currentSection: string,
  investmentGroups: InvestmentGroup[],
  catalogData: InvestmentListCatalogData
): Array<{ id: string; label: string }> | null => {
  if (currentSection === 'overview') {
    return null
  }

  const group = investmentGroups.find(item => item.tabId === currentSection)
  if (!group) {
    return null
  }

  const options = catalogData.investmentTypes
    .filter(entry => belongsToInvestmentGroup(entry, group))
    .map(entry => ({
      id: entry.id,
      label: entry.value || entry.code || entry.id
    }))

  return Array.from(new Map(options.map(option => [option.id, option])).values())
}

const getInvestmentGroupPreferencesKey = (group: Pick<InvestmentGroup, 'code' | 'id'>): string => {
  return `irm:investment-view:group:${group.code || group.id}:preferences:v1`
}

const saveInvestmentViewPreferencePatch = (storageKey: string | undefined, patch: StoredPreferences): void => {
  if (!storageKey) return
  writeViewPreferences(storageKey, { ...readViewPreferences(storageKey), ...patch })
}

const reconcileVisibleColumns = (
  cachedVisibleColumns: string[] | undefined,
  availableColumnIds: string[],
  defaultVisibleColumns: string[]
): string[] | null => {
  if (!cachedVisibleColumns) {
    return null
  }

  const available = new Set(availableColumnIds)
  const visibleColumns = cachedVisibleColumns.filter(column => available.has(column))

  return visibleColumns.length > 0 ? visibleColumns : defaultVisibleColumns
}

const useDynamicGroupSlot = ({
  accessToken,
  investmentGroups,
  index,
  filtersByTab,
  filtersReady,
  currentSection,
  columnConfigByTab,
  preferenceKeysByTab,
  preferencesByTab
}: {
  accessToken?: string
  investmentGroups: InvestmentGroup[]
  index: number
  filtersByTab: Record<string, Record<string, any>>
  filtersReady: boolean
  currentSection: string
  columnConfigByTab: Record<string, InvestmentListColumnConfiguration>
  preferenceKeysByTab: Record<string, string>
  preferencesByTab: Record<string, StoredPreferences>
}) => {
  const group = investmentGroups[index]
  const tabId = group?.tabId
  const columnConfig = tabId ? columnConfigByTab[tabId] : undefined
  const preferences = tabId ? preferencesByTab[tabId] : undefined
  const preferenceKey = tabId ? preferenceKeysByTab[tabId] : undefined
  const availableColumnIds = useMemo(
    () => (columnConfig ? ['name', ...columnConfig.availableColumns.map(column => column.id), 'actions'] : []),
    [columnConfig]
  )
  const initialVisibleColumns = useMemo(
    () =>
      columnConfig
        ? reconcileVisibleColumns(preferences?.visibleColumns, availableColumnIds, columnConfig.defaultVisibleColumns)
        : null,
    [availableColumnIds, columnConfig, preferences?.visibleColumns]
  )

  // Full filters for the data list (respects all user-applied filters)
  const selectedFilters = useMemo(() => filtersByTab[tabId || ''] || {}, [filtersByTab, tabId])

  const handleSortingPreferenceChange = useCallback(
    (sorting: Array<{ id: string; desc: boolean }>) => {
      saveInvestmentViewPreferencePatch(preferenceKey, { sorting })
    },
    [preferenceKey]
  )

  const handleVisibleColumnsPreferenceChange = useCallback(
    (visibleColumns: string[]) => {
      saveInvestmentViewPreferencePatch(preferenceKey, { visibleColumns })
    },
    [preferenceKey]
  )

  const sectionStateOptions = {
    accessToken: filtersReady && group && currentSection === tabId ? accessToken || '' : '',
    groupCode: group?.code || '',
    selectedFilters,
    defaultVisibleColumns: columnConfig?.defaultVisibleColumns,
    initialSorting: preferences?.sorting ?? null,
    onSortingChange: handleSortingPreferenceChange,
    initialVisibleColumns,
    onVisibleColumnsChange: handleVisibleColumnsPreferenceChange,
    queryFields: columnConfig?.queryFields,
    sortFieldByColumnId: columnConfig?.sortFieldByColumnId,
    filterConditionByFilterId: columnConfig?.filterConditionByFilterId
  }

  const stateResult = useGenericInvestmentSectionState(sectionStateOptions)

  return {
    tabId,
    stateResult
  }
}

export interface InvestmentViewProps extends BusinessAppContextProps {
  initialSubTab?: string
  onSubTabChange?: (subTab: string) => void
}

export const InvestmentView: React.FC<InvestmentViewProps> = context => {
  const { initialSubTab, onSubTabChange, accessToken } = context

  // Fetch investment groups from catalog dynamically
  const { investmentGroups, catalogData, isLoading: groupsLoading } = useInvestmentGroups(accessToken || '')

  // Normalize section - only 'overview' is hardcoded, others come from catalog
  const normalize = useCallback(
    (val?: string) => {
      if (!val || val === 'overview') return 'overview'
      // Check if it's a valid group tab
      const validTabs = investmentGroups.map(g => g.tabId)
      return validTabs.includes(val) ? val : 'overview'
    },
    [investmentGroups]
  )

  const [currentSection, setCurrentSection] = useState(normalize(initialSubTab))

  // Single currency state per tab (stored in map)
  const [currencyByTab, setCurrencyByTab] = useState<Record<string, string>>({
    overview: 'all'
  })

  // Single filter state per tab (stored in map)
  const [filtersByTab, setFiltersByTab] = useState<Record<string, Record<string, any>>>({
    overview: {}
  })
  const [filtersReady, setFiltersReady] = useState(false)

  // Get current tab's currency and filters (memoize to prevent infinite loops)
  const selectedCurrency = currencyByTab[currentSection] || 'all'

  /** Aggregates use a single display currency; when "All" is selected, default to EUR for formatting only. */
  const displayCurrencyCode = useMemo(
    () => (isAllCurrencySelection(selectedCurrency) ? 'EUR' : selectedCurrency),
    [selectedCurrency]
  )
  const selectedFilters = useMemo(() => filtersByTab[currentSection] || EMPTY_FILTERS, [filtersByTab, currentSection])

  // Fetch available currencies
  const { currencies: availableCurrencies, isLoading: currenciesLoading } = useAvailableCurrencies(context, {
    returnFormat: 'full'
  })

  // Fetch all counts (overview + all groups) in a single GraphQL query, filtered by currency.
  // Active tab count is sourced from the list query's totalCount after filters are applied.
  const allCounts = useAllInvestmentCounts(context, investmentGroups, currencyByTab, filtersReady)

  const dynamicColumnConfigByTab = useMemo(
    () =>
      investmentGroups.reduce(
        (acc, group) => {
          acc[group.tabId] = buildAggregatedInvestmentListColumnConfiguration(group, catalogData)
          return acc
        },
        {} as Record<string, InvestmentListColumnConfiguration>
      ),
    [catalogData, investmentGroups]
  )

  const preferenceKeysByTab = useMemo(
    () =>
      investmentGroups.reduce(
        (acc, group) => {
          acc[group.tabId] = getInvestmentGroupPreferencesKey(group)
          return acc
        },
        { overview: INVESTMENT_OVERVIEW_PREFERENCES_KEY } as Record<string, string>
      ),
    [investmentGroups]
  )

  const preferencesByTab = useMemo(
    () =>
      Object.entries(preferenceKeysByTab).reduce(
        (acc, [tabId, storageKey]) => {
          acc[tabId] = readViewPreferences(storageKey)
          return acc
        },
        {} as Record<string, StoredPreferences>
      ),
    [preferenceKeysByTab]
  )

  const initialFiltersByTab = useMemo(
    () =>
      Object.entries(preferencesByTab).reduce(
        (acc, [tabId, preferences]) => {
          acc[tabId] = preferences.filters ?? {}
          return acc
        },
        {} as Record<string, Record<string, any>>
      ),
    [preferencesByTab]
  )

  // Bounded dynamic slots to support scalable groups without fixed group0..group4 wiring
  const groupSlot0 = useDynamicGroupSlot({
    accessToken,
    investmentGroups,
    index: 0,
    filtersByTab,
    filtersReady,
    currentSection,
    columnConfigByTab: dynamicColumnConfigByTab,
    preferenceKeysByTab,
    preferencesByTab
  })
  const groupSlot1 = useDynamicGroupSlot({
    accessToken,
    investmentGroups,
    index: 1,
    filtersByTab,
    filtersReady,
    currentSection,
    columnConfigByTab: dynamicColumnConfigByTab,
    preferenceKeysByTab,
    preferencesByTab
  })
  const groupSlot2 = useDynamicGroupSlot({
    accessToken,
    investmentGroups,
    index: 2,
    filtersByTab,
    filtersReady,
    currentSection,
    columnConfigByTab: dynamicColumnConfigByTab,
    preferenceKeysByTab,
    preferencesByTab
  })
  const groupSlot3 = useDynamicGroupSlot({
    accessToken,
    investmentGroups,
    index: 3,
    filtersByTab,
    filtersReady,
    currentSection,
    columnConfigByTab: dynamicColumnConfigByTab,
    preferenceKeysByTab,
    preferencesByTab
  })
  const groupSlot4 = useDynamicGroupSlot({
    accessToken,
    investmentGroups,
    index: 4,
    filtersByTab,
    filtersReady,
    currentSection,
    columnConfigByTab: dynamicColumnConfigByTab,
    preferenceKeysByTab,
    preferencesByTab
  })
  const groupSlot5 = useDynamicGroupSlot({
    accessToken,
    investmentGroups,
    index: 5,
    filtersByTab,
    filtersReady,
    currentSection,
    columnConfigByTab: dynamicColumnConfigByTab,
    preferenceKeysByTab,
    preferencesByTab
  })
  const groupSlot6 = useDynamicGroupSlot({
    accessToken,
    investmentGroups,
    index: 6,
    filtersByTab,
    filtersReady,
    currentSection,
    columnConfigByTab: dynamicColumnConfigByTab,
    preferenceKeysByTab,
    preferencesByTab
  })
  const groupSlot7 = useDynamicGroupSlot({
    accessToken,
    investmentGroups,
    index: 7,
    filtersByTab,
    filtersReady,
    currentSection,
    columnConfigByTab: dynamicColumnConfigByTab,
    preferenceKeysByTab,
    preferencesByTab
  })
  const groupSlot8 = useDynamicGroupSlot({
    accessToken,
    investmentGroups,
    index: 8,
    filtersByTab,
    filtersReady,
    currentSection,
    columnConfigByTab: dynamicColumnConfigByTab,
    preferenceKeysByTab,
    preferencesByTab
  })
  const groupSlot9 = useDynamicGroupSlot({
    accessToken,
    investmentGroups,
    index: 9,
    filtersByTab,
    filtersReady,
    currentSection,
    columnConfigByTab: dynamicColumnConfigByTab,
    preferenceKeysByTab,
    preferencesByTab
  })

  const dynamicGroupSlots = useMemo(
    () =>
      [
        groupSlot0,
        groupSlot1,
        groupSlot2,
        groupSlot3,
        groupSlot4,
        groupSlot5,
        groupSlot6,
        groupSlot7,
        groupSlot8,
        groupSlot9
      ].slice(0, MAX_DYNAMIC_GROUP_SLOTS),
    [
      groupSlot0,
      groupSlot1,
      groupSlot2,
      groupSlot3,
      groupSlot4,
      groupSlot5,
      groupSlot6,
      groupSlot7,
      groupSlot8,
      groupSlot9
    ]
  )

  // Create stable filter reference for overview
  const stableOverviewFilters = useMemo(() => filtersByTab.overview || {}, [filtersByTab.overview])
  const overviewInitialVisibleColumns = useMemo(
    () =>
      reconcileVisibleColumns(
        preferencesByTab.overview?.visibleColumns,
        OVERVIEW_AVAILABLE_COLUMN_IDS,
        OVERVIEW_DEFAULT_VISIBLE_COLUMNS
      ),
    [preferencesByTab.overview?.visibleColumns]
  )
  const saveOverviewSorting = useCallback((sorting: Array<{ id: string; desc: boolean }>) => {
    saveInvestmentViewPreferencePatch(INVESTMENT_OVERVIEW_PREFERENCES_KEY, { sorting })
  }, [])
  const saveOverviewVisibleColumns = useCallback((visibleColumns: string[]) => {
    saveInvestmentViewPreferencePatch(INVESTMENT_OVERVIEW_PREFERENCES_KEY, { visibleColumns })
  }, [])

  // Overview state (hardcoded)
  const shouldFetchOverview = filtersReady && currentSection === 'overview'
  const overviewState = useInvestmentSectionState({
    accessToken: shouldFetchOverview ? accessToken || '' : '',
    selectedFilters: stableOverviewFilters,
    initialSorting: preferencesByTab.overview?.sorting ?? null,
    onSortingChange: saveOverviewSorting,
    initialVisibleColumns: overviewInitialVisibleColumns,
    onVisibleColumnsChange: saveOverviewVisibleColumns
  })

  const dynamicStates = useMemo(
    () =>
      aggregateDynamicStates(
        investmentGroups,
        dynamicGroupSlots.map(slot => slot.stateResult)
      ),
    [investmentGroups, dynamicGroupSlots]
  )

  const investmentViewKPIScope = useMemo((): InvestmentViewKPIScope => {
    if (currentSection === 'overview') return 'overview'
    const group = investmentGroups.find(g => g.tabId === currentSection)
    return group ? { groupCode: group.code } : 'overview'
  }, [currentSection, investmentGroups])

  const kpiCurrencyId = filtersByTab[currentSection]?.currencyIds?.[0] as string | undefined
  const investmentViewKPIFilters = useMemo(
    () => (kpiCurrencyId ? { currencyIds: [kpiCurrencyId] } : EMPTY_FILTERS),
    [kpiCurrencyId]
  )

  const investmentViewKPIEnabled =
    filtersReady && (currentSection === 'overview' || investmentGroups.some(g => g.tabId === currentSection))

  const investmentViewKPIs = useInvestmentViewKPIIntegration(
    context,
    investmentViewKPIScope,
    investmentViewKPIFilters,
    selectedCurrency,
    investmentViewKPIEnabled
  )

  // Initialize currencies and filters when available
  useInvestmentTabsInitialization(
    availableCurrencies,
    filtersReady,
    investmentGroups,
    setCurrencyByTab,
    setFiltersByTab,
    setFiltersReady,
    initialFiltersByTab
  )

  // Section change handler
  const handleSectionChange = useCallback(
    (newSection: string) => {
      setCurrentSection(newSection)
      onSubTabChange?.(newSection)
    },
    [onSubTabChange]
  )

  // Get current state - memoized to keep a stable reference
  const currentState = useMemo(() => {
    if (currentSection === 'overview') return overviewState
    return dynamicStates[currentSection] || overviewState
  }, [currentSection, overviewState, dynamicStates])

  // Refs so the filter handler can read the latest values without being recreated
  const currentSectionRef = useRef(currentSection)
  currentSectionRef.current = currentSection
  const availableCurrenciesRef = useRef(availableCurrencies)
  availableCurrenciesRef.current = availableCurrencies
  const selectedCurrencyRef = useRef(selectedCurrency)
  selectedCurrencyRef.current = selectedCurrency
  const currentStateRef = useRef(currentState)
  currentStateRef.current = currentState
  const preferenceKeysByTabRef = useRef(preferenceKeysByTab)
  preferenceKeysByTabRef.current = preferenceKeysByTab

  // Fetch all accounts linked to any investment — shared across every tab.
  // No group or currency scoping so the list is fetched exactly once after initialisation.
  const { accounts: accountOptions } = useInvestmentAccountFilter(context.accessToken, filtersReady)

  // Filter configuration
  const filterGroups = useFilterGroups(context, 'Investment', INVESTMENT_DESCRIPTORS)

  const injectAccountFilter = useCallback(
    (filter: any) => {
      if (filter.id !== 'investmentAccountIds' || accountOptions.length === 0) return filter
      return {
        ...filter,
        config: {
          ...filter.config,
          options: accountOptions.map((a: any) => ({ id: a.id, label: a.label })),
          totalCount: accountOptions.length,
          hasMore: false
        }
      }
    },
    [accountOptions]
  )

  const injectAccountGroup = useCallback(
    (group: any) => {
      if (group.id !== 'account-group') return group
      return { ...group, filters: group.filters.map(injectAccountFilter) }
    },
    [injectAccountFilter]
  )

  const investmentTypeOptions = useMemo(
    () => getInvestmentTypeFilterOptions(currentSection, investmentGroups, catalogData),
    [catalogData, currentSection, investmentGroups]
  )

  const injectInvestmentTypeFilter = useCallback(
    (filter: any) => {
      if (filter.id !== 'investmentTypeIds' || investmentTypeOptions === null) return filter
      return {
        ...filter,
        config: {
          ...filter.config,
          options: investmentTypeOptions,
          totalCount: investmentTypeOptions.length,
          hasMore: false
        }
      }
    },
    [investmentTypeOptions]
  )

  const injectInvestmentTypeGroup = useCallback(
    (group: any) => {
      if (group.id !== 'investment-type-group') return group
      return { ...group, filters: group.filters.map(injectInvestmentTypeFilter) }
    },
    [injectInvestmentTypeFilter]
  )

  const injectBaseFilterGroups = useCallback(
    (group: any) => injectInvestmentTypeGroup(injectAccountGroup(group)),
    [injectAccountGroup, injectInvestmentTypeGroup]
  )

  const currentFilterConfig = useMemo(() => {
    const baseConfig = currentSection === 'overview' ? overviewInvestmentFilterConfig : baseInvestmentFilterConfig
    const sectionFilterConfig =
      currentSection === 'overview'
        ? baseConfig
        : mergeFilterConfigurations(baseConfig, dynamicColumnConfigByTab[currentSection]?.dynamicFilterConfig)
    const builtConfig =
      filterGroups.isLoading || Object.keys(filterGroups.filterData || {}).length === 0
        ? sectionFilterConfig
        : buildDynamicFilterConfig(sectionFilterConfig, INVESTMENT_DESCRIPTORS, filterGroups)

    return { ...builtConfig, groups: builtConfig.groups.map(injectBaseFilterGroups) }
  }, [currentSection, filterGroups, injectBaseFilterGroups, dynamicColumnConfigByTab])

  // Stable filter change handler — uses refs so it never needs to be recreated.
  // Matches the AccountLayout pattern (empty deps, functional state updates).
  const handleFilterChange = useCallback((newFilters: Record<string, any>) => {
    const section = currentSectionRef.current
    const selection = selectedCurrencyRef.current
    const finalFilters = isAllCurrencySelection(selection)
      ? (() => {
          const f = { ...newFilters }
          delete f.currencyIds
          return f
        })()
      : buildFilterWithCurrency(newFilters, findCurrencyByCode(availableCurrenciesRef.current, selection))

    setFiltersByTab(prev => ({ ...prev, [section]: finalFilters }))
    saveInvestmentViewPreferencePatch(preferenceKeysByTabRef.current[section], { filters: finalFilters })

    const state = currentStateRef.current
    state.handlePaginationChange({ pageIndex: 0, pageSize: state.pageSize })
  }, [])

  // Currency change handler
  const handleCurrencyChange = useCallback(
    (newCurrency: string) => {
      const sectionFilters = { ...selectedFilters }
      if (isAllCurrencySelection(newCurrency)) {
        delete sectionFilters.currencyIds
      } else {
        Object.assign(sectionFilters, buildCurrencyFilter(availableCurrencies, newCurrency))
      }

      setCurrencyByTab(prev => ({ ...prev, [currentSection]: newCurrency }))
      setFiltersByTab(prev => ({ ...prev, [currentSection]: sectionFilters }))
      saveInvestmentViewPreferencePatch(preferenceKeysByTab[currentSection], { filters: sectionFilters })
    },
    [availableCurrencies, currentSection, preferenceKeysByTab, selectedFilters]
  )

  // Column definitions
  const availableColumns = useMemo(() => {
    if (currentSection !== 'overview') {
      const dynamicColumns = dynamicColumnConfigByTab[currentSection]?.availableColumns || []
      return [{ id: 'name', label: 'Investment' }, ...dynamicColumns, { id: 'actions', label: 'Actions' }]
    }

    return [
      { id: 'name', label: 'Investment' },
      { id: 'investmentGroup', label: 'Group' },
      { id: 'investmentType', label: 'Type' },
      { id: 'totalInvestmentAmount', label: 'Total Investment' },
      { id: 'securityQuantity', label: 'Quantity' },
      { id: 'timeWeightedPerformance', label: 'Time-Weighted Performance' },
      { id: 'maturityDate', label: 'Maturity Date' },
      { id: 'ownerEmployee', label: 'Owner' },
      { id: 'investmentStatus', label: 'Status' },
      { id: 'createdAt', label: 'Created' },
      { id: 'actions', label: 'Actions' }
    ]
  }, [currentSection, dynamicColumnConfigByTab])

  const sortableColumns = useMemo(() => {
    if (currentSection !== 'overview') {
      const dynamicColumns = dynamicColumnConfigByTab[currentSection]?.sortableColumns || []
      return [{ id: 'name', label: 'Investment' }, ...dynamicColumns]
    }

    return [
      { id: 'name', label: 'Investment' },
      { id: 'totalInvestmentAmount', label: 'Total Investment' },
      { id: 'securityQuantity', label: 'Quantity' },
      { id: 'timeWeightedPerformance', label: 'Time-Weighted Performance' },
      { id: 'maturityDate', label: 'Maturity Date' },
      { id: 'ownerEmployee', label: 'Owner' },
      { id: 'investmentStatus', label: 'Status' },
      { id: 'createdAt', label: 'Created' }
    ]
  }, [currentSection, dynamicColumnConfigByTab])

  // Listen for process completion - refetch counts + active section data
  useProcessCompletion({
    onSuccess: () => {
      allCounts.refetch()
      void investmentViewKPIs.refetch()
      if (currentSection === 'overview') {
        overviewState.refetch()
      } else {
        dynamicStates[currentSection]?.refetch?.()
      }
    }
  })

  const currencyCodes = useMemo(
    () =>
      (Array.isArray(availableCurrencies) ? availableCurrencies : [])
        .filter(c => c && typeof c !== 'string')
        .map((c: any) => c.code as string)
        .filter(Boolean),
    [availableCurrencies]
  )

  const currencyFilterUI = (
    <CurrencyFilter
      value={selectedCurrency}
      currencies={currencyCodes}
      onChange={handleCurrencyChange}
      allOptionLabel={getTranslationFromI18nKeyAndLabel('currency.filter.all', 'All')}
      dataTestId="investment-view-currency-filter"
    />
  )

  // Primary action for current section
  const renderPrimaryAction = useMemo(() => {
    const getActionContext = () => {
      if (currentSection === 'overview') {
        return {
          context: FlowContextName.investmentCreate,
          contextData: { fromView: 'investments', fromSubView: 'overview' }
        }
      }
      const group = investmentGroups.find(g => g.tabId === currentSection)
      if (group) {
        return {
          context: FlowContextName.investmentCreate,
          contextData: {
            investmentGroup: group.id,
            fromView: 'investments',
            fromSubView: group.tabId
          }
        }
      }
      return null
    }

    const actionContext = getActionContext()
    if (!actionContext) return null

    const label =
      currentSection === 'overview'
        ? getTranslationFromI18nKeyAndLabel('investment:investment.addInvestment', 'Add Investment')
        : `Add ${investmentGroups.find(g => g.tabId === currentSection)?.label || 'Investment'}`

    return (
      <AppAction
        variant="create-primary"
        contexts={[actionContext]}
        accessToken={accessToken || ''}
        data-testid={`${currentSection}-add-action`}
        emptyState="hide"
      >
        {label}
      </AppAction>
    )
  }, [currentSection, investmentGroups, accessToken])

  // Normalize active tab count: overviewState uses `totalCount`, group states use `total`
  const stateWithCount = currentState as { totalCount?: number; total?: number }
  const activeTabCount = stateWithCount.totalCount ?? stateWithCount.total ?? 0

  // Build title sections dynamically.
  // Active tab: count comes from the list query so it reflects applied filters (0 extra requests).
  // Non-active tabs: count comes from the initial combined query (currency-only, stable).
  const titleSections = useMemo(() => {
    const sections = [
      {
        id: 'overview',
        label: 'Overview',
        metadata: {
          count: currentSection === 'overview' ? activeTabCount : allCounts.overview.count,
          isLoading: currentSection === 'overview' ? currentState.loading : allCounts.overview.isLoading
        }
      }
    ]

    investmentGroups.forEach(group => {
      const isActive = currentSection === group.tabId
      sections.push({
        id: group.tabId,
        label: group.label,
        metadata: {
          count: isActive ? activeTabCount : allCounts.groups[group.tabId]?.count || 0,
          isLoading: isActive ? currentState.loading : allCounts.groups[group.tabId]?.isLoading || false
        }
      })
    })

    return sections
  }, [investmentGroups, allCounts, currentSection, activeTabCount, currentState.loading])

  const renderKPIs = () => (
    <InvestmentKPICards
      config={INVESTMENT_VIEW_KPI_CONFIG}
      data={investmentViewKPIs.current}
      previousData={investmentViewKPIs.previous}
      currencyCode={displayCurrencyCode}
      isLoading={investmentViewKPIs.isLoading}
      error={investmentViewKPIs.error ? new Error(investmentViewKPIs.error) : null}
      onRetry={investmentViewKPIs.refetch}
      data-testid={`investment-view-${currentSection}-kpis`}
    />
  )

  // Render list for current section
  const renderList = () => {
    if (currentSection === 'overview') {
      return (
        <AllInvestmentsList
          {...context}
          data={overviewState.investments}
          loading={overviewState.isInitialLoading}
          error={overviewState.error}
          totalCount={overviewState.totalCount}
          sorting={overviewState.sorting}
          onSortingChange={overviewState.handleSortingChange}
          pagination={overviewState.pagination}
          onPaginationChange={overviewState.handlePaginationChange}
          visibleColumns={overviewState.visibleColumns}
          listAggregates={overviewState.listAggregates}
          showAggregatesBar={!overviewState.isInitialLoading && !overviewState.error}
          displayCurrencyCode={displayCurrencyCode}
        />
      )
    }

    const group = investmentGroups.find(g => g.tabId === currentSection)
    const state = dynamicStates[currentSection]
    if (!group || !state) return null

    const columnConfig = dynamicColumnConfigByTab[group.tabId]

    return (
      <GenericInvestmentsList
        {...context}
        config={{
          investmentGroup: group.code as any,
          dataTestIdPrefix: `${group.tabId}-investment`,
          defaultTypeLabel: 'Unknown',
          fromSubView: group.tabId,
          emptyMessage: `No ${group.label.toLowerCase()} investments found`
        }}
        catalogColumns={columnConfig?.columns}
        data={state.investments}
        loading={state.isInitialLoading}
        error={state.error}
        totalCount={state.totalCount}
        sorting={state.sorting}
        onSortingChange={state.handleSortingChange}
        pagination={state.pagination}
        onPaginationChange={state.handlePaginationChange}
        visibleColumns={state.visibleColumns}
        listAggregates={state.listAggregates}
        showAggregatesBar={!state.isInitialLoading && !state.error}
        showEquityMetrics={group.code === 'EQUITY'}
        displayCurrencyCode={displayCurrencyCode}
      />
    )
  }

  const activeGroup = investmentGroups.find(g => g.tabId === currentSection)
  const exportFilenamePrefix =
    currentSection === 'overview'
      ? 'investments'
      : activeGroup?.label?.toLowerCase().replace(/\s+/g, '-') || 'investments'

  const { isExporting, handleExportCsv, handleExportExcel } = useInvestmentExport({
    accessToken: accessToken || '',
    currentState,
    selectedFilters,
    currentSection,
    investmentGroups,
    totalCount: activeTabCount,
    filenamePrefix: exportFilenamePrefix,
    displayCurrencyCode
  })

  if (groupsLoading || currenciesLoading) {
    return <div>Loading...</div>
  }

  return (
    <div data-testid="investment-view">
      {/* Header */}
      <div className="gba:mb-6">
        <div className="gba:mb-4">
          <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">Investment Portfolio</h1>
          <p className="gba:text-gray-600">Manage and track investment portfolio across asset classes</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="gba:mb-6">{renderKPIs()}</div>

      {/* DataDisplay with dynamic tabs */}
      <DataDisplay
        titleSections={titleSections}
        currentSection={currentSection}
        onSectionChange={handleSectionChange}
        searchValue={currentState.search}
        searchPlaceholder="Search investments..."
        onSearchChange={currentState.setSearch}
        filters={selectedFilters}
        filterConfiguration={currentFilterConfig}
        onFilterChange={handleFilterChange}
        sorting={currentState.sorting}
        sortableColumns={sortableColumns}
        onSortingChange={currentState.handleSortingChange}
        availableColumns={availableColumns}
        visibleColumns={currentState.visibleColumns}
        onVisibleColumnsChange={currentState.setVisibleColumns}
        primaryAction={renderPrimaryAction}
        secondaryActions={
          <>
            {currencyFilterUI}
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCsv}
              disabled={isExporting || activeTabCount === 0}
              title={isExporting ? 'Exporting…' : `Export ${activeTabCount} investments as CSV`}
              data-testid="export-investments-csv"
            >
              <DownloadIcon size={16} />
              CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportExcel}
              disabled={isExporting || activeTabCount === 0}
              title={isExporting ? 'Exporting…' : `Export ${activeTabCount} investments as Excel`}
              data-testid="export-investments-excel"
            >
              <FileXlsIcon size={16} />
              Excel
            </Button>
          </>
        }
        toolbarDensity="default"
      >
        {renderList()}
      </DataDisplay>
    </div>
  )
}

export default InvestmentView

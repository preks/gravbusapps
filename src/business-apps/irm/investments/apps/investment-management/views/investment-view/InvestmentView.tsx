import React, { useState, useCallback, useMemo, useRef } from 'react'
import { DataDisplay, Button } from '@newwork/nw-design-system'
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
import { baseInvestmentFilterConfig, overviewInvestmentFilterConfig } from './data/investmentFilterConfig'
import { useInvestmentSectionState } from './data/investment-data/useInvestmentSectionState'
import { useGenericInvestmentSectionState } from './hooks/useGenericInvestmentSectionState'
import { useInvestmentGroups } from './hooks/useInvestmentGroups'
import { useAllInvestmentCounts } from './hooks/useAllInvestmentCounts'
import { useInvestmentTabsInitialization } from './hooks/useInvestmentTabsInitialization'
import { getGroupConfiguration } from './config/groupConfigurations'
import { aggregateDynamicStates } from './utils/kpiAggregation'
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

const useDynamicGroupSlot = ({
  accessToken,
  investmentGroups,
  index,
  filtersByTab,
  filtersReady,
  currentSection
}: {
  accessToken?: string
  investmentGroups: Array<{ code: string; tabId: string }>
  index: number
  filtersByTab: Record<string, Record<string, any>>
  filtersReady: boolean
  currentSection: string
}) => {
  const group = investmentGroups[index]
  const tabId = group?.tabId

  // Full filters for the data list (respects all user-applied filters)
  const selectedFilters = useMemo(() => filtersByTab[tabId || ''] || {}, [filtersByTab, tabId])

  const stateResult = useGenericInvestmentSectionState({
    accessToken: filtersReady && group && currentSection === tabId ? accessToken || '' : '',
    groupCode: group?.code || '',
    selectedFilters
  })

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
  const { investmentGroups, isLoading: groupsLoading } = useInvestmentGroups(accessToken || '')

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

  // Bounded dynamic slots to support scalable groups without fixed group0..group4 wiring
  const groupSlot0 = useDynamicGroupSlot({
    accessToken,
    investmentGroups,
    index: 0,
    filtersByTab,
    filtersReady,
    currentSection
  })
  const groupSlot1 = useDynamicGroupSlot({
    accessToken,
    investmentGroups,
    index: 1,
    filtersByTab,
    filtersReady,
    currentSection
  })
  const groupSlot2 = useDynamicGroupSlot({
    accessToken,
    investmentGroups,
    index: 2,
    filtersByTab,
    filtersReady,
    currentSection
  })
  const groupSlot3 = useDynamicGroupSlot({
    accessToken,
    investmentGroups,
    index: 3,
    filtersByTab,
    filtersReady,
    currentSection
  })
  const groupSlot4 = useDynamicGroupSlot({
    accessToken,
    investmentGroups,
    index: 4,
    filtersByTab,
    filtersReady,
    currentSection
  })
  const groupSlot5 = useDynamicGroupSlot({
    accessToken,
    investmentGroups,
    index: 5,
    filtersByTab,
    filtersReady,
    currentSection
  })
  const groupSlot6 = useDynamicGroupSlot({
    accessToken,
    investmentGroups,
    index: 6,
    filtersByTab,
    filtersReady,
    currentSection
  })
  const groupSlot7 = useDynamicGroupSlot({
    accessToken,
    investmentGroups,
    index: 7,
    filtersByTab,
    filtersReady,
    currentSection
  })
  const groupSlot8 = useDynamicGroupSlot({
    accessToken,
    investmentGroups,
    index: 8,
    filtersByTab,
    filtersReady,
    currentSection
  })
  const groupSlot9 = useDynamicGroupSlot({
    accessToken,
    investmentGroups,
    index: 9,
    filtersByTab,
    filtersReady,
    currentSection
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

  // Overview state (hardcoded)
  const shouldFetchOverview = filtersReady && currentSection === 'overview'
  const overviewState = useInvestmentSectionState({
    accessToken: shouldFetchOverview ? accessToken || '' : '',
    selectedFilters: stableOverviewFilters
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
    setFiltersReady
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

  // Fetch all accounts linked to any investment — shared across every tab.
  // No group or currency scoping so the list is fetched exactly once after initialisation.
  const { accounts: accountOptions } = useInvestmentAccountFilter(context.accessToken, filtersReady)

  // Filter configuration
  const filterGroups = useFilterGroups(context, 'Investment', INVESTMENT_DESCRIPTORS)

  const injectAccountFilter = useCallback(
    (filter: any) => {
      if (filter.id !== 'investmentAccountIds') return filter
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

  const currentFilterConfig = useMemo(() => {
    const baseConfig = currentSection === 'overview' ? overviewInvestmentFilterConfig : baseInvestmentFilterConfig
    const builtConfig =
      filterGroups.isLoading || Object.keys(filterGroups.filterData || {}).length === 0
        ? baseConfig
        : buildDynamicFilterConfig(baseConfig, INVESTMENT_DESCRIPTORS, filterGroups)

    if (accountOptions.length === 0) return builtConfig

    return { ...builtConfig, groups: builtConfig.groups.map(injectAccountGroup) }
  }, [currentSection, filterGroups, accountOptions, injectAccountGroup])

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

    const state = currentStateRef.current
    state.handlePaginationChange({ pageIndex: 0, pageSize: state.pageSize })
  }, [])

  // Currency change handler
  const handleCurrencyChange = useCallback(
    (newCurrency: string) => {
      setCurrencyByTab(prev => ({ ...prev, [currentSection]: newCurrency }))
      setFiltersByTab(prev => {
        const sectionFilters = { ...prev[currentSection] }
        if (isAllCurrencySelection(newCurrency)) {
          delete sectionFilters.currencyIds
        } else {
          Object.assign(sectionFilters, buildCurrencyFilter(availableCurrencies, newCurrency))
        }
        return { ...prev, [currentSection]: sectionFilters }
      })
    },
    [currentSection, availableCurrencies]
  )

  // Column definitions
  const availableColumns = useMemo(
    () => [
      { id: 'name', label: 'Investment' },
      { id: 'investmentGroup', label: 'Group' },
      { id: 'investmentType', label: 'Type' },
      { id: 'totalInvestmentAmount', label: 'Total Investment' },
      { id: 'ownerEmployee', label: 'Owner' },
      { id: 'investmentStatus', label: 'Status' },
      { id: 'createdAt', label: 'Created' },
      { id: 'actions', label: 'Actions' }
    ],
    []
  )

  const sortableColumns = useMemo(
    () => [
      { id: 'name', label: 'Investment' },
      { id: 'totalInvestmentAmount', label: 'Total Investment' },
      { id: 'ownerEmployee', label: 'Owner' },
      { id: 'investmentStatus', label: 'Status' },
      { id: 'createdAt', label: 'Created' }
    ],
    []
  )

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

    const config = getGroupConfiguration(group.code)

    return (
      <GenericInvestmentsList
        {...context}
        config={{
          investmentGroup: group.code as any,
          dataTestIdPrefix: `${group.tabId}-investment`,
          defaultTypeLabel: 'Unknown',
          fromSubView: group.tabId,
          extraColumns: config.extraColumns || [],
          emptyMessage: `No ${group.label.toLowerCase()} investments found`
        }}
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

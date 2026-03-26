import React, { useState, useCallback, useMemo, useRef } from 'react'
import { DataDisplay, Button } from '@newwork/nw-design-system'
import { DownloadIcon, FileXlsIcon } from '@phosphor-icons/react'
import { AppAction } from '@/components/app-action/AppAction'
import { useInvestmentExport } from './hooks/useInvestmentExport'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useAvailableCurrencies } from '@/common/data/common/hooks/useAvailableCurrencies'
import { InvestmentKPICards } from '@/common/components/investment-kpi-cards'
import { OVERVIEW_KPI_CONFIG } from '@/common/data/investment/kpis'
import { useInvestmentPortfolioIntegration } from '../analytics-view/overview/hooks'
import { useEquityKPIIntegration } from '../analytics-view/equity-analytics/hooks'
import { useLiquidFundKPIIntegration } from '../analytics-view/liquid-fund-analytics/hooks'
import { useRealEstateKPIIntegration } from '../analytics-view/real-estate-analytics/hooks'
import { useGenericGroupKPIIntegration } from '@/common/data/investment/hooks/useGenericGroupKPIIntegration'
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
import { aggregateDynamicKPIs, aggregateDynamicStates } from './utils/kpiAggregation'
import { findCurrencyByCode, buildFilterWithCurrency, buildCurrencyFilter } from './utils/filterHandlers'
import { useInvestmentAccountFilter } from './hooks/useInvestmentAccountFilter'
import { CurrencyFilter } from '../analytics-view/shared/components/CurrencyFilter'

// Stable empty object to prevent infinite loops
const EMPTY_FILTERS = {}
const MAX_DYNAMIC_GROUP_SLOTS = 10

const useDynamicGroupSlot = ({
  context,
  accessToken,
  investmentGroups,
  index,
  currencyByTab,
  filtersByTab,
  filtersReady,
  currentSection
}: {
  context: BusinessAppContextProps
  accessToken?: string
  investmentGroups: Array<{ code: string; tabId: string }>
  index: number
  currencyByTab: Record<string, string>
  filtersByTab: Record<string, Record<string, any>>
  filtersReady: boolean
  currentSection: string
}) => {
  const group = investmentGroups[index]
  const tabId = group?.tabId
  const selectedCurrency = useMemo(() => currencyByTab[tabId || ''] || 'EUR', [currencyByTab, tabId])

  // Full filters for the data list (respects all user-applied filters)
  const selectedFilters = useMemo(() => filtersByTab[tabId || ''] || {}, [filtersByTab, tabId])

  // Currency-only filters for KPIs — prevents KPI re-fetch on non-currency filter changes
  const currencyId = filtersByTab[tabId || '']?.currencyIds?.[0] as string | undefined
  const kpiFilters = useMemo(() => (currencyId ? { currencyIds: [currencyId] } : {}), [currencyId])

  const stateResult = useGenericInvestmentSectionState({
    accessToken: filtersReady && group && currentSection === tabId ? accessToken || '' : '',
    groupCode: group?.code || '',
    selectedFilters
  })
  const genericKPIResult = useGenericGroupKPIIntegration(
    context,
    group?.code || '',
    selectedCurrency,
    kpiFilters,
    filtersReady && !!group && !getGroupConfiguration(group.code).kpiHookName && currentSection === tabId
  )

  return {
    tabId,
    stateResult,
    genericKPIResult
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
    overview: 'EUR'
  })

  // Single filter state per tab (stored in map)
  const [filtersByTab, setFiltersByTab] = useState<Record<string, Record<string, any>>>({
    overview: {}
  })
  const [filtersReady, setFiltersReady] = useState(false)

  // Get current tab's currency and filters (memoize to prevent infinite loops)
  const selectedCurrency = currencyByTab[currentSection] || 'EUR'
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
    context,
    accessToken,
    investmentGroups,
    index: 0,
    currencyByTab,
    filtersByTab,
    filtersReady,
    currentSection
  })
  const groupSlot1 = useDynamicGroupSlot({
    context,
    accessToken,
    investmentGroups,
    index: 1,
    currencyByTab,
    filtersByTab,
    filtersReady,
    currentSection
  })
  const groupSlot2 = useDynamicGroupSlot({
    context,
    accessToken,
    investmentGroups,
    index: 2,
    currencyByTab,
    filtersByTab,
    filtersReady,
    currentSection
  })
  const groupSlot3 = useDynamicGroupSlot({
    context,
    accessToken,
    investmentGroups,
    index: 3,
    currencyByTab,
    filtersByTab,
    filtersReady,
    currentSection
  })
  const groupSlot4 = useDynamicGroupSlot({
    context,
    accessToken,
    investmentGroups,
    index: 4,
    currencyByTab,
    filtersByTab,
    filtersReady,
    currentSection
  })
  const groupSlot5 = useDynamicGroupSlot({
    context,
    accessToken,
    investmentGroups,
    index: 5,
    currencyByTab,
    filtersByTab,
    filtersReady,
    currentSection
  })
  const groupSlot6 = useDynamicGroupSlot({
    context,
    accessToken,
    investmentGroups,
    index: 6,
    currencyByTab,
    filtersByTab,
    filtersReady,
    currentSection
  })
  const groupSlot7 = useDynamicGroupSlot({
    context,
    accessToken,
    investmentGroups,
    index: 7,
    currencyByTab,
    filtersByTab,
    filtersReady,
    currentSection
  })
  const groupSlot8 = useDynamicGroupSlot({
    context,
    accessToken,
    investmentGroups,
    index: 8,
    currencyByTab,
    filtersByTab,
    filtersReady,
    currentSection
  })
  const groupSlot9 = useDynamicGroupSlot({
    context,
    accessToken,
    investmentGroups,
    index: 9,
    currencyByTab,
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

  // Overview KPIs - only fetch when overview tab is active, only react to currency changes
  const overviewCurrencyId = filtersByTab['overview']?.currencyIds?.[0] as string | undefined
  const overviewKPIFilters = useMemo(
    () => (overviewCurrencyId ? { currencyIds: [overviewCurrencyId] } : EMPTY_FILTERS),
    [overviewCurrencyId]
  )
  const overviewKPIs = useInvestmentPortfolioIntegration(
    context,
    selectedCurrency,
    overviewKPIFilters,
    shouldFetchOverview
  )

  // Find stable tab IDs for KPI hooks
  const equityTabId = useMemo(() => investmentGroups.find(g => g.code === 'EQUITY')?.tabId, [investmentGroups])
  const liquidFundTabId = useMemo(() => investmentGroups.find(g => g.code === 'LIQUID_FUND')?.tabId, [investmentGroups])
  const realEstateTabId = useMemo(() => investmentGroups.find(g => g.code === 'REAL_ESTATE')?.tabId, [investmentGroups])

  // KPI filters scoped to currency only — other filters must not trigger KPI re-fetches
  const equityCurrencyId = filtersByTab[equityTabId || '']?.currencyIds?.[0] as string | undefined
  const liquidFundCurrencyId = filtersByTab[liquidFundTabId || '']?.currencyIds?.[0] as string | undefined
  const realEstateCurrencyId = filtersByTab[realEstateTabId || '']?.currencyIds?.[0] as string | undefined

  const equityKPIFilters = useMemo(
    () => (equityCurrencyId ? { currencyIds: [equityCurrencyId] } : EMPTY_FILTERS),
    [equityCurrencyId]
  )
  const liquidFundKPIFilters = useMemo(
    () => (liquidFundCurrencyId ? { currencyIds: [liquidFundCurrencyId] } : EMPTY_FILTERS),
    [liquidFundCurrencyId]
  )
  const realEstateKPIFilters = useMemo(
    () => (realEstateCurrencyId ? { currencyIds: [realEstateCurrencyId] } : EMPTY_FILTERS),
    [realEstateCurrencyId]
  )

  // Specialized KPIs - only fetch when the specific group tab is active
  const equityKPIs = useEquityKPIIntegration(
    context,
    currencyByTab[equityTabId || ''] || 'EUR',
    equityKPIFilters,
    filtersReady && currentSection === equityTabId
  )
  const liquidFundKPIs = useLiquidFundKPIIntegration(
    context,
    currencyByTab[liquidFundTabId || ''] || 'EUR',
    liquidFundKPIFilters,
    filtersReady && currentSection === liquidFundTabId
  )
  const realEstateKPIs = useRealEstateKPIIntegration(
    context,
    currencyByTab[realEstateTabId || ''] || 'EUR',
    realEstateKPIFilters,
    filtersReady && currentSection === realEstateTabId
  )

  const dynamicKPIs = useMemo(
    () =>
      aggregateDynamicKPIs(
        investmentGroups,
        equityKPIs,
        liquidFundKPIs,
        realEstateKPIs,
        dynamicGroupSlots.map(slot => slot.genericKPIResult)
      ),
    [investmentGroups, equityKPIs, liquidFundKPIs, realEstateKPIs, dynamicGroupSlots]
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
    const currencyObj = findCurrencyByCode(availableCurrenciesRef.current, selectedCurrencyRef.current)
    const finalFilters = buildFilterWithCurrency(newFilters, currencyObj)

    setFiltersByTab(prev => ({ ...prev, [section]: finalFilters }))

    const state = currentStateRef.current
    state.handlePaginationChange({ pageIndex: 0, pageSize: state.pageSize })
  }, [])

  // Currency change handler
  const handleCurrencyChange = useCallback(
    (newCurrency: string) => {
      const currencyFilter = buildCurrencyFilter(availableCurrencies, newCurrency)

      setCurrencyByTab(prev => ({ ...prev, [currentSection]: newCurrency }))
      setFiltersByTab(prev => ({
        ...prev,
        [currentSection]: { ...prev[currentSection], ...currencyFilter }
      }))
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
      if (currentSection === 'overview') {
        overviewKPIs.refetch()
        overviewState.refetch()
      } else {
        dynamicKPIs[currentSection]?.refetch?.()
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
    <CurrencyFilter value={selectedCurrency} currencies={currencyCodes} onChange={handleCurrencyChange} />
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

  // Render KPIs for current section
  const renderKPIs = () => {
    if (currentSection === 'overview') {
      return (
        <InvestmentKPICards
          config={OVERVIEW_KPI_CONFIG}
          data={overviewKPIs.kpis}
          previousData={overviewKPIs.previousKpis}
          currencyCode={selectedCurrency}
          isLoading={overviewKPIs.isLoading}
          error={overviewKPIs.error ? new Error(overviewKPIs.error) : null}
          onRetry={overviewKPIs.refetch}
          data-testid="investment-view-overview-kpis"
        />
      )
    }

    const kpiData = dynamicKPIs[currentSection]
    const group = investmentGroups.find(g => g.tabId === currentSection)
    if (!group || !kpiData) return null

    const config = getGroupConfiguration(group.code)

    return (
      <InvestmentKPICards
        config={config.kpiConfig!}
        data={kpiData.current || kpiData.kpis}
        previousData={kpiData.previous || kpiData.previousKpis}
        currencyCode={selectedCurrency}
        isLoading={kpiData.isLoading}
        error={kpiData.error ? new Error(kpiData.error) : null}
        onRetry={kpiData.refetch}
        data-testid={`investment-view-${currentSection}-kpis`}
      />
    )
  }

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
          defaultTypeLabel: group.label,
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
    filenamePrefix: exportFilenamePrefix
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

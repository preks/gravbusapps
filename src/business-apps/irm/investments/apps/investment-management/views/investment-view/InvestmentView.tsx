import React, { useState, useCallback, useMemo } from 'react'
import {
  DataDisplay,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Label
} from '@newwork/nw-design-system'
import { AppAction } from '@/components/app-action/AppAction'
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
import { useInvestmentTypeCount } from './hooks/useInvestmentTypeCount'
import { useInvestmentGroups } from './hooks/useInvestmentGroups'
import { useInvestmentTabsInitialization } from './hooks/useInvestmentTabsInitialization'
import { getGroupConfiguration } from './config/groupConfigurations'
import { aggregateDynamicKPIs, aggregateDynamicCounts, aggregateDynamicStates } from './utils/kpiAggregation'
import { findCurrencyByCode, buildFilterWithCurrency, buildCurrencyFilter } from './utils/filterHandlers'

// Stable empty object to prevent infinite loops
const EMPTY_FILTERS = {}

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

  // Fetch count for each investment type independently
  const { count: overviewCount, isLoading: overviewCountLoading } = useInvestmentTypeCount(
    context,
    'overview',
    selectedCurrency,
    selectedFilters,
    filtersReady
  )

  // Create stable tab IDs to prevent infinite loops (used by count hooks)
  const group0TabId = investmentGroups[0]?.tabId
  const group1TabId = investmentGroups[1]?.tabId
  const group2TabId = investmentGroups[2]?.tabId
  const group3TabId = investmentGroups[3]?.tabId
  const group4TabId = investmentGroups[4]?.tabId

  // Stable currency and filter references for count hooks
  const group0Currency = useMemo(() => currencyByTab[group0TabId || ''] || 'EUR', [currencyByTab, group0TabId])
  const group1Currency = useMemo(() => currencyByTab[group1TabId || ''] || 'EUR', [currencyByTab, group1TabId])
  const group2Currency = useMemo(() => currencyByTab[group2TabId || ''] || 'EUR', [currencyByTab, group2TabId])
  const group3Currency = useMemo(() => currencyByTab[group3TabId || ''] || 'EUR', [currencyByTab, group3TabId])
  const group4Currency = useMemo(() => currencyByTab[group4TabId || ''] || 'EUR', [currencyByTab, group4TabId])

  const group0CountFilters = useMemo(() => filtersByTab[group0TabId || ''] || {}, [filtersByTab, group0TabId])
  const group1CountFilters = useMemo(() => filtersByTab[group1TabId || ''] || {}, [filtersByTab, group1TabId])
  const group2CountFilters = useMemo(() => filtersByTab[group2TabId || ''] || {}, [filtersByTab, group2TabId])
  const group3CountFilters = useMemo(() => filtersByTab[group3TabId || ''] || {}, [filtersByTab, group3TabId])
  const group4CountFilters = useMemo(() => filtersByTab[group4TabId || ''] || {}, [filtersByTab, group4TabId])

  // Dynamic counts for each group (must call hooks at top level)
  // Create count hooks for up to 5 potential groups (covers all current groups)
  const groupCount0 = useInvestmentTypeCount(
    context,
    group0TabId || '',
    group0Currency,
    group0CountFilters,
    filtersReady && !!investmentGroups[0]
  )
  const groupCount1 = useInvestmentTypeCount(
    context,
    group1TabId || '',
    group1Currency,
    group1CountFilters,
    filtersReady && !!investmentGroups[1]
  )
  const groupCount2 = useInvestmentTypeCount(
    context,
    group2TabId || '',
    group2Currency,
    group2CountFilters,
    filtersReady && !!investmentGroups[2]
  )
  const groupCount3 = useInvestmentTypeCount(
    context,
    group3TabId || '',
    group3Currency,
    group3CountFilters,
    filtersReady && !!investmentGroups[3]
  )
  const groupCount4 = useInvestmentTypeCount(
    context,
    group4TabId || '',
    group4Currency,
    group4CountFilters,
    filtersReady && !!investmentGroups[4]
  )

  const dynamicCounts = useMemo(
    () => aggregateDynamicCounts(investmentGroups, [groupCount0, groupCount1, groupCount2, groupCount3, groupCount4]),
    [investmentGroups, groupCount0, groupCount1, groupCount2, groupCount3, groupCount4]
  )

  // Create stable filter reference for overview
  const stableOverviewFilters = useMemo(() => filtersByTab.overview || {}, [filtersByTab.overview])

  // Overview state (hardcoded)
  const shouldFetchOverview = filtersReady && currentSection === 'overview'
  const overviewState = useInvestmentSectionState({
    accessToken: shouldFetchOverview ? accessToken || '' : '',
    selectedFilters: stableOverviewFilters
  })

  // Dynamic group states (must call hooks at top level)
  // Reuse the same stable filter references used by count hooks
  const groupState0 = useGenericInvestmentSectionState({
    accessToken: filtersReady && investmentGroups[0] && currentSection === group0TabId ? accessToken || '' : '',
    groupCode: investmentGroups[0]?.code || '',
    selectedFilters: group0CountFilters
  })
  const groupState1 = useGenericInvestmentSectionState({
    accessToken: filtersReady && investmentGroups[1] && currentSection === group1TabId ? accessToken || '' : '',
    groupCode: investmentGroups[1]?.code || '',
    selectedFilters: group1CountFilters
  })
  const groupState2 = useGenericInvestmentSectionState({
    accessToken: filtersReady && investmentGroups[2] && currentSection === group2TabId ? accessToken || '' : '',
    groupCode: investmentGroups[2]?.code || '',
    selectedFilters: group2CountFilters
  })
  const groupState3 = useGenericInvestmentSectionState({
    accessToken: filtersReady && investmentGroups[3] && currentSection === group3TabId ? accessToken || '' : '',
    groupCode: investmentGroups[3]?.code || '',
    selectedFilters: group3CountFilters
  })
  const groupState4 = useGenericInvestmentSectionState({
    accessToken: filtersReady && investmentGroups[4] && currentSection === group4TabId ? accessToken || '' : '',
    groupCode: investmentGroups[4]?.code || '',
    selectedFilters: group4CountFilters
  })

  const dynamicStates = useMemo(
    () => aggregateDynamicStates(investmentGroups, [groupState0, groupState1, groupState2, groupState3, groupState4]),
    [investmentGroups, groupState0, groupState1, groupState2, groupState3, groupState4]
  )

  // Overview KPIs (hardcoded) - memoize filters to prevent infinite loop
  const overviewKPIFilters = useMemo(
    () => (shouldFetchOverview ? selectedFilters : EMPTY_FILTERS),
    [shouldFetchOverview, selectedFilters]
  )
  const overviewKPIs = useInvestmentPortfolioIntegration(context, selectedCurrency, overviewKPIFilters, true)

  // Find stable tab IDs for KPI hooks
  const equityTabId = useMemo(() => investmentGroups.find(g => g.code === 'EQUITY')?.tabId, [investmentGroups])
  const liquidFundTabId = useMemo(() => investmentGroups.find(g => g.code === 'LIQUID_FUND')?.tabId, [investmentGroups])
  const realEstateTabId = useMemo(() => investmentGroups.find(g => g.code === 'REAL_ESTATE')?.tabId, [investmentGroups])

  // Stable KPI filter references for specialized hooks
  const equityKPIFilters = useMemo(() => filtersByTab[equityTabId || ''] || {}, [filtersByTab, equityTabId])
  const liquidFundKPIFilters = useMemo(() => filtersByTab[liquidFundTabId || ''] || {}, [filtersByTab, liquidFundTabId])
  const realEstateKPIFilters = useMemo(() => filtersByTab[realEstateTabId || ''] || {}, [filtersByTab, realEstateTabId])

  // Stable KPI filter references for generic hooks
  const genericGroup0Filters = useMemo(() => filtersByTab[group0TabId || ''] || {}, [filtersByTab, group0TabId])
  const genericGroup1Filters = useMemo(() => filtersByTab[group1TabId || ''] || {}, [filtersByTab, group1TabId])
  const genericGroup2Filters = useMemo(() => filtersByTab[group2TabId || ''] || {}, [filtersByTab, group2TabId])
  const genericGroup3Filters = useMemo(() => filtersByTab[group3TabId || ''] || {}, [filtersByTab, group3TabId])
  const genericGroup4Filters = useMemo(() => filtersByTab[group4TabId || ''] || {}, [filtersByTab, group4TabId])

  // Dynamic KPIs for each group (call all specialized hooks at top level)
  const equityKPIs = useEquityKPIIntegration(context, currencyByTab[equityTabId || ''] || 'EUR', equityKPIFilters, true)
  const liquidFundKPIs = useLiquidFundKPIIntegration(
    context,
    currencyByTab[liquidFundTabId || ''] || 'EUR',
    liquidFundKPIFilters,
    true
  )
  const realEstateKPIs = useRealEstateKPIIntegration(
    context,
    currencyByTab[realEstateTabId || ''] || 'EUR',
    realEstateKPIFilters,
    true
  )

  // Generic KPIs for groups 0-4 (to handle unknown/new groups)
  const genericGroup0KPIs = useGenericGroupKPIIntegration(
    context,
    investmentGroups[0]?.code || '',
    currencyByTab[group0TabId || ''] || 'EUR',
    genericGroup0Filters,
    filtersReady && !!investmentGroups[0] && !getGroupConfiguration(investmentGroups[0]?.code).kpiHookName
  )
  const genericGroup1KPIs = useGenericGroupKPIIntegration(
    context,
    investmentGroups[1]?.code || '',
    currencyByTab[group1TabId || ''] || 'EUR',
    genericGroup1Filters,
    filtersReady && !!investmentGroups[1] && !getGroupConfiguration(investmentGroups[1]?.code).kpiHookName
  )
  const genericGroup2KPIs = useGenericGroupKPIIntegration(
    context,
    investmentGroups[2]?.code || '',
    currencyByTab[group2TabId || ''] || 'EUR',
    genericGroup2Filters,
    filtersReady && !!investmentGroups[2] && !getGroupConfiguration(investmentGroups[2]?.code).kpiHookName
  )
  const genericGroup3KPIs = useGenericGroupKPIIntegration(
    context,
    investmentGroups[3]?.code || '',
    currencyByTab[group3TabId || ''] || 'EUR',
    genericGroup3Filters,
    filtersReady && !!investmentGroups[3] && !getGroupConfiguration(investmentGroups[3]?.code).kpiHookName
  )
  const genericGroup4KPIs = useGenericGroupKPIIntegration(
    context,
    investmentGroups[4]?.code || '',
    currencyByTab[group4TabId || ''] || 'EUR',
    genericGroup4Filters,
    filtersReady && !!investmentGroups[4] && !getGroupConfiguration(investmentGroups[4]?.code).kpiHookName
  )

  const dynamicKPIs = useMemo(
    () =>
      aggregateDynamicKPIs(investmentGroups, equityKPIs, liquidFundKPIs, realEstateKPIs, [
        genericGroup0KPIs,
        genericGroup1KPIs,
        genericGroup2KPIs,
        genericGroup3KPIs,
        genericGroup4KPIs
      ]),
    [
      investmentGroups,
      equityKPIs,
      liquidFundKPIs,
      realEstateKPIs,
      genericGroup0KPIs,
      genericGroup1KPIs,
      genericGroup2KPIs,
      genericGroup3KPIs,
      genericGroup4KPIs
    ]
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

  // Get current state
  const getCurrentState = () => {
    if (currentSection === 'overview') return overviewState
    return dynamicStates[currentSection] || overviewState
  }

  const currentState = getCurrentState()

  // Filter configuration
  const { filterGroups } = useFilterGroups(INVESTMENT_DESCRIPTORS)
  const currentFilterConfig = useMemo(() => {
    if (!filterGroups)
      return currentSection === 'overview' ? overviewInvestmentFilterConfig : baseInvestmentFilterConfig

    if (currentSection === 'overview') {
      return buildDynamicFilterConfig(overviewInvestmentFilterConfig, INVESTMENT_DESCRIPTORS, filterGroups)
    }
    return buildDynamicFilterConfig(baseInvestmentFilterConfig, INVESTMENT_DESCRIPTORS, filterGroups)
  }, [currentSection, filterGroups])

  // Filter change handler
  const handleFilterChange = useCallback(
    (newFilters: Record<string, any>) => {
      const currencyObj = findCurrencyByCode(availableCurrencies, selectedCurrency)
      const finalFilters = buildFilterWithCurrency(newFilters, currencyObj)

      setFiltersByTab(prev => ({ ...prev, [currentSection]: finalFilters }))
      currentState.handlePaginationChange({ pageIndex: 0, pageSize: currentState.pageSize })
    },
    [currentSection, availableCurrencies, selectedCurrency, currentState]
  )

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

  // Listen for process completion
  useProcessCompletion({
    onSuccess: () => {
      overviewKPIs.refetch()
      Object.values(dynamicKPIs).forEach(kpi => kpi?.refetch?.())
      if (currentSection === 'overview') {
        overviewState.refetch()
      } else {
        dynamicStates[currentSection]?.refetch?.()
      }
    }
  })

  // Currency Filter UI
  const currencyFilterUI = (
    <div className="gba:flex gba:items-center gba:gap-2">
      <Label className="gba:text-sm gba:font-medium gba:whitespace-nowrap">Currency:</Label>
      <Select value={selectedCurrency} onValueChange={handleCurrencyChange}>
        <SelectTrigger className="gba:w-24">
          <SelectValue placeholder="Currency" />
        </SelectTrigger>
        <SelectContent>
          {(Array.isArray(availableCurrencies) ? availableCurrencies : []).map(currency => {
            if (typeof currency === 'string') return null
            return (
              <SelectItem key={currency.code} value={currency.code}>
                {currency.code}
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
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

  // Build title sections dynamically
  const titleSections = useMemo(() => {
    const sections = [
      {
        id: 'overview',
        label: 'Overview',
        metadata: { count: overviewCount, isLoading: overviewCountLoading }
      }
    ]

    investmentGroups.forEach(group => {
      sections.push({
        id: group.tabId,
        label: group.label,
        metadata: {
          count: dynamicCounts[group.tabId]?.count || 0,
          isLoading: dynamicCounts[group.tabId]?.isLoading || false
        }
      })
    })

    return sections
  }, [investmentGroups, overviewCount, overviewCountLoading, dynamicCounts])

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
        secondaryActions={currencyFilterUI}
        toolbarDensity="default"
      >
        {renderList()}
      </DataDisplay>
    </div>
  )
}

export default InvestmentView

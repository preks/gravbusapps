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
import { useInvestmentGroups } from './hooks/useInvestmentGroups'
import { useAllInvestmentCounts } from './hooks/useAllInvestmentCounts'
import { useInvestmentTabsInitialization } from './hooks/useInvestmentTabsInitialization'
import { getGroupConfiguration } from './config/groupConfigurations'
import { aggregateDynamicKPIs, aggregateDynamicStates } from './utils/kpiAggregation'
import { findCurrencyByCode, buildFilterWithCurrency, buildCurrencyFilter } from './utils/filterHandlers'

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
  const selectedFilters = useMemo(() => filtersByTab[tabId || ''] || {}, [filtersByTab, tabId])

  const stateResult = useGenericInvestmentSectionState({
    accessToken: filtersReady && group && currentSection === tabId ? accessToken || '' : '',
    groupCode: group?.code || '',
    selectedFilters
  })
  const genericKPIResult = useGenericGroupKPIIntegration(
    context,
    group?.code || '',
    selectedCurrency,
    selectedFilters,
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

  // Fetch all counts (overview + all groups) in a single GraphQL query
  const allCounts = useAllInvestmentCounts(context, investmentGroups, currencyByTab, filtersByTab, filtersReady)

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

  // Overview KPIs - only fetch when overview tab is active
  const overviewKPIFilters = useMemo(
    () => (shouldFetchOverview ? selectedFilters : EMPTY_FILTERS),
    [shouldFetchOverview, selectedFilters]
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

  // Stable KPI filter references for specialized hooks
  const equityKPIFilters = useMemo(() => filtersByTab[equityTabId || ''] || {}, [filtersByTab, equityTabId])
  const liquidFundKPIFilters = useMemo(() => filtersByTab[liquidFundTabId || ''] || {}, [filtersByTab, liquidFundTabId])
  const realEstateKPIFilters = useMemo(() => filtersByTab[realEstateTabId || ''] || {}, [filtersByTab, realEstateTabId])

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

  // Get current state
  const getCurrentState = () => {
    if (currentSection === 'overview') return overviewState
    return dynamicStates[currentSection] || overviewState
  }

  const currentState = getCurrentState()

  // Filter configuration
  const filterGroups = useFilterGroups(context, 'Investment', INVESTMENT_DESCRIPTORS)
  const currentFilterConfig = useMemo(() => {
    if (filterGroups.isLoading || Object.keys(filterGroups.filterData || {}).length === 0)
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
        metadata: { count: allCounts.overview.count, isLoading: allCounts.overview.isLoading }
      }
    ]

    investmentGroups.forEach(group => {
      sections.push({
        id: group.tabId,
        label: group.label,
        metadata: {
          count: allCounts.groups[group.tabId]?.count || 0,
          isLoading: allCounts.groups[group.tabId]?.isLoading || false
        }
      })
    })

    return sections
  }, [investmentGroups, allCounts])

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

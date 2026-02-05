import React, { useEffect, useState, useCallback, useMemo } from 'react'
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
import {
  OVERVIEW_KPI_CONFIG,
  EQUITY_KPI_CONFIG,
  LIQUID_FUND_KPI_CONFIG,
  REAL_ESTATE_KPI_CONFIG
} from '@/common/data/investment/kpis'
import { useInvestmentPortfolioIntegration } from '../analytics-view/overview/hooks'
import { useEquityKPIIntegration } from '../analytics-view/equity-analytics/hooks'
import { useLiquidFundKPIIntegration } from '../analytics-view/liquid-fund-analytics/hooks'
import { useRealEstateKPIIntegration } from '../analytics-view/real-estate-analytics/hooks'
import AllInvestmentsList from './data/investment-data/AllInvestmentsList'
import EquityInvestmentsList from './data/equity-data/EquityInvestmentsList'
import RealEstateInvestmentsList from './data/real-estate-data/RealEstateInvestmentsList'
import LiquidFundInvestmentsList from './data/liquid-fund-data/LiquidFundInvestmentsList'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { useFilterGroups } from '@/common/data/common/hooks/useFilterGroups'
import { buildDynamicFilterConfig } from '@/common/components/common-relations/view-layouts/account-layout/utils/filterHelpers'
import { INVESTMENT_DESCRIPTORS } from '@/common/data/investment/types/investmentTypes.new'
import { baseInvestmentFilterConfig, overviewInvestmentFilterConfig } from './data/investmentFilterConfig'
import { useInvestmentSectionState } from './data/investment-data/useInvestmentSectionState'
import { useLiquidFundSectionState } from './data/liquid-fund-data/useLiquidFundSectionState'
import { useRealEstateSectionState } from './data/real-estate-data/useRealEstateSectionState'
import { useEquitySectionState } from './data/equity-data/useEquitySectionState'
import { useInvestmentTypeCount } from './hooks/useInvestmentTypeCount'

export interface InvestmentViewProps extends BusinessAppContextProps {
  initialSubTab?: string
  onSubTabChange?: (subTab: string) => void
}

export const InvestmentView: React.FC<InvestmentViewProps> = context => {
  const { initialSubTab, onSubTabChange, accessToken } = context

  const normalize = useCallback((val?: string) => {
    const allowed = new Set(['overview', 'equity', 'real-estate', 'liquid-funds'])
    if (!val) return 'overview'
    return allowed.has(val) ? val : 'overview'
  }, [])

  const [currentSection, setCurrentSection] = useState(normalize(initialSubTab))

  // Separate currency state for each tab (currency filter applies only to active tab)
  const [overviewCurrency, setOverviewCurrency] = useState<string>('EUR')
  const [equityCurrency, setEquityCurrency] = useState<string>('EUR')
  const [liquidFundCurrency, setLiquidFundCurrency] = useState<string>('EUR')
  const [realEstateCurrency, setRealEstateCurrency] = useState<string>('EUR')

  // Separate filter state for each tab
  const [overviewFilters, setOverviewFilters] = useState<Record<string, any>>({})
  const [equityFilters, setEquityFilters] = useState<Record<string, any>>({})
  const [liquidFundFilters, setLiquidFundFilters] = useState<Record<string, any>>({})
  const [realEstateFilters, setRealEstateFilters] = useState<Record<string, any>>({})
  const [filtersReady, setFiltersReady] = useState(false)

  // Get current tab's currency
  const getSelectedCurrency = () => {
    switch (currentSection) {
      case 'overview':
        return overviewCurrency
      case 'equity':
        return equityCurrency
      case 'liquid-funds':
        return liquidFundCurrency
      case 'real-estate':
        return realEstateCurrency
      default:
        return overviewCurrency
    }
  }
  const selectedCurrency = getSelectedCurrency()

  // Fetch count for each investment type independently
  // Each tab fetches its count after initial filters are ready and refetches when its filters change
  const { count: overviewCount, isLoading: overviewCountLoading } = useInvestmentTypeCount(
    context,
    'overview',
    overviewCurrency,
    overviewFilters,
    filtersReady
  )
  const { count: equityCount, isLoading: equityCountLoading } = useInvestmentTypeCount(
    context,
    'equity',
    equityCurrency,
    equityFilters,
    filtersReady
  )
  const { count: liquidFundCount, isLoading: liquidFundCountLoading } = useInvestmentTypeCount(
    context,
    'liquidFund',
    liquidFundCurrency,
    liquidFundFilters,
    filtersReady
  )
  const { count: realEstateCount, isLoading: realEstateCountLoading } = useInvestmentTypeCount(
    context,
    'realEstate',
    realEstateCurrency,
    realEstateFilters,
    filtersReady
  )

  // Fetch KPIs for each section using Analytics View hooks (single source of truth)
  // Pass tab-specific filters AND currencies to ensure KPIs reflect the filtered data for that tab only
  // Only fetch KPIs for the active tab to improve performance
  const overviewKPIs = useInvestmentPortfolioIntegration(
    context,
    overviewCurrency,
    overviewFilters,
    currentSection === 'overview'
  )
  const equityKPIs = useEquityKPIIntegration(context, equityCurrency, equityFilters, currentSection === 'equity')
  const liquidFundKPIs = useLiquidFundKPIIntegration(
    context,
    liquidFundCurrency,
    liquidFundFilters,
    currentSection === 'liquid-funds'
  )
  const realEstateKPIs = useRealEstateKPIIntegration(
    context,
    realEstateCurrency,
    realEstateFilters,
    currentSection === 'real-estate'
  )

  // Fetch available currencies efficiently using distinctOn (full format to get IDs)
  const { currencies: availableCurrencies } = useAvailableCurrencies(context, {
    filters: { entity: 'Investment' },
    returnFormat: 'full'
  })

  useEffect(() => {
    setCurrentSection(normalize(initialSubTab))
  }, [initialSubTab, normalize])

  // Set initial currency filter when currencies are loaded (only once)
  // Each tab gets EUR as default currency
  useEffect(() => {
    if (!filtersReady && availableCurrencies && availableCurrencies.length > 0) {
      const currencyObj = (Array.isArray(availableCurrencies) ? availableCurrencies : []).find(
        (c): c is { id: string; code: string; value: string } => typeof c !== 'string' && c?.code === 'EUR'
      )
      if (currencyObj) {
        const currencyFilter = { currencyIds: [currencyObj.id] }
        // Set default EUR currency filter for all tabs
        setOverviewFilters(prev => ({ ...prev, ...currencyFilter }))
        setEquityFilters(prev => ({ ...prev, ...currencyFilter }))
        setLiquidFundFilters(prev => ({ ...prev, ...currencyFilter }))
        setRealEstateFilters(prev => ({ ...prev, ...currencyFilter }))
      }
      setFiltersReady(true)
    }
  }, [availableCurrencies, filtersReady])

  const handleSectionChange = useCallback(
    (value: string) => {
      setCurrentSection(value)
      onSubTabChange?.(value)
    },
    [onSubTabChange]
  )

  // Fetch filter groups using centralized hook (loads once, used by all tabs)
  const filterGroups = useFilterGroups(context, 'Investment', INVESTMENT_DESCRIPTORS, { limit: 100 })

  // Dynamic Filter Configuration for all tabs (without Investment Group)
  const commonFilterConfig = useMemo(() => {
    return buildDynamicFilterConfig(baseInvestmentFilterConfig, INVESTMENT_DESCRIPTORS, filterGroups)
  }, [baseInvestmentFilterConfig, INVESTMENT_DESCRIPTORS, filterGroups])

  // Dynamic Filter Configuration for Overview (with Investment Group)
  const overviewFilterConfig = useMemo(() => {
    return buildDynamicFilterConfig(overviewInvestmentFilterConfig, INVESTMENT_DESCRIPTORS, filterGroups)
  }, [overviewInvestmentFilterConfig, INVESTMENT_DESCRIPTORS, filterGroups])

  // Filter Config based on active section
  const currentFilterConfig = useMemo(() => {
    if (currentSection === 'overview') {
      return overviewFilterConfig
    }
    return commonFilterConfig
  }, [currentSection, overviewFilterConfig, commonFilterConfig])

  // Use section state hooks - only fetch when currency filter is ready AND section is active
  // This prevents unnecessary API calls for non-visible sections
  // Empty accessToken prevents useInvestments from fetching (see useInvestments.new.ts line 78-81)
  const shouldFetchOverview = filtersReady && currentSection === 'overview'
  const shouldFetchLiquidFund = filtersReady && currentSection === 'liquid-funds'
  const shouldFetchRealEstate = filtersReady && currentSection === 'real-estate'
  const shouldFetchEquity = filtersReady && currentSection === 'equity'

  const overviewState = useInvestmentSectionState({
    accessToken: shouldFetchOverview ? accessToken || '' : '',
    selectedFilters: overviewFilters
  })

  const liquidFundState = useLiquidFundSectionState({
    accessToken: shouldFetchLiquidFund ? accessToken || '' : '',
    selectedFilters: liquidFundFilters
  })

  const realEstateState = useRealEstateSectionState({
    accessToken: shouldFetchRealEstate ? accessToken || '' : '',
    selectedFilters: realEstateFilters
  })

  const equityState = useEquitySectionState({
    accessToken: shouldFetchEquity ? accessToken || '' : '',
    selectedFilters: equityFilters
  })

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

  // Listen for process completion events to refresh data
  useProcessCompletion({
    onSuccess: () => {
      // Refetch KPIs for all sections
      overviewKPIs.refetch()
      equityKPIs.refetch()
      liquidFundKPIs.refetch()
      realEstateKPIs.refetch()
      // Refetch active section data
      if (currentSection === 'overview') {
        overviewState.refetch()
      } else if (currentSection === 'liquid-funds') {
        liquidFundState.refetch()
      } else if (currentSection === 'real-estate') {
        realEstateState.refetch()
      } else if (currentSection === 'equity') {
        equityState.refetch()
      }
    }
  })

  // Currency Filter Component
  const currencyFilterUI = (
    <div className="gba:flex gba:items-center gba:gap-2">
      <Label className="gba:text-sm gba:font-medium gba:whitespace-nowrap">Currency:</Label>
      <Select
        value={selectedCurrency}
        onValueChange={newCurrency => {
          // Find currency object and set currencyIds filter for CURRENT tab only
          const currencyObj = (Array.isArray(availableCurrencies) ? availableCurrencies : []).find(
            (c): c is { id: string; code: string; value: string } => typeof c !== 'string' && c?.code === newCurrency
          )
          const currencyFilter = currencyObj ? { currencyIds: [currencyObj.id] } : {}

          // Update currency and filters for ONLY the current active tab
          if (currentSection === 'overview') {
            setOverviewCurrency(newCurrency)
            setOverviewFilters(prev => ({ ...prev, ...currencyFilter }))
          } else if (currentSection === 'equity') {
            setEquityCurrency(newCurrency)
            setEquityFilters(prev => ({ ...prev, ...currencyFilter }))
          } else if (currentSection === 'liquid-funds') {
            setLiquidFundCurrency(newCurrency)
            setLiquidFundFilters(prev => ({ ...prev, ...currencyFilter }))
          } else if (currentSection === 'real-estate') {
            setRealEstateCurrency(newCurrency)
            setRealEstateFilters(prev => ({ ...prev, ...currencyFilter }))
          }
        }}
      >
        <SelectTrigger className="gba:w-[120px]" data-testid="investment-view-currency-filter">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Array.isArray(availableCurrencies) ? availableCurrencies : []).map(currency => {
            const currencyCode = typeof currency === 'string' ? currency : currency?.code || currency?.value || ''
            return (
              <SelectItem key={currencyCode} value={currencyCode}>
                {currencyCode}
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )

  // Memoized helper functions to get current section state
  const getCurrentSectionState = useCallback(() => {
    if (currentSection === 'overview') return overviewState
    if (currentSection === 'liquid-funds') return liquidFundState
    if (currentSection === 'real-estate') return realEstateState
    if (currentSection === 'equity') return equityState
    return overviewState
  }, [currentSection, overviewState, liquidFundState, realEstateState, equityState])

  // Memoized helper function to get current section filters
  const getCurrentSectionFilters = useCallback(() => {
    if (currentSection === 'overview') return overviewFilters
    if (currentSection === 'liquid-funds') return liquidFundFilters
    if (currentSection === 'real-estate') return realEstateFilters
    if (currentSection === 'equity') return equityFilters
    return overviewFilters
  }, [currentSection, overviewFilters, liquidFundFilters, realEstateFilters, equityFilters])

  // Memoized helper function to get current section filter setter
  const getCurrentSectionFilterSetter = useCallback(() => {
    if (currentSection === 'overview') return setOverviewFilters
    if (currentSection === 'liquid-funds') return setLiquidFundFilters
    if (currentSection === 'real-estate') return setRealEstateFilters
    if (currentSection === 'equity') return setEquityFilters
    return setOverviewFilters
  }, [currentSection])

  const currentState = getCurrentSectionState()
  const selectedFilters = getCurrentSectionFilters()

  // Filter change handler - only updates current tab's filters
  const handleFilterChange = useCallback(
    (newFilters: Record<string, any>) => {
      // Preserve currency filter if not explicitly changed
      // When user clears filters, the default currency should remain
      const finalFilters = { ...newFilters }
      if (!finalFilters.currencyIds && availableCurrencies && availableCurrencies.length > 0) {
        const currencyObj = (Array.isArray(availableCurrencies) ? availableCurrencies : []).find(
          (c): c is { id: string; code: string; value: string } => typeof c !== 'string' && c?.code === selectedCurrency
        )
        if (currencyObj) {
          finalFilters.currencyIds = [currencyObj.id]
        }
      }

      // Update filters for current tab only
      const setter = getCurrentSectionFilterSetter()
      setter(finalFilters)

      // Reset to page 1 when filters change for current tab only
      const state = getCurrentSectionState()
      state.handlePaginationChange({ pageIndex: 0, pageSize: state.pageSize })
    },
    [getCurrentSectionFilterSetter, getCurrentSectionState, availableCurrencies, selectedCurrency]
  )

  // Define all action contexts - loaded once for all sections
  const overviewActionContexts = useMemo(
    () => [
      {
        context: FlowContextName.investmentCreate,
        contextData: {
          fromView: 'investments',
          fromSubView: 'overview'
        }
      }
    ],
    []
  )

  const liquidFundActionContexts = useMemo(
    () => [
      {
        context: FlowContextName.investmentCreate,
        contextData: {
          investmentGroup: 'InvestmentGroup:v1:LIQUID_FUND',
          fromView: 'investments',
          fromSubView: 'liquid-funds'
        }
      }
    ],
    []
  )

  const realEstateActionContexts = useMemo(
    () => [
      {
        context: FlowContextName.investmentCreate,
        contextData: {
          investmentGroup: 'InvestmentGroup:v1:REAL_ESTATE',
          fromView: 'investments',
          fromSubView: 'real-estate'
        }
      }
    ],
    []
  )

  const equityActionContexts = useMemo(
    () => [
      {
        context: FlowContextName.investmentCreate,
        contextData: {
          investmentGroup: 'InvestmentGroup:v1:EQUITY',
          fromView: 'investments',
          fromSubView: 'equity'
        }
      }
    ],
    []
  )

  // Render all primary actions - all loaded initially, only current one visible
  const renderPrimaryAction = useMemo(() => {
    return (
      <div className="gba:relative" style={{ minHeight: '40px' }}>
        {/* Overview Action */}
        <div style={{ display: currentSection === 'overview' ? 'block' : 'none' }}>
          <AppAction
            variant="create-primary"
            contexts={overviewActionContexts}
            accessToken={accessToken || ''}
            data-testid="all-investments-add-action"
            emptyState="hide"
          >
            {getTranslationFromI18nKeyAndLabel('investment:investment.addInvestment', 'Add Investment')}
          </AppAction>
        </div>

        {/* Liquid Fund Action */}
        <div style={{ display: currentSection === 'liquid-funds' ? 'block' : 'none' }}>
          <AppAction
            variant="create-primary"
            contexts={liquidFundActionContexts}
            accessToken={accessToken || ''}
            data-testid="liquid-fund-investments-add-action"
            emptyState="hide"
          >
            {getTranslationFromI18nKeyAndLabel('investment:liquidFund.addLiquidFund', 'Add Liquid Fund')}
          </AppAction>
        </div>

        {/* Real Estate Action */}
        <div style={{ display: currentSection === 'real-estate' ? 'block' : 'none' }}>
          <AppAction
            variant="create-primary"
            contexts={realEstateActionContexts}
            accessToken={accessToken || ''}
            data-testid="real-estate-investments-add-action"
            emptyState="hide"
          >
            {getTranslationFromI18nKeyAndLabel('investment:realEstate.addRealEstate', 'Add Real Estate')}
          </AppAction>
        </div>

        {/* Equity Action */}
        <div style={{ display: currentSection === 'equity' ? 'block' : 'none' }}>
          <AppAction
            variant="create-primary"
            contexts={equityActionContexts}
            accessToken={accessToken || ''}
            data-testid="equity-investments-add-action"
            emptyState="hide"
          >
            {getTranslationFromI18nKeyAndLabel('investment:equity.addEquityInvestment', 'Add Equity Investment')}
          </AppAction>
        </div>
      </div>
    )
  }, [
    currentSection,
    overviewActionContexts,
    liquidFundActionContexts,
    realEstateActionContexts,
    equityActionContexts,
    accessToken
  ])

  return (
    <div data-testid="investment-view">
      {/* Header */}
      <div className="gba:mb-6">
        <div className="gba:mb-4">
          <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">Investment Portfolio</h1>
          <p className="gba:text-gray-600">Manage and track investment portfolio across asset classes</p>
        </div>
      </div>

      {/* KPI Cards - Using shared configs and Analytics View hooks */}
      <div className="gba:mb-6">
        <div style={{ display: currentSection === 'overview' ? 'block' : 'none' }}>
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
        </div>
        <div style={{ display: currentSection === 'equity' ? 'block' : 'none' }}>
          <InvestmentKPICards
            config={EQUITY_KPI_CONFIG}
            data={equityKPIs.current}
            previousData={equityKPIs.previous}
            currencyCode={selectedCurrency}
            isLoading={equityKPIs.isLoading}
            error={equityKPIs.error ? new Error(equityKPIs.error) : null}
            onRetry={equityKPIs.refetch}
            data-testid="investment-view-equity-kpis"
          />
        </div>
        <div style={{ display: currentSection === 'liquid-funds' ? 'block' : 'none' }}>
          <InvestmentKPICards
            config={LIQUID_FUND_KPI_CONFIG}
            data={liquidFundKPIs.current}
            previousData={liquidFundKPIs.previous}
            currencyCode={selectedCurrency}
            isLoading={liquidFundKPIs.isLoading}
            error={liquidFundKPIs.error ? new Error(liquidFundKPIs.error) : null}
            onRetry={liquidFundKPIs.refetch}
            data-testid="investment-view-liquid-fund-kpis"
          />
        </div>
        <div style={{ display: currentSection === 'real-estate' ? 'block' : 'none' }}>
          <InvestmentKPICards
            config={REAL_ESTATE_KPI_CONFIG}
            data={realEstateKPIs.current}
            previousData={realEstateKPIs.previous}
            currencyCode={selectedCurrency}
            isLoading={realEstateKPIs.isLoading}
            error={realEstateKPIs.error ? new Error(realEstateKPIs.error) : null}
            onRetry={realEstateKPIs.refetch}
            data-testid="investment-view-real-estate-kpis"
          />
        </div>
      </div>

      {/* DataDisplay with titleSections - Using lightweight counts for tab badges */}
      <DataDisplay
        titleSections={[
          {
            id: 'overview',
            label: 'Overview',
            metadata: {
              count: overviewCount,
              isLoading: overviewCountLoading
            }
          },
          {
            id: 'liquid-funds',
            label: 'Liquid Fund',
            metadata: {
              count: liquidFundCount,
              isLoading: liquidFundCountLoading
            }
          },
          {
            id: 'real-estate',
            label: 'Real Estate',
            metadata: {
              count: realEstateCount,
              isLoading: realEstateCountLoading
            }
          },
          {
            id: 'equity',
            label: 'Equity',
            metadata: {
              count: equityCount,
              isLoading: equityCountLoading
            }
          }
        ]}
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
        {currentSection === 'overview' && (
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
        )}
        {currentSection === 'equity' && (
          <EquityInvestmentsList
            {...context}
            data={equityState.investments}
            loading={equityState.isInitialLoading}
            error={equityState.error}
            totalCount={equityState.totalCount}
            sorting={equityState.sorting}
            onSortingChange={equityState.handleSortingChange}
            pagination={equityState.pagination}
            onPaginationChange={equityState.handlePaginationChange}
            visibleColumns={equityState.visibleColumns}
          />
        )}
        {currentSection === 'real-estate' && (
          <RealEstateInvestmentsList
            {...context}
            data={realEstateState.investments}
            loading={realEstateState.isInitialLoading}
            error={realEstateState.error}
            totalCount={realEstateState.totalCount}
            sorting={realEstateState.sorting}
            onSortingChange={realEstateState.handleSortingChange}
            pagination={realEstateState.pagination}
            onPaginationChange={realEstateState.handlePaginationChange}
            visibleColumns={realEstateState.visibleColumns}
          />
        )}
        {currentSection === 'liquid-funds' && (
          <LiquidFundInvestmentsList
            {...context}
            data={liquidFundState.investments}
            loading={liquidFundState.isInitialLoading}
            error={liquidFundState.error}
            totalCount={liquidFundState.totalCount}
            sorting={liquidFundState.sorting}
            onSortingChange={liquidFundState.handleSortingChange}
            pagination={liquidFundState.pagination}
            onPaginationChange={liquidFundState.handlePaginationChange}
            visibleColumns={liquidFundState.visibleColumns}
          />
        )}
      </DataDisplay>
    </div>
  )
}

export default InvestmentView

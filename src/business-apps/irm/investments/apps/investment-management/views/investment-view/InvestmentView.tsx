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
import { useInvestmentStatistics } from '@/common/data/investment/hooks/useInvestmentStatistics'
import AllInvestmentsList from './data/investment-data/AllInvestmentsList'
import EquityInvestmentsList from './data/equity-data/EquityInvestmentsList'
import RealEstateInvestmentsList from './data/real-estate-data/RealEstateInvestmentsList'
import LiquidFundInvestmentsList from './data/liquid-fund-data/LiquidFundInvestmentsList'
import InvestmentStatistics from './data/investment-data/InvestmentStatistics'
import EquityInvestmentStatistics from './data/equity-data/EquityInvestmentStatistics'
import LiquidFundInvestmentStatistics from './data/liquid-fund-data/LiquidFundInvestmentStatistics'
import RealEstateInvestmentStatistics from './data/real-estate-data/RealEstateInvestmentStatistics'
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
  const [selectedCurrency, setSelectedCurrency] = useState<string>('EUR')

  // Fetch investment statistics for all sections in a single query
  const investmentStatistics = useInvestmentStatistics(accessToken || '', selectedCurrency)

  // Fetch available currencies efficiently using distinctOn (full format to get IDs)
  const { currencies: availableCurrencies } = useAvailableCurrencies(context, {
    filters: { entity: 'Investment' },
    returnFormat: 'full'
  })

  useEffect(() => {
    setCurrentSection(normalize(initialSubTab))
  }, [initialSubTab, normalize])

  // Set initial currency filter when currencies are loaded
  useEffect(() => {
    if (availableCurrencies && availableCurrencies.length > 0) {
      const currencyObj = (Array.isArray(availableCurrencies) ? availableCurrencies : []).find(
        (c): c is { id: string; code: string; value: string } => typeof c !== 'string' && c?.code === selectedCurrency
      )
      if (currencyObj) {
        setSelectedFilters(prev => ({
          ...prev,
          currencyIds: [currencyObj.id]
        }))
      }
    }
  }, [availableCurrencies, selectedCurrency])

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

  // Unified filter state for all tabs
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>({})

  // Use section state hooks
  const overviewState = useInvestmentSectionState({
    accessToken: accessToken || '',
    selectedFilters
  })

  const liquidFundState = useLiquidFundSectionState({
    accessToken: accessToken || '',
    selectedFilters
  })

  const realEstateState = useRealEstateSectionState({
    accessToken: accessToken || '',
    selectedFilters
  })

  const equityState = useEquitySectionState({
    accessToken: accessToken || '',
    selectedFilters
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
      // Refetch statistics for all sections
      investmentStatistics.refetch()
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
          setSelectedCurrency(newCurrency)
          // Find currency object and set currencyIds filter
          const currencyObj = (Array.isArray(availableCurrencies) ? availableCurrencies : []).find(
            (c): c is { id: string; code: string; value: string } => typeof c !== 'string' && c?.code === newCurrency
          )
          if (currencyObj) {
            setSelectedFilters(prev => ({
              ...prev,
              currencyIds: [currencyObj.id]
            }))
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

  // Filter change handler - unified for all tabs
  const handleFilterChange = useCallback(
    (newFilters: Record<string, any>) => {
      setSelectedFilters(newFilters)
      // Reset to page 1 when filters change
      if (currentSection === 'overview') {
        overviewState.handlePaginationChange({ pageIndex: 0, pageSize: overviewState.pageSize })
      } else if (currentSection === 'liquid-funds') {
        liquidFundState.handlePaginationChange({ pageIndex: 0, pageSize: liquidFundState.pageSize })
      } else if (currentSection === 'real-estate') {
        realEstateState.handlePaginationChange({ pageIndex: 0, pageSize: realEstateState.pageSize })
      } else if (currentSection === 'equity') {
        equityState.handlePaginationChange({ pageIndex: 0, pageSize: equityState.pageSize })
      }
    },
    [currentSection, overviewState, liquidFundState, realEstateState, equityState]
  )

  // Get current section state
  const getCurrentSectionState = () => {
    if (currentSection === 'overview') return overviewState
    if (currentSection === 'liquid-funds') return liquidFundState
    if (currentSection === 'real-estate') return realEstateState
    if (currentSection === 'equity') return equityState
    return overviewState
  }

  const currentState = getCurrentSectionState()

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

      {/* Statistics - Load all KPIs initially, show based on active section */}
      <div className="gba:mb-6">
        <div style={{ display: currentSection === 'overview' ? 'block' : 'none' }}>
          <InvestmentStatistics
            {...context}
            currencyCode={selectedCurrency}
            statistics={investmentStatistics.overview}
            isLoading={investmentStatistics.isLoading}
            error={investmentStatistics.error}
            onRetry={investmentStatistics.refetch}
          />
        </div>
        <div style={{ display: currentSection === 'equity' ? 'block' : 'none' }}>
          <EquityInvestmentStatistics
            {...context}
            currencyCode={selectedCurrency}
            statistics={investmentStatistics.equity}
            isLoading={investmentStatistics.isLoading}
            error={investmentStatistics.error}
            onRetry={investmentStatistics.refetch}
          />
        </div>
        <div style={{ display: currentSection === 'liquid-funds' ? 'block' : 'none' }}>
          <LiquidFundInvestmentStatistics
            {...context}
            currencyCode={selectedCurrency}
            statistics={investmentStatistics.liquidFund}
            isLoading={investmentStatistics.isLoading}
            error={investmentStatistics.error}
            onRetry={investmentStatistics.refetch}
          />
        </div>
        <div style={{ display: currentSection === 'real-estate' ? 'block' : 'none' }}>
          <RealEstateInvestmentStatistics
            {...context}
            currencyCode={selectedCurrency}
            statistics={investmentStatistics.realEstate}
            isLoading={investmentStatistics.isLoading}
            error={investmentStatistics.error}
            onRetry={investmentStatistics.refetch}
          />
        </div>
      </div>

      {/* DataDisplay with titleSections */}
      <DataDisplay
        titleSections={[
          {
            id: 'overview',
            label: 'Overview',
            metadata: {
              count: overviewState.totalCount,
              isLoading: overviewState.isInitialLoading
            }
          },
          {
            id: 'liquid-funds',
            label: 'Liquid Fund',
            metadata: {
              count: liquidFundState.totalCount,
              isLoading: liquidFundState.isInitialLoading
            }
          },
          {
            id: 'real-estate',
            label: 'Real Estate',
            metadata: {
              count: realEstateState.totalCount,
              isLoading: realEstateState.isInitialLoading
            }
          },
          {
            id: 'equity',
            label: 'Equity',
            metadata: {
              count: equityState.totalCount,
              isLoading: equityState.isInitialLoading
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

import { useCallback, useMemo, useRef, useState } from 'react'
import type { FilterConfiguration } from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useAvailableCurrencies } from '@/common/data/common/hooks/useAvailableCurrencies'
import { useFilterGroups } from '@/common/data/common/hooks/useFilterGroups'
import { buildDynamicFilterConfig } from '@/common/components/common-relations/view-layouts/account-layout/utils/filterHelpers'
import { INVESTMENT_DESCRIPTORS } from '@/common/data/investment/types/investmentTypes.new'
import { LIQUID_FUND_INVESTMENT_DESCRIPTORS } from '@/common/data/investment/types/liquidFundInvestmentTypes'
import { baseInvestmentFilterConfig, overviewInvestmentFilterConfig } from '../data/investmentFilterConfig'
import type { InvestmentGroup, InvestmentListCatalogData } from './useInvestmentGroups'
import type { InvestmentListColumnConfiguration } from '../utils/investmentListColumnTransformer'
import {
  buildCurrencyFilter,
  buildFilterWithCurrency,
  findCurrencyByCode,
  isAllCurrencySelection
} from '../utils/filterHandlers'
import { useInvestmentAccountFilter } from './useInvestmentAccountFilter'
import { useInvestmentTabsInitialization } from './useInvestmentTabsInitialization'
import { getInvestmentTypeFilterOptions, mergeFilterConfigurations } from '../utils/investmentViewFilters'
import { injectRelationFilterOptions } from '../utils/investmentViewRelationFilterOptions'

interface UseInvestmentViewFiltersOptions {
  context: BusinessAppContextProps
  currentSection: string
  resetActivePagination: () => void
  investmentGroups: InvestmentGroup[]
  catalogData: InvestmentListCatalogData
  dynamicColumnConfigByTab: Record<string, InvestmentListColumnConfiguration>
  activeColumnConfig: InvestmentListColumnConfiguration | undefined
  initialFiltersByTab: Record<string, Record<string, any>>
  savePreferencePatch: (tabId: string, patch: { filters?: Record<string, any> }) => void
}

const EMPTY_FILTERS: Record<string, any> = {}

export const useInvestmentViewFilters = ({
  context,
  currentSection,
  resetActivePagination,
  investmentGroups,
  catalogData,
  dynamicColumnConfigByTab,
  activeColumnConfig,
  initialFiltersByTab,
  savePreferencePatch
}: UseInvestmentViewFiltersOptions) => {
  const [currencyByTab, setCurrencyByTab] = useState<Record<string, string>>({ overview: 'all' })
  const [filtersByTab, setFiltersByTab] = useState<Record<string, Record<string, any>>>({ overview: {} })
  const [filtersReady, setFiltersReady] = useState(false)

  const selectedCurrency = currencyByTab[currentSection] || 'all'
  const displayCurrencyCode = useMemo(
    () => (isAllCurrencySelection(selectedCurrency) ? 'EUR' : selectedCurrency),
    [selectedCurrency]
  )
  const selectedFilters = useMemo(() => filtersByTab[currentSection] || EMPTY_FILTERS, [currentSection, filtersByTab])

  const { currencies: availableCurrencies, isLoading: currenciesLoading } = useAvailableCurrencies(context, {
    returnFormat: 'full'
  })

  useInvestmentTabsInitialization(
    availableCurrencies,
    filtersReady,
    investmentGroups,
    setCurrencyByTab,
    setFiltersByTab,
    setFiltersReady,
    initialFiltersByTab
  )

  const currentSectionRef = useRef(currentSection)
  currentSectionRef.current = currentSection
  const availableCurrenciesRef = useRef(availableCurrencies)
  availableCurrenciesRef.current = availableCurrencies
  const selectedCurrencyRef = useRef(selectedCurrency)
  selectedCurrencyRef.current = selectedCurrency
  const { accounts: accountOptions } = useInvestmentAccountFilter(context.accessToken, filtersReady)
  const filterGroups = useFilterGroups(context, 'Investment', INVESTMENT_DESCRIPTORS)
  const liquidFundFilterGroups = useFilterGroups(context, 'LiquidFundInvestment', LIQUID_FUND_INVESTMENT_DESCRIPTORS)

  const injectAccountFilter = useCallback(
    (filter: any) => {
      if (filter.id !== 'investmentAccountIds' || accountOptions.length === 0) return filter
      return {
        ...filter,
        config: {
          ...filter.config,
          options: accountOptions.map((account: any) => ({ id: account.id, label: account.label })),
          totalCount: accountOptions.length,
          hasMore: false
        }
      }
    },
    [accountOptions]
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

  const injectBaseFilterGroups = useCallback(
    (group: any) => {
      if (group.id === 'account-group') return { ...group, filters: group.filters.map(injectAccountFilter) }
      if (group.id === 'investment-type-group')
        return { ...group, filters: group.filters.map(injectInvestmentTypeFilter) }
      return group
    },
    [injectAccountFilter, injectInvestmentTypeFilter]
  )

  const currentFilterConfig = useMemo((): FilterConfiguration => {
    const baseConfig = currentSection === 'overview' ? overviewInvestmentFilterConfig : baseInvestmentFilterConfig
    const sectionFilterConfig =
      currentSection === 'overview'
        ? baseConfig
        : mergeFilterConfigurations(baseConfig, dynamicColumnConfigByTab[currentSection]?.dynamicFilterConfig)
    const builtConfig =
      filterGroups.isLoading || Object.keys(filterGroups.filterData || {}).length === 0
        ? sectionFilterConfig
        : buildDynamicFilterConfig(sectionFilterConfig, INVESTMENT_DESCRIPTORS, filterGroups)
    const withRelationOptions = injectRelationFilterOptions(
      builtConfig,
      activeColumnConfig?.relationFilterOptionSources ?? [],
      { LiquidFundInvestment: liquidFundFilterGroups }
    )

    return { ...withRelationOptions, groups: withRelationOptions.groups.map(injectBaseFilterGroups) }
  }, [
    activeColumnConfig?.relationFilterOptionSources,
    currentSection,
    dynamicColumnConfigByTab,
    filterGroups,
    injectBaseFilterGroups,
    liquidFundFilterGroups
  ])

  const handleFilterChange = useCallback(
    (newFilters: Record<string, any>) => {
      const section = currentSectionRef.current
      const selection = selectedCurrencyRef.current
      const finalFilters = isAllCurrencySelection(selection)
        ? (() => {
            const filters = { ...newFilters }
            delete filters.currencyIds
            return filters
          })()
        : buildFilterWithCurrency(newFilters, findCurrencyByCode(availableCurrenciesRef.current, selection))

      setFiltersByTab(prev => ({ ...prev, [section]: finalFilters }))
      savePreferencePatch(section, { filters: finalFilters })

      resetActivePagination()
    },
    [resetActivePagination, savePreferencePatch]
  )

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
      savePreferencePatch(currentSection, { filters: sectionFilters })
    },
    [availableCurrencies, currentSection, savePreferencePatch, selectedFilters]
  )

  const currencyCodes = useMemo(
    () =>
      (Array.isArray(availableCurrencies) ? availableCurrencies : [])
        .filter(currency => currency && typeof currency !== 'string')
        .map((currency: any) => currency.code as string)
        .filter(Boolean),
    [availableCurrencies]
  )

  return {
    availableCurrencies,
    currenciesLoading,
    currencyByTab,
    filtersByTab,
    filtersReady,
    selectedCurrency,
    displayCurrencyCode,
    selectedFilters,
    currentFilterConfig,
    currencyCodes,
    handleFilterChange,
    handleCurrencyChange
  }
}

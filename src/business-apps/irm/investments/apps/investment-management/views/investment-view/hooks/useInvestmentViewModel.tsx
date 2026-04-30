import { useCallback, useEffect, useRef, useState } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { useInvestmentViewActions } from './useInvestmentViewActions'
import { useInvestmentViewCatalog } from './useInvestmentViewCatalog'
import { useInvestmentViewColumns } from './useInvestmentViewColumns'
import { useInvestmentViewFilters } from './useInvestmentViewFilters'
import { useInvestmentViewKpis } from './useInvestmentViewKpis'
import { useInvestmentViewPreferences } from './useInvestmentViewPreferences'
import { useInvestmentViewSections } from './useInvestmentViewSections'

export interface InvestmentViewModelContext extends BusinessAppContextProps {
  initialSubTab?: string
  onSubTabChange?: (subTab: string) => void
}

export const useInvestmentViewModel = (context: InvestmentViewModelContext) => {
  const { accessToken, initialSubTab, onSubTabChange } = context
  const [currentSection, setCurrentSection] = useState(initialSubTab || 'overview')
  const catalog = useInvestmentViewCatalog(accessToken || '', currentSection)
  const preferences = useInvestmentViewPreferences(catalog.investmentGroups)

  const normalizeSection = useCallback(
    (value?: string) => {
      if (!value || value === 'overview') return 'overview'
      return catalog.investmentGroups.some(group => group.tabId === value) ? value : 'overview'
    },
    [catalog.investmentGroups]
  )

  useEffect(() => {
    if (catalog.groupsLoading) return
    setCurrentSection(section => normalizeSection(section))
  }, [catalog.groupsLoading, normalizeSection])

  const handleSectionChange = useCallback(
    (newSection: string) => {
      const normalizedSection = normalizeSection(newSection)
      setCurrentSection(normalizedSection)
      onSubTabChange?.(normalizedSection)
    },
    [normalizeSection, onSubTabChange]
  )

  const currentStateRef = useRef<any>(null)
  const resetActivePagination = useCallback(() => {
    const state = currentStateRef.current
    if (!state) return
    state.handlePaginationChange({ pageIndex: 0, pageSize: state.pageSize })
  }, [])

  const filters = useInvestmentViewFilters({
    context,
    currentSection,
    resetActivePagination,
    investmentGroups: catalog.investmentGroups,
    catalogData: catalog.catalogData,
    dynamicColumnConfigByTab: catalog.dynamicColumnConfigByTab,
    activeColumnConfig: catalog.activeColumnConfig,
    initialFiltersByTab: preferences.initialFiltersByTab,
    savePreferencePatch: preferences.savePreferencePatch
  })

  const sections = useInvestmentViewSections({
    accessToken,
    currentSection,
    investmentGroups: catalog.investmentGroups,
    filtersByTab: filters.filtersByTab,
    filtersReady: filters.filtersReady,
    dynamicColumnConfigByTab: catalog.dynamicColumnConfigByTab,
    preferencesByTab: preferences.preferencesByTab,
    savePreferencePatch: preferences.savePreferencePatch
  })
  currentStateRef.current = sections.currentState

  const columns = useInvestmentViewColumns(currentSection, catalog.dynamicColumnConfigByTab)
  const kpis = useInvestmentViewKpis(
    context,
    currentSection,
    catalog.investmentGroups,
    filters.filtersByTab,
    filters.selectedCurrency,
    filters.displayCurrencyCode,
    filters.filtersReady
  )
  const actions = useInvestmentViewActions({
    accessToken,
    currentSection,
    currentState: sections.currentState,
    selectedFilters: filters.selectedFilters,
    selectedCurrency: filters.selectedCurrency,
    currencyCodes: filters.currencyCodes,
    onCurrencyChange: filters.handleCurrencyChange,
    investmentGroups: catalog.investmentGroups,
    activeGroup: sections.activeGroup,
    activeColumnConfig: catalog.activeColumnConfig,
    activeTabCount: sections.currentState.totalCount ?? 0,
    displayCurrencyCode: filters.displayCurrencyCode
  })

  useProcessCompletion({
    onSuccess: () => {
      void kpis.refetch()
      sections.currentState.refetch()
    }
  })

  return {
    ...catalog,
    ...filters,
    ...sections,
    ...columns,
    ...actions,
    kpis,
    currentSection,
    handleSectionChange,
    isLoading: catalog.groupsLoading || filters.currenciesLoading
  }
}

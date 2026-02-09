import { useEffect } from 'react'

/**
 * Custom hook to handle initialization of currencies and filters for all investment tabs
 * Reduces cognitive complexity in InvestmentView component
 */
export const useInvestmentTabsInitialization = (
  availableCurrencies: Array<{ id: string; code: string; value: string } | string> | undefined,
  filtersReady: boolean,
  investmentGroups: Array<{ tabId: string }>,
  setCurrencyByTab: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  setFiltersByTab: React.Dispatch<React.SetStateAction<Record<string, Record<string, any>>>>,
  setFiltersReady: React.Dispatch<React.SetStateAction<boolean>>
) => {
  useEffect(() => {
    if (!availableCurrencies || availableCurrencies.length === 0 || filtersReady) {
      return
    }

    const defaultCurrency = 'EUR'
    const currencyObj = (Array.isArray(availableCurrencies) ? availableCurrencies : []).find(
      (c): c is { id: string; code: string; value: string } => typeof c !== 'string' && c?.code === defaultCurrency
    )

    if (!currencyObj) {
      return
    }

    const defaultFilter = { currencyIds: [currencyObj.id] }

    // Initialize overview
    setCurrencyByTab(prev => ({ ...prev, overview: defaultCurrency }))
    setFiltersByTab(prev => ({ ...prev, overview: defaultFilter }))

    // Initialize all groups
    investmentGroups.forEach(group => {
      setCurrencyByTab(prev => ({ ...prev, [group.tabId]: defaultCurrency }))
      setFiltersByTab(prev => ({ ...prev, [group.tabId]: defaultFilter }))
    })

    setFiltersReady(true)
  }, [availableCurrencies, filtersReady, investmentGroups, setCurrencyByTab, setFiltersByTab, setFiltersReady])
}

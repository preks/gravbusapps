import { useEffect } from 'react'

const getInitialCurrencySelection = (
  availableCurrencies: Array<{ id: string; code: string; value: string } | string> | undefined,
  filters?: Record<string, any>
): string => {
  const currencyId = Array.isArray(filters?.currencyIds) ? filters.currencyIds[0] : undefined
  if (!currencyId || !availableCurrencies) {
    return 'all'
  }

  const currency = availableCurrencies.find(
    (item): item is { id: string; code: string; value: string } => typeof item !== 'string' && item.id === currencyId
  )

  return currency?.code || 'all'
}

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
  setFiltersReady: React.Dispatch<React.SetStateAction<boolean>>,
  initialFiltersByTab: Record<string, Record<string, any>> = {}
) => {
  useEffect(() => {
    // Wait for both currencies AND groups before initialising so all tab currencies are
    // set in a single render — preventing the counts query from firing twice on page load.
    if (!availableCurrencies || availableCurrencies.length === 0 || filtersReady || investmentGroups.length === 0) {
      return
    }

    // Default: all currencies (no currencyIds) so the list shows every investment.
    // Cached tab filters may include a currencyIds entry; reflect that in the currency control.
    setCurrencyByTab(prev => {
      const next = {
        ...prev,
        overview: getInitialCurrencySelection(availableCurrencies, initialFiltersByTab.overview)
      }
      investmentGroups.forEach(group => {
        next[group.tabId] = getInitialCurrencySelection(availableCurrencies, initialFiltersByTab[group.tabId])
      })
      return next
    })
    setFiltersByTab(prev => {
      const next = { ...prev, overview: initialFiltersByTab.overview ?? {} }
      investmentGroups.forEach(group => {
        next[group.tabId] = initialFiltersByTab[group.tabId] ?? {}
      })
      return next
    })

    setFiltersReady(true)
  }, [
    availableCurrencies,
    filtersReady,
    initialFiltersByTab,
    investmentGroups,
    setCurrencyByTab,
    setFiltersByTab,
    setFiltersReady
  ])

  // When catalog groups arrive after the first init, default missing tabs to "all currencies".
  useEffect(() => {
    if (!filtersReady || investmentGroups.length === 0) {
      return
    }
    setCurrencyByTab(prev => {
      let changed = false
      const next = { ...prev }
      investmentGroups.forEach(group => {
        if (next[group.tabId] === undefined) {
          next[group.tabId] = getInitialCurrencySelection(availableCurrencies, initialFiltersByTab[group.tabId])
          changed = true
        }
      })
      return changed ? next : prev
    })
    setFiltersByTab(prev => {
      let changed = false
      const next = { ...prev }
      investmentGroups.forEach(group => {
        if (next[group.tabId] === undefined) {
          next[group.tabId] = initialFiltersByTab[group.tabId] ?? {}
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [availableCurrencies, filtersReady, initialFiltersByTab, investmentGroups, setCurrencyByTab, setFiltersByTab])
}

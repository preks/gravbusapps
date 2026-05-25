import { useCallback, useMemo } from 'react'
import { getCatalogValue } from '@/common/utils/windowUtils'
import { TOP_DESTINATION_FILTER_TOKEN_PREFIX } from '../components/tabs/expense-plans-tab/config/expensePlanFilterTokens'

export interface UseExpensePlansTabTopDestinationUiParams {
  destinationFilter: string | null
  topDestination: unknown
  selectedFilters: string[]
  filterLabelMap: Record<string, string>
  setBaseFilters: (filters: string[]) => void
  setDestinationFilter: (value: string | null) => void
  activeWidget: string | null
  setActiveWidget: (value: string | null) => void
  setSuppressCurrencyAutoSelect: (value: boolean) => void
  t: (key: string) => string
}

export function useExpensePlansTabTopDestinationUi({
  destinationFilter,
  topDestination,
  selectedFilters,
  filterLabelMap,
  setBaseFilters,
  setDestinationFilter,
  activeWidget,
  setActiveWidget,
  setSuppressCurrencyAutoSelect,
  t
}: UseExpensePlansTabTopDestinationUiParams) {
  const topDestinationPill = useMemo(() => {
    if (!destinationFilter || destinationFilter === 'N/A') return null
    const labelValue = topDestination && topDestination !== 'N/A' ? getCatalogValue(topDestination) : destinationFilter
    const token = `${TOP_DESTINATION_FILTER_TOKEN_PREFIX}${destinationFilter}`
    const label = `${t('expense-plans-filter-top-destination')}: ${labelValue}`
    return { token, label }
  }, [destinationFilter, topDestination, t])

  const uiSelectedFilters = useMemo(() => {
    if (!topDestinationPill) return selectedFilters
    if (selectedFilters.includes(topDestinationPill.token)) return selectedFilters
    return [...selectedFilters, topDestinationPill.token]
  }, [selectedFilters, topDestinationPill])

  const uiFilterLabelMap = useMemo(() => {
    if (!topDestinationPill) return filterLabelMap
    return { ...filterLabelMap, [topDestinationPill.token]: topDestinationPill.label }
  }, [filterLabelMap, topDestinationPill])

  const setFiltersForTable = useCallback(
    (filters: string[]) => {
      const hasTopDestination = filters.some(f => f.startsWith(TOP_DESTINATION_FILTER_TOKEN_PREFIX))
      if (!hasTopDestination) {
        if (destinationFilter) setDestinationFilter(null)
        if (activeWidget === 'top-destinations') setActiveWidget(null)
      }

      const strippedFilters = filters.filter(f => !f.startsWith(TOP_DESTINATION_FILTER_TOKEN_PREFIX))

      if (strippedFilters.length === 0) {
        setSuppressCurrencyAutoSelect(true)
      } else if (strippedFilters.some(f => f.startsWith('currency:'))) {
        setSuppressCurrencyAutoSelect(false)
      } else {
        setSuppressCurrencyAutoSelect(true)
      }
      setBaseFilters(strippedFilters)
    },
    [
      destinationFilter,
      activeWidget,
      setDestinationFilter,
      setActiveWidget,
      setSuppressCurrencyAutoSelect,
      setBaseFilters
    ]
  )

  return {
    topDestinationPill,
    uiSelectedFilters,
    uiFilterLabelMap,
    setFiltersForTable
  }
}

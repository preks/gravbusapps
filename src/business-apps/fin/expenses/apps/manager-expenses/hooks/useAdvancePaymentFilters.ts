import { useState, useCallback, useMemo, useEffect } from 'react'
import type { DataFilterGroup, DataFilter } from '@/components/data-filter/DataFilter'
import { useDebounce } from '@/common/hooks/useDebounce'
import { getAdvancePaymentStatusDisplay } from '../utils'
import { advancePaymentFilterStatuses } from './availableFilterStatuses'
import { useCurrencyStore } from '../store/useCurrencyStore'
import { useAdvancePaymentCurrencies } from './useAdvancePaymentCurrencies'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface UseAdvancePaymentFiltersProps {
  accessToken?: string
  managerId?: string
}

export interface UseAdvancePaymentFiltersReturn {
  searchTerm: string
  setSearchTerm: (term: string) => void
  debouncedSearchTerm: string
  statusFilter: string[] | null
  setStatusFilter: (status: string[] | null) => void
  filterGroups: DataFilterGroup[]
  handleDataFilterChange: (filterId: string, selected: boolean) => void
  filterLabelMap: Record<string, string>
  // Currency filter related properties
  currencyFilter: string
  setCurrencyFilter: (currency: string) => void
  // Loading state for currency data
  currenciesLoading: boolean
  // Initialization flag (set true once filter data is ready)
  filtersInitialized: boolean
}

export const useAdvancePaymentFilters = ({
  accessToken,
  managerId
}: UseAdvancePaymentFiltersProps = {}): UseAdvancePaymentFiltersReturn => {
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string[] | null>(['PENDING'])
  // Local primary currency for advance payments (independent from global store)
  const [localPrimaryCurrency, setLocalPrimaryCurrency] = useState<string>('')
  const [userHasSelectedCurrency, setUserHasSelectedCurrency] = useState(false)
  const [filtersInitialized, setFiltersInitialized] = useState(false)

  // Use the global currency store with enhanced properties
  const { setPrimaryCurrency, setUserSelected } = useCurrencyStore()

  // Fetch dynamic currency data if accessToken and managerId are provided
  const {
    availableCurrencies: dynamicCurrencies = [],
    mostUsedCurrency: advancePaymentMostUsedCurrency,
    isLoading: currenciesLoading,
    isInitialized: currenciesInitialized
  } = useAdvancePaymentCurrencies({
    accessToken: accessToken || '',
    managerId: managerId || ''
  })

  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Set local primary currency from advance payment's most used currency
  useEffect(() => {
    if (advancePaymentMostUsedCurrency && !userHasSelectedCurrency) {
      setLocalPrimaryCurrency(advancePaymentMostUsedCurrency)
    }
  }, [advancePaymentMostUsedCurrency, userHasSelectedCurrency])

  // Mark filters as initialized once currency data is ready
  useEffect(() => {
    if (!filtersInitialized && !currenciesLoading && currenciesInitialized) {
      setFiltersInitialized(true)
    }
  }, [filtersInitialized, currenciesLoading, currenciesInitialized])

  // Fallback: initialize filters when no credentials to avoid deadlock
  useEffect(() => {
    if (!filtersInitialized && (!accessToken || !managerId)) {
      setFiltersInitialized(true)
    }
  }, [filtersInitialized, accessToken, managerId])

  const handleStatusFilterChange = useCallback(
    (newStatus: string[] | null) => {
      if (newStatus === null || newStatus.length === 0) {
        setStatusFilter(null)
      } else {
        setStatusFilter(newStatus)
      }
    },
    [setStatusFilter]
  )

  const handleDataFilterChange = useCallback(
    (filterId: string, isSelected: boolean) => {
      // Check if this is a currency filter by prefix
      const isCurrencyFilter = String(filterId).startsWith('currency:') || String(filterId).includes('Currency:v1:')

      // Normalize to ISO code: handles "Currency:v1:EUR", "currency:EUR", "EUR"
      const lastSeg = String(filterId).split(':').pop() || filterId
      const currencyCode = lastSeg.replace(/^currency:/, '')

      // Safe access to dynamicCurrencies array
      const availableCurrencies = Array.isArray(dynamicCurrencies) ? dynamicCurrencies : []

      // Handle currency filters - check by prefix OR if it's in available currencies
      if (isCurrencyFilter || availableCurrencies.includes(currencyCode)) {
        // Handle currency filter selection
        if (isSelected) {
          setLocalPrimaryCurrency(currencyCode)
          setUserHasSelectedCurrency(true) // Mark this as a user selection
          setPrimaryCurrency(currencyCode) // Also update global store
          setUserSelected(true)
        } else {
          // When deselecting currency, reset to most used and update global store
          const fallback = advancePaymentMostUsedCurrency || ''
          setLocalPrimaryCurrency(fallback)
          setPrimaryCurrency(fallback) // Also update global store
          setUserHasSelectedCurrency(false)
          setUserSelected(false)
        }
        return
      }

      // Handle status filters
      const currentFilters = statusFilter || []

      if (isSelected) {
        // Add the filter
        const newFilters = [...currentFilters, filterId]
        handleStatusFilterChange(newFilters)
      } else {
        // Remove the filter
        const newFilters = currentFilters.filter(id => id !== filterId)
        handleStatusFilterChange(newFilters.length > 0 ? newFilters : null)
      }
    },
    [
      statusFilter,
      handleStatusFilterChange,
      setPrimaryCurrency,
      setUserSelected,
      dynamicCurrencies,
      advancePaymentMostUsedCurrency
    ]
  )

  const availableFilterStatuses = advancePaymentFilterStatuses

  // Helper function to format status display name with brackets (matching personal expenses pattern)
  const getStatusDisplayName = useCallback((status: string): string => {
    const statusConfig = getAdvancePaymentStatusDisplay(status)
    // Only show backend status in parentheses if the label is different from the status
    if (statusConfig.label.toLowerCase() === status.toLowerCase()) {
      return statusConfig.label
    } else {
      // Format backend status with only first letter uppercase and translate it
      const formattedStatus = status.charAt(0) + status.slice(1).toLowerCase()
      const translatedStatus = getTranslationFromI18nKeyAndLabel(
        `lowcoder:expense_statuses.${status.toLowerCase()}`,
        formattedStatus
      )
      return `${statusConfig.label} (${translatedStatus})`
    }
  }, [])

  // Create a mapping of filter IDs to their display labels
  const filterLabelMap = useMemo(() => {
    const map: Record<string, string> = {}

    // Add status filters with brackets
    for (const status of availableFilterStatuses) {
      map[status] = getStatusDisplayName(status)
    }

    // Add currency filters from dynamic data (safe access)
    const availableCurrencies = Array.isArray(dynamicCurrencies) ? dynamicCurrencies : []
    for (const currency of availableCurrencies) {
      map[currency] = currency
    }

    return map
  }, [availableFilterStatuses, dynamicCurrencies, getStatusDisplayName])

  // Create filter groups for the DataFilter component
  // NOTE: Only returning status group - currency group is built by the tab from overview data
  const filterGroups = useMemo<DataFilterGroup[]>(() => {
    // Status filter items
    const statusItems: DataFilter[] = availableFilterStatuses.map(status => ({
      id: status,
      label: filterLabelMap[status],
      selected: statusFilter ? statusFilter.includes(status) : false,
      group: 'statusGroup'
    }))

    return [
      {
        id: 'statusGroup',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status'),
        filters: statusItems,
        selectionMode: 'multiple'
      }
    ]
  }, [availableFilterStatuses, statusFilter, filterLabelMap])

  // Unified currency setter that updates all related states (local + global)
  const setUnifiedCurrency = useCallback(
    (currency: string) => {
      setLocalPrimaryCurrency(currency)
      setUserHasSelectedCurrency(true) // Mark as user selection
      setPrimaryCurrency(currency) // Update global store
      setUserSelected(true) // Mark global store as user-selected
    },
    [setPrimaryCurrency, setUserSelected]
  )

  return {
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
    statusFilter,
    setStatusFilter,
    filterGroups,
    handleDataFilterChange,
    filterLabelMap,
    currencyFilter: localPrimaryCurrency,
    setCurrencyFilter: setUnifiedCurrency,
    currenciesLoading,
    filtersInitialized
  }
}

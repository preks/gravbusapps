import { useState, useCallback, useMemo, useEffect } from 'react'
import dayjs from 'dayjs'

export interface ColumnConfig {
  id: string
  label: string
  visible: boolean
  disabled?: boolean
}

export interface ReportFiltersState {
  startDate: dayjs.Dayjs | null
  endDate: dayjs.Dayjs | null
  isTransposed: boolean
  columnConfig: ColumnConfig[]
  visibleColumns: string[]
  selectedCurrencies: string[]
  availableCurrencies: string[]
}

export interface ReportFiltersCallbacks {
  handleStartDateChange: (date: dayjs.Dayjs | null) => void
  handleEndDateChange: (date: dayjs.Dayjs | null) => void
  handleClearFilters: () => void
  handleTransposeToggle: () => void
  handleColumnVisibilityChange: (columnId: string, visible: boolean) => void
  handleCurrencyChange: (currencies: string[]) => void
  handleAvailableCurrenciesUpdate: (currencies: string[]) => void
}

export interface UseReportFiltersReturn extends ReportFiltersState, ReportFiltersCallbacks {
  // Computed filters for API calls
  computedFilters: {
    startDate?: string
    endDate?: string
    currencyIds?: string[]
  }
  // Filter initialization state
  filtersInitialized: boolean
}

/**
 * Shared hook for report filter state management across all investment report types
 * Handles date range filtering, column visibility, and currency filtering
 *
 * Features:
 * - Date range filtering (start/end dates)
 * - Currency multi-select filtering
 * - Available currencies tracking (populated by child components)
 * - Column visibility management
 * - Table transpose toggle
 */
export const useReportFilters = (initialColumns?: ColumnConfig[]): UseReportFiltersReturn => {
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(null)
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(null)
  const [isTransposed, setIsTransposed] = useState(false)
  const [filtersInitialized, setFiltersInitialized] = useState(false)
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([])
  const [availableCurrencies, setAvailableCurrencies] = useState<Set<string>>(new Set())

  // Column visibility management
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(initialColumns || [])

  // Update columnConfig when initialColumns changes (e.g., after catalog loads or tab switch)
  useEffect(() => {
    if (initialColumns && initialColumns.length > 0) {
      setColumnConfig(prevConfig => {
        if (prevConfig.length === 0) {
          // First time initialization - use initialColumns as-is
          return initialColumns
        }

        // Check how many columns from prevConfig exist in initialColumns
        const newIds = new Set(initialColumns.map(col => col.id))
        const commonIds = prevConfig.filter(col => newIds.has(col.id))
        const overlapPercentage = prevConfig.length > 0 ? commonIds.length / prevConfig.length : 0

        // If less than 50% overlap, this is likely a tab switch - reset all columns to default
        if (overlapPercentage < 0.5) {
          return initialColumns
        }

        // Otherwise, preserve user's visibility preferences for columns that exist in both configs
        const prevVisibilityMap = new Map(prevConfig.map(col => [col.id, col.visible]))

        // Merge: keep user's visibility choices, but add new columns from initialColumns
        return initialColumns.map(col => ({
          ...col,
          visible: prevVisibilityMap.has(col.id) ? prevVisibilityMap.get(col.id)! : col.visible // Use default for new columns
        }))
      })
    }
  }, [initialColumns])

  // Get visible columns
  const visibleColumns = useMemo(() => columnConfig.filter(col => col.visible).map(col => col.id), [columnConfig])

  // Filter change handlers - consistent across all reports
  const handleStartDateChange = useCallback((date: dayjs.Dayjs | null) => {
    setStartDate(date)
  }, [])

  const handleEndDateChange = useCallback((date: dayjs.Dayjs | null) => {
    setEndDate(date)
  }, [])

  const handleTransposeToggle = useCallback(() => {
    setIsTransposed(prev => !prev)
  }, [])

  const handleColumnVisibilityChange = useCallback((columnId: string, visible: boolean) => {
    setColumnConfig(prev => prev.map(col => (col.id === columnId ? { ...col, visible } : col)))
  }, [])

  const handleCurrencyChange = useCallback((currencies: string[]) => {
    setSelectedCurrencies(currencies)
  }, [])

  const handleAvailableCurrenciesUpdate = useCallback((currencies: string[]) => {
    setAvailableCurrencies(prev => {
      const updated = new Set(prev)
      for (const id of currencies) {
        updated.add(id)
      }
      return updated
    })
  }, [])

  const handleClearFilters = useCallback(() => {
    setStartDate(null)
    setEndDate(null)
    setSelectedCurrencies([])
  }, [])

  // Compute final filter values for API calls
  const computedFilters = useMemo(() => {
    return {
      startDate: startDate?.format('YYYY-MM-DD'),
      endDate: endDate?.format('YYYY-MM-DD'),
      currencyIds: selectedCurrencies.length > 0 ? selectedCurrencies : undefined
    }
  }, [startDate, endDate, selectedCurrencies])

  // Initialize filters after initial state setup
  useEffect(() => {
    setFiltersInitialized(true)
  }, [])

  return {
    // State
    startDate,
    endDate,
    isTransposed,
    columnConfig,
    visibleColumns,
    selectedCurrencies,
    availableCurrencies: Array.from(availableCurrencies),
    // Callbacks
    handleStartDateChange,
    handleEndDateChange,
    handleTransposeToggle,
    handleColumnVisibilityChange,
    handleCurrencyChange,
    handleAvailableCurrenciesUpdate,
    handleClearFilters,
    // Computed values
    computedFilters,
    // Initialization state
    filtersInitialized
  }
}

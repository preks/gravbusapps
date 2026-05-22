import React, { useMemo, useEffect, useCallback } from 'react'
import {
  useTranslation,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { useCurrencyStore } from '../../store/useCurrencyStore'
import translations from '../../_i18n'

export interface CurrencyFilterProps {
  /**
   * Loading state indicator
   */
  isLoading?: boolean
  /**
   * Currently selected currency code
   */
  value: string | null

  /**
   * Callback when currency selection changes
   */
  onChange: (currency: string | null) => void

  /**
   * List of available currencies to display (optional - will use dynamic data if not provided)
   */
  currencies?: string[]

  /**
   * Whether to show "All Currencies" option
   */
  showAllOption?: boolean

  /**
   * Custom placeholder text when no currency is selected
   */
  placeholder?: string

  /**
   * Additional CSS class names
   */
  className?: string

  /**
   * Data test ID for testing
   */
  'data-testid'?: string

  /**
   * Whether the component is disabled
   */
  disabled?: boolean

  /**
   * Access token for API calls
   */
  accessToken?: string

  /**
   * Manager ID for filtering currency data
   */
  managerId?: string
}

/**
 * Reusable currency filter component for selecting currencies
 * Follows the design specifications with a consistent dropdown style
 */
export const CurrencyFilter: React.FC<CurrencyFilterProps> = ({
  value,
  onChange,
  currencies: propCurrencies,
  isLoading: propIsLoading,
  showAllOption = true,
  placeholder: placeholderProp,
  className = '',
  'data-testid': dataTestId = 'currency-filter',
  disabled = false
}) => {
  const { t } = useTranslation(translations)
  const placeholder = placeholderProp ?? t('currency-filter-all-currencies')
  const loadingLabel = t('common-loading')
  const emptyLabel = t('common-no-currencies')

  // Use the global currency store for consistent state across components
  const {
    primaryCurrency,
    setPrimaryCurrency,
    availableCurrencies: storeCurrencies,
    setUserSelected
  } = useCurrencyStore()

  // Dynamic fetching removed to avoid duplicate currency calls.
  // Rely on provided currencies or store.
  const mostUsedCurrency = null as unknown as string | null

  // Use either provided currencies or dynamic currencies with fallbacks
  // Ensure we have a comprehensive list that includes the most used currency
  const currencies = useMemo(() => {
    // Start with provided currencies if available
    let currencyList = propCurrencies || []

    // Use store currencies as primary fallback when prop not provided
    const availableStoreCurrencies = storeCurrencies || []

    // Combine all sources, prioritizing dynamic data
    currencyList = [...new Set([...currencyList, ...availableStoreCurrencies])]

    // Ensure the most used currency is included if available
    if (mostUsedCurrency && !currencyList.includes(mostUsedCurrency)) {
      currencyList.push(mostUsedCurrency)
    }

    // If still empty after all attempts, use minimal fallback (just EUR)
    if (currencyList.length === 0) {
      currencyList = ['EUR']
    }

    return [...new Set(currencyList)].sort((a, b) => a.localeCompare(b))
  }, [propCurrencies, mostUsedCurrency, storeCurrencies])

  // Combine loading states
  const isLoading = propIsLoading || false

  // Determine if we should pre-select a value
  // If no value is selected and we have currencies available, pre-select the most used currency
  useEffect(() => {
    // Only attempt to set initial value if:
    // 1. No value is currently selected
    // 2. We have currencies available
    if (value === null && currencies.length > 0) {
      // Use most used currency if available, otherwise use primaryCurrency from store
      const initialCurrency = mostUsedCurrency || primaryCurrency

      if (initialCurrency && currencies.includes(initialCurrency)) {
        // Set the currency without marking as user-selected
        onChange(initialCurrency)
      } else if (currencies[0]) {
        // Fallback to first available currency if most used is not in the list
        onChange(currencies[0])
      }
    }
  }, [value, currencies, mostUsedCurrency, primaryCurrency, onChange])

  // Mark currency as user-selected when changed via UI
  const handleCurrencyChange = useCallback(
    (newValue: string) => {
      // If "all" is selected, pass null to indicate no specific currency filter
      if (newValue === 'all') {
        onChange(null)
        return
      }

      // Mark as user-selected in the store
      setUserSelected(true)

      // Update primary currency in the store
      setPrimaryCurrency(newValue)

      // Notify parent component
      onChange(newValue)
    },
    [onChange, setPrimaryCurrency, setUserSelected]
  )

  // Use the enhanced currency change handler that marks user selection
  const handleChange = handleCurrencyChange

  // Determine if we should show loading state or empty state
  // Only show loading state if we're loading and have no currencies available
  const showLoadingState = isLoading && currencies.length === 0
  const showEmptyState = !isLoading && (!currencies || currencies.length === 0)

  // Render currency options based on state
  const renderCurrencyOptions = () => {
    if (showLoadingState) {
      return (
        <SelectItem value="loading" data-testid={`${dataTestId}-option-loading`}>
          {loadingLabel}
        </SelectItem>
      )
    }

    if (showEmptyState) {
      return (
        <SelectItem value="empty" data-testid={`${dataTestId}-option-empty`}>
          {emptyLabel}
        </SelectItem>
      )
    }

    return currencies.map(currency => (
      <SelectItem key={currency} value={currency} data-testid={`${dataTestId}-option-${currency.toLowerCase()}`}>
        {currency}
      </SelectItem>
    ))
  }

  return (
    <div className={`gba:flex gba:w-full ${className}`} data-testid={`${dataTestId}-container`}>
      <Select
        value={value || 'all'}
        onValueChange={handleChange}
        disabled={disabled} // Only disable if explicitly set to disabled
        data-testid={dataTestId}
      >
        <SelectTrigger className="gba:flex gba:w-full gba:w-[140px] gba:h-9 gba:text-sm gba:border-input">
          <SelectValue placeholder={showLoadingState ? loadingLabel : placeholder} />
        </SelectTrigger>
        <SelectContent>
          {showAllOption && (
            <SelectItem value="all" data-testid={`${dataTestId}-option-all`}>
              {placeholder}
            </SelectItem>
          )}
          {renderCurrencyOptions()}
        </SelectContent>
      </Select>
    </div>
  )
}

export default CurrencyFilter

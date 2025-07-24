import React, { useMemo, useEffect, useCallback } from 'react';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useCurrencyData } from '../../hooks/useCurrencyData';

export interface CurrencyFilterProps {
  /**
   * Loading state indicator
   */
  isLoading?: boolean;
  /**
   * Currently selected currency code
   */
  value: string | null;
  
  /**
   * Callback when currency selection changes
   */
  onChange: (currency: string | null) => void;
  
  /**
   * List of available currencies to display (optional - will use dynamic data if not provided)
   */
  currencies?: string[];
  
  /**
   * Whether to show "All Currencies" option
   */
  showAllOption?: boolean;
  
  /**
   * Custom placeholder text when no currency is selected
   */
  placeholder?: string;
  
  /**
   * Additional CSS class names
   */
  className?: string;
  
  /**
   * Data test ID for testing
   */
  'data-testid'?: string;
  
  /**
   * Whether the component is disabled
   */
  disabled?: boolean;
  
  /**
   * Access token for API calls
   */
  accessToken?: string;
  
  /**
   * Manager ID for filtering currency data
   */
  managerId?: string;
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
  placeholder = getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.all_currencies', 'All Currencies'),
  className = '',
  'data-testid': dataTestId = 'currency-filter',
  disabled = false,
  accessToken = '',
  managerId = ''
}) => {
  // Use the global currency store for consistent state across components
  const { 
    primaryCurrency, 
    setPrimaryCurrency, 
    availableCurrencies: storeCurrencies,
    setUserSelected,
  } = useCurrencyStore();
  
  // Always use dynamic currency data if accessToken and managerId are provided
  const useDynamicData = accessToken && managerId;
  const { 
    availableCurrencies: dynamicCurrencies, 
    isLoading: dynamicIsLoading,
    mostUsedCurrency
  } = useDynamicData ? useCurrencyData(accessToken, managerId) : { 
    availableCurrencies: [], 
    isLoading: false, 
    mostUsedCurrency: null
  };
  
  // Use either provided currencies or dynamic currencies with fallbacks
  // Ensure we have a comprehensive list that includes the most used currency
  const currencies = useMemo(() => {
    // Start with provided currencies if available
    let currencyList = propCurrencies || [];
    
    // Always prioritize dynamic currencies from the store or hook
    // This ensures we have the most complete list available
    const availableDynamicCurrencies = useDynamicData ? dynamicCurrencies : [];
    const availableStoreCurrencies = storeCurrencies || [];
    
    // Combine all sources, prioritizing dynamic data
    currencyList = [
      ...new Set([
        ...currencyList,
        ...availableDynamicCurrencies,
        ...availableStoreCurrencies
      ])
    ];
    
    // Ensure the most used currency is included if available
    if (mostUsedCurrency && !currencyList.includes(mostUsedCurrency)) {
      currencyList.push(mostUsedCurrency);
    }
    
    // If still empty after all attempts, use comprehensive fallback list
    if (currencyList.length === 0) {
      currencyList = ['EUR', 'USD', 'GBP', 'RON', 'CHF', 'PLN', 'CZK'];
    }
    
    // Log the available currencies for debugging
    console.log('Currency filter options:', {
      propCurrencies: propCurrencies || [],
      dynamicCurrencies: availableDynamicCurrencies,
      storeCurrencies: availableStoreCurrencies,
      mostUsedCurrency,
      finalList: [...new Set(currencyList)].sort()
    });
    
    return [...new Set(currencyList)].sort();
  }, [propCurrencies, dynamicCurrencies, mostUsedCurrency, storeCurrencies]);
  
  // Combine loading states
  const isLoading = propIsLoading || (useDynamicData && dynamicIsLoading);
  
  // Determine if we should pre-select a value
  // If no value is selected and we have currencies available, pre-select the most used currency
  useEffect(() => {
    // Only attempt to set initial value if:
    // 1. No value is currently selected
    // 2. We have currencies available
    if (value === null && currencies.length > 0) {
      // Use most used currency if available, otherwise use primaryCurrency from store
      const initialCurrency = mostUsedCurrency || primaryCurrency;
      console.log('Setting initial currency:', { initialCurrency, mostUsedCurrency, primaryCurrency, value });
      
      if (initialCurrency && currencies.includes(initialCurrency)) {
        // Set the currency without marking as user-selected
        onChange(initialCurrency);
      } else if (currencies[0]) {
        // Fallback to first available currency if most used is not in the list
        onChange(currencies[0]);
      }
    }
  }, [value, currencies, mostUsedCurrency, primaryCurrency, onChange]);

  // Mark currency as user-selected when changed via UI
  const handleCurrencyChange = useCallback((newValue: string) => {
    // If "all" is selected, pass null to indicate no specific currency filter
    if (newValue === 'all') {
      onChange(null);
      return;
    }
    
    // Mark as user-selected in the store
    setUserSelected(true);
    
    // Update primary currency in the store
    setPrimaryCurrency(newValue);
    
    // Notify parent component
    onChange(newValue);
  }, [onChange, setPrimaryCurrency, setUserSelected]);
  
  // Use the enhanced currency change handler that marks user selection
  const handleChange = handleCurrencyChange;

  // Determine if we should show loading state or empty state
  // Only show loading state if we're loading and have no currencies available
  const showLoadingState = isLoading && currencies.length === 0;
  const showEmptyState = !isLoading && (!currencies || currencies.length === 0);
  
  return (
    <div 
      className={`flex w-full ${className}`}
      data-testid={`${dataTestId}-container`}
    >
      <Select
        value={value || 'all'}
        onValueChange={handleChange}
        disabled={disabled} // Only disable if explicitly set to disabled
        data-testid={dataTestId}
      >
        <SelectTrigger className="flex w-full gba:w-[140px] gba:h-9 gba:text-sm gba:border-gray-300">
          <SelectValue placeholder={showLoadingState ? getTranslationFromI18nKeyAndLabel('lowcoder:common.loading', 'Loading...') : placeholder} />
        </SelectTrigger>
        <SelectContent>
          {showAllOption && (
            <SelectItem value="all" data-testid={`${dataTestId}-option-all`}>
              {placeholder}
            </SelectItem>
          )}
          {showLoadingState ? (
            <SelectItem value="loading" data-testid={`${dataTestId}-option-loading`}>
              {getTranslationFromI18nKeyAndLabel('lowcoder:common.loading', 'Loading...')}
            </SelectItem>
          ) : showEmptyState ? (
            <SelectItem value="empty" data-testid={`${dataTestId}-option-empty`}>
              {getTranslationFromI18nKeyAndLabel('lowcoder:common.no_data', 'No currencies available')}
            </SelectItem>
          ) : (
            currencies.map((currency) => (
              <SelectItem 
                key={currency} 
                value={currency}
                data-testid={`${dataTestId}-option-${currency.toLowerCase()}`}
              >
                {currency}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

export default CurrencyFilter;

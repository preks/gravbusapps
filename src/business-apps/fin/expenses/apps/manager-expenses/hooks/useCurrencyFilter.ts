import { useMemo } from 'react';
import { useCurrencyStore } from '../store/useCurrencyStore';
import type { DataFilterGroup, DataFilter } from '@/components/data-filter/DataFilter';
import { useCurrencyData } from './useCurrencyData';

export interface UseCurrencyFilterReturn {
  currencyFilter: string;
  setCurrencyFilter: (currency: string) => void;
  filterGroups: DataFilterGroup[];
  handleDataFilterChange: (filterId: string, selected: boolean) => void;
  filterLabelMap: Record<string, string>;
}

/**
 * Hook for managing currency filters in the manager-expenses app
 * Follows the pattern of existing filter hooks
 */
export const useCurrencyFilter = (accessToken?: string, managerId?: string): UseCurrencyFilterReturn => {
  const { primaryCurrency, setPrimaryCurrency } = useCurrencyStore();
  
  // Use the currency data hook to get dynamic currency data
  const { 
    availableCurrencies, 
    mostUsedCurrency, 
    isLoading
  } = useCurrencyData(accessToken || '', managerId || '');
  
  // Fallback to default currencies if dynamic data is not available or loading
  const displayCurrencies = useMemo(() => {
    if (isLoading || !availableCurrencies || availableCurrencies.length === 0) {
      // Fallback to common currencies
      return ['EUR', 'USD', 'GBP', 'RON', 'CHF', 'PLN', 'CZK', 'HUF', 'SEK', 'DKK', 'NOK'];
    }
    return availableCurrencies;
  }, [availableCurrencies, isLoading]);
  
  // Use most used currency as default if available
  useMemo(() => {
    if (mostUsedCurrency && !isLoading) {
      setPrimaryCurrency(mostUsedCurrency);
    }
  }, [mostUsedCurrency, isLoading, setPrimaryCurrency]);
  
  // Create filter groups for the DataFilter component
  const filterGroups = useMemo<DataFilterGroup[]>(() => {
    const currencyItems: DataFilter[] = displayCurrencies.map(
      (currency) => ({
        id: currency,
        label: currency,
        selected: currency === primaryCurrency,
        group: 'currencyGroup',
      })
    );

    return [
      {
        id: 'currencyGroup',
        title: 'Currency',
        filters: currencyItems,
        selectionMode: 'single',
      },
    ];
  }, [displayCurrencies, primaryCurrency]);

  // Map of currency codes to display labels
  const filterLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    displayCurrencies.forEach((currency) => {
      map[currency] = currency;
    });
    return map;
  }, [displayCurrencies]);

  // Handle filter changes
  const handleDataFilterChange = (filterId: string, isSelected: boolean) => {
    if (isSelected) {
      setPrimaryCurrency(filterId);
    }
  };

  return {
    currencyFilter: primaryCurrency,
    setCurrencyFilter: setPrimaryCurrency,
    filterGroups,
    handleDataFilterChange,
    filterLabelMap,
  };
};

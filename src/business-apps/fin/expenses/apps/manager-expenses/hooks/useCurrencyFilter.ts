import { useMemo } from 'react';
import { useCurrencyStore } from '../store/useCurrencyStore';
import type { DataFilterGroup, DataFilter } from '@/components/data-filter/DataFilter';

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
export const useCurrencyFilter = (): UseCurrencyFilterReturn => {
  const { primaryCurrency, setPrimaryCurrency } = useCurrencyStore();
  
  // Available currencies - expanded to include RON and other common currencies
  const availableCurrencies = ['EUR', 'USD', 'GBP', 'RON', 'CHF', 'PLN', 'CZK', 'HUF', 'SEK', 'DKK', 'NOK'];
  
  // Create filter groups for the DataFilter component
  const filterGroups = useMemo<DataFilterGroup[]>(() => {
    const currencyItems: DataFilter[] = availableCurrencies.map(
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
  }, [availableCurrencies, primaryCurrency]);

  // Map of currency codes to display labels
  const filterLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    availableCurrencies.forEach((currency) => {
      map[currency] = currency;
    });
    return map;
  }, [availableCurrencies]);

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

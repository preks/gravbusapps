import { useState, useMemo, useCallback } from 'react';
import type { DataFilterGroup, DataFilter } from '@/components/data-filter';
import { ExpenseStatus, getExpensePlanStatusDisplay } from '../utils';
import { useDebounce } from '@/common/hooks/useDebounce';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useCurrencyStore } from '../store/useCurrencyStore';
import { useExpensePlanCurrencies } from './useExpensePlanCurrencies';

export interface UseExpensePlanFiltersProps {
  accessToken?: string;
  managerId?: string;
}

export interface UseExpensePlanFiltersReturn {
  searchTerm: string; 
  setSearchTerm: (term: string) => void; 
  debouncedSearchTerm: string; 
  statusFilter: ExpenseStatus[]; 
  setStatusFilter: (status: ExpenseStatus[]) => void; 
  currencyFilter: string;
  setCurrencyFilter: (currency: string) => void;
  filterGroups: DataFilterGroup[]; 
  handleDataFilterChange: (filterId: string, selected: boolean) => void; 
  filterLabelMap: Record<string, string>; 
  getFilters: () => Record<string, any>;
  currenciesLoading: boolean;
}

// Move outside component to prevent re-creation on every render
const availableFilterStatuses: ExpenseStatus[] = [
  ExpenseStatus.CREATED,
  ExpenseStatus.PENDING,
  ExpenseStatus.REJECTED,
  ExpenseStatus.APPROVED,
  ExpenseStatus.ASSIGNED,
  ExpenseStatus.BOOKED,
  ExpenseStatus.VERIFIED,
  ExpenseStatus.CLOSED,
];

export const useExpensePlanFilters = ({
  accessToken,
  managerId
}: UseExpensePlanFiltersProps = {}): UseExpensePlanFiltersReturn => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  // Default to PENDING (Approval Required) status filter
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus[]>([ExpenseStatus.PENDING]);
  
  // Use the currency store for global currency state management with enhanced properties
  const { 
    primaryCurrency, 
    setPrimaryCurrency,
    setUserSelected,
    mostUsedCurrency,
    isInitialized: storeInitialized
  } = useCurrencyStore();
  
  // Fetch dynamic currency data if accessToken and managerId are provided
  const { 
    availableCurrencies: dynamicCurrencies, 
    isLoading: currenciesLoading,
    isInitialized: currenciesInitialized
  } = useExpensePlanCurrencies({
    accessToken: accessToken || '',
    managerId: managerId || ''
  });

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const handleDataFilterChange = useCallback((filterId: string, isSelected: boolean) => {
    // Check if this is a currency filter (starts with 'currency:')
    if (filterId.startsWith('currency:')) {
      const currencyCode = filterId.replace('currency:', '');
      if (isSelected) {
        setPrimaryCurrency(currencyCode);
        setUserSelected(true); // Mark this as a user selection
        console.log(`Expense plan currency filter changed by user to: ${currencyCode}`);
      }
      // We don't handle deselection for currency as it's a single-select
      return;
    }
    
    // Handle status filters
    setStatusFilter(prevFilter => {
      if (isSelected) {
        // Add the status if it's not already in the array
        if (!prevFilter.includes(filterId as ExpenseStatus)) {
          return [...prevFilter, filterId as ExpenseStatus];
        }
        return prevFilter;
      } else {
        // Remove the status from the array
        return prevFilter.filter(status => status !== filterId);
      }
    });
  }, [setPrimaryCurrency, setUserSelected]);

  // Memoize filterLabelMap with stable dependencies
  const filterLabelMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    availableFilterStatuses.forEach((status) => {
      // Use custom labels for BOOKED and VERIFIED to distinguish them
      if (status === ExpenseStatus.BOOKED) {
        map[status] = 'In Transit (Booked)';
      } else if (status === ExpenseStatus.VERIFIED) {
        map[status] = 'In Transit (Verified)';
      } else {
        map[status] = getExpensePlanStatusDisplay(status).label;
      }
    });
    return map;
  }, []); // Empty dependency array since availableFilterStatuses is now stable

  const filterGroups = useMemo<DataFilterGroup[]>(() => {
    // Status filter items
    const statusItems: DataFilter[] = availableFilterStatuses.map(
      (status) => ({
        id: status,
        label: filterLabelMap[status],
        selected: statusFilter.includes(status),
        group: 'statusGroup',
      })
    );

    // Use combined currency options from all sources
    // This ensures the filter shows the correct currencies from the beginning
    const availableCurrencies = Array.from(new Set([
      ...dynamicCurrencies,
      ...(mostUsedCurrency ? [mostUsedCurrency] : []),
      'EUR', 'USD' // Always include these fallback currencies
    ])).sort();
    
    // Log the currency options for debugging
    console.log('Expense plan currency filter options:', {
      dynamicCurrencies,
      mostUsedCurrency,
      primaryCurrency,
      combined: availableCurrencies,
      isInitialized: currenciesInitialized || storeInitialized
    });
      
    const currencyItems: DataFilter[] = availableCurrencies.map(
      (currency) => ({
        id: `currency:${currency}`,
        label: currency,
        selected: primaryCurrency === currency,
        group: 'currencyGroup',
      })
    );

    return [
      {
        id: 'statusGroup',
        title: getTranslationFromI18nKeyAndLabel('expense_plan_status_filter_title', 'Status'),
        filters: statusItems,
      },
      {
        id: 'currencyGroup',
        title: getTranslationFromI18nKeyAndLabel('expense_plan_currency_filter_title', 'Currency'),
        filters: currencyItems,
      },
    ];
  }, [filterLabelMap, statusFilter, primaryCurrency, dynamicCurrencies, mostUsedCurrency, currenciesInitialized, storeInitialized]);

  // Helper function to get filters for backend queries
  const getFilters = useCallback(() => {
    const filters: Record<string, any> = {};
    
    // Add status filters if any are selected
    if (statusFilter.length > 0) {
      filters.status = statusFilter;
    }
    
    // Add currency filter if selected
    if (primaryCurrency) {
      filters.currency = `Currency:v1:${primaryCurrency}`;
    }
    
    return filters;
  }, [statusFilter, primaryCurrency]);

  return {
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
    statusFilter,
    setStatusFilter,
    currencyFilter: primaryCurrency,
    setCurrencyFilter: setPrimaryCurrency,
    filterGroups,
    handleDataFilterChange,
    filterLabelMap,
    getFilters,
    currenciesLoading,
  };
};

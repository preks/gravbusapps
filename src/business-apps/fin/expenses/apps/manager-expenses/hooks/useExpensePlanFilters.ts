import { useState, useMemo, useCallback } from 'react';
import type { DataFilterGroup, DataFilter } from '@/components/data-filter';
import { ExpenseStatus, getExpensePlanStatusDisplay } from '../utils';
import { useDebounce } from '@/common/hooks/useDebounce';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useCurrencyStore } from '../store/useCurrencyStore';

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

export const useExpensePlanFilters = (): UseExpensePlanFiltersReturn => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  // Default to PENDING (Approval Required) status filter
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus[]>([ExpenseStatus.PENDING]);
  
  // Use the currency store for global currency state management
  const { primaryCurrency, setPrimaryCurrency } = useCurrencyStore();

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const handleDataFilterChange = useCallback((filterId: string, isSelected: boolean) => {
    // Check if this is a currency filter (starts with 'currency:')
    if (filterId.startsWith('currency:')) {
      const currencyCode = filterId.replace('currency:', '');
      if (isSelected) {
        setPrimaryCurrency(currencyCode);
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
  }, [setPrimaryCurrency]);

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

    // Currency filter items
    const availableCurrencies = ['EUR', 'USD', 'GBP', 'CHF', 'JPY'];
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
  }, [filterLabelMap, statusFilter, primaryCurrency]);

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
  };
};

import { useState, useCallback, useMemo } from 'react';
import type { DataFilterGroup, DataFilter } from '@/components/data-filter/DataFilter';
import { useDebounce } from '@/common/hooks/useDebounce';
import { ExpenseStatus, getAdvancePaymentStatusDisplay } from '../utils';
import { useCurrencyStore } from '../store/useCurrencyStore';
import { useAdvancePaymentCurrencies } from './useAdvancePaymentCurrencies';

export interface UseAdvancePaymentFiltersProps {
  accessToken?: string;
  managerId?: string;
}

export interface UseAdvancePaymentFiltersReturn {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  debouncedSearchTerm: string;
  statusFilter: string[] | null;
  setStatusFilter: (status: string[] | null) => void;
  filterGroups: DataFilterGroup[];
  handleDataFilterChange: (filterId: string, selected: boolean) => void;
  filterLabelMap: Record<string, string>;
  // Currency filter related properties
  currencyFilter: string;
  setCurrencyFilter: (currency: string) => void;
  // Loading state for currency data
  currenciesLoading: boolean;
}

export const useAdvancePaymentFilters = ({
  accessToken,
  managerId
}: UseAdvancePaymentFiltersProps = {}): UseAdvancePaymentFiltersReturn => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  // Default to PENDING (Approval Required) status filter as per requirements
  const [statusFilter, setStatusFilter] = useState<string[] | null>([ExpenseStatus.PENDING]);
  
  // Use the global currency store with enhanced properties
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
  } = useAdvancePaymentCurrencies({
    accessToken: accessToken || '',
    managerId: managerId || ''
  });

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const handleStatusFilterChange = useCallback((newStatus: string[] | null) => {
    if (newStatus === null || newStatus.length === 0) {
      setStatusFilter(null);
    } else {
      setStatusFilter(newStatus);
    }
  }, [setStatusFilter]);

  const handleDataFilterChange = useCallback((filterId: string, isSelected: boolean) => {
    // Always use dynamic currencies first, even if loading
    // This ensures the filter shows the correct currencies from the beginning
    const currencyOptions = dynamicCurrencies.length > 0
      ? dynamicCurrencies
      : ['EUR', 'USD']; // Minimal fallback list
    
    if (currencyOptions.includes(filterId)) {
      // Handle currency filter selection
      if (isSelected) {
        setPrimaryCurrency(filterId);
        setUserSelected(true); // Mark this as a user selection
        console.log(`Currency filter changed by user to: ${filterId}`);
      }
      return;
    }
    
    // Handle status filters
    const currentFilters = statusFilter || [];
    
    if (isSelected) {
      // Add the filter
      const newFilters = [...currentFilters, filterId];
      handleStatusFilterChange(newFilters);
    } else {
      // Remove the filter
      const newFilters = currentFilters.filter(id => id !== filterId);
      handleStatusFilterChange(newFilters.length > 0 ? newFilters : null);
    }
  }, [statusFilter, handleStatusFilterChange, setPrimaryCurrency, setUserSelected]);

  // Define the statuses that should be used for filtering with the correct mappings
  // Include all relevant statuses from the ExpenseStatus enum to match backend values
  const availableFilterStatuses: ExpenseStatus[] = [
    ExpenseStatus.PREPARED,
    ExpenseStatus.CREATED,
    ExpenseStatus.ASSIGNED,
    ExpenseStatus.PENDING,
    ExpenseStatus.APPROVED,
    ExpenseStatus.RETURNED,
    ExpenseStatus.REJECTED,
    ExpenseStatus.VERIFIED,
    ExpenseStatus.BOOKED,
    ExpenseStatus.PAID,
    ExpenseStatus.CLOSED,
    ExpenseStatus.DISCARDED,
    ExpenseStatus.TRANSFERRED,
  ];
  
  // Map of status to display label based on user requirements
  const statusDisplayMap: Partial<Record<ExpenseStatus, string>> = {
    [ExpenseStatus.PREPARED]: 'Prepared',
    [ExpenseStatus.CREATED]: 'Draft (Created)',
    [ExpenseStatus.ASSIGNED]: 'Assigned',
    [ExpenseStatus.PENDING]: 'Approval Required',
    [ExpenseStatus.APPROVED]: 'Approved',
    [ExpenseStatus.RETURNED]: 'In Revision (Returned)',
    [ExpenseStatus.REJECTED]: 'Revision Required (Rejected)',
    [ExpenseStatus.VERIFIED]: 'In Transit (Verified)',
    [ExpenseStatus.BOOKED]: 'In Transit (Booked)',
    [ExpenseStatus.PAID]: 'Paid',
    [ExpenseStatus.CLOSED]: 'Closed',
    [ExpenseStatus.DISCARDED]: 'Discarded',
    [ExpenseStatus.TRANSFERRED]: 'In Transit (Transferred)',
  };

  // Create a mapping of filter IDs to their display labels
  const filterLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    
    // Add status filters
    availableFilterStatuses.forEach((status) => {
      // Use the custom display map if available, otherwise get from getAdvancePaymentStatusDisplay
      map[status] = statusDisplayMap[status] || getAdvancePaymentStatusDisplay(status).label;
    });
    
    // Add currency filters - expanded to include RON and other common currencies
    const currencyOptions = ['EUR', 'USD', 'GBP', 'RON', 'CHF', 'PLN', 'CZK', 'HUF', 'SEK', 'DKK', 'NOK'];
    currencyOptions.forEach(currency => {
      map[currency] = currency;
    });
    
    return map;
  }, [availableFilterStatuses]);

  // Create filter groups for the DataFilter component
  const filterGroups = useMemo<DataFilterGroup[]>(() => {
    // Status filter items
    const statusItems: DataFilter[] = availableFilterStatuses.map(
      (status) => ({
        id: status,
        label: filterLabelMap[status],
        selected: statusFilter ? statusFilter.includes(status) : false,
        group: 'statusGroup',
      })
    );
    
    // Use combined currency options from all sources
    // This ensures the filter shows the correct currencies from the beginning
    const currencyOptions = Array.from(new Set([
      ...dynamicCurrencies,
      ...(mostUsedCurrency ? [mostUsedCurrency] : []),
      'EUR', 'USD' // Always include these fallback currencies
    ])).sort();
    
    // Log the currency options for debugging
    console.log('Advance payment currency filter options:', {
      dynamicCurrencies,
      mostUsedCurrency,
      primaryCurrency,
      combined: currencyOptions,
      isInitialized: currenciesInitialized || storeInitialized
    });
    
    const currencyItems: DataFilter[] = currencyOptions.map(
      (currency) => ({
        id: currency,
        label: currency,
        selected: currency === primaryCurrency,
        group: 'currencyGroup',
      })
    );

    return [
      {
        id: 'statusGroup',
        title: 'Status',
        filters: statusItems,
        selectionMode: 'multiple',
      },
      {
        id: 'currencyGroup',
        title: 'Currency',
        filters: currencyItems,
        selectionMode: 'single',
      },
    ];
  }, [availableFilterStatuses, statusFilter, filterLabelMap, primaryCurrency, dynamicCurrencies, mostUsedCurrency, currenciesInitialized, storeInitialized]);

  return {
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
    statusFilter,
    setStatusFilter,
    filterGroups,
    handleDataFilterChange,
    filterLabelMap,
    currencyFilter: primaryCurrency,
    setCurrencyFilter: setPrimaryCurrency,
    currenciesLoading,
  };
};

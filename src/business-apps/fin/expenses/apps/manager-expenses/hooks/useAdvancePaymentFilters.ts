import { useState, useCallback, useMemo } from 'react';
import type { DataFilterGroup, DataFilter } from '@/components/data-filter/DataFilter';
import { useDebounce } from '@/common/hooks/useDebounce';
import { ExpenseStatus, getAdvancePaymentStatusDisplay } from '../utils';
import { useCurrencyStore } from '../store/useCurrencyStore';

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
}

export const useAdvancePaymentFilters = (): UseAdvancePaymentFiltersReturn => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  // Default to PENDING (Approval Required) status filter
  const [statusFilter, setStatusFilter] = useState<string[] | null>([ExpenseStatus.PENDING]);
  
  // Use the global currency store
  const { primaryCurrency, setPrimaryCurrency } = useCurrencyStore();

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const handleStatusFilterChange = useCallback((newStatus: string[] | null) => {
    if (newStatus === null || newStatus.length === 0) {
      setStatusFilter(null);
    } else {
      setStatusFilter(newStatus);
    }
  }, [setStatusFilter]);

  const handleDataFilterChange = useCallback((filterId: string, isSelected: boolean) => {
    // Check if this is a currency filter (expanded to include RON and other common currencies)
    const currencyOptions = ['EUR', 'USD', 'GBP', 'RON', 'CHF', 'PLN', 'CZK', 'HUF', 'SEK', 'DKK', 'NOK'];
    
    if (currencyOptions.includes(filterId)) {
      // Handle currency filter selection
      if (isSelected) {
        setPrimaryCurrency(filterId);
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
  }, [statusFilter, handleStatusFilterChange, setPrimaryCurrency]);

  // Define the statuses that should be used for filtering with the correct mappings
  const availableFilterStatuses: ExpenseStatus[] = [
    ExpenseStatus.PREPARED,
    ExpenseStatus.APPROVED,
    ExpenseStatus.BOOKED,
    ExpenseStatus.PAID,
    ExpenseStatus.PENDING,
    ExpenseStatus.REJECTED,
    ExpenseStatus.TRANSFERRED,
    ExpenseStatus.VERIFIED,
  ];
  
  // Map of status to display label based on user requirements
  const statusDisplayMap: Partial<Record<ExpenseStatus, string>> = {
    [ExpenseStatus.PREPARED]: 'Prepared',
    [ExpenseStatus.APPROVED]: 'Approved',
    [ExpenseStatus.BOOKED]: 'In Transit (Booked)',
    [ExpenseStatus.PAID]: 'Paid',
    [ExpenseStatus.PENDING]: 'Approval Required',
    [ExpenseStatus.REJECTED]: 'Revision Required',
    [ExpenseStatus.TRANSFERRED]: 'Transferred',
    [ExpenseStatus.VERIFIED]: 'In Transit (Verified)',
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
    
    // Currency filter items - expanded to include RON and other common currencies
    const currencyOptions = ['EUR', 'USD', 'GBP', 'RON', 'CHF', 'PLN', 'CZK', 'HUF', 'SEK', 'DKK', 'NOK'];
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
  }, [availableFilterStatuses, statusFilter, filterLabelMap, primaryCurrency]);

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
  };
};

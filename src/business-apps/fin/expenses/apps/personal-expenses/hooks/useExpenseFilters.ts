import { useState, useCallback, useMemo } from 'react';
import { DataFilterGroup } from '@/components/data-filter/DataFilter';
import { ExpenseFilter } from './useGetExpenseItems';
import { ExpenseStatus, getExpenseItemStatusDisplay } from '../utils';

// Define these as constants for stable references outside the hook
const TIME_PERIOD_OPTIONS = ['last30days', 'last90days', 'last180days'];
const EXPENSE_TYPE_OPTIONS = ['expense', 'trip'];
const OTHER_OPTIONS = ['noreceiptfilter'];

// Interface for the return type of useExpenseFilters
export interface UseExpenseFiltersReturn {
  search: string;
  setSearch: (search: string) => void;
  selectedFilters: string[];
  filterGroups: DataFilterGroup[];
  filterLabelMap: Record<string, string>;
  addFilter: (filterId: string) => void;
  removeFilter: (filterId: string) => void;
  clearFilters: () => void;
  getFilters: (filtersToApply?: string[]) => ExpenseFilter;
  setFilters: (filters: string[]) => void;
}

/**
 * Hook to manage filter selection for expense items
 */
export const useExpenseFilters = (): UseExpenseFiltersReturn => {
  // State for search and selected filters
  const [search, setSearch] = useState<string>('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  // Helper function to format status display names
  const formatStatusName = (status: string): string => {
    return status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ');
  };

  // Define filter groups - memoized so they don't cause re-renders
  const filterGroups = useMemo<DataFilterGroup[]>(() => [
    {
      id: 'timePeriod',
      title: 'Time Period',
      filters: [
        { id: 'last30days', label: 'Last 30 days', selected: selectedFilters.includes('last30days') },
        { id: 'last90days', label: 'Last 90 days', selected: selectedFilters.includes('last90days') },
        { id: 'last180days', label: 'Last 180 days', selected: selectedFilters.includes('last180days') }
      ]
    },
    {
      id: 'expenseType',
      title: 'Expense Type',
      filters: [
        { id: 'expense', label: 'Expense', selected: selectedFilters.includes('expense') },
        { id: 'trip', label: 'Trip', selected: selectedFilters.includes('trip') }
      ]
    },
    {
      id: 'status',
      title: 'Status',
      multiSelect: true,
      filters: Object.values(ExpenseStatus).map(status => {
        const id = status.toLowerCase();
        const displayLabel = getExpenseItemStatusDisplay(status).label;
        const beLabel = status.charAt(0) + status.slice(1).toLowerCase();
        const label = displayLabel !== beLabel ? `${displayLabel} (${beLabel})` : displayLabel;
        return {
          id,
          label,
          selected: selectedFilters.includes(id)
        };
      })
    },
    {
      id: 'other',
      title: 'Other',
      filters: [
        { id: 'noreceiptfilter', label: 'No receipt', selected: selectedFilters.includes('noreceiptfilter') },
      ]
    }
  ], [selectedFilters]);

  // Build the filter label map dynamically
  const filterLabelMap = useMemo(() => {
    const labelMap: Record<string, string> = {
      'last30days': 'Last 30 days',
      'last90days': 'Last 90 days',
      'last180days': 'Last 180 days',
      'expense': 'Expense',
      'trip': 'Trip',
      'noreceiptfilter': 'No receipt',
    };

    // Add all status options
    Object.values(ExpenseStatus).forEach(status => {
  const key = status.toLowerCase();
  const displayLabel = getExpenseItemStatusDisplay(status).label;
  const beLabel = status.charAt(0) + status.slice(1).toLowerCase();
  labelMap[key] = displayLabel !== beLabel ? `${displayLabel} (${beLabel})` : displayLabel;
});

    return labelMap;
  }, []);

  // Add filter with proper dependency handling
  const addFilter = useCallback((filterId: string) => {
    setSelectedFilters(prev => {
      // Special handling for radio filter types (time period)
      if (TIME_PERIOD_OPTIONS.includes(filterId)) {
        // Remove any existing time period filter
        const withoutTimePeriods = prev.filter(f => !TIME_PERIOD_OPTIONS.includes(f));
        return [...withoutTimePeriods, filterId];
      }
      // For multi-select filters, just add if not already selected
      if (prev.includes(filterId)) {
        return prev;
      } else {
        return [...prev, filterId];
      }
    });
  }, [TIME_PERIOD_OPTIONS]);

  // Remove filter with proper dependency handling
  const removeFilter = useCallback((filterId: string) => {
    setSelectedFilters(prev => prev.filter(f => f !== filterId));
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedFilters([]);
  }, []);

  // Atomic setter for filters
  const setFilters = useCallback((filters: string[]) => {
    setSelectedFilters(filters);
  }, []);

  // Convert UI filters to API filter format
  const getFilters = useCallback((filtersToApply: string[] = selectedFilters): ExpenseFilter => {
    console.log('Getting filters from selected filters:', filtersToApply);

    // Map UI filter format to the expected API filter format
    const filter: ExpenseFilter = {};

    // Extract filters by types
    const timePeriod = filtersToApply.find(f => TIME_PERIOD_OPTIONS.includes(f)) || null;

    // Get status filters and convert back to uppercase (as they're stored in ExpenseStatus enum)
    const statusFilters = filtersToApply.filter(f => 
      Object.values(ExpenseStatus).map(s => s.toLowerCase()).includes(f));

    // Map the lowercase status filters back to their uppercase enum values
    const statuses = statusFilters.map(f => f.toUpperCase());

    const expenseTypes = filtersToApply.filter(f => EXPENSE_TYPE_OPTIONS.includes(f));
    const otherFilters = filtersToApply.filter(f => OTHER_OPTIONS.includes(f));

    // Check if no receipt filter is selected
    const hasNoReceiptFilter = otherFilters.includes('noreceiptfilter');

    // Process status filters
    if (statuses.length > 0) {
      // Convert all selected statuses from lowercase UI values to uppercase API values
      filter.status = statuses.map(status => status.toUpperCase());
      console.log('Applying status filters:', filter.status);
    }

    // Process time period filters
    if (timePeriod) {
      const today = new Date();
      const endDate = new Date(today).toISOString().split('T')[0];

      // Calculate start date based on selected time period
      let startDate = new Date(today);
      if (timePeriod === 'last30days') {
        startDate.setDate(today.getDate() - 30);
      } else if (timePeriod === 'last90days') {
        startDate.setDate(today.getDate() - 90);
      } else if (timePeriod === 'last180days') {
        startDate.setDate(today.getDate() - 180);
      }

      filter.expenseDateStart = startDate.toISOString().split('T')[0];
      filter.expenseDateEnd = endDate;
    }

    // Process expense type filters
    if (expenseTypes.length > 0) {
      // For now, use only the first selected expense type since expenseClass doesn't support multiple values
      const selectedType = expenseTypes[0];

      // Map UI expense types to the expected API values with proper capitalization
      if (selectedType === 'expense') {
        filter.expenseClass = { value: 'Expense' };
      } else if (selectedType === 'trip') {
        filter.expenseClass = { value: 'Trip' };
      }
    }

    // Process the No receipt filter
    if (hasNoReceiptFilter) {
      filter.noReceipt = true;
    }

    console.log('getFilters returning:', filter);
    return filter;
  }, [selectedFilters, TIME_PERIOD_OPTIONS, EXPENSE_TYPE_OPTIONS, OTHER_OPTIONS]);
  
  return {
    search,
    setSearch,
    selectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    clearFilters,
    getFilters,
    setFilters,
  };
};

import React, { useState, useCallback, useMemo } from 'react';
import { DataFilterGroup } from '@/components/data-filter/DataFilter';
import { ExpenseFilter } from './useGetExpenseItems';
import { ExpenseStatus, getExpenseItemStatusDisplay } from '../utils';
import { ExpenseDateRangeFilter } from '../components/tabs/expense-items-tab/ExpenseDateRangeFilter';
import { ExpenseAmountRangeFilter } from '../components/tabs/expense-items-tab/ExpenseAmountRangeFilter';

// Define these as constants for stable references outside the hook
const EXPENSE_TYPE_OPTIONS = ['expense', 'trip'];
const OTHER_OPTIONS = ['noreceiptfilter'];

export enum DataFilterType {
  CHECKBOX_GROUP = 'checkbox-group',
  DATE_RANGE = 'date-range',
  NUMBER_RANGE = 'number-range',
}

// Interface for the return type of useExpenseItemsFilters
export interface UseExpenseItemsFiltersReturn {
  search: string;
  setSearch: (search: string) => void;
  selectedFilters: string[];
  filterGroups: DataFilterGroup[];
  filterLabelMap: Record<string, string>;
  addFilter: (filterId: string) => void;
  removeFilter: (filterId: string) => void;
  clearFilters: () => void;
  getFilters: (filtersToApply?: string[], startDateRange?: [Date | null, Date | null] | null, endDateRange?: [Date | null, Date | null] | null, expenseDateRange?: [Date | null, Date | null] | null) => ExpenseFilter;
  setFilters: (filters: string[]) => void;
  setExpenseDateRange: (expenseDateRange: [Date | null, Date | null] | null) => void;
  expenseDateRange: [Date | null, Date | null] | null;
  amountRange: { min?: number; max?: number } | null;
  setAmountRange: (range: { min?: number; max?: number } | null) => void;
  onStatusFilterChange: (status: string, selected: boolean) => void;
}

/**
 * Hook to manage filter selection for expense items with all available statuses
 */
export const useExpenseItemsFilters = (availableStatuses: string[] = []): UseExpenseItemsFiltersReturn => {
  // State for search and selected filters
  const [search, setSearch] = useState<string>('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [expenseDateRange, setExpenseDateRange] = useState<[Date | null, Date | null] | null>(null);
  const [amountRange, setAmountRange] = useState<{ min?: number; max?: number } | null>(null);

  // Helper function to format status display names based on srn_expenseItemList mapping
  const formatStatusName = (status: string): string => {
    // Map status to proper display name with backend status in parentheses
    const statusMapping: Record<string, string> = {
      'PREPARED': 'Prepared (Prepared)',
      'CREATED': 'Draft (Created)',
      'ASSIGNED': 'Assigned (Assigned)',
      'PENDING': 'In Approval (Pending)',
      'APPROVED': 'In Transit (Approved)',
      'VERIFIED': 'In Transit (Verified)',
      'BOOKED': 'In Transit (Booked)',
      'TRANSFERRED': 'In Transit (Transferred)',
      'PAID': 'Paid (Paid)',
      'REJECTED': 'Revision Required (Rejected)',
      'CLOSED': 'Closed (Closed)',
    };
    
    return statusMapping[status] || `${status.charAt(0) + status.slice(1).toLowerCase()} (${status})`;
  };

  // Helper function to format date range for display
  const formatDateRangeLabel = (dateRange: [Date | null, Date | null] | null): string => {
    if (!dateRange || (!dateRange[0] && !dateRange[1])) return '';
    
    const startDate = dateRange[0];
    const endDate = dateRange[1];
    
    if (startDate && endDate) {
      return `${startDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })} - ${endDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })}`;
    } else if (startDate) {
      return `From ${startDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })}`;
    } else if (endDate) {
      return `To ${endDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })}`;
    }
    
    return '';
  };

  // Get all available statuses or use default ones
  const allStatuses = useMemo(() => {
    if (availableStatuses.length > 0) {
      return availableStatuses;
    }
    // Default statuses if none provided
    return [
      'PREPARED',
      'CREATED',
      'ASSIGNED', 
      'PENDING',
      'APPROVED',
      'REJECTED',
      'VERIFIED',
      'BOOKED',
      'PAID',
      'CLOSED',
      'TRANSFERRED'
    ];
  }, [availableStatuses]);

  // Define filter groups - memoized so they don't cause re-renders
  const filterGroups = useMemo<DataFilterGroup[]>(() => [
    {
      id: 'expenseDateRange',
      title: 'Expense Date',
      type: DataFilterType.DATE_RANGE,
      customComponent: React.createElement(ExpenseDateRangeFilter, {
        expenseDateRange: expenseDateRange,
        onDateRangeChange: setExpenseDateRange,
        placeholder: ['Start date', 'End date']
      }),
      hideSearch: true,
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
      filters: allStatuses.map(status => ({
        id: status.toLowerCase(),
        label: formatStatusName(status),
        selected: selectedFilters.includes(status.toLowerCase())
      }))
    },
    {
      id: 'amountRange',
      title: 'Amount Range',
      type: DataFilterType.NUMBER_RANGE,
      customComponent: React.createElement(ExpenseAmountRangeFilter, {
        amountRange: amountRange,
        onAmountRangeChange: setAmountRange,
        label: 'Amount Range',
        dataTestIdPrefix: 'expense-amount-range'
      }),
      hideSearch: true,
    }
      ], [selectedFilters, expenseDateRange, allStatuses, amountRange]);

  // Create filter label map including date range and amount range
  const filterLabelMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    
    // Add standard filter labels
    filterGroups.forEach(group => {
      if (group.filters) {
        group.filters.forEach(filter => {
          map[filter.id] = filter.label;
        });
      }
    });
    
    // Add status labels with proper mapping for pills
    allStatuses.forEach(status => {
      const statusKey = status.toLowerCase();
      const displayName = formatStatusName(status);
      map[statusKey] = displayName;
    });
    
    // Add date range label if active
    const dateRangeLabel = formatDateRangeLabel(expenseDateRange);
    if (dateRangeLabel) {
      map['expenseDateRange'] = `Expense Date: ${dateRangeLabel}`;
    }
    
    // Add amount range label if active
    if (amountRange && (amountRange.min !== undefined || amountRange.max !== undefined)) {
      let amountLabel = 'Amount Range: ';
      if (amountRange.min !== undefined && amountRange.max !== undefined) {
        amountLabel += `${amountRange.min} - ${amountRange.max}`;
      } else if (amountRange.min !== undefined) {
        amountLabel += `≥${amountRange.min}`;
      } else if (amountRange.max !== undefined) {
        amountLabel += `≤${amountRange.max}`;
      }
      map['amountRange'] = amountLabel;
    }
    
    return map;
  }, [filterGroups, expenseDateRange, amountRange, allStatuses, formatStatusName]);

  // Get all selected filters including date range and amount range when active
  const getAllSelectedFilters = useMemo(() => {
    const filters = [...selectedFilters];
    
    // Add date range as a filter if it's active
    if (expenseDateRange && (expenseDateRange[0] || expenseDateRange[1])) {
      filters.push('expenseDateRange');
    }
    
    // Add amount range as a filter if it's active
    if (amountRange && (amountRange.min !== undefined || amountRange.max !== undefined)) {
      filters.push('amountRange');
    }
    
    return filters;
  }, [selectedFilters, expenseDateRange, amountRange]);

  // Clear all filters including date range and amount range
  const clearAllFilters = useCallback(() => {
    setSelectedFilters([]);
    setExpenseDateRange(null);
    setAmountRange(null);
  }, []);

  // Remove filter function that handles date range and amount range
  const removeFilter = useCallback((filterId: string) => {
    if (filterId === 'expenseDateRange') {
      setExpenseDateRange(null);
    } else if (filterId === 'amountRange') {
      setAmountRange(null);
    } else {
      setSelectedFilters(prev => prev.filter(id => id !== filterId));
    }
  }, []);

  // Add filter with proper dependency handling
  const addFilter = useCallback((filterId: string) => {
    setSelectedFilters(prev => {
      // For multi-select filters, just add if not already selected
      if (prev.includes(filterId)) {
        return prev;
      } else {
        return [...prev, filterId];
      }
    });
  }, []);

  // Atomic setter for filters
  const setFilters = useCallback((filters: string[]) => {
    setSelectedFilters(filters);
  }, []);

  // Status filter change handler for card interactions
  const onStatusFilterChange = useCallback((status: string, selected: boolean) => {
    if (selected) {
      addFilter(status.toLowerCase());
    } else {
      removeFilter(status.toLowerCase());
    }
  }, [addFilter, removeFilter]);

  // Convert UI filters to API filter format
  const getFilters = useCallback((
    filtersToApply: string[] = getAllSelectedFilters,
    startDateRange?: [Date | null, Date | null] | null,
    endDateRange?: [Date | null, Date | null] | null,
    expenseDateRangeParam?: [Date | null, Date | null] | null
  ): ExpenseFilter => {
    console.log('Getting filters from selected filters:', filtersToApply);

    // Map UI filter format to the expected API filter format
    const filter: ExpenseFilter = {};

    // Extract filters by types (exclude date range from processing as regular filter)

    // Get status filters and convert back to uppercase (as they're stored in ExpenseStatus enum)
    const statusFilters = filtersToApply.filter(f => f !== 'expenseDateRange' && 
      Object.values(ExpenseStatus).map(s => s.toLowerCase()).includes(f));

    // Map the lowercase status filters back to their uppercase enum values
    const statuses = statusFilters.map(f => f.toUpperCase());

    const expenseTypes = filtersToApply.filter(f => f !== 'expenseDateRange' && EXPENSE_TYPE_OPTIONS.includes(f));
    const otherFilters = filtersToApply.filter(f => f !== 'expenseDateRange' && OTHER_OPTIONS.includes(f));

    // Check if no receipt filter is selected
    const hasNoReceiptFilter = otherFilters.includes('noreceiptfilter');

    // Process status filters
    if (statuses.length > 0) {
      // Convert all selected statuses from lowercase UI values to uppercase API values
      filter.status = statuses.map(status => status.toUpperCase());
      console.log('Applying status filters:', filter.status);
    }

    // Process expense date range filters (priority over time period filters)
    const dateRangeToUse = expenseDateRangeParam || expenseDateRange;
    if (dateRangeToUse && dateRangeToUse[0] && dateRangeToUse[1]) {
      filter.expenseDateStart = dateRangeToUse[0].toISOString().split('T')[0];
      filter.expenseDateEnd = dateRangeToUse[1].toISOString().split('T')[0];
      console.log('Applying expense date range filters:', filter.expenseDateStart, 'to', filter.expenseDateEnd);
    }
    // Process date range filters (priority over time period filters)
    else if (startDateRange && startDateRange[0] && endDateRange && endDateRange[1]) {
      filter.expenseDateStart = startDateRange[0].toISOString().split('T')[0];
      filter.expenseDateEnd = endDateRange[1].toISOString().split('T')[0];
      console.log('Applying date range filters:', filter.expenseDateStart, 'to', filter.expenseDateEnd);
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

    // Process amount range filters
    if (amountRange) {
      if (amountRange.min !== undefined) {
        filter.totalAmountMin = amountRange.min;
      }
      if (amountRange.max !== undefined) {
        filter.totalAmountMax = amountRange.max;
      }
    }

    console.log('getFilters returning:', filter);
    return filter;
  }, [selectedFilters, EXPENSE_TYPE_OPTIONS, OTHER_OPTIONS, expenseDateRange, amountRange, getAllSelectedFilters]);
  
  return {
    search,
    setSearch,
    selectedFilters: getAllSelectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter: removeFilter,
    clearFilters: clearAllFilters,
    getFilters,
    setFilters,
    expenseDateRange,
    setExpenseDateRange,
    amountRange,
    setAmountRange,
    onStatusFilterChange
  };
}; 
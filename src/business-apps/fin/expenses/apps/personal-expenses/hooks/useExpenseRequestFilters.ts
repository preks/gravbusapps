import { useState, useCallback, useMemo } from 'react';
import { ExpenseStatus } from '../utils';
import { DataFilterGroup } from '@/components/data-filter/DataFilter';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

// Define expense request status types
export enum ExpenseRequestStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED'
}

// Interface for request filter
export interface ExpenseRequestFilter {
  status?: string[];
  requestDateStart?: string;
  requestDateEnd?: string;
  requestType?: { value: string };
}

// Interface for the return type of useExpenseRequestFilters
export interface UseExpenseRequestFiltersReturn {
  search: string;
  setSearch: (search: string) => void;
  selectedFilters: string[];
  filterGroups: DataFilterGroup[];
  filterLabelMap: Record<string, string>;
  addFilter: (filterId: string) => void;
  removeFilter: (filterId: string) => void;
  getFilters: () => ExpenseRequestFilter;
}

/**
 * Hook to manage filter selection for expense requests
 */
export const useExpenseRequestFilters = (): UseExpenseRequestFiltersReturn => {
  // State for search and selected filters
  const [search, setSearch] = useState<string>('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  // Define these as constants for stable references
  const TIME_PERIOD_OPTIONS = ['last30days', 'last90days', 'last180days'];
  const REQUEST_TYPE_OPTIONS = ['general', 'trip'];
  
  // Helper function to format status display names
  const formatStatusName = (status: string): string => {
    return status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ');
  };

  // Define filter groups - memoized so they don't cause re-renders
  const filterGroups = useMemo<DataFilterGroup[]>(() => [
    {
      id: 'timePeriod',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.employee_report_filter.period_title', 'Time Period'),
      filters: [
        { id: 'last30days', label: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.last_30_days', 'Last 30 days'), selected: selectedFilters.includes('last30days') },
        { id: 'last90days', label: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.last_90_days', 'Last 90 days'), selected: selectedFilters.includes('last90days') },
        { id: 'last180days', label: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.last_180_days', 'Last 180 days'), selected: selectedFilters.includes('last180days') }
      ]
    },
    {
      id: 'requestType',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.affected_expense_modal.request_type', 'Request Type'),
      filters: [
        { id: 'general', label: 'General Expense', selected: selectedFilters.includes('general') },
        { id: 'trip', label: getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_plan.tab_container.trip_header', 'Trip'), selected: selectedFilters.includes('trip') }
      ]
    },
    {
      id: 'status',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:manager_expense_request_list.expense_table.status', 'Status'),
      filters: Object.values(ExpenseRequestStatus).map(status => {
        const id = status.toLowerCase();
        return { 
          id, 
          label: status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' '),
          selected: selectedFilters.includes(id) 
        };
      })
    }
  ], [selectedFilters]);
  
  // Build the filter label map dynamically
  const filterLabelMap = useMemo(() => {
    const labelMap: Record<string, string> = {
      'last30days': 'Last 30 days',
      'last90days': 'Last 90 days',
      'last180days': 'Last 180 days',
      'general': 'General Expense',
      'trip': 'Trip',
    };
    
    // Add all status options
    Object.values(ExpenseRequestStatus).forEach(status => {
      const key = status.toLowerCase();
      labelMap[key] = formatStatusName(status);
    });
    
    return labelMap;
  }, []);
  
  // Add filter with proper dependency handling - returns the new filters array for immediate use
  const addFilter = useCallback((filterId: string): string[] => {
    let newFilters: string[] = [];
    
    setSelectedFilters(prev => {
      // Special handling for radio filter types (time period)
      if (TIME_PERIOD_OPTIONS.includes(filterId)) {
        // Remove any existing time period filter
        const withoutTimePeriods = prev.filter(f => !TIME_PERIOD_OPTIONS.includes(f));
        newFilters = [...withoutTimePeriods, filterId];
        return newFilters;
      }
      // For multi-select filters, just add if not already selected
      if (prev.includes(filterId)) {
        newFilters = [...prev];
        return prev;
      } else {
        newFilters = [...prev, filterId];
        return newFilters;
      }
    });
    
    return newFilters;
  }, [TIME_PERIOD_OPTIONS]);
  
  // Remove filter with proper dependency handling - returns the new filters array for immediate use
  const removeFilter = useCallback((filterId: string): string[] => {
    let newFilters: string[] = [];
    
    setSelectedFilters(prev => {
      newFilters = prev.filter(f => f !== filterId);
      return newFilters;
    });
    
    return newFilters;
  }, []);
  
  // Convert UI filters to API filter format
  const getFilters = useCallback((): ExpenseRequestFilter => {
    // Map UI filter format to the expected API filter format
    const filter: ExpenseRequestFilter = {};
    
    // Extract filters by types
    const timePeriod = selectedFilters.find(f => TIME_PERIOD_OPTIONS.includes(f)) || null;
    
    // Get status filters from the selected filters
    const statusFilters = selectedFilters.filter(f => 
      Object.values(ExpenseRequestStatus).map(s => s.toLowerCase()).includes(f));
    
    // Map UI status values to backend ExpenseStatus enum values
    const statuses = statusFilters.map(f => {
      // Map from UI lowercase status to backend ExpenseStatus enum
      switch (f) {
        case 'draft': return ExpenseStatus.CREATED;
        case 'submitted': return ExpenseStatus.PENDING;
        case 'approved': return ExpenseStatus.APPROVED;
        case 'rejected': return ExpenseStatus.REJECTED;
        case 'paid': return ExpenseStatus.PAID;
        case 'cancelled': return ExpenseStatus.CLOSED;
        default: return f.toUpperCase(); // Fallback
      }
    });
    
    const requestTypes = selectedFilters.filter(f => REQUEST_TYPE_OPTIONS.includes(f));
    
    // Process status filters
    if (statuses.length > 0) {
      console.log('Applying status filters:', statuses);
      filter.status = statuses;
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
      
      filter.requestDateStart = startDate.toISOString().split('T')[0];
      filter.requestDateEnd = endDate;
    }
    
    // Process request type filters
    if (requestTypes.length > 0) {
      // For now, use only the first selected type
      const selectedType = requestTypes[0];
      
      console.log('Applying request type filter:', selectedType);
      
      // Map UI request types to the expected API values
      if (selectedType === 'general') {
        filter.requestType = { value: 'General Expense' };
        console.log('Mapped to API value:', filter.requestType);
      } else if (selectedType === 'trip') {
        filter.requestType = { value: 'Trip' };
        console.log('Mapped to API value:', filter.requestType);
      }
    }
    
    return filter;
  }, [selectedFilters, TIME_PERIOD_OPTIONS, REQUEST_TYPE_OPTIONS]);
  
  return {
    search,
    setSearch,
    selectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    getFilters
  };
};

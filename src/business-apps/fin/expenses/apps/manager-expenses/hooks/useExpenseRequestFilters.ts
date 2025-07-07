import { useState, useCallback, useMemo } from 'react';
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
        { id: 'trip', label: 'Trip', selected: selectedFilters.includes('trip') }
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
      'last30days': getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.last_30_days', 'Last 30 days'),
      'last90days': getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.last_90_days', 'Last 90 days'),
      'last180days': getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.last_180_days', 'Last 180 days'),
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
  
  // Add a filter to the selected filters
  const addFilter = useCallback((filterId: string) => {
    // For time period filters, ensure only one is selected at a time
    if (TIME_PERIOD_OPTIONS.includes(filterId)) {
      setSelectedFilters(prev => {
        const newFilters = prev.filter(f => !TIME_PERIOD_OPTIONS.includes(f));
        return [...newFilters, filterId];
      });
    } else {
      setSelectedFilters(prev => [...prev, filterId]);
    }
  }, []);
  
  // Remove a filter from the selected filters
  const removeFilter = useCallback((filterId: string) => {
    setSelectedFilters(prev => prev.filter(id => id !== filterId));
  }, []);
  
  // Convert selected filters to the API filter format
  const getFilters = useCallback((): ExpenseRequestFilter => {
    const filters: ExpenseRequestFilter = {};
    
    // Handle status filters
    const statusFilters = selectedFilters
      .filter(filter => Object.values(ExpenseRequestStatus).map(s => s.toLowerCase()).includes(filter));
    if (statusFilters.length > 0) {
      filters.status = statusFilters;
    }
    
    // Handle time period filters
    const timePeriodFilter = selectedFilters.find(filter => TIME_PERIOD_OPTIONS.includes(filter));
    if (timePeriodFilter) {
      const now = new Date();
      const startDate = new Date(now);
      
      if (timePeriodFilter === 'last30days') {
        startDate.setDate(now.getDate() - 30);
      } else if (timePeriodFilter === 'last90days') {
        startDate.setDate(now.getDate() - 90);
      } else if (timePeriodFilter === 'last180days') {
        startDate.setDate(now.getDate() - 180);
      }
      
      filters.requestDateStart = startDate.toISOString().split('T')[0];
    }
    
    // Handle request type filters
    const requestTypeFilter = selectedFilters.find(filter => REQUEST_TYPE_OPTIONS.includes(filter));
    if (requestTypeFilter) {
      filters.requestType = { value: requestTypeFilter };
    }
    
    return filters;
  }, [selectedFilters]);
  
  return {
    search,
    setSearch,
    selectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    getFilters,
  };
};

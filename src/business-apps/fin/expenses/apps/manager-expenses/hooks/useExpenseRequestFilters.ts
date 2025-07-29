import { useState, useCallback, useMemo } from 'react';
import { DataFilterGroup } from '@/components/data-filter/DataFilter';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

// Define expense request status types - updated to match the correct options
export enum ExpenseRequestStatus {
  DRAFT = 'DRAFT',
  IN_APPROVAL = 'IN_APPROVAL',
  VERIFICATION_REQUIRED = 'VERIFICATION_REQUIRED',
  REVISION_REQUIRED = 'REVISION_REQUIRED',
  BOOKING_REQUIRED = 'BOOKING_REQUIRED',
  TRANSFER_REQUIRED = 'TRANSFER_REQUIRED',
  PAYMENT_REQUIRED = 'PAYMENT_REQUIRED',
  PAID = 'PAID',
  CLOSED = 'CLOSED'
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
  
  const statusLabelMap: Record<string, string> = {
    [ExpenseRequestStatus.DRAFT]: 'Draft',
    [ExpenseRequestStatus.IN_APPROVAL]: 'Approval Required',
    [ExpenseRequestStatus.VERIFICATION_REQUIRED]: 'Verification Required',
    [ExpenseRequestStatus.REVISION_REQUIRED]: 'Revision Required',
    [ExpenseRequestStatus.BOOKING_REQUIRED]: 'Booking Required',
    [ExpenseRequestStatus.TRANSFER_REQUIRED]: 'Transfer Required',
    [ExpenseRequestStatus.PAYMENT_REQUIRED]: 'Payment Required',
    [ExpenseRequestStatus.PAID]: 'Paid',
    [ExpenseRequestStatus.CLOSED]: 'Closed'
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
      ],
      selectionMode: 'single'
    },
    {
      id: 'requestType',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.affected_expense_modal.request_type', 'Request Type'),
      filters: [
        { id: 'general', label: 'General Expense', selected: selectedFilters.includes('general') },
        { id: 'trip', label: 'Trip', selected: selectedFilters.includes('trip') }
      ],
      selectionMode: 'single'
    },
    {
      id: 'status',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:manager_expense_request_list.expense_table.status', 'Status'),
      filters: Object.values(ExpenseRequestStatus).map(status => {
        const id = status.toLowerCase();
        return { 
          id, 
          label: statusLabelMap[status],
          selected: selectedFilters.includes(id) 
        };
      }),
      selectionMode: 'multiple'
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
    Object.entries(statusLabelMap).forEach(([key, value]) => {
      labelMap[key.toLowerCase()] = value;
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
    
    // Handle status filters, mapping UI status values to backend database values
    let statusFilters = selectedFilters
      .filter(filter => {
        const validStatuses = Object.values(ExpenseRequestStatus).map(s => s.toLowerCase());
        const isValid = validStatuses.includes(filter);
        console.log(`Filter validation - ${filter}: ${isValid} (valid statuses: ${validStatuses.join(', ')})`);
        return isValid;
      });

    // Map UI status values to database status values
    console.log('Filter mapping - selected filters:', selectedFilters);
    console.log('Filter mapping - status filters before mapping:', statusFilters);
    
    statusFilters = statusFilters.map(status => {
      let mappedStatus;
      switch (status) {
        case 'draft':
          mappedStatus = 'CREATED';
          break;
        case 'in_approval':
          mappedStatus = 'PENDING';
          break;
        case 'verification_required':
          mappedStatus = 'APPROVED';
          break;
        case 'revision_required':
          mappedStatus = 'REJECTED'; // Changed from RETURNED to REJECTED
          break;
        case 'booking_required':
          mappedStatus = 'VERIFIED';
          break;
        case 'transfer_required':
          mappedStatus = 'BOOKED';
          break;
        case 'payment_required':
          mappedStatus = 'TRANSFERRED';
          break;
        case 'paid':
          mappedStatus = 'PAID';
          break;
        case 'closed':
          mappedStatus = 'CLOSED';
          break;
        default:
          mappedStatus = status.toUpperCase();
      }
      console.log(`Filter mapping - ${status} → ${mappedStatus}`);
      return mappedStatus;
    });
    
    console.log('Filter mapping - status filters after mapping:', statusFilters);

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

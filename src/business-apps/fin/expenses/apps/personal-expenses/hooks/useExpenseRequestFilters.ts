import React, { useState, useCallback, useMemo } from 'react';
import { ExpenseStatus, getExpenseRequestStatusDisplay } from '../utils';
import { DataFilterGroup } from '@/components/data-filter/DataFilter';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { StartDateRangeFilter } from '../components/tabs/expense-requests-tab/StartDateRangeFilter';
import { EndDateRangeFilter } from '../components/tabs/expense-requests-tab/EndDateRangeFilter';
import RequestDateRangeFilter from '../components/tabs/expense-requests-tab/RequestDateRangeFilter';
import dayjs from 'dayjs';

// Define expense request status types based on srn_expenseRequest mappings
export enum ExpenseRequestStatus {
  PREPARED = 'PREPARED',
  CREATED = 'CREATED',
  ASSIGNED = 'ASSIGNED',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  VERIFIED = 'VERIFIED',
  BOOKED = 'BOOKED',
  PAID = 'PAID',
  CLOSED = 'CLOSED',
  TRANSFERRED = 'TRANSFERRED'
}

// Interface for request filter
export interface ExpenseRequestFilter {
  status?: string[];
  requestDateStart?: string;
  requestDateEnd?: string;
  startDateStart?: string;
  startDateEnd?: string;
  endDateStart?: string;
  endDateEnd?: string;
  requestType?: { value: string };
}

// Interface for GraphQL where clause structure
export interface ExpenseRequestWhereClause {
  _and?: Array<{
    _or?: Array<{
      code?: { _ilike: string };
      title?: { _ilike: string };
    }>;
    status?: { 
      _in?: string[];
      _neq?: string;
    };
    startDate?: {
      _gte?: string;
      _lte?: string;
    };
    endDate?: {
      _gte?: string;
      _lte?: string;
    };
         requestDate?: {
       _gte?: string;
       _lte?: string;
     };
     requestTypeRef?: {
       _eq?: string;
     };
  }>;
}

// Interface for the return type of useExpenseRequestFilters
export interface UseExpenseRequestFiltersReturn {
  search: string;
  setSearch: (search: string) => void;
  selectedFilters: string[];
  setFilters: (filters: string[]) => void;
  filterGroups: DataFilterGroup[];
  handleFilterChange: (filterId: string, selected: boolean) => void;
  clearFilters: () => void;
  getFilters: () => ExpenseRequestWhereClause;
  setStartDateRange: (dateRange: [Date | null, Date | null] | null) => void;
  setEndDateRange: (dateRange: [Date | null, Date | null] | null) => void;
  setRequestDateRange: (dateRange: [Date | null, Date | null] | null) => void;
  filterLabelMap: Record<string, string>;
}

/**
 * Hook to manage filter selection for expense requests
 */
export const useExpenseRequestFilters = (): UseExpenseRequestFiltersReturn => {
  // State for search and selected filters
  const [search, setSearch] = useState<string>('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [startDateRange, setStartDateRange] = useState<[Date | null, Date | null] | null>(null);
  const [endDateRange, setEndDateRange] = useState<[Date | null, Date | null] | null>(null);
  const [requestDateRange, setRequestDateRange] = useState<[Date | null, Date | null] | null>(null);

  // Define these as constants for stable references
  // const TIME_PERIOD_OPTIONS = ['last30days', 'last90days', 'last180days'];
  const REQUEST_TYPE_OPTIONS = ['general', 'trip'];
  
  // Helper function to get status display name with backend status in parentheses only when different
  const getStatusDisplayName = (status: string): string => {
    const statusConfig = getExpenseRequestStatusDisplay(status);
    // Only show backend status in parentheses if the label is different from the status
    if (statusConfig.label.toLowerCase() === status.toLowerCase()) {
      return statusConfig.label;
    } else {
      // Format backend status with only first letter uppercase and translate it
      const formattedStatus = status.charAt(0) + status.slice(1).toLowerCase();
      const translatedStatus = getTranslationFromI18nKeyAndLabel(`lowcoder:expense_statuses.${status.toLowerCase()}`, formattedStatus);
      return `${statusConfig.label} (${translatedStatus})`;
    }
  };

  // Define filter groups - memoized so they don't cause re-renders
  const filterGroups = useMemo<DataFilterGroup[]>(() => [
    {
      id: 'requestDateRange',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:confirm_transfer_advance_payment.request_date_label','Request Date'),
      type: 'date-range' as any,
      customComponent: React.createElement(RequestDateRangeFilter, {
        requestDateRange: requestDateRange,
        onDateRangeChange: setRequestDateRange,
        placeholder: ['Start date', 'End date']
      }),
      hideSearch: true,
    },
    {
      id: 'startDateRange',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date','Start Date'),
      type: 'date-range' as any,
      customComponent: React.createElement(StartDateRangeFilter, {
        startDateRange: startDateRange,
        onDateRangeChange: setStartDateRange,
        placeholder: ['Start date', 'End date']
      }),
      hideSearch: true,
    },
    {
      id: 'endDateRange',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date','End Date'),
      type: 'date-range' as any,
      customComponent: React.createElement(EndDateRangeFilter, {
        endDateRange: endDateRange,
        onDateRangeChange: setEndDateRange,
        placeholder: ['Start date', 'End date']
      }),
      hideSearch: true,
    },
    // {
    //   id: 'timePeriod',
    //   title: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.employee_report_filter.period_title', 'Time Period'),
    //   filters: [
    //     { id: 'last30days', label: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.last_30_days', 'Last 30 days'), selected: selectedFilters.includes('last30days') },
    //     { id: 'last90days', label: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.last_90_days', 'Last 90 days'), selected: selectedFilters.includes('last90days') },
    //     { id: 'last180days', label: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.last_180_days', 'Last 180 days'), selected: selectedFilters.includes('last180days') }
    //   ]
    // },
         {
       id: 'requestType',
       title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.affected_expense_modal.request_type', 'Request Type'),
       type: 'radio' as any,
       filters: [
         { id: 'ExpenseRequestType:v1:EXPENSES', label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.general_expense', 'General Expense'), selected: selectedFilters.includes('ExpenseRequestType:v1:EXPENSES') },
         { id: 'ExpenseRequestType:v1:TRIP', label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.trip', 'Trip'), selected: selectedFilters.includes('ExpenseRequestType:v1:TRIP') }
       ]
     },
    {
      id: 'status',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:manager_expense_request_list.expense_table.status', 'Status'),
      filters: Object.values(ExpenseRequestStatus).map(status => {
        const id = status;
        return { 
          id, 
          label: getStatusDisplayName(status),
          selected: selectedFilters.includes(id) 
        };
      })
    }
  ], [selectedFilters, startDateRange, endDateRange, requestDateRange]);
  
  // Helper function to format date range for display
  const formatDateRangeLabel = useCallback((dateRange: [Date | null, Date | null] | null): string => {
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
  }, []);

  // Build the filter label map dynamically
  const filterLabelMap = useMemo(() => {
         const labelMap: Record<string, string> = {
       // 'last30days': 'Last 30 days',
       // 'last90days': 'Last 90 days',
       // 'last180days': 'Last 180 days',
       'ExpenseRequestType:v1:EXPENSES': getTranslationFromI18nKeyAndLabel('lowcoder:expense_request.general_expense', 'General Expense'),
       'ExpenseRequestType:v1:TRIP': getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_plan.tab_container.trip_header', 'Trip'),
     };
    
    // Add all status options using the same display names as the filter dropdown
    Object.values(ExpenseRequestStatus).forEach(status => {
      labelMap[status] = getStatusDisplayName(status);
    });
    
    // Add date range labels if active
    const requestDateLabel = formatDateRangeLabel(requestDateRange);
    if (requestDateLabel) {
      labelMap['requestDateRange'] = `Request Date: ${requestDateLabel}`;
    }
    
    const startDateLabel = formatDateRangeLabel(startDateRange);
    if (startDateLabel) {
      labelMap['startDateRange'] = `Start Date: ${startDateLabel}`;
    }
    
    const endDateLabel = formatDateRangeLabel(endDateRange);
    if (endDateLabel) {
      labelMap['endDateRange'] = `End Date: ${endDateLabel}`;
    }
    
    return labelMap;
  }, [getStatusDisplayName, formatDateRangeLabel, requestDateRange, startDateRange, endDateRange]);
  
  // Add filter with proper dependency handling - returns the new filters array for immediate use
  const addFilter = useCallback((filterId: string): string[] => {
    let newFilters: string[] = [];
    
    setSelectedFilters(prev => {
      // Special handling for radio filter types (time period)
      // if (TIME_PERIOD_OPTIONS.includes(filterId)) {
      //   // Remove any existing time period filter
      //   const withoutTimePeriods = prev.filter(f => !TIME_PERIOD_OPTIONS.includes(f));
      //   newFilters = [...withoutTimePeriods, filterId];
      //   return newFilters;
      // }
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
  }, []);
  
  // Remove filter with proper dependency handling - returns the new filters array for immediate use
  const removeFilter = useCallback((filterId: string): string[] => {
    let newFilters: string[] = [];
    
    if (filterId === 'requestDateRange') {
      setRequestDateRange(null);
      setSelectedFilters(prev => {
        newFilters = prev.filter(f => f !== filterId);
        return newFilters;
      });
    } else if (filterId === 'startDateRange') {
      setStartDateRange(null);
      setSelectedFilters(prev => {
        newFilters = prev.filter(f => f !== filterId);
        return newFilters;
      });
    } else if (filterId === 'endDateRange') {
      setEndDateRange(null);
      setSelectedFilters(prev => {
        newFilters = prev.filter(f => f !== filterId);
        return newFilters;
      });
    } else {
      setSelectedFilters(prev => {
        newFilters = prev.filter(f => f !== filterId);
        return newFilters;
      });
    }
    
    return newFilters;
  }, []);
  
  // Convert UI filters to API filter format
  const getFilters = useCallback((): ExpenseRequestWhereClause => {
    const conditions: any[] = [];

    // Helper function to format date for start of range (beginning of day)
    const formatStartDate = (date: Date): string => {
      return dayjs(date).startOf('day').format('YYYY-MM-DD HH:mm:ss');
    };

    // Helper function to format date for end of range (end of day)
    const formatEndDate = (date: Date): string => {
      return dayjs(date).endOf('day').format('YYYY-MM-DD HH:mm:ss');
    };

    if (search && typeof search === 'string' && search.trim()) {
      conditions.push({ _or: [
        { code: { _ilike: `%${search.trim()}%` } },
        { title: { _ilike: `%${search.trim()}%` } }
      ] });
    }
    // Separate status filters from request type filters
    const statusFilters = selectedFilters.filter(filter => 
      Object.values(ExpenseRequestStatus).includes(filter as ExpenseRequestStatus)
    );
    const requestTypeFilters = selectedFilters.filter(filter => 
      filter.startsWith('ExpenseRequestType:')
    );

    if (statusFilters.length > 0) {
      conditions.push({ status: { _in: statusFilters } });
    }
    
             if (requestTypeFilters.length > 0) {
      // For request type, we need to use the correct GraphQL structure
      // The requestType field is a catalog entry, so we filter by the catalog entry ID
      // Use requestTypeRef which is the correct field name in the GraphQL schema
      conditions.push({ requestTypeRef: { _eq: requestTypeFilters[0] } });
    }
    if (startDateRange?.[0]) {
      conditions.push({ startDate: { _gte: formatStartDate(startDateRange[0]) } });
    }
    if (startDateRange?.[1]) {
      conditions.push({ startDate: { _lte: formatEndDate(startDateRange[1]) } });
    }
    if (endDateRange?.[0]) {
      conditions.push({ endDate: { _gte: formatStartDate(endDateRange[0]) } });
    }
    if (endDateRange?.[1]) {
      conditions.push({ endDate: { _lte: formatEndDate(endDateRange[1]) } });
    }
    if (requestDateRange?.[0]) {
      conditions.push({ requestDate: { _gte: formatStartDate(requestDateRange[0]) } });
    }
    if (requestDateRange?.[1]) {
      conditions.push({ requestDate: { _lte: formatEndDate(requestDateRange[1]) } });
    }

    // Always exclude DISCARDED requests at backend level for correct pagination
    conditions.push({ status: { _neq: ExpenseStatus.DISCARDED } });
    
    const result = { _and: conditions.length > 0 ? conditions : [{}] };
    return result;

  }, [search, selectedFilters, startDateRange, endDateRange, requestDateRange]);

  const clearFilters = useCallback(() => {
    setSelectedFilters([]);
    setStartDateRange(null);
    setEndDateRange(null);
    setRequestDateRange(null);
    setSearch('');
  }, []);

  const handleFilterChange = useCallback((filterId: string, selected: boolean) => {
    setSelectedFilters(prev => {
      // Handle radio button behavior for request type filters
      if (filterId.startsWith('ExpenseRequestType:')) {
        if (selected) {
          // Remove any existing request type filters and add the new one
          const withoutRequestTypes = prev.filter(id => !id.startsWith('ExpenseRequestType:'));
          return [...withoutRequestTypes, filterId];
        } else {
          // Remove the specific request type filter
          return prev.filter(id => id !== filterId);
        }
      } else {
        // Handle regular multi-select filters
        return selected ? [...prev, filterId] : prev.filter(id => id !== filterId);
      }
    });
  }, []);
  
  return {
    search,
    setSearch,
    selectedFilters,
    setFilters: setSelectedFilters,
    filterGroups,
    handleFilterChange,
    clearFilters,
    getFilters,
    setStartDateRange,
    setEndDateRange,
    setRequestDateRange,
    filterLabelMap
  };
};

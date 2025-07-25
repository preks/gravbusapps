import { useState, useCallback, useMemo } from 'react';
import { DataFilterGroup } from '@/components/data-filter/DataFilter';
import { useCurrencyStore } from '../store/useCurrencyStore';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useExpenseRequestCurrencies } from './useExpenseRequestCurrencies';

// Import the ExpenseStatus enum to ensure consistency with backend values
import { ExpenseStatus } from '../utils';

// Map the backend ExpenseStatus enum values to UI-friendly status values
export const ExpenseRequestStatusMap = {
  [ExpenseStatus.CREATED]: 'draft',
  [ExpenseStatus.PENDING]: 'in_approval',
  [ExpenseStatus.APPROVED]: 'verification_required',
  [ExpenseStatus.REJECTED]: 'revision_required',
  [ExpenseStatus.VERIFIED]: 'booking_required',
  [ExpenseStatus.BOOKED]: 'transfer_required',
  [ExpenseStatus.TRANSFERRED]: 'payment_required',
  [ExpenseStatus.PAID]: 'paid',
  [ExpenseStatus.CLOSED]: 'closed',
  [ExpenseStatus.PREPARED]: 'prepared',
  [ExpenseStatus.RETURNED]: 'returned',
  [ExpenseStatus.DISCARDED]: 'discarded',
};

// Interface for request filter
export interface ExpenseRequestFilter {
  status?: string[];
  requestDateStart?: string;
  requestDateEnd?: string;
  requestType?: { value: string };
}

// Interface for the return type of useExpenseRequestFilters
export interface UseExpenseRequestFiltersProps {
  accessToken?: string;
  managerId?: string;
}

export interface UseExpenseRequestFiltersReturn {
  search: string;
  setSearch: (search: string) => void;
  selectedFilters: string[];
  filterGroups: DataFilterGroup[];
  filterLabelMap: Record<string, string>;
  addFilter: (filterId: string) => void;
  removeFilter: (filterId: string) => void;
  getFilters: () => ExpenseRequestFilter;
  // Currency filter related properties
  currencyFilter: string;
  setCurrencyFilter: (currency: string) => void;
  // DataFilter component integration
  handleDataFilterChange: (filterId: string, isSelected: boolean) => void;
  // Loading state for currency data
  currenciesLoading: boolean;
}

/**
 * Hook to manage filter selection for expense requests
 */
export const useExpenseRequestFilters = ({
  accessToken,
  managerId
}: UseExpenseRequestFiltersProps = {}): UseExpenseRequestFiltersReturn => {
  // State for search and selected filters
  const [search, setSearch] = useState<string>('');
  // Default to 'in_approval' (maps to PENDING) as per requirements
  const [selectedFilters, setSelectedFilters] = useState<string[]>([ExpenseRequestStatusMap[ExpenseStatus.PENDING]]);
  
  // Use the global currency store
  const { primaryCurrency, setPrimaryCurrency } = useCurrencyStore();
  
  // Fetch dynamic currency data if accessToken and managerId are provided
  const { 
    availableCurrencies: dynamicCurrencies, 
    isLoading: currenciesLoading 
  } = useExpenseRequestCurrencies({
    accessToken: accessToken || '',
    managerId: managerId || ''
  });

  // Define these as constants for stable references
  const TIME_PERIOD_OPTIONS = ['last30days', 'last90days', 'last180days'];
  const REQUEST_TYPE_OPTIONS = ['general', 'trip'];
  
  // Map the filter IDs to user-friendly display labels
  const statusLabelMap: Record<string, string> = {
    'draft': 'Draft (Created)',
    'in_approval': 'In Approval (Pending)',
    'verification_required': 'Verification Required',
    'revision_required': 'Revision Required (Rejected)',
    'booking_required': 'Booking Required',
    'transfer_required': 'Transfer Required',
    'payment_required': 'Payment Required',
    'paid': 'Paid',
    'closed': 'Closed',
    'prepared': 'Prepared',
    'returned': 'In Revision (Returned)',
    'discarded': 'Discarded',
    'transferred': 'In Transit (Transferred)'
  };

  // Define filter groups - memoized so they don't cause re-renders
  const filterGroups = useMemo<DataFilterGroup[]>(() => {
    // Always use dynamic currencies first, even if loading
    // This ensures the filter shows the correct currencies from the beginning
    const availableCurrencies = dynamicCurrencies.length > 0
      ? dynamicCurrencies
      : ['EUR', 'USD']; // Minimal fallback list
    // Create the status filter group using the ExpenseStatus enum values
    const statusGroup: DataFilterGroup = {
      id: 'status',
      title: getTranslationFromI18nKeyAndLabel('expense_request_status_filter_title', 'Status'),
      filters: Object.entries(ExpenseRequestStatusMap).map(([_, uiStatus]) => {
        return {
          id: uiStatus,
          label: statusLabelMap[uiStatus] || uiStatus,
          selected: selectedFilters.includes(uiStatus),
          group: 'statusGroup'
        };
      })
    };

    // Create the time period filter group
    const timePeriodGroup: DataFilterGroup = {
      id: 'timePeriod',
      title: getTranslationFromI18nKeyAndLabel('expense_request_time_period_filter_title', 'Time Period'),
      filters: TIME_PERIOD_OPTIONS.map(period => ({
        id: period,
        label: getTranslationFromI18nKeyAndLabel(`lowcoder:team_expenses_page.dashboard_tab.last_${period}`, `Last ${period}`),
        selected: selectedFilters.includes(period)
      }))
    };

    // Create the request type filter group
    const requestTypeGroup: DataFilterGroup = {
      id: 'requestType',
      title: getTranslationFromI18nKeyAndLabel('expense_request_type_filter_title', 'Request Type'),
      filters: REQUEST_TYPE_OPTIONS.map(type => ({
        id: type,
        label: type === 'general' ? 'General Expense' : 'Trip',
        selected: selectedFilters.includes(type)
      }))
    };
    
    // Create the currency filter group
    const currencyGroup: DataFilterGroup = {
      id: 'currency',
      title: getTranslationFromI18nKeyAndLabel('expense_request_currency_filter_title', 'Currency'),
      filters: availableCurrencies.map(currency => ({
        id: currency,
        label: currency,
        selected: currency === primaryCurrency
      }))
    };

    return [statusGroup, timePeriodGroup, requestTypeGroup, currencyGroup];
  }, [selectedFilters, primaryCurrency]);

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
    // Check if this is a currency filter - expanded to include RON and other common currencies
    const currencyOptions = ['EUR', 'USD', 'GBP', 'RON', 'CHF', 'PLN', 'CZK', 'HUF', 'SEK', 'DKK', 'NOK'];
    
    if (currencyOptions.includes(filterId)) {
      // Handle currency filter selection
      setPrimaryCurrency(filterId);
      return;
    }
    
    // Handle status filters
    if (!selectedFilters.includes(filterId)) {
      setSelectedFilters([...selectedFilters, filterId]);
    }
  }, [selectedFilters, setPrimaryCurrency]);

  const removeFilter = useCallback((filterId: string) => {
    // Check if this is a currency filter (EUR, USD, GBP)
    const currencyOptions = ['EUR', 'USD', 'GBP'];
    
    if (currencyOptions.includes(filterId)) {
      // Don't remove currency filter, just ignore
      return;
    }
    
    // Handle status filters
    setSelectedFilters(selectedFilters.filter(id => id !== filterId));
  }, [selectedFilters]);

  // Convert selected filters to the API filter format
  const getFilters = useCallback((): ExpenseRequestFilter => {
    const filters: ExpenseRequestFilter = {};
    
    // Handle status filters, mapping UI status values to backend database values
    const sLower = selectedFilters.map(s => s.toLowerCase());
    // Use let instead of const since we'll be reassigning this variable
    let statusFilters = sLower.filter(s => {
      if (s.includes('draft')) return true;
      if (Object.values(ExpenseRequestStatusMap).some(status => s === status.toLowerCase())) return true;
      if (TIME_PERIOD_OPTIONS.includes(s)) return false;
      if (REQUEST_TYPE_OPTIONS.includes(s)) return false;
      return false;
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
  
  // Handle filter changes from DataFilter component
  const handleDataFilterChange = useCallback((filterId: string, isSelected: boolean) => {
    if (isSelected) {
      addFilter(filterId);
    } else {
      removeFilter(filterId);
    }
  }, [addFilter, removeFilter]);

  return {
    search,
    setSearch,
    selectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    getFilters,
    currencyFilter: primaryCurrency,
    setCurrencyFilter: setPrimaryCurrency,
    handleDataFilterChange,
    currenciesLoading,
  };
};

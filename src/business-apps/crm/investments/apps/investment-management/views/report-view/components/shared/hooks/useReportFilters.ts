import { useState, useCallback, useMemo, useEffect } from 'react';
import dayjs from 'dayjs';

export interface ReportFiltersState {
  timeFilter: string;
  startDate: dayjs.Dayjs | null;
  endDate: dayjs.Dayjs | null;
}

export interface ReportFiltersCallbacks {
  handleTimeFilterChange: (value: string) => void;
  handleStartDateChange: (date: dayjs.Dayjs | null) => void;
  handleEndDateChange: (date: dayjs.Dayjs | null) => void;
  handleClearFilters: () => void;
}

export interface UseReportFiltersReturn extends ReportFiltersState, ReportFiltersCallbacks {
  // Computed filters for API calls
  computedFilters: {
    startDate?: string;
    endDate?: string;
  };
  // Filter initialization state
  filtersInitialized: boolean;
}

/**
 * Shared hook for report filter state management across all investment report types
 * Handles the common pattern of time period selection vs individual date selection
 */
export const useReportFilters = (): UseReportFiltersReturn => {
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(null);
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(null);
  const [filtersInitialized, setFiltersInitialized] = useState(false);

  // Filter change handlers - consistent across all reports
  const handleTimeFilterChange = useCallback((value: string) => {
    setTimeFilter(value);
    if (value !== 'all') {
      setStartDate(null); // Clear individual dates when using time filter
      setEndDate(null);
    }
  }, []);

  const handleStartDateChange = useCallback((date: dayjs.Dayjs | null) => {
    setStartDate(date);
    if (date) {
      setTimeFilter('all'); // Clear time filter when using individual dates
    }
  }, []);

  const handleEndDateChange = useCallback((date: dayjs.Dayjs | null) => {
    setEndDate(date);
    if (date) {
      setTimeFilter('all'); // Clear time filter when using individual dates
    }
  }, []);

  const handleClearFilters = useCallback(() => {
    setTimeFilter('all');
    setStartDate(null);
    setEndDate(null);
  }, []);

  // Compute final filter values for API calls
  const computedFilters = useMemo(() => {
    let computedStartDate: string | undefined;
    let computedEndDate: string | undefined;

    if (timeFilter !== 'all') {
      // Use time filter logic
      const now = dayjs();
      switch (timeFilter) {
        case 'last7days':
          computedStartDate = now.subtract(7, 'day').format('YYYY-MM-DD');
          computedEndDate = now.format('YYYY-MM-DD');
          break;
        case 'last30days':
          computedStartDate = now.subtract(30, 'day').format('YYYY-MM-DD');
          computedEndDate = now.format('YYYY-MM-DD');
          break;
        case 'last3months':
          computedStartDate = now.subtract(3, 'month').format('YYYY-MM-DD');
          computedEndDate = now.format('YYYY-MM-DD');
          break;
        case 'last6months':
          computedStartDate = now.subtract(6, 'month').format('YYYY-MM-DD');
          computedEndDate = now.format('YYYY-MM-DD');
          break;
        case 'lastyear':
          computedStartDate = now.subtract(1, 'year').format('YYYY-MM-DD');
          computedEndDate = now.format('YYYY-MM-DD');
          break;
      }
    } else {
      // Use individual dates if provided
      computedStartDate = startDate?.format('YYYY-MM-DD');
      computedEndDate = endDate?.format('YYYY-MM-DD');
    }

    return {
      startDate: computedStartDate,
      endDate: computedEndDate
    };
  }, [timeFilter, startDate, endDate]);

  // Initialize filters after initial state setup
  useEffect(() => {
    setFiltersInitialized(true);
  }, []);

  return {
    // State
    timeFilter,
    startDate,
    endDate,
    // Callbacks
    handleTimeFilterChange,
    handleStartDateChange,
    handleEndDateChange,
    handleClearFilters,
    // Computed values
    computedFilters,
    // Initialization state
    filtersInitialized
  };
};

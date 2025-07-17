import React, { useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import ExpensePlansTable from './ExpensePlansTable';
import { useGetExpensePlans } from '../../../hooks/useGetExpensePlans';
import { useGetExpensePlanStatistics } from '../../../hooks/useGetExpensePlanStatistics';
import { useExpensePlanFilters } from '../../../hooks/useExpensePlanFilters';
import { useExpensePlanWidgetFilters, getActiveWidgetFromFilters } from '../../../hooks/useExpensePlanWidgetFilters';
import ExpensePlanStatistics from './ExpensePlanStatistics';
import dayjs from 'dayjs';
import { ExpenseStatus } from '../../../utils';

interface ExpensePlansTabProps extends BusinessAppContextProps {
  onContentHeaderChange?: (header: ReactNode) => void;
}

const ExpensePlansTab: React.FC<ExpensePlansTabProps> = (props) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [activeWidget, setActiveWidget] = useState<string | null>(null);

  const {
    filterGroups,
    selectedFilters,
    setFilters,
    handleFilterChange,
    clearFilters,
    search,
    setSearch,
    getFilters,
    setStartDateRange,
    setEndDateRange
  } = useExpensePlanFilters();
  
  const { items, isLoading, error, totalCount, fetchItems } = useGetExpensePlans(props);
  const { statistics, isLoading: statsLoading, error: statsError, fetchStatistics } = useGetExpensePlanStatistics(props);

  // Combine widget and table filters
  const finalFilters = useExpensePlanWidgetFilters(selectedFilters, activeWidget);

  // Synchronize activeWidget with selectedFilters when filters change externally
  useEffect(() => {
    const expectedActiveWidget = getActiveWidgetFromFilters(selectedFilters);
    if (expectedActiveWidget !== activeWidget) {
      console.log('Synchronizing expense plan widget state:', { 
        selectedFilters, 
        activeWidget, 
        expectedActiveWidget 
      });
      setActiveWidget(expectedActiveWidget);
    }
  }, [selectedFilters, activeWidget]);

  // Handle widget clicks with immediate visual feedback
  const handleWidgetClick = useCallback((widgetKey: string) => {
    const newActiveWidget = activeWidget === widgetKey ? null : widgetKey;
    setActiveWidget(newActiveWidget);
    
    // Synchronize widget state with table filters
    if (newActiveWidget === 'total-plans') {
      // Clear existing filters and add closed status
      clearFilters();
      handleFilterChange(ExpenseStatus.CLOSED, true);
    } else if (newActiveWidget === 'total-estimated') {
      // Clear existing filters and set up total-estimated filters
      clearFilters();
      // The date and status filters will be set by the statistics component
    } else if (newActiveWidget === 'pending-approval') {
      // Clear existing filters and set up pending-approval filters
      clearFilters();
      // The status filter will be set by the statistics component
    } else if (newActiveWidget === 'top-destinations') {
      // Clear existing filters and set up top-destinations filters
      clearFilters();
      // The destination filtering will be handled by the memoized filters
    } else if (newActiveWidget === null) {
      // If deactivating widget, clear all filters
      clearFilters();
    }
  }, [activeWidget, clearFilters, handleFilterChange]);

  // Handle clearing all filters (widget + table)
  const handleClearAllFilters = useCallback((filters: string[]) => {
    setFilters(filters);
    setActiveWidget(null);
    // Also clear search and date ranges when clearing all filters
    if (filters.length === 0) {
      setSearch('');
      setStartDateRange(null);
      setEndDateRange(null);
    }
  }, [setFilters, setSearch, setStartDateRange, setEndDateRange]);

  // Memoize the filters to prevent unnecessary API calls
  const memoizedFilters = useMemo(() => {
    // Get base filters from the filter hook
    const baseFilters = getFilters();
    
    // Only add widget-specific filters if a widget is active and needs date filtering
    if (activeWidget && (activeWidget === 'total-plans' || activeWidget === 'total-estimated')) {
      const today = dayjs();
      const currentMonthStart = today.startOf('month').format('YYYY-MM-DD HH:mm:ss');
      const currentMonthEnd = today.endOf('month').format('YYYY-MM-DD HH:mm:ss');
      
      // Add date range filters for current month (both start and end dates)
      const startDateCondition = {
        _and: [
          { startDate: { _gte: currentMonthStart } },
          { startDate: { _lte: currentMonthEnd } }
        ]
      };
      
      const endDateCondition = {
        _and: [
          { endDate: { _gte: currentMonthStart } },
          { endDate: { _lte: currentMonthEnd } }
        ]
      };
      
      // Merge with existing conditions
      if (baseFilters._and) {
        baseFilters._and.push(startDateCondition);
        baseFilters._and.push(endDateCondition);
      } else {
        baseFilters._and = [startDateCondition, endDateCondition];
      }
    }
    
    // Add destination filtering when top-destinations widget is active
    if (activeWidget === 'top-destinations' && statistics.topDestination && statistics.topDestination !== 'N/A') {
      const destinationCondition = {
        expenseRequestTrip: {
          pointType: { _eq: "DESTINATION_POINT" },
          travelRegion: {
            _or: [
              { value: { _eq: statistics.topDestination } },
              { translations: { value: { _eq: statistics.topDestination } } }
            ]
          }
        }
      };
      
      // Merge with existing conditions
      if (baseFilters._and) {
        baseFilters._and.push(destinationCondition);
      } else {
        baseFilters._and = [destinationCondition];
      }
    }
    
    return baseFilters;
  }, [getFilters, activeWidget, statistics.topDestination]);

  // Only fetch when filters, page, or pageSize change
  useEffect(() => {
    fetchItems(
      memoizedFilters,
      currentPage,
      pageSize
    );
  }, [fetchItems, currentPage, pageSize, memoizedFilters]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  // Memoize content header to prevent unnecessary re-renders
  const contentHeader = useMemo(() => {
    return <ExpensePlanStatistics 
      plans={items} 
      currentMonthTotal={statistics.currentMonthTotal} 
      previousMonthTotal={statistics.previousMonthTotal} 
      totalEstimated={statistics.totalEstimated} 
      pendingApproval={statistics.pendingApproval} 
      topDestination={statistics.topDestination} 
      statsLoading={statsLoading} 
      statsError={statsError ? new Error(statsError) : null}
      onWidgetClick={handleWidgetClick}
      activeWidgetKey={activeWidget ?? undefined}
      currentMonthClosedPlans={statistics.currentMonthClosedPlans}
      previousMonthClosedPlans={statistics.previousMonthClosedPlans}
      onStartDateRangeFilterChange={setStartDateRange}
      onEndDateRangeFilterChange={setEndDateRange}
      onStatusFilterChange={handleFilterChange}
    />;
  }, [items, statistics, statsLoading, statsError, handleWidgetClick, activeWidget, setStartDateRange, setEndDateRange, handleFilterChange]);

  useEffect(() => {
    if (props.onContentHeaderChange) {
      props.onContentHeaderChange(contentHeader);
    }
  }, [props.onContentHeaderChange, contentHeader]);

  const handleTableChange = useCallback((pagination: any, filters: any, sorter: any) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
  }, []);

  return (
    <ExpensePlansTable
      {...props}
      items={items.filter(plan => plan.status !== 'DISCARDED')}
      isLoading={isLoading}
      error={error}
      totalCount={totalCount}
      currentPage={currentPage}
      pageSize={pageSize}
      onTableChange={handleTableChange}
      search={search}
      onSearchChange={setSearch}
      selectedFilters={finalFilters}
      setFilters={handleClearAllFilters}
      filterGroups={filterGroups}
      handleFilterChange={handleFilterChange}
      clearFilters={clearFilters}
    />
  );
};

export default ExpensePlansTab;

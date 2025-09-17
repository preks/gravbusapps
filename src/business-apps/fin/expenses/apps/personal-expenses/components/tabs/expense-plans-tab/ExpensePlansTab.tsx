import React, { useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import ExpensePlansTable from './ExpensePlansTable';
import { useGetExpensePlans } from '../../../hooks/useGetExpensePlans';
import { useGetExpensePlanStatistics } from '../../../hooks/useGetExpensePlanStatistics';
import { useExpensePlanFilters } from '../../../hooks/useExpensePlanFilters';
import {  getActiveWidgetFromFilters } from '../../../hooks/useExpensePlanWidgetFilters';
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
  const [destinationFilter, setDestinationFilter] = useState<string | null>(null);
  const [tableRefreshTrigger, setTableRefreshTrigger] = useState<number>(0);
  // Add sorting state for server-side sorting
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | null>('descend');

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
    setEndDateRange,
    setPlanDateRange,
    filterLabelMap,
    addFilter,
    removeFilter
  } = useExpensePlanFilters();
  
  const { items, isLoading, error, totalCount, fetchItems } = useGetExpensePlans(props);
  const { statistics, isLoading: statsLoading, error: statsError, fetchStatistics } = useGetExpensePlanStatistics(props);

 
  // Synchronize activeWidget with selectedFilters when filters change externally
  useEffect(() => {
    const expectedActiveWidget = getActiveWidgetFromFilters(selectedFilters);
    // Don't deactivate top-destinations widget based on status filters alone
    // since destination filtering is handled separately
    if (expectedActiveWidget !== activeWidget && activeWidget !== 'top-destinations') {
      setActiveWidget(expectedActiveWidget);
    }
  }, [selectedFilters, activeWidget]);

  // Helper function to get current month date range
  const getCurrentMonthRange = useCallback(() => {
    const today = dayjs();
    const currentMonthStart = today.startOf('month').toDate();
    const currentMonthEnd = today.endOf('month').toDate();
    return [currentMonthStart, currentMonthEnd] as [Date, Date];
  }, []);

  // Handle widget clicks with immediate visual feedback
  const handleWidgetClick = useCallback((widgetKey: string) => {
    const isDeactivating = activeWidget === widgetKey;
    const newActiveWidget = isDeactivating ? null : widgetKey;
    setActiveWidget(newActiveWidget);
   
    // If deactivating (clicking the same widget again), clear all filters
    if (isDeactivating) {
      clearFilters();
      setDestinationFilter(null);
      return;
    }
    
    // Clear existing filters when switching to a different widget
    clearFilters();
    
    // Clear destination filter for all widgets except top-destinations
    if (newActiveWidget !== 'top-destinations') {
      setDestinationFilter(null);
    }
    
    // Apply widget-specific filter logic
    switch (newActiveWidget) {
      case 'total-plans':
        const currentMonthRange = getCurrentMonthRange();
        setPlanDateRange(currentMonthRange);
        handleFilterChange(ExpenseStatus.CLOSED, true);
        handleFilterChange(ExpenseStatus.PAID, true);
        break;
      case 'total-estimated':
        const today = dayjs();
        const currentMonthStart = today.startOf('month').toDate();
        const currentMonthEnd = today.endOf('month').toDate();
        setPlanDateRange([currentMonthStart, currentMonthEnd]);
        // Set status filters to exclude DRAFT (CREATED) and PAID
        const allStatuses = ['PREPARED', 'ASSIGNED', 'PENDING', 'APPROVED', 'REJECTED', 'VERIFIED', 'BOOKED', 'TRANSFERRED'];
        allStatuses.forEach(status => {
          handleFilterChange(status, true);
        });
        break;
      case 'pending-approval':
        // Clear any existing date range filters
        setStartDateRange(null);
        setEndDateRange(null);
        // Set status filter to only show PENDING plans
        const allStatusesForPending = ['PREPARED', 'ASSIGNED', 'PENDING', 'APPROVED', 'REJECTED', 'VERIFIED', 'BOOKED', 'CLOSED', 'TRANSFERRED'];
        allStatusesForPending.forEach(status => {
          handleFilterChange(status, false);
        });
        handleFilterChange('PENDING', true);
        break;
      case 'top-destinations':
        // Clear any existing date range filters
        setStartDateRange(null);
        setEndDateRange(null);
        // Clear all status filters to show all plans for the destination
        const allStatusesForDestination = ['PREPARED', 'ASSIGNED', 'PENDING', 'APPROVED', 'REJECTED', 'VERIFIED', 'BOOKED', 'CLOSED', 'TRANSFERRED'];
        allStatusesForDestination.forEach(status => {
          handleFilterChange(status, false);
        });
        // Set destination filter
        if (statistics.topDestination && statistics.topDestination !== 'N/A') {
          setDestinationFilter(statistics.topDestination);
        } else {
          setDestinationFilter(null);
        }
        break;
      case null:
        // Widget deactivated - filters already cleared above
        setDestinationFilter(null);
        break;
    }
  }, [activeWidget, clearFilters, handleFilterChange, setPlanDateRange, getCurrentMonthRange, setDestinationFilter, statistics.topDestination, setStartDateRange, setEndDateRange]);



  // Wrapper for clear all filters without parameters (for ExpensePlansTable clearFilters prop)
  const handleClearAllFiltersNoParams = useCallback(() => {
    // Use the enhanced setFilters which handles clearing all filters properly
    setFilters([]);
    setActiveWidget(null);
    setDestinationFilter(null);
  }, [setFilters]);

  // Helper function to build widget-specific filters
  const buildWidgetFilters = useCallback((baseFilters: any) => {
    const filters = { ...baseFilters };
    
    // Add total-estimated widget filters
    if (activeWidget === 'total-estimated') {
      const today = dayjs();
      const currentMonthStart = today.startOf('month').format('YYYY-MM-DD HH:mm:ss');
      const currentMonthEnd = today.endOf('month').format('YYYY-MM-DD HH:mm:ss');
      
      const planDateCondition = {
        _and: [
          { planDate: { _gte: currentMonthStart } },
          { planDate: { _lte: currentMonthEnd } }
        ]
      };
      
      if (filters._and) {
        filters._and.push(planDateCondition);
      } else {
        filters._and = [planDateCondition];
      }
    }
  
    // Add top-destinations widget filters
    if (activeWidget === 'top-destinations' && destinationFilter && destinationFilter !== 'N/A') {
      const destinationCondition = {
        expenseRequestTrip: {
          pointType: { _eq: "DESTINATION_POINT" },
          travelRegion: {
            _or: [
              { value: { _eq: destinationFilter } },
              { translations: { value: { _eq: destinationFilter } } },
              { code: { _eq: destinationFilter } }
            ]
          }
        }
      };
      
      if (filters._and) {
        filters._and.push(destinationCondition);
      } else {
        filters._and = [destinationCondition];
      }
    }
    
    return filters;
  }, [activeWidget, destinationFilter]);
 
  // Memoize the filters to prevent unnecessary API calls
  const memoizedFilters = useMemo(() => {
    const baseFilters = getFilters();
    const finalFilters = buildWidgetFilters(baseFilters);
    return finalFilters;
  }, [getFilters, buildWidgetFilters]);

  // Only fetch when filters, page, pageSize, or sorting changes
  useEffect(() => {
    fetchItems(
      memoizedFilters,
      currentPage,
      pageSize,
      sortField,
      sortOrder
    );
  }, [fetchItems, currentPage, pageSize, memoizedFilters, sortField, sortOrder]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);


  // Process completion event listener for refreshing data
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
  
        if (event.detail?.resolution === 'success') {
          console.log('ExpensePlansTab: Refreshing data after successful process completion');
          
          // Refresh plans data
          if (props.accessToken && props.userInfo?.employeeDetails?.employeeId) {
            fetchItems(memoizedFilters, currentPage, pageSize, sortField, sortOrder);
          }
          
          // Refresh statistics
          fetchStatistics();
          
          // Reset active widget to force refresh of statistics
          setActiveWidget(null);
          
          // Trigger table refresh by updating a state that forces re-render
          setTableRefreshTrigger(prev => prev + 1);
          
          return;
        }
      } catch (err) {
        console.error('Error handling process completion:', err);
      }
    };

    const handleAllEvents = (event: any) => {
      if (event.type && (event.type.includes('process') || event.type.includes('task'))) {
        handleProcessCompletion(event);
      }
    };

    const eventNames = [
      'com.newwork.process.taskCompletion',
      'com.newwork.process.completion',
      'com.newwork.process.continue',
      'com.newwork.process.processCompletion',
      'processCompletion',
      'taskCompletion',
      'taskCompleted',
      'processCompleted',
      'task-completion',
      'process-completion'
    ];

    eventNames.forEach(eventName => {
      window.addEventListener(eventName, handleProcessCompletion as EventListener);
    });

    const originalDispatchEvent = window.dispatchEvent;
    window.dispatchEvent = function(event: Event) {
      if (event.type && (event.type.includes('process') || event.type.includes('task'))) {
        handleAllEvents(event);
      }
      return originalDispatchEvent.call(this, event);
    };

    return () => {
      eventNames.forEach(eventName => {
        window.removeEventListener(eventName, handleProcessCompletion as EventListener);
      });
      
      window.dispatchEvent = originalDispatchEvent;
    };
  }, [fetchItems, fetchStatistics, memoizedFilters, currentPage, pageSize, sortField, sortOrder, props.accessToken, props.userInfo?.employeeDetails?.employeeId]);


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
    />;
  }, [items, statistics, statsLoading, statsError, handleWidgetClick, activeWidget]);

  useEffect(() => {
    if (props.onContentHeaderChange) {
      props.onContentHeaderChange(contentHeader);
    }
  }, [props.onContentHeaderChange, contentHeader]);

  // Enhanced table change handler for server-side sorting
  const handleTableChange = useCallback((pagination: any, filters: any, sorter: any) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
    
    // Handle sorting for server-side sorting
    if (sorter && sorter.field) {
      setSortField(sorter.field);
      setSortOrder(sorter.order);
    } else {
      // Reset to default sorting (creation date descending)
      setSortField('createdAt');
      setSortOrder('descend');
    }
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
      selectedFilters={selectedFilters}
      setFilters={setFilters}
      filterGroups={filterGroups}
      handleFilterChange={handleFilterChange}
      clearFilters={handleClearAllFiltersNoParams}
      filterLabelMap={filterLabelMap}
      addFilter={addFilter}
      removeFilter={removeFilter}
      tableRefreshTrigger={tableRefreshTrigger}
    />
  );
};

export default ExpensePlansTab;

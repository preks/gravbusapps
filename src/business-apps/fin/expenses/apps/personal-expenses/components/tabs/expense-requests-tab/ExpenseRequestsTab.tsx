import React, { useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { startProcess } from '@/common/utils/start-process';
import ExpenseRequestStatistics from './ExpenseRequestStatistics';
import ExpenseRequestsTable from './ExpenseRequestsTable';
import { useGetExpenseRequests } from '../../../hooks/useGetExpenseRequests';
import { useExpenseRequestFilters } from '../../../hooks/useExpenseRequestFilters';
import { message } from 'antd';
import dayjs from 'dayjs';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

export interface ExpenseRequestsTabProps extends BusinessAppContextProps {
  onContentHeaderChange?: (header: ReactNode) => void;
}

const ExpenseRequestsTab: React.FC<ExpenseRequestsTabProps> = (props) => {
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
    userInfo: props.userInfo
  }), [props.accessToken, props.userInfo]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [activeWidget, setActiveWidget] = useState<string | null>(null);

  // Server-side sorting state
  const [sortField, setSortField] = useState<string>('requestDate');
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | undefined>('descend');

  // Table refresh trigger state
  const [tableRefreshTrigger, setTableRefreshTrigger] = useState<number>(0);

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
    setRequestDateRange,
    filterLabelMap,
    addFilter,
    removeFilter
  } = useExpenseRequestFilters();
  
  const { items, isLoading, error, totalCount, fetchItems } = useGetExpenseRequests(contextProps);

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
      return;
    }
    
    // Clear existing filters when switching to a different widget
    clearFilters();
    
    // Apply widget-specific filter logic
    switch (newActiveWidget) {
      case 'total-requests':
        const currentMonthRange = getCurrentMonthRange();
        setRequestDateRange(currentMonthRange);
        handleFilterChange('PAID', true);
        handleFilterChange('CLOSED', true);
        handleFilterChange('TRANSFERRED', true);
        break;
      case 'total-amount':
        const today = dayjs();
        const currentMonthStart = today.startOf('month').toDate();
        const currentMonthEnd = today.endOf('month').toDate();
        setRequestDateRange([currentMonthStart, currentMonthEnd]);
        handleFilterChange('PAID', true);
        handleFilterChange('CLOSED', true);
        handleFilterChange('TRANSFERRED', true);
        break;
      case 'pending-approval':
        // Clear any existing date range filters
        setRequestDateRange(null);
        setStartDateRange(null);
        setEndDateRange(null);
        // Set status filter to only show PENDING requests
        const allStatusesForPending = ['PREPARED', 'CREATED', 'ASSIGNED', 'PENDING', 'APPROVED', 'REJECTED', 'VERIFIED', 'BOOKED', 'PAID', 'CLOSED', 'TRANSFERRED'];
        allStatusesForPending.forEach(status => {
          handleFilterChange(status, false);
        });
        handleFilterChange('PENDING', true);
        break;
      case 'reimbursable':
        // Clear any existing date range filters
        setRequestDateRange(null);
        setStartDateRange(null);
        setEndDateRange(null);
        // Set status filters to exclude PAID, CLOSED, TRANSFERRED
        const allStatusesForReimbursable = ['PREPARED', 'CREATED', 'ASSIGNED', 'PENDING', 'APPROVED', 'REJECTED', 'VERIFIED', 'BOOKED', 'PAID', 'CLOSED', 'TRANSFERRED'];
        allStatusesForReimbursable.forEach(status => {
          if (['PAID', 'CLOSED', 'TRANSFERRED'].includes(status)) {
            handleFilterChange(status, false);
          } else {
            handleFilterChange(status, true);
          }
        });
        break;
      case null:
        // Widget deactivated - filters already cleared above
        break;
    }
  }, [activeWidget, clearFilters, handleFilterChange, setRequestDateRange, getCurrentMonthRange, setStartDateRange, setEndDateRange]);

  // Memoize the filters to prevent unnecessary API calls
  const memoizedFilters = useMemo(() => {
    return getFilters();
  }, [getFilters]);

  // Only fetch when filters, page, pageSize, or sorting changes
  useEffect(() => {
    if (contextProps.accessToken && contextProps.userInfo?.employeeDetails?.employeeId) {
      fetchItems(
        memoizedFilters,
        currentPage,
        pageSize,
        sortField,
        sortOrder
      );
    }
  }, [fetchItems, currentPage, pageSize, memoizedFilters, sortField, sortOrder, contextProps.accessToken, contextProps.userInfo?.employeeDetails?.employeeId]);

  // Process completion event listener to refresh data
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        if (event.detail?.resolution === 'success') {
          // Refresh expense requests data after successful process completion
          if (contextProps.accessToken && contextProps.userInfo?.employeeDetails?.employeeId) {
            fetchItems(
              memoizedFilters,
              currentPage,
              pageSize,
              sortField,
              sortOrder
            );
          }
          
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
  }, [fetchItems, currentPage, pageSize, memoizedFilters, sortField, sortOrder, contextProps.accessToken, contextProps.userInfo?.employeeDetails?.employeeId]);

  // Memoize content header to prevent unnecessary re-renders
  const contentHeader = useMemo(() => {
    return (
      <ExpenseRequestStatistics 
        {...contextProps} 
        onWidgetClick={handleWidgetClick}
        activeWidgetKey={activeWidget || undefined}
      />
    );
  }, [contextProps, handleWidgetClick, activeWidget]);

  // Memoize the label map to prevent unnecessary re-rendering
  
  // Update the content header only when it changes
  const onContentHeaderChange = props.onContentHeaderChange;
  useEffect(() => {
    // Only update content header when the callback exists
    if (onContentHeaderChange) {
      // Use a small timeout to ensure proper React rendering cycle
      const timerId = setTimeout(() => {
        onContentHeaderChange(contentHeader);
      }, 0);
      return () => clearTimeout(timerId);
    }
  }, [onContentHeaderChange, contentHeader]);

  // Handle adding a new expense request
  const handleAddExpenseRequest = useCallback(() => {
    const employeeId = contextProps.userInfo?.employeeDetails?.employeeId;
    if (!employeeId) {
      console.warn('Cannot start process: Employee ID not available. User info may not be fully loaded.');
      message.warning(getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.user_information_not_loaded','User information not loaded yet. Please wait a moment and try again.'));
      return;
    }
    
  
    startProcess({
      domain: 'employee-expense',
      processName: 'changeExpenseRequest',
      payload: {
        employeeId: employeeId
      },
      builderType: 'NATIVE_SCREEN'
    });
  }, [contextProps.userInfo?.employeeDetails?.employeeId]);

  const handleTableChange = useCallback((pagination: any, filters: any, sorter: any) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
    
    // Handle sorting changes
    if (sorter && sorter.field) {
      setSortField(sorter.field);
      setSortOrder(sorter.order);
    } else {
      // Reset to default sorting
      setSortField('requestDate');
      setSortOrder('descend');
    }
  }, []);

  // Function for DataController setFilter requirement
  const handleSetFilter = useCallback((filters: string[]) => {
    // This is called by DataController's "Clear all filters" button or individual filter removal
    if (filters.length === 0) {
      // Clear all filters
      clearFilters();
      setActiveWidget(null);
    } else {
      // Handle individual filter removal - find which filters were removed and remove them
      const removedFilters = selectedFilters.filter(f => !filters.includes(f));
      removedFilters.forEach(filterId => removeFilter(filterId));
    }
    setCurrentPage(1);
  }, [clearFilters, selectedFilters, removeFilter]);

  // Adapter function for DataFilter component
  const handleFilterChangeCallback = useCallback((filterId: string, selected: boolean) => {
    selected ? addFilter(filterId) : removeFilter(filterId);
  }, [addFilter, removeFilter]);

  return (
    <ExpenseRequestsTable
      {...props}
      items={items}
      isLoading={isLoading}
      error={error}
      totalCount={totalCount}
      currentPage={currentPage}
      pageSize={pageSize}
      onTableChange={handleTableChange}
      search={search}
      onSearchChange={setSearch}
      selectedFilters={selectedFilters}
      setFilters={handleSetFilter}
      filterGroups={filterGroups}
      handleFilterChange={handleFilterChangeCallback}
      clearFilters={clearFilters}
      filterLabelMap={{ ...filterLabelMap }}
      onAddExpenseRequest={handleAddExpenseRequest}
      tableRefreshTrigger={tableRefreshTrigger}
      addFilter={addFilter}
      removeFilter={removeFilter}
    />
  );
};

export default ExpenseRequestsTab;

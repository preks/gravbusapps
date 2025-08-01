import React, { useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { startProcess } from '@/common/utils/start-process';
import ExpenseRequestStatistics from './ExpenseRequestStatistics';
import ExpenseRequestsTable from './ExpenseRequestsTable';
import { useGetExpenseRequests } from '../../../hooks/useGetExpenseRequests';
import { useExpenseRequestFilters } from '../../../hooks/useExpenseRequestFilters';
import { message } from 'antd';
import dayjs from 'dayjs';

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
    filterLabelMap
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
    const newActiveWidget = activeWidget === widgetKey ? null : widgetKey;
    setActiveWidget(newActiveWidget);
    
    // Clear existing filters for all widget activations
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
      message.warning('User information not loaded yet. Please wait a moment and try again.');
      return;
    }
    
    console.log('Starting add expense request process for employeeId:', employeeId);
    startProcess({
      domain: 'employee-expense',
      processName: 'changeExpenseRequest',
      payload: {
        employeeId: employeeId
      }
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

  const handleClearAllFilters = useCallback(() => {
    clearFilters();
    setActiveWidget(null);
    setCurrentPage(1);
  }, [clearFilters]);

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
      setFilters={handleClearAllFilters}
      filterGroups={filterGroups}
      handleFilterChange={handleFilterChange}
      clearFilters={clearFilters}
      filterLabelMap={filterLabelMap}
      onAddExpenseRequest={handleAddExpenseRequest}
    />
  );
};

export default ExpenseRequestsTab;

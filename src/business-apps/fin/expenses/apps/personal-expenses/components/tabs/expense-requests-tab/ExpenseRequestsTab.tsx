import React, { useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { startProcess } from '@/common/utils/start-process';
import ExpenseRequestStatistics from './ExpenseRequestStatistics';
import ExpenseRequestsTable from './ExpenseRequestsTable';
import { useGetExpenseRequests } from '../../../hooks/useGetExpenseRequests';
import { useExpenseRequestFilters } from '../../../hooks/useExpenseRequestFilters';
import { message } from 'antd';

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
  } = useExpenseRequestFilters();
  
  const { items, isLoading, error, totalCount, fetchItems } = useGetExpenseRequests(contextProps);

  // Memoize the filters to prevent unnecessary API calls
  const memoizedFilters = useMemo(() => {
    return getFilters();
  }, [getFilters]);

  // Only fetch when filters, page, or pageSize change
  useEffect(() => {
    if (contextProps.accessToken && contextProps.userInfo?.employeeDetails?.employeeId) {
      fetchItems(
        memoizedFilters,
        currentPage,
        pageSize
      );
    }
  }, [fetchItems, currentPage, pageSize, memoizedFilters, contextProps.accessToken, contextProps.userInfo?.employeeDetails?.employeeId]);

  // Create filter label map for proper display labels
  const filterLabelMap = useMemo(() => {
    const labelMap: Record<string, string> = {};
    
    // Map status values to their display labels
    const statusLabels = {
      'PREPARED': 'Prepared',
      'CREATED': 'Draft (Created)',
      'PENDING': 'In Approval (Pending)',
      'ASSIGNED': 'Assigned',
      'APPROVED': 'Approved',
      'REJECTED': 'Revision Required (Rejected)',
      'VERIFIED': 'In Transit (Verified)',
      'BOOKED': 'In Transit (Booked)',
      'PAID': 'Paid',
      'CLSOED': 'Closed',
      'TRANSFERRED': 'In Transit (Transferred)',
    };
    
    // Add all status mappings
    Object.entries(statusLabels).forEach(([status, label]) => {
      labelMap[status] = label;
    });
    
    return labelMap;
  }, []);

  // Memoize content header to prevent unnecessary re-renders
  const contentHeader = useMemo(() => {
    return items && items.length > 0 ? <ExpenseRequestStatistics items={items} /> : null;
  }, [items]);
  
  // Update the content header only when it changes and when items are loaded
  const onContentHeaderChange = props.onContentHeaderChange;
  useEffect(() => {
    // Only update content header when we have items and the callback exists
    if (onContentHeaderChange && items && items.length > 0) {
      // Use a small timeout to ensure proper React rendering cycle
      const timerId = setTimeout(() => {
        onContentHeaderChange(contentHeader);
      }, 0);
      return () => clearTimeout(timerId);
    }
  }, [onContentHeaderChange, contentHeader, items]);

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
  }, []);

  const handleClearAllFilters = useCallback(() => {
    clearFilters();
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

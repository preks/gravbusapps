import React, { useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { startProcess } from '@/common/utils/start-process';
import ExpenseRequestStatistics from './ExpenseRequestStatistics';
import ExpenseRequestsTable from './ExpenseRequestsTable';
import { useGetExpenseRequests } from '../../../hooks/useGetExpenseRequests';

export interface ExpenseRequestsTabProps extends BusinessAppContextProps {
  onContentHeaderChange?: (header: ReactNode) => void;
}

const ExpenseRequestsTab: React.FC<ExpenseRequestsTabProps> = (props) => {
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
    userInfo: props.userInfo
  }), [props.accessToken, props.userInfo]);

  // Use the expense request data hook for statistics
  const { items, isLoading, error, totalCount, fetchItems } = useGetExpenseRequests(contextProps);

  // Initial data fetch when component mounts and employee ID is available
  useEffect(() => {
    if (contextProps.accessToken && contextProps.userInfo?.employeeDetails?.employeeId) {
      fetchItems();
    }
  }, [contextProps.accessToken, contextProps.userInfo?.employeeDetails?.employeeId, fetchItems]);

  // Create memoized content header with statistics component
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
    if (contextProps.userInfo?.employeeDetails?.employeeId) {
      startProcess({
        domain: 'employee-expense',
        processName: 'changeExpenseRequest',
        payload: {
          employeeId: contextProps.userInfo.employeeDetails.employeeId
        }
      });
    }
  }, [contextProps.userInfo?.employeeDetails?.employeeId]);

  return (
    <ExpenseRequestsTable
      {...contextProps}
      onAddExpenseRequest={handleAddExpenseRequest}
    />
  );
};

export default ExpenseRequestsTab;

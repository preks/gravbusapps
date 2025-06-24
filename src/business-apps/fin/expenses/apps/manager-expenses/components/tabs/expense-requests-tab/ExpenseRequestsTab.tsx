import React, { useState, useEffect, useMemo, ReactNode } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetExpenseRequests } from '../../../hooks/useGetExpenseRequests';
import ExpenseRequestStatistics from './ExpenseRequestStatistics';
import ExpenseRequestsTable from './ExpenseRequestsTable';

export interface ExpenseRequestsTabProps extends BusinessAppContextProps {
  onContentHeaderChange?: (header: ReactNode) => void;
}

const ExpenseRequestsTab: React.FC<ExpenseRequestsTabProps> = (props) => {
  const { onContentHeaderChange } = props;
  
  // Search term state for synchronization with table
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
    userInfo: props.userInfo
  }), [props.accessToken, props.userInfo]);
  
  // Use hook only for statistics
  const {
    requestStats,
    requestStatsLoading,
    requestStatsError,
    fetchRequestStatistics
  } = useGetExpenseRequests(contextProps);
  
  // Fetch statistics on component mount
  useEffect(() => {
    fetchRequestStatistics();
  }, [fetchRequestStatistics]);

  // Handle search changes from the table
  const handleSearchChange = (search: string) => {
    setSearchTerm(search);
  };

  // Update the content header when statistics change
  useEffect(() => {
    if (onContentHeaderChange) {
      const headerContent = (
        <ExpenseRequestStatistics 
          requestStats={requestStats} 
          requestStatsLoading={requestStatsLoading} 
          requestStatsError={requestStatsError} 
          fetchRequestStatistics={fetchRequestStatistics} 
        />
      );
      onContentHeaderChange(headerContent);
    }
  }, [requestStats, requestStatsLoading, requestStatsError, onContentHeaderChange, fetchRequestStatistics]);





  return (
    <ExpenseRequestsTable
      {...contextProps}
      search={searchTerm}
      onSearchChange={handleSearchChange}
    />
  );
};

export default ExpenseRequestsTab;

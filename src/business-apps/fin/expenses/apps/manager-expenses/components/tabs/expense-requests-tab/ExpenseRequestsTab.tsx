import React, { useEffect, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetExpenseRequests } from '../../../hooks/useGetExpenseRequests';
import ExpenseRequestStatistics from './ExpenseRequestStatistics';
import ExpenseRequestsTable from './ExpenseRequestsTable';

export interface ExpenseRequestsTabProps extends BusinessAppContextProps {}

const ExpenseRequestsTab: React.FC<ExpenseRequestsTabProps> = (props) => {
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

  return (
    <div className="gba:h-full gba:flex gba:flex-col">
      {/* Statistics Section - Now inside the tab content */}
      <div className="gba:mb-6">
        <ExpenseRequestStatistics 
          requestStats={requestStats} 
          requestStatsLoading={requestStatsLoading} 
          requestStatsError={requestStatsError} 
          fetchRequestStatistics={fetchRequestStatistics} 
        />
      </div>
      
      {/* Table Container */}
      <div className="gba:flex-1">
        <div data-testid="expense-requests-table-container">
          <ExpenseRequestsTable
            {...contextProps}
          />
        </div>
      </div>
    </div>
  );
};

export default ExpenseRequestsTab;

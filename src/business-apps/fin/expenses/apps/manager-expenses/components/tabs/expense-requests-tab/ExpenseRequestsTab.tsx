import React, { useEffect, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetExpenseRequests } from '../../../hooks/useGetExpenseRequests';
import { useExpenseRequestFilters } from '../../../hooks/useExpenseRequestFilters';
import { useCurrencyStore } from '../../../store/useCurrencyStore';
import ExpenseRequestStatistics from './ExpenseRequestStatistics';
import ExpenseRequestsTable from './ExpenseRequestsTable';

export interface ExpenseRequestsTabProps extends BusinessAppContextProps {}

const ExpenseRequestsTab: React.FC<ExpenseRequestsTabProps> = (props) => {
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
    userInfo: props.userInfo
  }), [props.accessToken, props.userInfo]);
  
  // Use the currency store for the primary currency
  const { primaryCurrency } = useCurrencyStore();
  
  // Use the expense request filters hook for filter management
  const { } = useExpenseRequestFilters(); // Hook is used in ExpenseRequestsTable component
  
  // Use hook only for statistics
  const {
    requestStats,
    requestStatsLoading,
    requestStatsError,
    fetchRequestStatistics
  } = useGetExpenseRequests(contextProps);
  
  // Fetch statistics on component mount and when primary currency changes
  useEffect(() => {
    fetchRequestStatistics(primaryCurrency);
  }, [fetchRequestStatistics, primaryCurrency]);

  return (
    <div className="gba:h-full gba:flex gba:flex-col">
      {/* Filter groups are now handled by the DataFilter component in ExpenseRequestsTable */}
      
      {/* Statistics Section - Now inside the tab content */}
      <div className="gba:mb-6">
        <ExpenseRequestStatistics 
          requestStats={requestStats} 
          requestStatsLoading={requestStatsLoading} 
          requestStatsError={requestStatsError} 
          fetchRequestStatistics={fetchRequestStatistics}
          currencyFilter={primaryCurrency}
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

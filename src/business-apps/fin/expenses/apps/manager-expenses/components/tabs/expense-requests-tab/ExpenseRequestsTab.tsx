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
  
  // Get managerId from userInfo for currency filtering
  const managerId = props.userInfo?.employeeDetails?.employeeId || '';
  
  // Use the currency store for the primary currency
  const { primaryCurrency } = useCurrencyStore();
  
  // Use the expense request filters hook with accessToken and managerId for dynamic currency data
  useExpenseRequestFilters({
    accessToken: props.accessToken,
    managerId
  }); // Most filter functionality is used in ExpenseRequestsTable component
  
  // Use hook only for statistics
  const {
    requestStats,
    requestStatsLoading,
    requestStatsError,
    fetchRequestStatistics
  } = useGetExpenseRequests(contextProps);
  
  // Use a ref to track the last currency used for statistics fetching
  const lastStatsCurrency = React.useRef<string | null>(null);
  
  // Debounced statistics fetch to prevent redundant requests
  const debouncedFetchStats = React.useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout | null = null;
      
      return (currency: string | null) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        timeoutId = setTimeout(() => {
          console.log('Fetching statistics with currency:', currency);
          fetchRequestStatistics(currency);
          timeoutId = null;
        }, 300); // 300ms debounce time
      };
    })(),
    [fetchRequestStatistics]
  );
  
  // Fetch statistics on component mount and when primary currency changes
  useEffect(() => {
    // Skip redundant fetches with the same currency
    if (lastStatsCurrency.current === primaryCurrency) {
      return;
    }
    
    // Update last currency ref
    lastStatsCurrency.current = primaryCurrency;
    
    // Use debounced fetch
    debouncedFetchStats(primaryCurrency);
  }, [primaryCurrency, debouncedFetchStats]);

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

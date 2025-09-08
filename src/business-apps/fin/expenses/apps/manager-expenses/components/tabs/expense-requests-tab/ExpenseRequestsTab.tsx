import React, { useEffect, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetExpenseRequests } from '../../../hooks/useGetExpenseRequests';
import { useExpenseRequestFilters, ExpenseRequestStatusMap } from '../../../hooks/useExpenseRequestFilters';
import { ExpenseStatus } from '../../../utils';
import { useCurrencyStore } from '../../../store/useCurrencyStore';
import { useAppCurrency } from '../../../hooks/useAppCurrency';
import ExpenseRequestStatistics from './ExpenseRequestStatistics';
import ExpenseRequestsTable from './ExpenseRequestsTable';

export interface ExpenseRequestsTabProps extends BusinessAppContextProps {
  moduleColor?: string;
}

const ExpenseRequestsTab: React.FC<ExpenseRequestsTabProps> = (props) => {
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
    userInfo: props.userInfo
  }), [props.accessToken, props.userInfo]);
  
  // Get managerId from userInfo for currency filtering
  const managerId = props.userInfo?.employeeDetails?.employeeId || '';
  
  // Use the app currency hook to ensure most used currency is loaded
  useAppCurrency(contextProps);
  
  // Use the currency store for the primary currency and most used currency
  const { primaryCurrency, mostUsedCurrency, setUserSelected } = useCurrencyStore();
  
  // Track if this is the first tab activation
  const isFirstActivation = React.useRef(true);
  
  // Initialize currency filter with most used currency on first load
  useEffect(() => {
    if (isFirstActivation.current && mostUsedCurrency) {
      console.log('ExpenseRequestsTab: Setting initial currency to most used currency:', mostUsedCurrency);
      // Set the primary currency to the most used currency without marking it as user-selected
      setUserSelected(false);
      isFirstActivation.current = false;
    }
  }, [mostUsedCurrency, setUserSelected]);
  
  // Use the expense request filters hook with accessToken and managerId for dynamic currency data
  useExpenseRequestFilters({
    accessToken: props.accessToken,
    managerId
  }); // Most filter functionality is used in ExpenseRequestsTable component
  
  // Use hook for statistics and to initialize default filters
  const {
    requestStats,
    requestStatsLoading,
    requestStatsError,
    fetchRequestStatistics,
    fetchRequests
  } = useGetExpenseRequests(contextProps);
  
  // Use the expense request filters hook
  useExpenseRequestFilters({
    accessToken: props.accessToken,
    managerId
  }); // Most filter functionality is used in ExpenseRequestsTable component
  
  // Ensure we fetch data with default filters when the component mounts
  useEffect(() => {
    // Only perform the initial fetch if we have a valid currency
    if (primaryCurrency) {
      // Fetch with PENDING status and most used currency
      const initialFetch = async () => {
        // Use the same status value that's used in the filters hook
        const pendingStatus = ExpenseRequestStatusMap[ExpenseStatus.PENDING];
        
        console.log('ExpenseRequestsTab: Initial fetch with default filters:', {
          status: pendingStatus,
          currency: primaryCurrency
        });
        
        // Force the status filter to be applied by using both the UI filter value and the backend value
        // This ensures the filter is properly mapped and applied in the GraphQL query
        await fetchRequests(
          '', // No search term
          1,  // First page
          10, // Default page size
          'requestDate:desc', // Default sorting
          ['PENDING', pendingStatus], // Include both formats to ensure it's applied
          undefined, // No request date filter
          primaryCurrency // Use primary currency (which should be the most used currency)
        );
      };
      
      initialFetch();
    }
  }, [fetchRequests, primaryCurrency, ExpenseRequestStatusMap, ExpenseStatus]);
  
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

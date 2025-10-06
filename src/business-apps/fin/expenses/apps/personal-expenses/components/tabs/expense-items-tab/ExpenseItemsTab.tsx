import React, { useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import dayjs from 'dayjs';
import { getItemsCardStrategies, preserveCurrencyAndReset } from './cardStrategies';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { GET_EXPENSE_ITEMS_BY_EMPLOYEE, GET_EXPENSE_ITEM_STATISTICS, GET_PENDING_ITEMS, GET_PENDING_ITEMS_WITH_DATE_RANGE } from '../../../queries/expenseItems';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { ExpenseStatus } from '../../../utils';
import ExpenseItemStatistics from './ExpenseItemStatistics';
import ExpenseItemsTable from './ExpenseItemsTable';
import { useExpenseItemsFilters } from '../../../hooks/useExpenseItemsFilters';
import { startProcess } from '@/common/utils/start-process';
import { env } from '@/common/env/EnvUtils';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
// import { useExpenseItemStatistics } from '../../../hooks/useExpenseItemStatistics';
import { getSelectedCurrencyRef } from '../../../utils/currencyUtils';

export interface ExpenseItemsTabProps extends BusinessAppContextProps {
  onContentHeaderChange?: (header: ReactNode) => void;
  filter?: string;
}

const ExpenseItemsTab: React.FC<ExpenseItemsTabProps> = (props) => {
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
    userInfo: props.userInfo,
    additionalData: props.additionalData
  }), [props.accessToken, props.userInfo, props.additionalData]);
  
  // Get all available statuses from the enum
  const availableStatuses = useMemo(() => [
    'PREPARED',
    'CREATED', 
    'ASSIGNED',
    'PENDING',
    'APPROVED',
    'REJECTED',
    'VERIFIED',
    'BOOKED',
    'PAID',
    'CLOSED',
    'TRANSFERRED'
  ], []);
  
  // Use our expense items filters hook
  const {
    addFilter,
    removeFilter,
    clearFilters,
    selectedFilters,
    filterGroups,
    filterLabelMap,
    getFilters,
    setFilters,
    setExpenseDateRange,
    expenseDateRange,
    amountRange,
    onStatusFilterChange,
  } = useExpenseItemsFilters(availableStatuses);

  // Use the selectedFilters from the hook which already includes date range and amount range
  // const allSelectedFilters = selectedFilters;

  const [activeCard, setActiveCard] = useState<string | null>(null);

  // State for storing all items for statistics
  const [allItems, setAllItems] = useState<any[]>([]);
  const [hasLoadedAllItems, setHasLoadedAllItems] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [totalExpenses, setTotalExpenses] = useState<number | null>(null);
  const [previousMonthTotalExpenses, setPreviousMonthTotalExpenses] = useState<number | null>(null);
  const [pendingReimbursementTotal, setPendingReimbursementTotal] = useState<number>(0);
  const [previousMonthPendingReimbursementTotal, setPreviousMonthPendingReimbursementTotal] = useState<number>(0);
  const [pendingItemCountFromApi, setPendingItemCountFromApi] = useState<number>(0);
  const [tableRefreshTrigger, setTableRefreshTrigger] = useState<number>(0);
  const graphqlClient = useGraphQLClient(contextProps.accessToken);
  
  // Read URL flag to hide statistics/cards
  const hideStats = useMemo(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('hideStats') === '1';
    } catch {
      return false;
    }
  }, []);
  
  
  // Ref to track if component is mounted
  const isMounted = useRef<boolean>(true);
  
  // Set isMounted to false when component unmounts
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Check sessionStorage for filter only once when the component mounts
  useEffect(() => {
    // First check sessionStorage for filter
    const storedFilter = sessionStorage.getItem('expenseItemsFilter');
    const urlParams = new URLSearchParams(window.location.search);
    const statusParam = (urlParams.get('status') || '').toLowerCase();
    
    if (storedFilter || statusParam) {
      
      
      // Clear existing filters first
      clearFilters();
      
      // Add the filter from sessionStorage
      if (statusParam) {
        addFilter(statusParam);
      } else if (storedFilter) {
        addFilter(storedFilter);
      }
      
      // Clear the sessionStorage after using it
      sessionStorage.removeItem('expenseItemsFilter');
    }
  // Only run this effect once when the component mounts
  }, [addFilter, clearFilters]);
  
  // Listen for the global API filter changes
  useEffect(() => {
    // Check the global API for filter changes
    const checkGlobalFilter = () => {
      const apiFilter = window.tabNavigationAPI?.filter;
      if (apiFilter && !selectedFilters.includes(apiFilter)) {
        
        
        // Clear existing filters first
        clearFilters();
        
        // Add the filter from global API
        addFilter(apiFilter);
        
        // Clear the filter from the global API after using it
        if (window.tabNavigationAPI) {
          window.tabNavigationAPI.filter = undefined;
        }
      }
    };
    
    // Check immediately
    checkGlobalFilter();
    
    // Set up a MutationObserver to detect when this tab becomes active
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // When DOM changes (e.g., tab becomes visible), check for filter
        if (mutation.type === 'attributes') {
          checkGlobalFilter();
        }
      });
    });
    
    // Start observing the document
    observer.observe(document.body, { attributes: true, childList: true, subtree: true });
    
    // Clean up
    return () => {
      observer.disconnect();
    };
  }, [addFilter, clearFilters, selectedFilters]);

  // Resolve selected currency from filters (token format: currency:<ref>)
  const selectedCurrencyRef = useMemo(() => {
    return getSelectedCurrencyRef(selectedFilters, 'Currency:v1:EUR');
  }, [selectedFilters]);

  const handleWidgetClick = useCallback((widgetKey: string) => {
    const strategies = getItemsCardStrategies({ setExpenseDateRange, onStatusFilterChange });

    const isDeactivating = activeCard === widgetKey;
    if (isDeactivating) {
      strategies[widgetKey]?.remove();
      setActiveCard(null);
      return;
    }

    preserveCurrencyAndReset(selectedFilters, clearFilters, addFilter);
    strategies[widgetKey]?.apply();
    setActiveCard(widgetKey);
  }, [activeCard, clearFilters, setExpenseDateRange, onStatusFilterChange, selectedFilters, addFilter]);

  // Handle status filter changes - use the hook's function (direct usage in handlers)

  // Handle clicking on missing receipts card
  const handleMissingReceiptsClick = useCallback(() => {
    const isNoReceiptFilterActive = selectedFilters.includes('noreceiptfilter');
    
    if (isNoReceiptFilterActive) {
      // Deactivate missing receipts → remove only that filter
      removeFilter('noreceiptfilter');
    } else {
      // Preserve currency filters while activating the missing receipts filter
      const currencyFilters = selectedFilters.filter((f) => f.startsWith('currency:'));
      clearFilters();
      currencyFilters.forEach((cf) => addFilter(cf));
      addFilter('noreceiptfilter');
    }
  }, [addFilter, removeFilter, selectedFilters, clearFilters]);

  // Function to fetch statistics data specifically (kept for compatibility; will be replaced by hook usage)
      const fetchItemStatistics = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const employeeId = contextProps?.userInfo?.employeeDetails?.employeeId;
      const accessToken = contextProps?.accessToken;

      if (!employeeId || !accessToken) {
        throw new Error('Missing employee ID or access token');
      }

      const today = dayjs();
      const currentMonthStart = today.startOf('month').format('YYYY-MM-DD HH:mm:ss');
      const currentMonthEnd = today.endOf('month').format('YYYY-MM-DD HH:mm:ss');

      const lastMonth = today.subtract(1, 'month');
      const previousMonthStart = lastMonth.startOf('month').format('YYYY-MM-DD HH:mm:ss');
      const previousMonthEnd = lastMonth.endOf('month').format('YYYY-MM-DD HH:mm:ss');

      const fetchStatsForPeriod = async (startDate: string, endDate: string) => {
        const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            query: GET_EXPENSE_ITEM_STATISTICS,
            variables: {
              employeeId,
              currencyRef: selectedCurrencyRef,
              startDate,
              endDate,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.errors) {
          throw new Error(result.errors.map((e: any) => e.message).join(', '));
        }

        return result.data?.totalExpenses?.aggregate?.sum?.totalAmount ?? 0;
      };

      const fetchPendingStatsForPeriod = async (startDate: string, endDate: string) => {
        const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            query: GET_PENDING_ITEMS_WITH_DATE_RANGE,
            variables: {
              employeeId,
              currencyRef: selectedCurrencyRef,
              startDate,
              endDate,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.errors) {
          throw new Error(result.errors.map((e: any) => e.message).join(', '));
        }

        return result.data?.pendingExcludingAllowance?.aggregate?.sum?.reimbursableAmount;
      };

      const [currentMonthTotal, previousMonthTotal, currentMonthPending, previousMonthPending] = await Promise.all([
        fetchStatsForPeriod(currentMonthStart, currentMonthEnd),
        fetchStatsForPeriod(previousMonthStart, previousMonthEnd),
        fetchPendingStatsForPeriod(currentMonthStart, currentMonthEnd),
        fetchPendingStatsForPeriod(previousMonthStart, previousMonthEnd),
      ]);

      if (isMounted.current) {
        setTotalExpenses(currentMonthTotal);
        setPreviousMonthTotalExpenses(previousMonthTotal);
        setPendingReimbursementTotal(currentMonthPending);
        setPreviousMonthPendingReimbursementTotal(previousMonthPending);
      }
    } catch (error) {
      if (isMounted.current) {
        setStatsError(error instanceof Error ? error.message : 'Unknown error fetching statistics');
      }
    } finally {
      if (isMounted.current) {
        setStatsLoading(false);
      }
    }
  }, [contextProps, selectedCurrencyRef]);

  // Fetch statistics on component mount
  useEffect(() => {
    if (!hideStats) {
      fetchItemStatistics();
    }
  }, [fetchItemStatistics, hideStats]);

  // Combine UI and card filters no longer needed locally (table consumes selectedFilters directly)

  // Create a custom getFilters function that includes date range parameters
  const getFiltersWithDateRange = useCallback((filtersToApply?: string[]) => {
    return getFilters(filtersToApply, null, null, expenseDateRange);
  }, [getFilters, expenseDateRange]);



  // Process completion event listener to refresh data
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        if (event.detail?.resolution === 'success') {
          // Refresh statistics data after successful process completion
          fetchItemStatistics();
          
          // Refresh pending item count (for display purposes, not for filtering)
          const fetchPendingItemCount = async () => {
            if (!contextProps.userInfo?.employeeDetails?.employeeId) return;
            try {
              const data = await graphqlClient.request(GET_PENDING_ITEMS, {
                employeeId: contextProps.userInfo.employeeDetails.employeeId,
                currencyRef: selectedCurrencyRef,
              });
              setPendingItemCountFromApi(
                data?.pendingExcludingAllowance?.aggregate?.count ?? 0
              );
            } catch (e) {
              setPendingItemCountFromApi(0);
            }
          };
          fetchPendingItemCount();
          
          // Reset all items to force refresh of statistics
          setHasLoadedAllItems(false);
          setAllItems([]);
          
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
  }, [fetchItemStatistics, contextProps.userInfo?.employeeDetails?.employeeId, graphqlClient]);

  // Memoize the content header to prevent unnecessary re-renders
  // Use allItems for statistics instead of filtered items
  const contentHeader = useMemo(() => {

    return (
      <div>
        <ExpenseItemStatistics 
          items={allItems ?? []} 
          totalExpenses={totalExpenses}
          previousMonthTotalExpenses={previousMonthTotalExpenses}
          pendingReimbursementTotal={pendingReimbursementTotal}
          previousMonthPendingReimbursementTotal={previousMonthPendingReimbursementTotal}
          pendingItemCountFromApi={pendingItemCountFromApi}
          statsLoading={statsLoading ?? !hasLoadedAllItems}
          statsError={statsError}
          fetchItemStatistics={fetchItemStatistics}
          onWidgetClick={handleWidgetClick}
          activeWidgetKey={activeCard ?? undefined}
          currencyCode={(selectedCurrencyRef?.split(':').pop()) || 'EUR'}
        />
      </div>
    );
  }, [allItems, totalExpenses, previousMonthTotalExpenses, selectedFilters, handleMissingReceiptsClick, statsLoading, statsError, fetchItemStatistics, hasLoadedAllItems, handleWidgetClick, activeCard, pendingReimbursementTotal, previousMonthPendingReimbursementTotal]);

  // Update the content header only when it changes and when allItems is loaded
  const onContentHeaderChange = props.onContentHeaderChange;
  useEffect(() => {
    if (hideStats) {
      // Explicitly clear any header when hideStats is requested
      if (onContentHeaderChange) {
        const timerId = setTimeout(() => {
          onContentHeaderChange(null);
        }, 0);
        return () => clearTimeout(timerId);
      }
      return;
    }
    // Only update content header when we have items and the callback exists
    if (onContentHeaderChange && allItems && allItems.length > 0) {
      const timerId = setTimeout(() => {
        onContentHeaderChange(contentHeader);
      }, 0);
      return () => clearTimeout(timerId);
    }
  }, [onContentHeaderChange, contentHeader, allItems, hideStats]);

  // One-time effect to fetch all items for statistics without filters
  useEffect(() => {
    // Skip heavy stats-only fetch when stats hidden
    if (hideStats) return;
    // Only fetch all items once
    if (!hasLoadedAllItems) {
      const fetchAllItemsForStats = async () => {
        try {
          
          // Use GraphQL directly for all-items query to avoid state conflicts
          const employeeId = contextProps?.userInfo?.employeeDetails?.employeeId;
          const accessToken = contextProps?.accessToken;
          
          if (!employeeId || !accessToken) {
            console.error('Missing employee ID or access token');
            return;
          }
          
          const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
              'Origin': window.location.origin,
            },
            credentials: 'include', // Include cookies for CORS requests
            mode: 'cors', // Explicitly set CORS mode
            body: JSON.stringify({
              query: GET_EXPENSE_ITEMS_BY_EMPLOYEE,
              variables: {
                employeeId: employeeId,
                searchTerm: '%',
                limit: 1000,
                offset: 0,
                status: Object.values(ExpenseStatus),
                expenseDateStart: null,
                expenseDateEnd: null,
                totalAmountMin: null,
                totalAmountMax: null,
                currencyRef: selectedCurrencyRef
              },
            }),
          });
  
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
  
          const result = await response.json();
          
          if (result.errors) {
            throw new Error(result.errors.map((e: any) => e.message).join(', '));
          }
          
          // Map the response data to our format
          const responseItems = result.data?.ExpenseItem ?? [];
          
          const mappedItems = responseItems.map((item: any) => ({
            id: item.id,
            description: item.description,
            date: item.date,
            status: item.status,
            totalAmount: item.totalAmount,
            reimbursableAmount: item.reimbursableAmount,
            nonReimbursableAmount: (item.totalAmount ?? 0) - (item.deductibleAmount ?? 0),
            deductibleAmount: item.deductibleAmount,
            currencyRef: item.currencyRef,
            costCenter: item.costCenter,
            expenseClass: item.expenseClass,
            additionalProperties: item.additionalProperties,
            expenseItemFile: item.expenseItemFile,
            employee: item.employee,
          }));
          
          setAllItems(mappedItems);
          setHasLoadedAllItems(true);
          
        } catch (error) {
          console.error('Error fetching statistics data:', error);
        }
      };
      
      fetchAllItemsForStats();
    }
  }, [contextProps?.userInfo?.employeeDetails?.employeeId, contextProps?.accessToken, hasLoadedAllItems, hideStats, selectedCurrencyRef]);

  // Handle adding a new expense item
  const handleAddExpenseItem = useCallback(() => {
    const employeeId = contextProps.userInfo?.employeeDetails?.employeeId;
    if (!employeeId) {
              console.warn('Cannot start process: Employee ID not available. User info may not be fully loaded.');
        console.warn(getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.user_information_not_loaded','User information not loaded yet. Please wait a moment and try again.'));
      return;
    }
    
    startProcess({
      domain: 'employee-expense',
      processName: 'changeExpenseItem',
      payload: {
        employeeId: employeeId
      },
      builderType: 'NATIVE_SCREEN'
    });
  }, [contextProps.userInfo?.employeeDetails?.employeeId]);

  return (
    <ExpenseItemsTable 
      {...contextProps}
      onAddExpenseItem={handleAddExpenseItem}
      // Pass the shared filter state to ensure toggle works
      selectedFilters={selectedFilters} // Use the hook's complete filter state instead of finalFilters
      addFilter={addFilter}
      removeFilter={removeFilter}
      clearFilters={clearFilters}
      filterGroups={filterGroups}
      filterLabelMap={filterLabelMap}
      getFilters={getFiltersWithDateRange}
      setFilters={setFilters}
      availableStatuses={availableStatuses}
      amountRange={amountRange}
      tableRefreshTrigger={tableRefreshTrigger}
      activeWidgetKey={activeCard ?? undefined}
    />
  );
};

export default ExpenseItemsTab;

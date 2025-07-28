import React, { useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import dayjs from 'dayjs';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { GET_EXPENSE_ITEMS_BY_EMPLOYEE, GET_EXPENSE_ITEM_STATISTICS, GET_PENDING_ITEMS } from '../../../queries/expenseItems';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { ExpenseStatus } from '../../../utils';
import ExpenseItemStatistics from './ExpenseItemStatistics';
import ExpenseItemsTable from './ExpenseItemsTable';
import { useExpenseItemsFilters } from '../../../hooks/useExpenseItemsFilters';
import { startProcess } from '@/common/utils/start-process';
import { env } from '@/common/env/EnvUtils';

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
    'RETURNED',
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
    setAmountRange,
    onStatusFilterChange
  } = useExpenseItemsFilters(availableStatuses);

  const [activeCard, setActiveCard] = useState<string | null>(null);

  // Centralized handler to clear all filters (UI + card)
  const handleClearAllFilters = useCallback(() => {
    setFilters([]);
    setExpenseDateRange(null);
  }, [setFilters, setExpenseDateRange]);
  
  // State for storing all items for statistics
  const [allItems, setAllItems] = useState<any[]>([]);
  const [hasLoadedAllItems, setHasLoadedAllItems] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [totalExpenses, setTotalExpenses] = useState<number | null>(null);
  const [previousMonthTotalExpenses, setPreviousMonthTotalExpenses] = useState<number | null>(null);
  const [pendingReimbursementTotal, setPendingReimbursementTotal] = useState<number>(0);
  const [pendingItemCountFromApi, setPendingItemCountFromApi] = useState<number>(0);
  const graphqlClient = useGraphQLClient(contextProps.accessToken);
  
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
    
    if (storedFilter) {
      
      
      // Clear existing filters first
      clearFilters();
      
      // Add the filter from sessionStorage
      addFilter(storedFilter);
      
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

  const handleWidgetClick = useCallback((widgetKey: string) => {
    setActiveCard(prev => (prev === widgetKey ? null : widgetKey));
  }, []);



  // Handle status filter changes - use the hook's function
  const handleStatusFilterChange = onStatusFilterChange;

  // Handle clicking on missing receipts card
  const handleMissingReceiptsClick = useCallback(() => {
    const isNoReceiptFilterActive = selectedFilters.includes('noreceiptfilter');
    
    if (isNoReceiptFilterActive) {
      // If filter is already active, remove it
      removeFilter('noreceiptfilter');
      
    } else {
      // Clear existing filters first to avoid multiple filters
      clearFilters();
      
      // Add the no receipt filter
      addFilter('noreceiptfilter');
      
    }
  }, [addFilter, removeFilter, selectedFilters, clearFilters]);

  // Function to fetch statistics data specifically
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
      const currentMonthStart = today.startOf('month').toISOString();
      const currentMonthEnd = today.endOf('month').toISOString();

      const lastMonth = today.subtract(1, 'month');
      const previousMonthStart = lastMonth.startOf('month').toISOString();
      const previousMonthEnd = lastMonth.endOf('month').toISOString();

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
              currencyRef: 'Currency:v1:EUR',
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

      const [currentMonthTotal, previousMonthTotal] = await Promise.all([
        fetchStatsForPeriod(currentMonthStart, currentMonthEnd),
        fetchStatsForPeriod(previousMonthStart, previousMonthEnd),
      ]);

      if (isMounted.current) {
        setTotalExpenses(currentMonthTotal);
        setPreviousMonthTotalExpenses(previousMonthTotal);
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
  }, [contextProps]);

  // Fetch statistics on component mount
  useEffect(() => {
    fetchItemStatistics();
  }, [fetchItemStatistics]);

  // Combine UI and card filters
  const finalFilters = useMemo(() => {
    let filters = [...selectedFilters];
    
    // Map card keys to filter values as needed
    if (activeCard === 'pending-reimbursement' && !filters.includes('pending')) {
      filters.push('pending');
    }
    
    if (activeCard === 'total-expenses') {
      // Only filter paid or closed items for total expenses
      filters = filters.filter(f => f !== 'pending' && f !== 'submitted' && f !== 'in progress');
      if (!filters.includes('paid')) filters.push('paid');
      if (!filters.includes('closed')) filters.push('closed');
    }
    
    return filters;
  }, [selectedFilters, activeCard]);

  // Create a custom getFilters function that includes date range parameters
  const getFiltersWithDateRange = useCallback((filtersToApply?: string[]) => {
    return getFilters(filtersToApply, null, null, expenseDateRange);
  }, [getFilters, expenseDateRange]);

  // Fetch pending reimbursement total
  useEffect(() => {
    const fetchPendingItems = async () => {
      if (!contextProps.userInfo?.employeeDetails?.employeeId) return;
      try {
        const data = await graphqlClient.request(GET_PENDING_ITEMS, {
          employeeId: contextProps.userInfo.employeeDetails.employeeId,
        });
        setPendingReimbursementTotal(
          data?.pendingExcludingAllowance?.aggregate?.sum?.reimbursableAmount ?? 0
        );
        setPendingItemCountFromApi(
          data?.pendingExcludingAllowance?.aggregate?.count ?? 0
        );
      } catch (e) {
        setPendingReimbursementTotal(0);
      }
    };
    fetchPendingItems();
  }, [contextProps.userInfo?.employeeDetails?.employeeId, graphqlClient]);

  // Memoize the content header to prevent unnecessary re-renders
  // Use allItems for statistics instead of filtered items
  const contentHeader = useMemo(() => {
    const isNoReceiptFilterActive = selectedFilters.includes('noreceiptfilter');

    return (
      <div>
        <ExpenseItemStatistics 
          items={allItems ?? []} 
          totalExpenses={totalExpenses}
          previousMonthTotalExpenses={previousMonthTotalExpenses}
          pendingReimbursementTotal={pendingReimbursementTotal}
          pendingItemCountFromApi={pendingItemCountFromApi}
          onMissingReceiptsClick={handleMissingReceiptsClick} 
          isNoReceiptFilterActive={isNoReceiptFilterActive}
          statsLoading={statsLoading ?? !hasLoadedAllItems}
          statsError={statsError}
          fetchItemStatistics={fetchItemStatistics}
          onWidgetClick={handleWidgetClick}
          activeWidgetKey={activeCard ?? undefined}
          onExpenseDateRangeFilterChange={setExpenseDateRange}
          onStatusFilterChange={handleStatusFilterChange}
        />
      </div>
    );
  }, [allItems, totalExpenses, previousMonthTotalExpenses, selectedFilters, handleMissingReceiptsClick, statsLoading, statsError, fetchItemStatistics, hasLoadedAllItems, handleWidgetClick, activeCard, pendingReimbursementTotal, expenseDateRange, handleStatusFilterChange]);

  // Update the content header only when it changes and when allItems is loaded
  const onContentHeaderChange = props.onContentHeaderChange;
  useEffect(() => {
    // Only update content header when we have items and the callback exists
    if (onContentHeaderChange && allItems && allItems.length > 0) {
      // Use a small timeout to ensure proper React rendering cycle
      const timerId = setTimeout(() => {
        onContentHeaderChange(contentHeader);
      }, 0);
      return () => clearTimeout(timerId);
    }
  }, [onContentHeaderChange, contentHeader, allItems]);

  // One-time effect to fetch all items for statistics without filters
  useEffect(() => {
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
                currencyRef: 'Currency:v1:EUR'
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
  }, [contextProps?.userInfo?.employeeDetails?.employeeId, contextProps?.accessToken, hasLoadedAllItems]);

  // Handle adding a new expense item
  const handleAddExpenseItem = useCallback(() => {
    const employeeId = contextProps.userInfo?.employeeDetails?.employeeId;
    if (!employeeId) {
              console.warn('Cannot start process: Employee ID not available. User info may not be fully loaded.');
        console.warn('User information not loaded yet. Please wait a moment and try again.');
      return;
    }
    
    console.log('Starting create expense process for employeeId:', employeeId);
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
      selectedFilters={finalFilters}
      addFilter={addFilter}
      removeFilter={removeFilter}
      clearFilters={clearFilters}
      filterGroups={filterGroups}
      filterLabelMap={filterLabelMap}
      getFilters={getFiltersWithDateRange}
      setFilters={handleClearAllFilters}
      availableStatuses={availableStatuses}
      amountRange={amountRange}
    />
  );
};

export default ExpenseItemsTab;

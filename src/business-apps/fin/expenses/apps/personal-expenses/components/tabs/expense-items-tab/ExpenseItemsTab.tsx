import React, { useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import dayjs from 'dayjs';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { GET_EXPENSE_ITEMS_BY_EMPLOYEE, GET_EXPENSE_ITEM_STATISTICS } from '../../../queries/expenseItems';
import { ExpenseStatus } from '../../../utils';
import ExpenseItemStatistics from './ExpenseItemStatistics';
import ExpenseItemsTable from './ExpenseItemsTable';
import { useExpenseFilters } from '../../../hooks/useExpenseFilters';
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
    userInfo: props.userInfo
  }), [props.accessToken, props.userInfo]);
  
  // Use our simplified expense filters hook
  const {
    addFilter,
    removeFilter,
    clearFilters,
    selectedFilters,
    filterGroups,
    filterLabelMap,
    getFilters,
    setFilters
  } = useExpenseFilters();

  const [activeCard, setActiveCard] = useState<string | null>(null);
  
  // State for storing all items for statistics
  const [allItems, setAllItems] = useState<any[]>([]);
  const [hasLoadedAllItems, setHasLoadedAllItems] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
      const [statsError, setStatsError] = useState<string | null>(null);
    const [totalExpenses, setTotalExpenses] = useState<number | null>(null);
  const [previousMonthTotalExpenses, setPreviousMonthTotalExpenses] = useState<number | null>(null);
  
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
      console.log('Found filter in sessionStorage:', storedFilter);
      
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
        console.log('Applying filter from global API:', apiFilter);
        
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

  // Handle clicking on missing receipts card
  const handleMissingReceiptsClick = useCallback(() => {
    const isNoReceiptFilterActive = selectedFilters.includes('noreceiptfilter');
    
    if (isNoReceiptFilterActive) {
      // If filter is already active, remove it
      removeFilter('noreceiptfilter');
      console.log('Removing Missing Receipts filter');
    } else {
      // Clear existing filters first to avoid multiple filters
      clearFilters();
      
      // Add the no receipt filter
      addFilter('noreceiptfilter');
      console.log('Applying Missing Receipts filter');
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
        console.error('Error fetching statistics data:', error);
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

  const finalFilters = useMemo(() => {
    const cardFilters: string[] = [];
    if (activeCard === 'total-expenses') {
      cardFilters.push(ExpenseStatus.PAID.toLowerCase(), ExpenseStatus.CLOSED.toLowerCase());
    } else if (activeCard === 'pending-reimbursement') {
      cardFilters.push(ExpenseStatus.PENDING.toLowerCase());
    }
    // Combine and remove duplicates
    return [...new Set([...selectedFilters, ...cardFilters])];
  }, [selectedFilters, activeCard]);

  // Memoize the content header to prevent unnecessary re-renders
  // Use allItems for statistics instead of filtered items
      const contentHeader = useMemo(() => {
    const isNoReceiptFilterActive = selectedFilters.includes('noreceiptfilter');
    return (
      <ExpenseItemStatistics 
        items={allItems ?? []} 
        totalExpenses={totalExpenses}
        previousMonthTotalExpenses={previousMonthTotalExpenses}
        onMissingReceiptsClick={handleMissingReceiptsClick} 
        isNoReceiptFilterActive={isNoReceiptFilterActive}
        statsLoading={statsLoading ?? !hasLoadedAllItems}
        statsError={statsError}
        fetchItemStatistics={fetchItemStatistics}
        onWidgetClick={handleWidgetClick}
        activeWidgetKey={activeCard ?? undefined}
      />
    );
  }, [allItems, totalExpenses, previousMonthTotalExpenses, selectedFilters, handleMissingReceiptsClick, statsLoading, statsError, fetchItemStatistics, hasLoadedAllItems, handleWidgetClick, activeCard]);

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
          console.log('Fetching all expense items for statistics...');
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
          console.log(`Loaded ${mappedItems.length} unfiltered items for statistics`);
        } catch (error) {
          console.error('Error fetching statistics data:', error);
        }
      };
      
      fetchAllItemsForStats();
    }
  }, [contextProps?.userInfo?.employeeDetails?.employeeId, contextProps?.accessToken, hasLoadedAllItems]);

  // Handle adding a new expense item
  const handleAddExpenseItem = useCallback(() => {
    if (contextProps.userInfo?.employeeDetails?.employeeId) {
      startProcess({
        domain: 'employee-expense',
        processName: 'changeExpenseItem',
        payload: {
          employeeId: contextProps.userInfo.employeeDetails.employeeId
        }
      });
    }
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
      getFilters={getFilters}
      setFilters={(filters: string[]) => {
        setFilters(filters);
        setActiveCard(null);
      }}
    />
  );
};

export default ExpenseItemsTab;

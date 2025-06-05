import React, { useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { Table, Button, Typography, Space, Spin, Alert } from 'antd';
import { FileTextOutlined, FileImageOutlined } from '@ant-design/icons';
import { PiLightning } from 'react-icons/pi';
import { useGetExpenseItems, ExpenseFilter } from '../../hooks/useGetExpenseItems';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import Pill from '@/components/pill/Pill';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { GET_EXPENSE_ITEMS_BY_EMPLOYEE } from '../../queries/expenseItems';
import { getExpenseItemStatusDisplay, ExpenseStatus } from '../../utils';
import ExpenseItemDetails from './ExpenseItemDetails';
import ExpenseItemStatistics from './ExpenseItemStatistics';
import { useExpenseFilters } from '../../hooks/useExpenseFilters';
// No longer using React Router for tab navigation

const { Text } = Typography;

export interface ExpenseItemsTabProps extends BusinessAppContextProps {
  onContentHeaderChange?: (header: ReactNode) => void;
}

const ExpenseItemsTab: React.FC<ExpenseItemsTabProps> = (props) => {
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
    userInfo: props.userInfo
  }), [props.accessToken, props.userInfo]);
  
  // No longer using location for navigation
  
  // Use our simplified expense filters hook
  const {
    search,
    setSearch,
    selectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    getFilters
  } = useExpenseFilters();
  
  // Get expense items with the filters
  // Use a single hook call for both filtered items and statistics
  const { items, isLoading, error, totalCount, fetchItems } = useGetExpenseItems(contextProps);
  
  // State for storing all items for statistics
  const [allItems, setAllItems] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  
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
      selectedFilters.forEach(f => removeFilter(f));
      
      // Add the filter from sessionStorage
      addFilter(storedFilter);
      
      // Create filter object for the API
      const filter: ExpenseFilter = {};
      
      // Handle specific filters
      if (storedFilter === 'noreceiptfilter') {
        filter.noReceipt = true;
        console.log('Setting noReceipt filter to true');
      }
      
      // Apply the filter directly
      console.log('Applying filter to fetchItems:', filter);
      fetchItems(search, 1, pageSize, filter);
      
      // Clear the sessionStorage after using it
      sessionStorage.removeItem('expenseItemsFilter');
    }
  // Only run this effect once when the component mounts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Listen for the global API filter changes
  useEffect(() => {
    // Check the global API for filter changes
    const checkGlobalFilter = () => {
      const apiFilter = window.tabNavigationAPI?.filter;
      if (apiFilter && !selectedFilters.includes(apiFilter)) {
        console.log('Applying filter from global API:', apiFilter);
        
        // Clear existing filters first
        selectedFilters.forEach(f => removeFilter(f));
        
        // Add the filter from global API
        addFilter(apiFilter);
        
        // Create filter object for the API
        const filter: ExpenseFilter = {};
        
        // Handle specific filters
        if (apiFilter === 'noreceiptfilter') {
          filter.noReceipt = true;
          console.log('Setting noReceipt filter to true from global API');
        }
        
        // Apply the filter directly
        console.log('Applying filter to fetchItems from global API:', filter);
        fetchItems(search, 1, pageSize, filter);
        
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
  }, [addFilter, removeFilter, fetchItems, search, pageSize, selectedFilters]);
  
  // Create a memoized search change handler
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setCurrentPage(1); // Reset to first page on new search
    // Apply filters when search changes
    const filters = getFilters();
    fetchItems(value, 1, pageSize, filters);
  }, [fetchItems, pageSize, getFilters]);
  
  // Define constants for filter options to avoid TypeScript errors
  const TIME_PERIOD_OPTIONS = ['last30days', 'last90days', 'last180days'];
  const EXPENSE_TYPE_OPTIONS = ['expense', 'trip'];
  const OTHER_OPTIONS = ['noreceiptfilter'];

  // Handle filter changes
  const handleFilterChange = useCallback((filterId: string, selected: boolean) => {
    // Initialize with the current selected filters
    let newSelectedFilters: string[] = [...selectedFilters];
    
    // Apply the filter change based on selection
    if (selected) {
      // Special handling for radio filter types (time period)
      if (TIME_PERIOD_OPTIONS.includes(filterId)) {
        // Remove any existing time period filter
        newSelectedFilters = [...newSelectedFilters.filter(f => !TIME_PERIOD_OPTIONS.includes(f)), filterId];
      } else if (!newSelectedFilters.includes(filterId)) {
        // For multi-select filters, just add if not already selected
        newSelectedFilters.push(filterId);
      }
      
      // Also call the original function to keep state consistent
      addFilter(filterId);
    } else {
      // Remove the filter
      newSelectedFilters = newSelectedFilters.filter(f => f !== filterId);
      
      // Also call the original function to keep state consistent
      removeFilter(filterId);
    }
    
    setCurrentPage(1); // Reset to first page when filters change
    
    // Apply filter immediately without waiting for state update
    const filter: ExpenseFilter = {};
    
    // Extract filters by types using our immediate newSelectedFilters
    const timePeriod = newSelectedFilters.find(f => TIME_PERIOD_OPTIONS.includes(f)) || null;
    
    // Get status filters and convert back to uppercase (as they're stored in ExpenseStatus enum)
    const statusFilters = newSelectedFilters.filter(f => 
      Object.values(ExpenseStatus).map(s => s.toLowerCase()).includes(f));
    
    // Map the lowercase status filters back to their uppercase enum values
    const statuses = statusFilters.map(f => f.toUpperCase());
    
    const expenseTypes = newSelectedFilters.filter(f => EXPENSE_TYPE_OPTIONS.includes(f));
    const otherFilters = newSelectedFilters.filter(f => OTHER_OPTIONS.includes(f));
    
    // Process status filters
    if (statuses.length > 0) {
      // Use all selected statuses, not just the first one
      filter.status = statuses;
      console.log('Applying multiple status filters:', statuses);
    }
    
    // Process Other filters (No receipt)
    if (otherFilters.includes('noreceiptfilter')) {
      filter.noReceipt = true;
      console.log('Adding No Receipt filter');
    }
    
    // Process time period filters
    if (timePeriod) {
      const today = new Date();
      const endDate = new Date(today).toISOString().split('T')[0]; 
      
      // Calculate start date based on selected time period
      let startDate = new Date(today);
      if (timePeriod === 'last30days') {
        startDate.setDate(today.getDate() - 30);
      } else if (timePeriod === 'last90days') {
        startDate.setDate(today.getDate() - 90);
      } else if (timePeriod === 'last180days') {
        startDate.setDate(today.getDate() - 180);
      }
      
      filter.expenseDateStart = startDate.toISOString().split('T')[0];
      filter.expenseDateEnd = endDate;
    }
    
    // Process expense type filters
    if (expenseTypes.length > 0) {
      // For now, use only the first selected expense type since expenseClass doesn't support multiple values
      const selectedType = expenseTypes[0];
      
      // Map UI expense types to the expected API values
      if (selectedType === 'expense') {
        filter.expenseClass = { value: 'Expense' };
      } else if (selectedType === 'trip') {
        filter.expenseClass = { value: 'Trip' };
      }
    }
    
    console.log('Applying immediate filter:', filter, 'from selected filters:', newSelectedFilters);
    
    // Apply the updated filters immediately
    fetchItems(search, 1, pageSize, filter);
  }, [addFilter, removeFilter, search, pageSize, fetchItems]);
  
  
  // Handle adding a new expense item
  const handleAddExpenseItem = useCallback(() => {
    // Add logic to create a new expense item
    console.log('Adding new expense item');
  }, []);
  
  // Handle clicking on missing receipts card
  const handleMissingReceiptsClick = useCallback(() => {
    const isNoReceiptFilterActive = selectedFilters.includes('noreceiptfilter');
    let filter: ExpenseFilter = {};
    
    if (isNoReceiptFilterActive) {
      // If filter is already active, remove it
      removeFilter('noreceiptfilter');
      console.log('Removing Missing Receipts filter');
      
      // Apply with no filters
      setCurrentPage(1); // Reset to first page
      fetchItems(search, 1, pageSize, filter);
    } else {
      // Clear existing filters first to avoid multiple filters
      selectedFilters.forEach(f => removeFilter(f));
      
      // Add the no receipt filter
      addFilter('noreceiptfilter');
      filter.noReceipt = true;
      console.log('Applying Missing Receipts filter');
      
      // Apply the filter directly
      setCurrentPage(1); // Reset to first page
      fetchItems(search, 1, pageSize, filter);
    }
  }, [addFilter, removeFilter, fetchItems, search, pageSize, selectedFilters, setCurrentPage]);

  // Statistics are now handled by the ExpenseItemStatistics component

  // Memoize the content header to prevent unnecessary re-renders
  // Use allItems for statistics instead of filtered items
  const contentHeader = useMemo(() => {
    const isNoReceiptFilterActive = selectedFilters.includes('noreceiptfilter');
    return allItems && allItems.length > 0 ? 
      <ExpenseItemStatistics 
        items={allItems} 
        onMissingReceiptsClick={handleMissingReceiptsClick} 
        isNoReceiptFilterActive={isNoReceiptFilterActive} 
      /> : null;
  }, [allItems, selectedFilters, handleMissingReceiptsClick]);

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




  // Load initial data with filters for the table
  useEffect(() => {
    const filters = getFilters();
    fetchItems(search, currentPage, pageSize, filters);
  }, []);
  
  // Track if we've loaded the all items data for statistics
  const [hasLoadedAllItems, setHasLoadedAllItems] = useState(false);
  
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
          
          const response = await fetch('https://newwork-dev.newwork.com/v1/graphql', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              query: GET_EXPENSE_ITEMS_BY_EMPLOYEE,
              variables: {
                employeeId: employeeId,
                searchTerm: '%',
                limit: 1000,
                offset: 0,
                status: Object.values(ExpenseStatus), // Include all statuses for statistics
                expenseDateStart: null,
                expenseDateEnd: null,
                totalAmountMin: null,
                totalAmountMax: null
                // Note: expenseClass filtering is done on client-side, not in GraphQL
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
          const responseItems = result.data?.ExpenseItem || [];
          
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
  
  // Handle pagination changes
  const handlePageChange = useCallback((page: number, pageSize?: number) => {
    setCurrentPage(page);
    const filters = getFilters();
    fetchItems(search, page, pageSize || 10, filters);
  }, [search, fetchItems, getFilters]);
  
  // Handle page size change
  const handlePageSizeChange = useCallback((_: number, size: number) => {
    setPageSize(size);
    setCurrentPage(1);
    const filters = getFilters();
    fetchItems(search, 1, size, filters);
  }, [search, fetchItems, getFilters]);

  // Handle item selection
  const handleSelectItem = useCallback((item: any) => {
    setSelectedItem(item);
    setSelectedRowKeys([item.id]);
  }, []);
  
  // Handle row selection change
  const handleRowSelectionChange = useCallback((newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
    
    // If a single row is selected, find and set the selected item
    if (newSelectedRowKeys.length === 1) {
      const selectedItemId = newSelectedRowKeys[0];
      const item = items?.find(item => item.id === selectedItemId);
      if (item) {
        setSelectedItem(item);
      }
    } else {
      // If multiple or no rows selected, clear the selected item
      setSelectedItem(null);
    }
  }, [items]);
  
  // Handle closing the details panel
  const handleCloseDetails = useCallback(() => {
    setSelectedItem(null);
    setSelectedRowKeys([]);
  }, []);

  const renderDataBody = useCallback(() => {
    if (isLoading) {
      return <div style={{ padding: 24, textAlign: 'center' }}><Spin size="large" /></div>;
    }

    if (error) {
      return <Alert message="Error" description={error} type="error" showIcon />;
    }

    if (!items || items.length === 0) {
      return (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <Text>No expense items found. Create your first expense item to get started.</Text>
        </div>
      );
    }

    return (
      <Table 
        dataSource={items} 
        rowKey="id"
        rowSelection={{
          type: 'checkbox',
          selectedRowKeys,
          onChange: handleRowSelectionChange,
          columnWidth: 48,
        }}
        onRow={(record) => ({
          onClick: (event) => {
            // Prevent row click from triggering when clicking on checkbox
            if ((event.target as HTMLElement).tagName !== 'INPUT') {
              handleSelectItem(record);
            }
          },
          style: { cursor: 'pointer' }
        })}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: totalCount,
          onChange: handlePageChange,
          onShowSizeChange: handlePageSizeChange,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} items`
        }}
        columns={[
          {
            title: 'ITEM',
            dataIndex: 'title',
            key: 'title',
            render: (text, record) => (
              <div>
                <div style={{ fontWeight: 'bold' }}>{text}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{record.invoiceDate}</div>
              </div>
            )
          },
          {
            title: 'ATTACHMENT',
            dataIndex: 'expenseItemFile',
            key: 'attachment',
            width: 80,
            align: 'center',
            render: (expenseItemFile) => (
              expenseItemFile && expenseItemFile.length > 0 ? (
                <div className="gba:flex gba:items-center gba:justify-center">
                  <FileImageOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                </div>
              ) : (
                <div className="gba:flex gba:items-center gba:justify-center">
                  <FileImageOutlined style={{ fontSize: '24px', color: '#d9d9d9' }} />
                </div>
              )
            )
          },
          {
            title: 'AMOUNT',
            dataIndex: 'reimbursableAmount',
            key: 'amount',
            align: 'right',
            render: (amount) => (
              <span style={{ fontWeight: 'bold' }}>€{amount?.toFixed(2) ?? '0.00'}</span>
            )
          },
          {
            title: 'STATUS',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
              const { label, type } = getExpenseItemStatusDisplay(status);
              return (
                <Pill 
                  label={label} 
                  type={type} 
                  className="gba:text-center"
                />
              );
            }
          },
          {
            title: 'ACTIONS',
            key: 'actions',
            render: () => (
              <Space>
                <Button 
                  type="text" 
                  size="small" 
                  icon={<PiLightning size={18} />}
                  className="gba:transition-colors gba:duration-300 hover:gba:text-blue-500"
                  aria-label="Edit"
                />
              </Space>
            )
          }
        ]}
      />
    );
  }, [items, currentPage, pageSize, handlePageChange, handlePageSizeChange]);

  // Render expense details panel using the ExpenseItemDetails component
  const renderExpenseDetails = useMemo(() => {
    if (!selectedItem) return null;

    return (
      <ExpenseItemDetails 
        selectedItem={selectedItem} 
        onClose={handleCloseDetails}
        {...contextProps}
      />
    );
  }, [selectedItem, handleCloseDetails, contextProps]);

  return (
    <>
      <DataContainer
        dataControllerProps={{
          search: search,
          filter: selectedFilters,
          setSearch: handleSearchChange,
          setFilter: (newFilters) => {
            // Handle filter removal when X is clicked or filters are cleared
            const filtersToRemove = selectedFilters.filter(f => !newFilters.includes(f));
            filtersToRemove.forEach(filterId => removeFilter(filterId));
            console.log('Filters removed:', filtersToRemove);
            
            // Always fetch new data with the remaining filters
            setCurrentPage(1); // Reset to first page
            
            // Build filters based on newFilters (remaining filters)
            const filter: ExpenseFilter = {};
            
            // Extract filters by types using our immediate newFilters
            const timePeriod = newFilters.find(f => TIME_PERIOD_OPTIONS.includes(f)) || null;
            
            // Get status filters and convert back to uppercase
            const statusFilters = newFilters.filter(f => 
              Object.values(ExpenseStatus).map(s => s.toLowerCase()).includes(f));
            const statuses = statusFilters.map(f => f.toUpperCase());
            
            // Process status filters
            if (statuses.length > 0) {
              filter.status = statuses;
            }
            
            // Process time period filters
            if (timePeriod) {
              const today = new Date();
              const endDate = new Date(today).toISOString().split('T')[0];
              
              // Calculate start date based on selected time period
              let startDate = new Date(today);
              if (timePeriod === 'last30days') {
                startDate.setDate(today.getDate() - 30);
              } else if (timePeriod === 'last90days') {
                startDate.setDate(today.getDate() - 90);
              } else if (timePeriod === 'last180days') {
                startDate.setDate(today.getDate() - 180);
              }
              
              filter.expenseDateStart = startDate.toISOString().split('T')[0];
              filter.expenseDateEnd = endDate;
            }
            
            // Process expense type filters
            const expenseTypes = newFilters.filter(f => EXPENSE_TYPE_OPTIONS.includes(f));
            if (expenseTypes.length > 0) {
              const selectedType = expenseTypes[0];
              filter.expenseClass = { value: selectedType === 'expense' ? 'Expense' : 'Trip' };
            }
            
            // Process Other filters (No receipt)
            const otherFilters = newFilters.filter(f => OTHER_OPTIONS.includes(f));
            if (otherFilters.includes('noreceiptfilter')) {
              filter.noReceipt = true;
              console.log('Preserving No Receipt filter');
            }
            
            console.log('Fetching with remaining filters:', filter);
            fetchItems(search, 1, pageSize, filter);
          },
          addButton: {
            onClick: handleAddExpenseItem,
            label: 'Add',
            'data-testid': 'add-expense-item-button'
          },
          listTitle: "My Expense Items",
          filterLabelMap: filterLabelMap,
        }}
        dataFilterProps={{
          filterGroups: filterGroups,
          onFilterChange: handleFilterChange,
        }}
        hideFilter={false}
        dataBody={renderDataBody()}
        contentBackground="white"
        dataDetails={selectedItem ? {
          title: selectedItem.title,
          icon: <FileTextOutlined />,
          content: renderExpenseDetails,
          onClose: handleCloseDetails
        } : undefined}
      />
      {items.length > 0 && (
        <div style={{ textAlign: 'right', padding: '16px 24px' }}>
          <Text type="secondary">Showing {items.length} of {totalCount} items</Text>
        </div>
      )}
    </>
  );
};

export default ExpenseItemsTab;

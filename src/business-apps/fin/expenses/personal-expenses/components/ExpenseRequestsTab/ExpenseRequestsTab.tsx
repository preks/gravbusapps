import React, { useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { 
  Spin, 
  Alert, 
  Button, 
  Table, 
  Empty
} from 'antd';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import { useGetExpenseRequests } from '../../hooks/useGetExpenseRequests';
import { useExpenseRequestFilters, ExpenseRequestFilter, ExpenseRequestStatus } from '../../hooks/useExpenseRequestFilters';
import { getExpenseRequestStatusDisplay, ExpenseStatus } from '../../utils';
import { InfoCircleOutlined } from '@ant-design/icons';
import { PiLightning } from 'react-icons/pi';
import Pill, { PillType } from '@/components/pill';
import ExpenseRequestStatistics from './ExpenseRequestStatistics';
import ExpenseRequestDetails from './ExpenseRequestDetails';



export interface ExpenseRequestsTabProps extends BusinessAppContextProps {
  onContentHeaderChange?: (header: ReactNode) => void;
}

const DEFAULT_PAGE_SIZE = 10;

const ExpenseRequestsTab: React.FC<ExpenseRequestsTabProps> = (props) => {
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
    userInfo: props.userInfo
  }), [props.accessToken, props.userInfo]);
  
  // Use the expense request filters hook
  const {
    search,
    setSearch,
    selectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    getFilters
  } = useExpenseRequestFilters();

  const { items, isLoading, error, totalCount, fetchItems } = useGetExpenseRequests(contextProps);

  const [searchInput, setSearchInput] = useState(''); // Live input value
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(''); // Debounced value for API
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Statistics are now calculated in the ExpenseRequestStatistics component
  
  // No need for client-side filtering as we're using server-side search
  
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

  // Unified useEffect for fetching data whenever pagination or filters change
  // We don't need to respond to debouncedSearchTerm changes anymore since we're fetching immediately in handleSearchChange
  useEffect(() => {
    const currentFilters = getFilters();
    console.log('Pagination or filters changed, fetching data immediately');
    fetchItems(searchInput, currentPage, pageSize, currentFilters);
  }, [fetchItems, currentPage, pageSize, selectedFilters, searchInput]); // Using searchInput directly

  // Define constants for filter options to avoid TypeScript errors
  const TIME_PERIOD_OPTIONS = ['last30days', 'last90days', 'last180days'];
  const REQUEST_TYPE_OPTIONS = ['general', 'trip'];

  // Create memoized search handler with NO debounce for immediate API calls
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    // Immediately update the debounced value without waiting
    setDebouncedSearchTerm(value);
    
    // Also trigger an immediate fetch with the new search value
    const currentFilters = getFilters();
    fetchItems(value, currentPage, pageSize, currentFilters);
  }, [fetchItems, currentPage, pageSize, getFilters]);

  // Handle filter changes
  const handleFilterChange = useCallback((filterId: string, selected: boolean) => {
    // Update filter state
    if (selected) {
      addFilter(filterId);
    } else {
      removeFilter(filterId);
    }
    
    // Reset to first page when filters change
    setCurrentPage(1);
    
    // Get updated filters and trigger API call immediately
    // We need to manually calculate the updated filters since the state update hasn't processed yet
    const updatedFilters = {...getFilters()};
    if (selected && !updatedFilters.status?.includes(filterId.toUpperCase())) {
      // If adding a status filter
      if (Object.values(ExpenseRequestStatus).map(s => s.toLowerCase()).includes(filterId)) {
        // Map UI status to backend status
        let backendStatus;
        switch (filterId) {
          case 'draft': backendStatus = ExpenseStatus.CREATED; break;
          case 'submitted': backendStatus = ExpenseStatus.PENDING; break;
          case 'approved': backendStatus = ExpenseStatus.APPROVED; break;
          case 'rejected': backendStatus = ExpenseStatus.REJECTED; break;
          case 'paid': backendStatus = ExpenseStatus.PAID; break;
          case 'cancelled': backendStatus = ExpenseStatus.CLOSED; break;
          default: backendStatus = filterId.toUpperCase();
        }
        
        updatedFilters.status = updatedFilters.status ? [...updatedFilters.status, backendStatus] : [backendStatus];
      }
      // Handle other filter types if needed
    } else if (!selected) {
      // If removing a filter, we'll just use getFilters() which should have the updated state
    }
    
    // Trigger API call immediately with the updated filters
    console.log('Filter change handler - making immediate API call');
    fetchItems(searchInput, 1, pageSize, updatedFilters);
  }, [addFilter, removeFilter, setCurrentPage, getFilters, fetchItems, debouncedSearchTerm, pageSize]);

  // Handle page change
  const handlePageChange = useCallback((page: number, pageSize?: number) => {
    setCurrentPage(page);
    const filters = getFilters();
    // Use current search input to avoid debounce delay
    fetchItems(searchInput, page, pageSize ?? 10, filters);
  }, [fetchItems, searchInput, getFilters]);

  // Handle page size change
  const handlePageSizeChange = useCallback((_: number, size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
    const filters = getFilters();
    // Use current search input to avoid debounce delay
    fetchItems(searchInput, 1, size, filters);
  }, [fetchItems, searchInput, getFilters]);

  // Handle adding a new expense request
  const handleAddExpenseRequest = useCallback(() => {
    // Add logic to create a new expense request
    console.log('Adding new expense request');
  }, []);

  // Helper function to determine status display with memoization
  const getStatusDisplay = useCallback((status: string): { type: PillType; text: string } => {
    const statusConfig = getExpenseRequestStatusDisplay(status);
    return { type: statusConfig.type, text: statusConfig.label };
  }, []);

  // Selected item for details panel
  const [selectedItem, setSelectedItem] = useState<typeof items[0] | null>(null);

  // Selected row keys for table
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Handle row selection change
  const handleRowSelectionChange = useCallback((newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  }, []);

  // Handle item selection
  const handleSelectItem = useCallback((item: typeof items[0]) => {
    setSelectedItem(item);
  }, []);

  // Handle editing an expense request
  const handleEditExpenseRequest = useCallback((item: typeof items[0]) => {
    // Add logic to edit the expense request
    console.log('Editing expense request:', item.id);
  }, []);

  // Render the data body with memoization
  const renderDataBody = useCallback(() => {
    // Show error message if there's an error
    if (error) {
      const errorMessage = typeof error === 'string' ? error : (error as Error)?.message || 'Failed to load expense requests.';
      return <Alert message="Error" description={errorMessage} type="error" showIcon />;
    }

    // Show empty state only when not loading and there are no items
    if (!isLoading && (!items || items.length === 0)) {
      return <Empty 
        description="No expense requests found matching your criteria." 
        style={{ margin: '40px 0' }}
      />;
    }
    
    // Always render the table, but use the loading prop to show loading state
    // This keeps the table visible during loading for better UX

    return (
      <div className="expense-requests-table">
        <Table
          rowKey="id"
          dataSource={items}
          loading={isLoading}
          rowSelection={{
            type: 'checkbox',
            selectedRowKeys,
            onChange: handleRowSelectionChange
          }}
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
              title: 'TITLE',
              dataIndex: 'title',
              key: 'title',
              render: (text, record) => (
                <div>
                  <div style={{ fontWeight: 'bold' }}>{text}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {record.code}
                  </div>
                </div>
              )
            },
            {
              title: 'TYPE',
              key: 'requestType',
              render: (_, record) => (
                <div>
                  {record.requestType?.value ?? 'General Expense'}
                </div>
              )
            },
            {
              title: 'DATE RANGE',
              key: 'dateRange',
              render: (_, record) => (
                <div>
                  {(record.startDate && record.endDate) 
                    ? `${new Date(record.startDate).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})} - ${new Date(record.endDate).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})}`
                    : 'No dates specified'}
                </div>
              )
            },
            {
              title: 'STATUS',
              dataIndex: 'status',
              key: 'status',
              render: (status) => {
                const { type, text } = getStatusDisplay(status);
                return <Pill type={type} label={text} />;
              }
            },
            {
              title: 'TOTAL AMOUNT',
              dataIndex: 'totalAmount',
              key: 'totalAmount',
              align: 'right',
              render: (amount) => (
                <div style={{ fontWeight: 'bold' }}>
                  €{typeof amount === 'number' ? amount.toFixed(2) : '0.00'}
                </div>
              )
            },
            {
              title: 'REIMBURSABLE',
              dataIndex: 'reimbursableAmount',
              key: 'reimbursableAmount',
              align: 'right',
              render: (amount) => (
                <div>
                  €{typeof amount === 'number' ? amount.toFixed(2) : '0.00'}
                </div>
              )
            },
            {
              title: 'ACTIONS',
              key: 'actions',
              width: 80,
              render: (_, record) => (
                <Button
                  type="text"
                  icon={<PiLightning size={16} />}
                  onClick={() => handleEditExpenseRequest(record)}
                  className="gba:transition-colors gba:duration-300 gba:hover:text-blue-500"
                  aria-label="Edit expense request"
                />
              )
            }
          ]}
          onRow={(record) => ({
            onClick: () => handleSelectItem(record)
          })}
        />
      </div>
    );
  }, [items, isLoading, error, getStatusDisplay, currentPage, pageSize, totalCount, 
      handlePageChange, handlePageSizeChange, selectedRowKeys, handleRowSelectionChange, 
      handleEditExpenseRequest, handleSelectItem]);
      
  // Memoized details panel render function using the new component
  const handleCloseDetails = useCallback(() => {
    setSelectedItem(null);
  }, []);

  const renderExpenseRequestDetails = useCallback(() => {
    if (!selectedItem) return null;
    return (
      <ExpenseRequestDetails 
        request={selectedItem} 
        onClose={handleCloseDetails}
        onEdit={handleEditExpenseRequest}
      />
    );
  }, [selectedItem, handleCloseDetails, handleEditExpenseRequest]);

  return (
      <DataContainer
        dataControllerProps={{
          search: search,
          filter: selectedFilters,
          setSearch: handleSearchChange,
          setFilter: (newFilters) => {
            // PERFORMANCE OPTIMIZATION: Use requestAnimationFrame to ensure the filter change
            // happens immediately without waiting for animations to complete
            requestAnimationFrame(() => {
              console.log('Filter change detected, processing immediately');
              console.time('filter-processing');
              
              // Handle filter removal when X is clicked or filters are cleared
              const filtersToRemove = selectedFilters.filter(f => !newFilters.includes(f));
              filtersToRemove.forEach(filterId => removeFilter(filterId));
              
              // Always fetch new data with the remaining filters
              setCurrentPage(1); // Reset to first page
              
              // Build filters based on newFilters (remaining filters)
              const filter: ExpenseRequestFilter = {};
              
              // Extract filters by types using our immediate newFilters
              const timePeriod = newFilters.find(f => TIME_PERIOD_OPTIONS.includes(f)) || null;
              
              // Get status filters and convert back to uppercase
              const statusFilters = newFilters.filter(f => 
                Object.values(ExpenseRequestStatus).map(s => s.toLowerCase()).includes(f));
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
                
                filter.requestDateStart = startDate.toISOString().split('T')[0];
                filter.requestDateEnd = endDate;
              }
              
              // Process request type filters
              const requestTypes = newFilters.filter(f => REQUEST_TYPE_OPTIONS.includes(f));
              if (requestTypes.length > 0) {
                const selectedType = requestTypes[0];
                if (selectedType === 'general') {
                  filter.requestType = { value: 'General Expense' };
                } else if (selectedType === 'trip') {
                  filter.requestType = { value: 'Trip' };
                }
              }
              
              console.log('Fetching with remaining filters:', filter);
              console.timeEnd('filter-processing');
              
              // Use the current search input value directly to avoid debounce delay
              fetchItems(searchInput, 1, pageSize, filter);
            });
          },
          addButton: {
            onClick: handleAddExpenseRequest,
            label: 'Add',
            'data-testid': 'add-expense-request-button'
          },
          listTitle: "My Expense Requests",
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
          title: selectedItem.title ?? 'Expense Request Details',
          icon: <InfoCircleOutlined />,
          content: renderExpenseRequestDetails(),
          onClose: handleCloseDetails
        } : undefined}
      />
  );
};

export default ExpenseRequestsTab;

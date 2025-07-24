import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { Alert, Empty } from 'antd';
import { DataTable, ActionButton } from '@newwork/gravity-ui-catalog';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import { useGetExpenseRequests } from '../../../hooks/useGetExpenseRequests';
import { useExpenseRequestFilters, ExpenseRequestFilter, ExpenseRequestStatus } from '../../../hooks/useExpenseRequestFilters';
import { getExpenseRequestStatusDisplay, ExpenseStatus } from '../../../utils';
import { InfoCircleOutlined } from '@ant-design/icons';
import Pill, { PillType } from '@/components/pill';
import ExpenseRequestDetails from './ExpenseRequestDetails';
import { formatDate, formatNumberFunction } from  '@/common/utils/windowUtils'

export interface ExpenseRequestsTableProps extends BusinessAppContextProps {
  search?: string;
  onSearchChange?: (search: string) => void;
  selectedFilters?: string[];
  onFilterChange?: (filterId: string, selected: boolean) => void;
  filterGroups?: any[];
  filterLabelMap?: Record<string, string>;
  onAddExpenseRequest?: () => void;
}

const DEFAULT_PAGE_SIZE = 20;

const ExpenseRequestsTable: React.FC<ExpenseRequestsTableProps> = React.memo((props) => {
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
    userInfo: props.userInfo
  }), [props.accessToken, props.userInfo]);
  
  // Use the expense request filters hook
  const {
    search,
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

  // Selected item for details panel
  const [selectedItem, setSelectedItem] = useState<typeof items[0] | null>(null);

  // Selected row keys for table
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Unified useEffect for fetching data whenever pagination or filters change
  useEffect(() => {
    // Only fetch data if we have both accessToken and employeeId
    if (contextProps.accessToken && contextProps.userInfo?.employeeDetails?.employeeId) {
      const currentFilters = getFilters();
      console.log('Pagination or filters changed, fetching data immediately');
      fetchItems(searchInput, currentPage, pageSize, currentFilters);
    }
  }, [fetchItems, currentPage, pageSize, selectedFilters, searchInput, contextProps.accessToken, contextProps.userInfo?.employeeDetails?.employeeId]);

  // Create memoized search handler with NO debounce for immediate API calls
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    // Immediately update the debounced value without waiting
    setDebouncedSearchTerm(value);
    
    // Only fetch data if we have both accessToken and employeeId
    if (contextProps.accessToken && contextProps.userInfo?.employeeDetails?.employeeId) {
      // Also trigger an immediate fetch with the new search value
      const currentFilters = getFilters();
      fetchItems(value, currentPage, pageSize, currentFilters);
    }
  }, [fetchItems, currentPage, pageSize, getFilters, contextProps.accessToken, contextProps.userInfo?.employeeDetails?.employeeId]);

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

  // Enhanced table change handler for pagination
  const handleEnhancedTableChange = useCallback((pagination: any, _filters: any, _sorter: any) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
  }, []);

  // Memoize pagination configuration
  const paginationConfig = useMemo(() => ({
    current: currentPage,
    pageSize: pageSize,
    total: totalCount,
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    showTotal: (total: number, range: [number, number]) => 
      `${range[0]}-${range[1]} of ${total} items`,
    onChange: (page: number, size: number) => handleEnhancedTableChange({ current: page, pageSize: size }, {}, {}),
    onShowSizeChange: (current: number, size: number) => handleEnhancedTableChange({ current, pageSize: size }, {}, {})
  }), [currentPage, pageSize, totalCount, handleEnhancedTableChange]);

  // Helper function to determine status display with memoization
  const getStatusDisplay = useCallback((status: string): { type: PillType; text: string } => {
    const statusConfig = getExpenseRequestStatusDisplay(status);
    return { type: statusConfig.type, text: statusConfig.label };
  }, []);

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

  // Handle closing the details panel
  const handleCloseDetails = useCallback(() => {
    setSelectedItem(null);
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
        <DataTable
          rowKey="id"
          dataSource={items}
          loading={isLoading}
          pagination={paginationConfig}
          onChange={handleEnhancedTableChange}
          data-testid="expense-requests-data-table"
          columns={[
                        {
              title: '',
              key: 'actions',
              width: 60,
              align: 'center',
              render: (_: any, record: any) => (
                <ActionButton
                  onClick={(e) => e.stopPropagation()}
                  flowData={[
                    {
                      category: 'Actions',
                      key: 'edit',
                      label: 'Edit',
                      onClick: (e?: React.MouseEvent) => {
                        e?.stopPropagation();
                        handleEditExpenseRequest(record as any);
                      }
                    },
                    {
                      category: 'Navigations',
                      key: 'view',
                      label: 'View Details',
                      onClick: (e?: React.MouseEvent) => {
                        e?.stopPropagation();
                        handleSelectItem(record as any);
                      }
                    },
                    {
                      category: 'Actions',
                      key: 'delete',
                      label: 'Delete',
                      onClick: (e?: React.MouseEvent) => {
                        e?.stopPropagation();
                        console.log('Delete expense request:', record.id);
                      }
                    }
                  ]}
                  portalContainer={document.body}
                  data-testid={`actions-${record.id}`}
                  size="md"
                />
              )
            },
            {
              title: 'Request Number',
              dataIndex: 'code',
              key: 'code',
              render: (code: string) => (
                <div>
                  {code || 'N/A'}
                </div>
              )
            },
            {
              title: 'Title',
              dataIndex: 'title',
              key: 'title',
              render: (text: string) => (
                <div>
                  {text}
                </div>
              )
            },
            {
              title: 'Start Date',
              dataIndex: 'startDate',
              key: 'startDate',
              render: (startDate: string) => (
                <div>
                  {startDate ? formatDate(startDate, 'date.long') : '-'}
                </div>
              )
            },
            {
              title: 'End Date',
              dataIndex: 'endDate',
              key: 'endDate',
              render: (endDate: string) => (
                <div>
                  {endDate ? formatDate(endDate, 'date.long') : '-'}
                </div>
              )
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (status: any) => {
                const { type, text } = getStatusDisplay(status);
                return <Pill type={type} label={text} />;
              }
            },
            {
              title: 'Reimbursable Amount',
              dataIndex: 'reimbursableAmount',
              key: 'reimbursableAmount',
              align: 'right',
              render: (amount: number, record: any) => {
                const currencyCode = record.currency?.code || '';
                const formattedAmount = amount && amount !== 0 ? `${formatNumberFunction(String(amount ?? '0'))} ${currencyCode}` : '-';
                
                return (
                  <div className="gba:text-right" data-testid={`reimbursable-amount-${record.id}`}>
                    {formattedAmount}
                  </div>
                );
              }
            },
            {
              title: 'Advance',
              dataIndex: 'advanceAmount',
              key: 'advanceAmount',
              align: 'right',
              render: (amount: number, record: any) => {
                const advanceAmountValue = record.expensePlan?.advancePaymentAggregate?.aggregate?.sum?.amount;
                const advanceAmount = advanceAmountValue && advanceAmountValue !== 0 ? advanceAmountValue : '-';
                
                // Use expense plan currency if available, otherwise fall back to main currency
                const currencyCode = advanceAmountValue && advanceAmountValue !== 0 && record.expensePlan?.currency?.code ? record.currency?.code : '';
                const formattedAmount = `${formatNumberFunction(String(advanceAmount))} ${currencyCode}`;
                
                return (
                  <div className="gba:text-right" data-testid={`total-amount-${record.id}`}>
                    {formattedAmount}
                  </div>
                );
              }
            },
            
          ]}
          onRow={(record: any) => ({
            onClick: () => handleSelectItem(record as any)
          })}
        />
      </div>
    );
  }, [items, isLoading, error, paginationConfig, 
      handleEnhancedTableChange, selectedRowKeys, handleRowSelectionChange, 
      handleEditExpenseRequest, handleSelectItem]);

  // Memoized details panel render function using the new component
  const renderExpenseRequestDetails = useCallback(() => {
    if (!selectedItem) return null;
    return (
      <ExpenseRequestDetails 
        selectedItem={selectedItem} 
        onClose={handleCloseDetails}
        accessToken={contextProps.accessToken}
        userInfo={contextProps.userInfo}
      />
    );
  }, [selectedItem, handleCloseDetails, contextProps.accessToken, contextProps.userInfo]);

  const dataControllerProps = useMemo(() => ({
    search: search,
    filter: selectedFilters,
    setSearch: handleSearchChange,
    setFilter: (newFilters: string[]) => {
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
        const TIME_PERIOD_OPTIONS = ['last30days', 'last90days', 'last180days'];
        const REQUEST_TYPE_OPTIONS = ['general', 'trip'];
        
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
      onClick: props.onAddExpenseRequest || (() => {}),
      label: 'Add',
      'data-testid': 'add-expense-request-button'
    },
    listTitle: "My Expense Requests",
    listAmount: totalCount ? `${totalCount}` : undefined,
    filterLabelMap: filterLabelMap,
  }), [search, selectedFilters, handleSearchChange, removeFilter, setCurrentPage, searchInput, pageSize, fetchItems, props.onAddExpenseRequest, totalCount, filterLabelMap]);

  const dataFilterProps = useMemo(() => ({
    filterGroups: filterGroups,
    onFilterChange: handleFilterChange,
  }), [filterGroups, handleFilterChange]);

  const dataDetails = useMemo(() => {
    if (selectedItem) {
      return {
        title: selectedItem.title ?? 'Expense Request Details',
        icon: <InfoCircleOutlined />,
        content: renderExpenseRequestDetails(),
        onClose: handleCloseDetails
      };
    }
    return undefined;
  }, [selectedItem, renderExpenseRequestDetails, handleCloseDetails]);

  return (
    <DataContainer
      dataControllerProps={dataControllerProps}
      dataFilterProps={dataFilterProps}
      hideFilter={false}
      dataBody={renderDataBody()}
      contentBackground="white"
      floatingDetails={true}
      dataDetails={dataDetails}
    />
  );
});

export default ExpenseRequestsTable; 
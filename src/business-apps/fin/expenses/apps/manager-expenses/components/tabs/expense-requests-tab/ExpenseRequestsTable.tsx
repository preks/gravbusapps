import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead, Button, Avatar, AvatarImage, AvatarFallback, Spinner, Alert } from '@newwork/nw-design-system';
import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import Pill from '@/components/pill/Pill';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetExpenseRequests, ExpenseRequest, SortField } from '../../../hooks/useGetExpenseRequests';
import { useExpenseRequestFilters, ExpenseRequestStatusMap } from '../../../hooks/useExpenseRequestFilters';
import { ExpenseStatus } from '../../../utils';
import { getExpenseRequestStatusDisplay } from '../../../utils';
import ExpenseRequestDetails from './ExpenseRequestDetails';
import { ensureShortDateFormat } from '../../../utils/dateUtils';
import { formatNumberFunction, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { formatCurrency } from '../../../utils/currencyUtils';

interface ExpenseRequestsTableProps extends BusinessAppContextProps {}

const ExpenseRequestsTable: React.FC<ExpenseRequestsTableProps> = (props) => {
  
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
    userInfo: props.userInfo
  }), [props.accessToken, props.userInfo]);
  
  // Local state management
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedRequest, setSelectedRequest] = useState<ExpenseRequest | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  
  // Get expense requests data using the hook
  const {
    requests,
    isLoading,
    error,
    totalCount,
    fetchRequests,
    approveRequest,
    rejectRequest,
    sorting,
    updateSorting
  } = useGetExpenseRequests(contextProps);

  // Get managerId from userInfo for currency filtering
  const managerId = props.userInfo?.employeeDetails?.employeeId || '';
  
  // Use the expense request filters hook with integrated currency filter and dynamic currencies
  const {
    search: searchText,
    setSearch,
    selectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    getFilters,
    currencyFilter,
    handleDataFilterChange
  } = useExpenseRequestFilters({
    accessToken: props.accessToken,
    managerId
  });
  
  // Track if this is the first render
  const isFirstRender = React.useRef(true);
  
  // Set default filter for "Approval Required" status and most used currency on initial load
  useEffect(() => {
    if (isFirstRender.current) {
      console.log('Initial render - setting up default filters');
      console.log('Current selected filters:', selectedFilters);
      console.log('ExpenseRequestStatusMap[PENDING]:', ExpenseRequestStatusMap[ExpenseStatus.PENDING]);
      
      // Apply default filter for "Approval Required" (PENDING maps to in_approval)
      // Force add the PENDING filter regardless of current state to ensure consistency
      addFilter(ExpenseRequestStatusMap[ExpenseStatus.PENDING]);
      
      // Ensure we're using the most used currency if available
      if (currencyFilter) {
        console.log('Setting initial currency filter to:', currencyFilter);
      }
      
      // Don't set isFirstRender to false here - we'll do that in the data fetch effect
      // after we've confirmed the filters are applied
    }
  }, [addFilter, selectedFilters, currencyFilter]);

  // Use a ref to track the last fetch parameters to avoid redundant fetches
  const lastFetchParams = React.useRef({
    searchText: '',
    currentPage: 1,
    pageSize: 10,
    selectedFilters: [] as string[],
    currencyFilter: '',
    sorting: { field: 'requestDate', order: 'DESC' }
  });
  
  // Debounced fetch function to prevent multiple rapid requests
  const debouncedFetch = React.useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout | null = null;
      
      return (params: {
        searchText: string;
        currentPage: number;
        pageSize: number;
        filters: any;
        currencyFilter: string | null;
        sorting: { field: string; order: 'ASC' | 'DESC' };
      }) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        timeoutId = setTimeout(() => {
          console.log('Executing debounced fetch with params:', params);
          const sortString = `${params.sorting.field}:${params.sorting.order.toLowerCase()}`;
          fetchRequests(
            params.searchText,
            params.currentPage,
            params.pageSize,
            sortString,
            params.filters.status || [],
            params.filters.requestDateStart,
            params.currencyFilter
          );
        }, 300);
      };
    })(),
    [fetchRequests]
  );
  
  // Consolidated fetch requests when filters or pagination changes
  useEffect(() => {
    // On first render, we want to fetch with default filters
    const isInitialRender = isFirstRender.current;
    
    // Ensure the status filter is applied on initial render
    if (isInitialRender && selectedFilters.length === 0) {
      console.log('Forcing PENDING status filter on initial render');
      addFilter(ExpenseRequestStatusMap[ExpenseStatus.PENDING]);
      return; // Skip this render cycle, will be triggered again after filter is added
    }
    
    console.log('ExpenseRequestsTable useEffect triggered');
    console.log('Current selectedFilters:', selectedFilters);
    console.log('Current searchText:', searchText);
    console.log('Current currencyFilter:', currencyFilter);
    
    const filters = getFilters();
    console.log('getFilters() result:', filters);
    
    // Check if this is a redundant fetch with the same parameters
    const currentParams = {
      searchText,
      currentPage,
      pageSize,
      selectedFilters: [...selectedFilters],
      currencyFilter: currencyFilter || '',
      sorting
    };
    
    const lastParams = lastFetchParams.current;
    const isRedundantFetch = 
      currentParams.searchText === lastParams.searchText &&
      currentParams.currentPage === lastParams.currentPage &&
      currentParams.pageSize === lastParams.pageSize &&
      currentParams.currencyFilter === lastParams.currencyFilter &&
      JSON.stringify(currentParams.selectedFilters) === JSON.stringify(lastParams.selectedFilters) &&
      JSON.stringify(currentParams.sorting) === JSON.stringify(lastParams.sorting);
    
    if (isRedundantFetch) {
      console.log('Skipping redundant fetch with same parameters');
      return;
    }
    
    // Update last fetch params
    lastFetchParams.current = currentParams;
    
    // Log the actual filters being used
    console.log('Fetching with filters:', {
      filters,
      statusFilters: filters.status,
      currencyFilter
    });
    
    // Use debounced fetch to prevent multiple rapid requests
    debouncedFetch({
      searchText,
      currentPage,
      pageSize,
      filters,
      currencyFilter,
      sorting
    });
    
    // If this was the initial render, log that we've applied default filters
    if (isInitialRender) {
      console.log('Initial data load with default filters:', {
        status: filters.status || [],
        currencyFilter
      });
    }
  }, [searchText, currentPage, pageSize, selectedFilters, currencyFilter, fetchRequests, getFilters, debouncedFetch, sorting]);

  // Handle search input changes
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setCurrentPage(1); // Reset to first page on search
  }, [setSearch]);
  
  // Handle sorting changes
  const handleSort = useCallback((field: SortField) => {
    updateSorting(field);
    setCurrentPage(1); // Reset to first page when sorting changes
  }, [updateSorting, setCurrentPage]);
  
  // Render sort indicator
  const renderSortIndicator = useCallback((field: SortField) => {
    if (sorting.field === field) {
      return sorting.order === 'ASC' ? 
        <ArrowUpOutlined className="gba:ml-1 gba:text-blue-500" /> : 
        <ArrowDownOutlined className="gba:ml-1 gba:text-blue-500" />;
    }
    return null;
  }, [sorting]);

  const handleTableChange = useCallback((pagination: any, _filters: any, _sorter: any) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
  }, []);
  
  // Handle request selection
  const handleSelectRequest = useCallback((request: ExpenseRequest) => {
    setSelectedRequest(request);
    setSelectedRowKeys([request.id]);
  }, []);
  
  // Handle row selection change
  const handleRowSelectionChange = useCallback((newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
    
    // If a single row is selected, find and set the selected request
    if (newSelectedRowKeys.length === 1) {
      const selectedRequestId = newSelectedRowKeys[0];
      const request = requests?.find(request => request.id === selectedRequestId);
      if (request) {
        setSelectedRequest(request);
      }
    } else {
      // If multiple or no rows selected, clear the selected request
      setSelectedRequest(null);
    }
  }, [requests]);
  
  // Handle approving a request
  const handleApproveRequest = useCallback(async (requestId: string) => {
    const success = await approveRequest(requestId);
    if (success) {
      // Refresh the list after approval
      const filters = getFilters();
      fetchRequests(
        searchText,
        currentPage,
        pageSize,
        undefined,
        filters.status || []
      );
      setSelectedRequest(null);
    }
  }, [approveRequest, fetchRequests, searchText, currentPage, pageSize, getFilters]);
  
  // Handle rejecting a request
  const handleRejectRequest = useCallback(async (requestId: string) => {
    const success = await rejectRequest(requestId);
    if (success) {
      // Refresh the list after rejection
      const filters = getFilters();
      fetchRequests(
        searchText,
        currentPage,
        pageSize,
        undefined,
        filters.status || []
      );
      setSelectedRequest(null);
    }
  }, [rejectRequest, fetchRequests, searchText, currentPage, pageSize, getFilters]);

  const renderDataBody = useCallback(() => {
    console.log('ExpenseRequestsTable renderDataBody called');
    console.log('requests data:', requests);
    console.log('isLoading:', isLoading);
    console.log('error:', error);
    
    // Only show loading spinner when there's no data yet
    // This prevents the table from disappearing during sorting operations
    if (isLoading && requests.length === 0) {
      return (
        <div className="gba:flex gba:justify-center gba:items-center gba:py-12">
          <Spinner className="gba:h-8 gba:w-8" />
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <div className="gba:font-medium">Error loading expense requests</div>
          <div className="gba:text-sm">{error}</div>
        </Alert>
      );
    }

    if (requests.length === 0) {
      return (
        <div className="gba:flex gba:justify-center gba:items-center gba:py-12 gba:text-gray-500">
          No expense requests found.
        </div>
      );
    }

    return (
      <div>
        <div className="gba:overflow-x-auto gba:border gba:border-gray-200 gba:rounded-md gba:shadow-sm gba:relative">
          {isLoading && requests.length > 0 && (
            <div className="gba:absolute gba:inset-0 gba:bg-white/50 gba:flex gba:items-center gba:justify-center gba:z-10" data-testid="expense-requests-loading-overlay">
              <Spinner className="gba:h-8 gba:w-8" />
            </div>
          )}
          <Table data-testid="expense-requests-table">
            <TableHeader>
              <TableRow>
                <TableHead className="gba:w-[60px]"></TableHead>
                <TableHead 
                  className="gba:cursor-pointer gba:select-none" 
                  onClick={() => handleSort('title')}
                  data-testid="expense-requests-title-header"
                >
                  <div className="gba:flex gba:items-center">
                    <span>{getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_details.title', 'Request Title')}</span>
                    {renderSortIndicator('title')}
                  </div>
                </TableHead>
                <TableHead 
                  className="gba:cursor-pointer gba:select-none" 
                  onClick={() => handleSort('startDate')}
                  data-testid="expense-requests-start-date-header"
                >
                  <div className="gba:flex gba:items-center">
                    <span>{getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_details.start_date', 'Start Date')}</span>
                    {renderSortIndicator('startDate')}
                  </div>
                </TableHead>
                <TableHead 
                  className="gba:cursor-pointer gba:select-none" 
                  onClick={() => handleSort('endDate')}
                  data-testid="expense-requests-end-date-header"
                >
                  <div className="gba:flex gba:items-center">
                    <span>{getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_details.end_date', 'End Date')}</span>
                    {renderSortIndicator('endDate')}
                  </div>
                </TableHead>
                <TableHead 
                  className="gba:cursor-pointer gba:select-none" 
                  onClick={() => handleSort('employee.fullName')}
                  data-testid="expense-requests-employee-header"
                >
                  <div className="gba:flex gba:items-center">
                    <span>{getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_details.employee', 'Employee')}</span>
                    {renderSortIndicator('employee.fullName')}
                  </div>
                </TableHead>
                <TableHead 
                  className="gba:cursor-pointer gba:select-none" 
                  onClick={() => handleSort('requestDate')}
                  data-testid="expense-requests-request-date-header"
                >
                  <div className="gba:flex gba:items-center">
                    <span>{getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_details.creation_date', 'Creation Date')}</span>
                    {renderSortIndicator('requestDate')}
                  </div>
                </TableHead>
                <TableHead 
                  className="gba:text-right gba:cursor-pointer gba:select-none" 
                  onClick={() => handleSort('amount')}
                  data-testid="expense-requests-amount-header"
                >
                  <div className="gba:flex gba:items-center gba:justify-end">
                    <span>{getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_details.amount', 'Amount')}</span>
                    {renderSortIndicator('amount')}
                  </div>
                </TableHead>
                <TableHead 
                  className="gba:cursor-pointer gba:select-none" 
                  onClick={() => handleSort('status')}
                  data-testid="expense-requests-status-header"
                >
                  <div className="gba:flex gba:items-center">
                    <span>{getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_details.status', 'Status')}</span>
                    {renderSortIndicator('status')}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {requests.map((record, index) => {
              console.log(`Rendering record ${index + 1}:`, {
                id: record.id,
                startDate: record.startDate,
                endDate: record.endDate,
                requestDate: record.requestDate,
                startDateType: typeof record.startDate,
                endDateType: typeof record.endDate,
                requestDateType: typeof record.requestDate
              });
              
              const { type, label } = getExpenseRequestStatusDisplay(record.status);
              return (
                <TableRow 
                  key={record.id}
                  className="gba:cursor-pointer gba:hover:bg-gray-50"
                  onClick={() => handleSelectRequest(record)}
                  data-testid={`expense-requests-row-${record.id}`}
                >
                  <TableCell data-testid={`expense-requests-actions-cell-${record.id}`}>
                    <div className="gba:flex gba:justify-start gba:gap-2">
                      <AppActionButton
                        data-testid={`expense-requests-update-button-${record.id}`}
                        variant="secondary"
                        contextsArray={[FlowContextName.expenseRequests]}
                        externalContextData={{
                          expenseRequestId: record.id
                        }}
                        prefixDataTestId="expense-requests-update"
                        accessToken={props.accessToken}
                        emptyStateBehavior="disable"
                        deferMainContextRequestsUntilClick
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="gba:text-left">
                    <div className="gba:font-medium gba:text-sm">{record.title ?? 'Untitled Request'}</div>
                    <div className="gba:text-xs gba:text-gray-500">{record.code ?? 'N/A'}</div>
                  </TableCell>
                  <TableCell className="gba:text-sm">
                    {record.startDate ? (() => {
                      try {
                        const date = new Date(record.startDate);
                        return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
                      } catch (error) {
                        return 'N/A';
                      }
                    })() : 'N/A'}
                  </TableCell>
                  <TableCell className="gba:text-sm">
                    {record.endDate ? (() => {
                      try {
                        const date = new Date(record.endDate);
                        return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
                      } catch (error) {
                        return 'N/A';
                      }
                    })() : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Avatar className="gba:h-6 gba:w-6">
                        <AvatarImage 
                          src={record.employee?.pictureThumbnail ? `data:image/gif;base64,${record.employee.pictureThumbnail}` : undefined} 
                          alt={record.employee?.fullName} 
                        />
                        <AvatarFallback>
                          {record.employee?.displayName?.charAt(0) || record.employee?.fullName?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="gba:font-medium gba:text-sm">{record.employee?.displayName || record.employee?.fullName}</div>
                        <div className="gba:text-xs gba:text-gray-500">{record.employee?.department || 'N/A'}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="gba:text-sm">
                    {record.requestDate ? (() => {
                      try {
                        const date = new Date(record.requestDate);
                        return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
                      } catch (error) {
                        return 'N/A';
                      }
                    })() : 'N/A'}
                  </TableCell>
                  <TableCell className="gba:text-right gba:text-sm" data-testid={`expense-request-amount-cell-${record.id}`}>
                    {typeof record.amount === 'number' ? formatCurrency(record.amount, currencyFilter || record.currency) : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Pill type={type as any} label={label} data-testid={`status-pill-${record.status?.toLowerCase()}`} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </div>
        
        {/* Pagination - Always show when there are records */}
        {totalCount > 0 && (
          <div className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-4 gba:border-t gba:border-gray-200" data-testid="expense-requests-pagination">
            <div className="gba:text-sm gba:text-gray-600" data-testid="expense-requests-pagination-info">
              {`${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, totalCount)} of ${totalCount} expense requests`}
            </div>
            <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
              <div className="gba:flex gba:items-center gba:space-x-2">
                <p className="gba:text-sm gba:font-medium">Rows per page</p>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const newPageSize = Number(e.target.value);
                    setPageSize(newPageSize);
                    setCurrentPage(1);
                  }}
                  className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                  data-testid="expense-requests-page-size-select"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium" data-testid="expense-requests-page-info">
                Page {currentPage} of {Math.ceil(totalCount / pageSize)}
              </div>
              <div className="gba:flex gba:items-center gba:space-x-2">
                <Button
                  variant="outline"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  data-testid="expense-requests-first-page-button"
                >
                  <span className="gba:sr-only">Go to first page</span>
                  ⟪⟪
                </Button>
                <Button
                  variant="outline"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  data-testid="expense-requests-previous-page-button"
                >
                  <span className="gba:sr-only">Go to previous page</span>
                  ⟪
                </Button>
                <Button
                  variant="outline"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                  data-testid="expense-requests-next-page-button"
                >
                  <span className="gba:sr-only">Go to next page</span>
                  ⟫
                </Button>
                <Button
                  variant="outline"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => setCurrentPage(Math.ceil(totalCount / pageSize))}
                  disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                  data-testid="expense-requests-last-page-button"
                >
                  <span className="gba:sr-only">Go to last page</span>
                  ⟫⟫
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }, [requests, isLoading, error, totalCount, pageSize, currentPage, approveRequest, rejectRequest]);

  // Update the URL or any other side effects when filters change
  useEffect(() => {
    const filters = getFilters();
    const sortString = sorting ? `${sorting.field}:${sorting.order.toLowerCase()}` : 'requestDate:desc';
    fetchRequests(
      searchText,
      currentPage,
      pageSize,
      sortString, // sortBy
      filters.status || [], // status filter - now an array
      filters.requestDateStart,
      currencyFilter // Pass currency filter to fetch requests
    );
  }, [selectedFilters, searchText, currentPage, pageSize, currencyFilter, sorting, getFilters, fetchRequests]);

  return (
    <DataContainer
      dataControllerProps={{
        search: searchText,
        setSearch: handleSearchChange,
        filter: selectedFilters,
        setFilter: (newFilters: string[]): void => {
          // Handle filter changes
          const filtersToRemove = selectedFilters.filter(f => !newFilters.includes(f));
          const filtersToAdd = newFilters.filter(f => !selectedFilters.includes(f));
          
          // Apply filter changes
          filtersToRemove.forEach(removeFilter);
          filtersToAdd.forEach(addFilter);
          
          // Reset to first page when filters change
          setCurrentPage(1);
          
          // No need to force reload data here - the useEffect with dependencies on
          // selectedFilters will handle the data fetching with debouncing
        },
        filterLabelMap: filterLabelMap,
        listTitle: (
          <div className="gba:flex gba:items-center gba:gap-4">
            <div className="gba:flex gba:items-center gba:gap-2">
              <span>{getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.expense_requests', 'Expense Requests')}</span>
              <span className="gba:text-gray-500">({totalCount})</span>
            </div>
          </div>
        ),
        debounceDelay: 300,
      }}
      dataFilterProps={{
        filterGroups: filterGroups,
        onFilterChange: handleDataFilterChange,
      }}
      dataBody={renderDataBody()}
      contentBackground="white"
      dataDetails={selectedRequest ? {
        title: 'Expense Request Details',
        content: (
          <ExpenseRequestDetails
            request={selectedRequest} 
            onApprove={handleApproveRequest}
            onReject={handleRejectRequest}
            {...contextProps}
          />
        ),
        onClose: () => {
          setSelectedRequest(null);
          setSelectedRowKeys([]);
        }
      } : undefined}
      data-testid="expense-requests-container"
    />
  );
};

export default ExpenseRequestsTable;

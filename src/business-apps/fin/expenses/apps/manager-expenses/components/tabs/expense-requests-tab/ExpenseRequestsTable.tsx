import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead, Button, Avatar, AvatarImage, AvatarFallback, Spinner, Alert } from '@newwork/nw-design-system';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import Pill from '@/components/pill/Pill';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetExpenseRequests, ExpenseRequest } from '../../../hooks/useGetExpenseRequests';
import { useExpenseRequestFilters, ExpenseRequestStatus } from '../../../hooks/useExpenseRequestFilters';
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
    rejectRequest
  } = useGetExpenseRequests(contextProps);

  // Use the expense request filters hook with integrated currency filter
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
  } = useExpenseRequestFilters();
  
  // Set default filter for "Approval Required" status on initial load
  useEffect(() => {
    if (selectedFilters.length === 0) {
      // Apply default filter for "Approval Required" (IN_APPROVAL)
      addFilter(ExpenseRequestStatus.IN_APPROVAL.toLowerCase());
    }
  }, [addFilter, selectedFilters]);

  // Fetch requests when filters or pagination changes
  useEffect(() => {
    console.log('ExpenseRequestsTable useEffect triggered');
    console.log('Current selectedFilters:', selectedFilters);
    console.log('Current searchText:', searchText);
    console.log('Current currencyFilter:', currencyFilter);
    const filters = getFilters();
    console.log('getFilters() result:', filters);
    fetchRequests(
      searchText,
      currentPage,
      pageSize,
      'requestDate:desc', // Default sort by request date, newest first
      filters.status || [], // status filter - now an array
      filters.requestDateStart,
      currencyFilter // Pass currency filter to fetch requests
    );
  }, [searchText, currentPage, pageSize, selectedFilters, currencyFilter, fetchRequests, getFilters]);

  // Handle search changes
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setCurrentPage(1);
  }, [setSearch]);

  const handleTableChange = (pagination: any, _filters: any, _sorter: any) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
  };

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

  const renderDataBody = () => {
    console.log('ExpenseRequestsTable renderDataBody called');
    console.log('requests data:', requests);
    console.log('isLoading:', isLoading);
    console.log('error:', error);
    
    if (isLoading) {
      return (
        <div className="gba:flex gba:justify-center gba:p-8">
          <Spinner />
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

    if (!requests || requests.length === 0) {
      return (
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center">
          <div className="gba:text-gray-500 gba:text-lg gba:font-medium gba:mb-2">
            No expense requests found
          </div>
          <div className="gba:text-gray-400 gba:mb-4">
            No expense requests match your current criteria.
          </div>
        </div>
      );
    }

    return (
      <div>
        {/* Table with horizontal scrolling */}
        <div className="gba:overflow-x-auto">
          <Table data-testid="expense-requests-table">
            <TableHeader>
              <TableRow>
                <TableHead className="gba:w-[8%]"></TableHead>
                <TableHead className="gba:w-[25%]">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:backoffice_expense_landing_page.request_info_pl', 'Requests')}
                </TableHead>
                <TableHead className="gba:w-[15%]">
                  Start Date
                </TableHead>
                <TableHead className="gba:w-[15%]">
                  End Date
                </TableHead>
                <TableHead className="gba:w-[20%]">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.employee', 'Employee')}
                </TableHead>
                <TableHead className="gba:w-[15%]">
                  Creation Date
                </TableHead>
                <TableHead className="gba:w-[18%] gba:text-right">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:sales_hub.amount', 'Amount')}
                </TableHead>
                <TableHead className="gba:w-[18%]">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_request_table.status', 'Status')}
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
        
        {/* Pagination */}
        {totalCount > pageSize && (
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
                  ⟨⟨
                </Button>
                <Button
                  variant="outline"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  data-testid="expense-requests-previous-page-button"
                >
                  <span className="gba:sr-only">Go to previous page</span>
                  ⟨
                </Button>
                <Button
                  variant="outline"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                  data-testid="expense-requests-next-page-button"
                >
                  <span className="gba:sr-only">Go to next page</span>
                  ⟩
                </Button>
                <Button
                  variant="outline"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => setCurrentPage(Math.ceil(totalCount / pageSize))}
                  disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                  data-testid="expense-requests-last-page-button"
                >
                  <span className="gba:sr-only">Go to last page</span>
                  ⟩⟩
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };



  // Update the URL or any other side effects when filters change
  useEffect(() => {
    const filters = getFilters();
    fetchRequests(
      searchText,
      currentPage,
      pageSize,
      undefined, // sortBy
      filters.status || [], // status filter - now an array
      filters.requestDateStart,
      currencyFilter // Pass currency filter to fetch requests
    );
  }, [selectedFilters, searchText, currentPage, pageSize, currencyFilter, getFilters, fetchRequests]);

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
          
          filtersToRemove.forEach(removeFilter);
          filtersToAdd.forEach(addFilter);
          setCurrentPage(1);
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

/**
 * Expense Requests Table Component
 * Displays a table of expense requests with filtering and view capabilities
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useExpenseRequests } from '../../../hooks/useExpenseRequests';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell,
  Alert, 
  Spinner,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@newwork/nw-design-system';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import { DataFilterGroup } from '@/components/data-filter/DataFilter';
import { formatNumberFunction, getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils';
import { ExpenseData } from '../../../types';
import { getExpenseRequestStatusDisplay } from '../../../utils/utils';
import Pill from '@/components/pill/Pill';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';


function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

interface ExpenseRequestsTableProps extends BusinessAppContextProps {
  search?: string;
  onSearchChange?: (search: string) => void;
}

const ExpenseRequestsTable: React.FC<ExpenseRequestsTableProps> = (props) => {
  const { search, onSearchChange, accessToken } = props;
 
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
  }), [props.accessToken]);
  

  const [initialParams] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      search: urlParams.get('search') || '',
      page: parseInt(urlParams.get('page') || '1', 10),
      pageSize: parseInt(urlParams.get('pageSize') || '20', 10),
      status: urlParams.get('status') || '',
      department: urlParams.get('department') || ''
    };
  });
  

  const [searchText, setSearchText] = useState<string>(search ?? initialParams.search);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseData | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  
  const updateURLParams = useCallback((params: {
    search?: string;
    page?: number;
    pageSize?: number;
    status?: string;
    department?: string;
  }) => {
    const newSearchParams = new URLSearchParams(window.location.search);
    
    if (params.search !== undefined) {
      if (params.search) {
        newSearchParams.set('search', params.search);
      } else {
        newSearchParams.delete('search');
      }
    }
    
    if (params.page !== undefined) {
      if (params.page > 1) {
        newSearchParams.set('page', params.page.toString());
      } else {
        newSearchParams.delete('page');
      }
    }
    
    if (params.pageSize !== undefined) {
      if (params.pageSize !== 20) {
        newSearchParams.set('pageSize', params.pageSize.toString());
      } else {
        newSearchParams.delete('pageSize');
      }
    }

    if (params.status !== undefined) {
      if (params.status) {
        newSearchParams.set('status', params.status);
      } else {
        newSearchParams.delete('status');
      }
    }

    if (params.department !== undefined) {
      if (params.department) {
        newSearchParams.set('department', params.department);
      } else {
        newSearchParams.delete('department');
      }
    }

    const newURL = `${window.location.pathname}${newSearchParams.toString() ? `?${newSearchParams.toString()}` : ''}`;
    window.history.replaceState({}, '', newURL);
  }, []);


  const { 
    expenses, 
    totalItems, 
    loading, 
    error, 
    currentPage, 
    pageSize, 
    searchTerm,
    fetchData,
    searchEmployees, 
    searchStatuses,
    handleEmployeeFilter,
    handleStatusFilter,
    handleAmountFilter,
    handleTableChange, 
    handleSearch,
    amountMinFilter,
    amountMaxFilter,
  } = useExpenseRequests(contextProps);

  useEffect(() => {
    const loadAvailableStatuses = async () => {
      try {
        const statuses = await searchStatuses();
        
        if (statuses.length === 0) {
          const defaultStatuses = ['CREATED', 'PENDING', 'APPROVED', 'VERIFIED', 'BOOKED', 'CLOSED', 'PAID', 'REJECTED'];
          setAvailableStatuses(defaultStatuses);
        } else {
          setAvailableStatuses(statuses);
        }
      } catch (error) {
        console.error('Error loading available statuses:', error);
        const defaultStatuses = ['CREATED', 'PENDING', 'APPROVED', 'VERIFIED', 'BOOKED', 'CLOSED', 'PAID', 'REJECTED'];
        setAvailableStatuses(defaultStatuses);
      }
    };

    loadAvailableStatuses();
  }, [searchStatuses]);


  const [employeeFilter, setEmployeeFilter] = useState('');
  const [employeeSearchText, setEmployeeSearchText] = useState('');
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [employeeSearchResults, setEmployeeSearchResults] = useState<Array<{id: string, name: string}>>([]);
  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<Array<{id: string, name: string}>>([]);

  // Status filter states
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);

  // Local amount filter states for immediate UI updates
  const [localAmountMin, setLocalAmountMin] = useState(amountMinFilter);
  const [localAmountMax, setLocalAmountMax] = useState(amountMaxFilter);


  const debouncedSearchEmployees = useMemo(() => 
    debounce(async (searchText: string) => {
      if (searchText.trim().length >= 2) {
        setEmployeeSearchLoading(true);
        try {
          const results = await searchEmployees(searchText);
          setEmployeeSearchResults(results);
        } catch (error) {
          console.error('Error searching employees:', error);
          setEmployeeSearchResults([]);
        } finally {
          setEmployeeSearchLoading(false);
        }
      } else {
        setEmployeeSearchResults([]);
      }
    }, 300), 
    [searchEmployees]
  );

  const debouncedAmountFilter = useMemo(() => 
    debounce((min: string, max: string) => {
      handleAmountFilter(min, max);
    }, 500), 
    [handleAmountFilter]
  );

  // Sync local amount state with hook state
  useEffect(() => {
    setLocalAmountMin(amountMinFilter);
    setLocalAmountMax(amountMaxFilter);
  }, [amountMinFilter, amountMaxFilter]);

  // Handle status filter changes
  const handleStatusFilterChange = useCallback((status: string, selected: boolean) => {
    const newStatusFilter = selected
      ? [...statusFilter, status]
      : statusFilter.filter(s => s !== status);
    
    setStatusFilter(newStatusFilter);
    handleStatusFilter(newStatusFilter.join(','));
  }, [statusFilter, handleStatusFilter]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.employee-search-container')) {
        setShowEmployeeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (contextProps.accessToken) {
      fetchData();
    }
  }, [contextProps.accessToken]);

  useEffect(() => {
    if (searchText !== initialParams.search) {
      updateURLParams({ search: searchText });
    }
  }, [searchText, initialParams.search, updateURLParams]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchText(value);
    handleSearch(value);
    onSearchChange?.(value);
  }, [handleSearch, onSearchChange]);

  const handleRowSelection = useCallback((selectedRowKeys: React.Key[], selectedRows: any[]) => {
    setSelectedRowKeys(selectedRowKeys);
    if (selectedRows.length === 1) {
      setSelectedExpense(selectedRows[0] as ExpenseData);
    } else {
      setSelectedExpense(null);
    }
  }, []);

  const handleRowClick = useCallback((record: any) => {
    setSelectedExpense(record as ExpenseData);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedExpense(null);
    setSelectedRowKeys([]);
  }, []);

  const filterGroups: DataFilterGroup[] = useMemo(() => {
    return [
      {
        id: 'status',
        title: getTranslationFromI18nKeyAndLabel('expense.request.filter.status', 'Status'),
        type: 'checkbox',
        filters: availableStatuses.map(status => ({
          id: status,
          label: getExpenseRequestStatusDisplay(status).label,
          selected: statusFilter.includes(status)
        }))
      },
      {
        id: 'employee',
        title: getTranslationFromI18nKeyAndLabel('expense.request.filter.employee', 'Employee'),
        type: 'custom',
        customComponent: (
          <div className="employee-search-container gba:relative gba:p-2">
            <input
              type="text"
              value={employeeSearchText}
              onChange={(e) => {
                setEmployeeSearchText(e.target.value);
                setShowEmployeeDropdown(true);
                debouncedSearchEmployees(e.target.value);
              }}
              onFocus={() => setShowEmployeeDropdown(true)}
              className="gba:h-8 gba:w-full gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
              placeholder="Search employee..."
              data-testid="employee-search-input"
            />
            
            {/* Dropdown with search results */}
            {showEmployeeDropdown && employeeSearchText.trim() && (
              <div className="gba:absolute gba:top-full gba:left-0 gba:right-0 gba:bg-white gba:border gba:border-gray-200 gba:rounded gba:shadow-lg gba:max-h-40 gba:overflow-y-auto gba:z-10">
                {employeeSearchLoading ? (
                  <div className="gba:p-2 gba:text-sm gba:text-gray-500">
                    Loading employees...
                  </div>
                ) : employeeSearchResults.length === 0 ? (
                  <div className="gba:p-2 gba:text-sm gba:text-gray-500">
                    No employees found
                  </div>
                ) : (
                  employeeSearchResults.map((employee) => (
                    <button
                      key={employee.id}
                      className={`gba:w-full gba:text-left gba:p-2 gba:text-sm gba:hover:bg-gray-100 gba:transition-colors ${
                        selectedEmployees.some(e => e.id === employee.id) ? 'gba:bg-blue-50 gba:text-blue-700' : 'gba:text-gray-700'
                      }`}
                      onClick={() => {
                        const newSelected = selectedEmployees.some(e => e.id === employee.id)
                          ? selectedEmployees.filter(e => e.id !== employee.id)
                          : [...selectedEmployees, employee];
                        setSelectedEmployees(newSelected);
                        setEmployeeFilter(newSelected.map(e => e.id).join(','));
                        
                        // Apply the employee filter to trigger data fetching
                        handleEmployeeFilter(newSelected.map(e => e.id).join(','));
                      }}
                      data-testid={`employee-option-${employee.id}`}
                    >
                      {employee.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )
      },
      {
        id: 'amount',
        title: getTranslationFromI18nKeyAndLabel('expense.request.filter.amount', 'Amount'),
        type: 'custom',
        customComponent: (
          <div className="gba:flex gba:flex-col gba:gap-2 gba:p-2" onClick={(e) => e.stopPropagation()}>
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:text-sm gba:text-gray-600 gba:w-8">Min</span>
              <input
                type="number"
                value={localAmountMin}
                onChange={(e) => {
                  e.stopPropagation();
                  const value = e.target.value;
                  setLocalAmountMin(value);
                  debouncedAmountFilter(value, localAmountMax);
                }}
                onFocus={(e) => e.stopPropagation()}
                className="gba:h-8 gba:w-[100px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                placeholder="Min"
                data-testid="amount-min-filter-input"
              />
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:text-sm gba:text-gray-600 gba:w-8">Max</span>
              <input
                type="number"
                value={localAmountMax}
                onChange={(e) => {
                  e.stopPropagation();
                  const value = e.target.value;
                  setLocalAmountMax(value);
                  debouncedAmountFilter(localAmountMin, value);
                }}
                onFocus={(e) => e.stopPropagation()}
                className="gba:h-8 gba:w-[100px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                placeholder="Max"
                data-testid="amount-max-filter-input"
              />
            </div>
          </div>
        )
      }
    ];
  }, [availableStatuses, statusFilter, employeeSearchText, showEmployeeDropdown, employeeSearchResults, employeeSearchLoading, selectedEmployees, handleEmployeeFilter, handleAmountFilter, amountMinFilter, amountMaxFilter, localAmountMin, localAmountMax, debouncedAmountFilter]);

  const getFilters = useCallback((filtersToApply?: string[]) => {
    const filters: Record<string, any> = {};
    if (employeeFilter) filters.employee = employeeFilter;
    return filters;
  }, [employeeFilter]);

  const setFilters = useCallback((filters: string[]) => {
    // Clear all filters
    setEmployeeFilter('');
    setSelectedEmployees([]);
    setEmployeeSearchText('');
    setStatusFilter([]);
    setLocalAmountMin('');
    setLocalAmountMax('');
    
    // Trigger data refresh by calling the handler functions
    handleEmployeeFilter('');
    handleStatusFilter('');
    handleAmountFilter('', '');
  }, [handleEmployeeFilter, handleStatusFilter, handleAmountFilter]);


  const handleEnhancedTableChange = useCallback((pagination: any, _filters: any, sorter: any) => {
    handleTableChange(pagination, _filters, sorter);
  }, [handleTableChange]);


  if (loading && expenses.length === 0) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="gba:p-4">
        <Alert
          variant="destructive"
          data-testid="expense-requests-error"
        >
          <div className="gba:font-medium">
            {getTranslationFromI18nKeyAndLabel('expense.request.error.title', 'Error Loading Data')}
          </div>
          <div className="gba:text-sm">{error}</div>
        </Alert>
      </div>
    );
  }

  return (
    <>
      <DataContainer
        dataControllerProps={{
          listTitle: getTranslationFromI18nKeyAndLabel('expense.request.list.title', 'Expense Requests'),
          listAmount: totalItems ? `${totalItems}` : undefined,
          search: searchText,
          setSearch: handleSearchChange,
          placeholder: getTranslationFromI18nKeyAndLabel('expense.request.search.placeholder', 'Search in Expense Requests'),
          filter: Object.keys(getFilters()),
          setFilter: setFilters,
          filterLabelMap: {
            status: statusFilter.length > 0 ? `Status: ${statusFilter.map(s => getExpenseRequestStatusDisplay(s).label).join(', ')}` : 'Status: All',
            employee: employeeFilter ? `Employee: ${selectedEmployees.map(e => e.name).join(', ')}` : 'Employee: All',
            amount: `Amount: ${amountMinFilter || '0'} - ${amountMaxFilter || '∞'}`,
          },
          actions: [],
        }}
        dataFilterProps={{
          filterGroups: filterGroups,
          onFilterChange: (filterId: string, selected: boolean) => {
            if (filterId === '') {
              // Handle "All" selection
              if (selected) {
                setEmployeeFilter('');
                setSelectedEmployees([]);
                setEmployeeSearchText('');
                setStatusFilter([]);
                setLocalAmountMin('');
                setLocalAmountMax('');
                
                // Trigger data refresh
                handleEmployeeFilter('');
                handleStatusFilter('');
                handleAmountFilter('', '');
              }
            } else {
              // Handle specific filter selection
              if (filterId === 'employee') {
                if (selected) {
                  // This is handled by the employee selection logic above
                } else {
                  setEmployeeFilter('');
                  setSelectedEmployees([]);
                  setEmployeeSearchText('');
                  handleEmployeeFilter('');
                }
              } else if (availableStatuses.includes(filterId)) {
                // Handle status filter changes
                handleStatusFilterChange(filterId, selected);
              }
            }
          },
        }}
        dataBody={
          loading && !expenses?.length ? (
            <div className="gba:flex gba:justify-center gba:p-8">
              <Spinner />
            </div>
          ) : error ? (
            <Alert variant="destructive" className="gba:m-4">
              {error}
            </Alert>
          ) : !expenses || expenses.length === 0 ? (
            <div className="gba:p-8 gba:text-center gba:text-gray-500">
              No expense requests found matching the current filters.
            </div>
          ) : (
            <div data-testid="expense-requests-data-table">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="gba:w-[60px]">Actions</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Employee Code</TableHead>
                    <TableHead>SAP Number</TableHead>
                    <TableHead>Request Number</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Creation Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="gba:text-right">Remaining Amount</TableHead>
                    <TableHead className="gba:text-right">Total Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((record: ExpenseData) => (
                    <TableRow 
                      key={record.id}
                      onClick={() => handleRowClick(record)}
                      className="gba:cursor-pointer gba:hover:bg-gray-50"
                    >
                      <TableCell className="gba:w-[60px]">
                        <div className="gba:flex gba:justify-start gba:gap-2">
                          <AppActionButton
                            data-testid={`expense-request-actions-${record.id}`}
                            contextsArray={[FlowContextName.expenseRequests]}
                            externalContextData={{ expenseRequestId: record.id }}
                            prefixDataTestId={`expense-request-actions-${record.id}`}
                            accessToken={accessToken}
                            emptyStateBehavior="disable"
                            deferMainContextRequestsUntilClick
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div data-testid={`expense-request-employee-${record.id}`}>
                          {record.employee}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div data-testid={`expense-request-employee-code-${record.id}`}>
                          {record.employeeCode}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div data-testid={`expense-request-sap-number-${record.id}`}>
                          {record.sapNumber}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div data-testid={`expense-request-code-${record.id}`}>
                          {record.code}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div data-testid={`expense-request-title-${record.id}`}>
                          {record.title}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div data-testid={`expense-request-start-date-${record.id}`}>
                          {record.startDate && record.startDate !== 'N/A' ? formatDate(record.startDate, 'date.short') : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div data-testid={`expense-request-end-date-${record.id}`}>
                          {record.endDate && record.endDate !== 'N/A' ? formatDate(record.endDate, 'date.short') : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div data-testid={`expense-request-creation-date-${record.id}`}>
                          {record.creationDate && record.creationDate !== 'N/A' ? formatDate(record.creationDate, 'date.short') : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div data-testid={`expense-request-status-${record.id}`}>
                          <Pill
                            label={getExpenseRequestStatusDisplay(record.status).label}
                            type={getExpenseRequestStatusDisplay(record.status).type}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="gba:text-right">
                        <span data-testid={`expense-request-remaining-amount-${record.id}`}>
                          {(() => {
                            const remainingAmount = Number(record.totalRemainingAmount) || 0;
                            const currencyCode = record.currency?.code || '';
                            return remainingAmount > 0 ? `${formatNumberFunction(String(remainingAmount))} ${currencyCode}` : '-';
                          })()}
                        </span>
                      </TableCell>
                      <TableCell className="gba:text-right">
                        <span data-testid={`expense-request-total-amount-${record.id}`}>
                          {formatNumberFunction(String(record.totalAmount))} {record.currency?.code || ''}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              {totalItems > 0 && (
                <div className="gba:flex gba:justify-between gba:items-center gba:mt-4 gba:px-4">
                  <div className="gba:text-sm gba:text-gray-600">
                    {`${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, totalItems)} of ${totalItems} items`}
                  </div>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => handleEnhancedTableChange({ current: currentPage - 1, pageSize }, {}, {})}
                          className={currentPage <= 1 ? 'gba:pointer-events-none gba:opacity-50' : 'gba:cursor-pointer'}
                        />
                      </PaginationItem>
                      {Array.from({ length: Math.ceil(totalItems / pageSize) }, (_, i) => i + 1)
                        .filter(page => page === 1 || page === Math.ceil(totalItems / pageSize) || Math.abs(page - currentPage) <= 1)
                        .map((page, index, array) => (
                          <React.Fragment key={page}>
                            {index > 0 && array[index - 1] !== page - 1 && (
                              <PaginationItem>
                                <span className="gba:px-2">...</span>
                              </PaginationItem>
                            )}
                            <PaginationItem>
                              <PaginationLink
                                onClick={() => handleEnhancedTableChange({ current: page, pageSize }, {}, {})}
                                className={page === currentPage ? 'gba:bg-blue-500 gba:text-white' : 'gba:cursor-pointer'}
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          </React.Fragment>
                        ))}
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => handleEnhancedTableChange({ current: currentPage + 1, pageSize }, {}, {})}
                          className={currentPage >= Math.ceil(totalItems / pageSize) ? 'gba:pointer-events-none gba:opacity-50' : 'gba:cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          )
        }
        dataDetails={
          selectedExpense ? {
            title: getTranslationFromI18nKeyAndLabel('expense.request.details.title', 'Expense Request Details'),
            content: (
              <div className="gba:p-4">
                <div className="gba:mb-4">
                  <h3 className="gba:text-lg gba:font-semibold">{selectedExpense.title}</h3>
                  <p className="gba:text-sm gba:text-gray-600">{selectedExpense.code}</p>
                </div>
                <div className="gba:space-y-2">
                  <div className="gba:flex gba:justify-between">
                    <span className="gba:font-medium">Employee:</span>
                    <span>{selectedExpense.employee}</span>
                  </div>
                  <div className="gba:flex gba:justify-between">
                    <span className="gba:font-medium">Employee Code:</span>
                    <span>{selectedExpense.employeeCode}</span>
                  </div>
                  <div className="gba:flex gba:justify-between">
                    <span className="gba:font-medium">SAP Number:</span>
                    <span>{selectedExpense.sapNumber}</span>
                  </div>
                  <div className="gba:flex gba:justify-between">
                    <span className="gba:font-medium">Request Number:</span>
                    <span>{selectedExpense.code}</span>
                  </div>
                  <div className="gba:flex gba:justify-between">
                    <span className="gba:font-medium">Title:</span>
                    <span>{selectedExpense.title}</span>
                  </div>
                  <div className="gba:flex gba:justify-between">
                    <span className="gba:font-medium">Start Date:</span>
                    <span>{selectedExpense.startDate && selectedExpense.startDate !== 'N/A' ? formatDate(selectedExpense.startDate, 'date.long') : 'N/A'}</span>
                  </div>
                  <div className="gba:flex gba:justify-between">
                    <span className="gba:font-medium">End Date:</span>
                    <span>{selectedExpense.endDate && selectedExpense.endDate !== 'N/A' ? formatDate(selectedExpense.endDate, 'date.long') : 'N/A'}</span>
                  </div>
                  <div className="gba:flex gba:justify-between">
                    <span className="gba:font-medium">Creation Date:</span>
                    <span>{selectedExpense.creationDate && selectedExpense.creationDate !== 'N/A' ? formatDate(selectedExpense.creationDate, 'date.long') : 'N/A'}</span>
                  </div>
                  <div className="gba:flex gba:justify-between">
                    <span className="gba:font-medium">Status:</span>
                    <span>{selectedExpense.status}</span>
                  </div>
                  <div className="gba:flex gba:justify-between">
                    <span className="gba:font-medium">Remaining Amount:</span>
                    <span>
                      {(() => {
                        const remainingAmount = Number(selectedExpense.totalRemainingAmount) || 0;
                        const currencyCode = selectedExpense.currency || '';
                        return remainingAmount > 0 ? `${formatNumberFunction(String(remainingAmount))} ${currencyCode}` : '-';
                      })()}
                    </span>
                  </div>
                  <div className="gba:flex gba:justify-between">
                    <span className="gba:font-medium">Total Amount:</span>
                    <span>{formatNumberFunction(String(selectedExpense.totalAmount))}</span>
                  </div>
                </div>
              </div>
            ),
            onClose: handleCloseDetails,
          } : undefined
        }
      />
    </>
  );
};

export default ExpenseRequestsTable;

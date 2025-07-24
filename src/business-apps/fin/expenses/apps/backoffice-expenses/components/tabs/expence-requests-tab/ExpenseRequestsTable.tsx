/**
 * Expense Requests Table Component
 * Displays a table of expense requests with filtering and view capabilities
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useExpenseRequests } from '../../../hooks/useExpenseRequests';
import { DataTable, ActionButton } from '@newwork/gravity-ui-catalog';
import { Alert, Spinner } from '@newwork/nw-design-system';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import { DataFilterGroup } from '@/components/data-filter/DataFilter';
import { formatNumberFunction, getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils';
import { ExpenseData } from '../../../types';
import { getExpenseRequestStatusDisplay } from '../../../utils/utils';
import Pill from '@/components/pill/Pill';

// Simple debounce function to avoid lodash dependency
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
  
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
  }), [props.accessToken]);
  
  // ⚡ BEST PRACTICE: Get initial values from URL parameters (like leads)
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
  
  // Local state management with URL initialization
  const [searchText, setSearchText] = useState<string>(search ?? initialParams.search);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseData | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  
  // ⚡ BEST PRACTICE: Update URL parameters (like leads)
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

  // ⚡ BEST PRACTICE: Use the hook with proper error handling
  const {
    expenses,
    loading,
    error,
    totalItems,
    currentPage,
    pageSize,
    searchTerm,
    fetchData,
    handleTableChange,
    handleSearch,
    handleEmployeeFilter,
    searchEmployees,
  } = useExpenseRequests(contextProps);

  // Employee filter states
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [employeeSearchText, setEmployeeSearchText] = useState('');
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [employeeSearchResults, setEmployeeSearchResults] = useState<Array<{id: string, name: string}>>([]);
  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<Array<{id: string, name: string}>>([]);

  // Debounced search for employees
  const debouncedSearchEmployees = useMemo(() => 
    debounce(async (searchTerm: string) => {
      if (!searchTerm.trim()) {
        setEmployeeSearchResults([]);
        return;
      }
      
      setEmployeeSearchLoading(true);
      try {
        const results = await searchEmployees(searchTerm);
        setEmployeeSearchResults(results);
      } catch (error) {
        console.error('Error searching employees:', error);
        setEmployeeSearchResults([]);
      } finally {
        setEmployeeSearchLoading(false);
      }
    }, 300),
    [searchEmployees]
  );

  // Handle clicking outside dropdown to close it
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

  // ⚡ BEST PRACTICE: Load data on mount and when dependencies change
  useEffect(() => {
    // Only fetch data if we have an access token and the component is mounted
    if (contextProps.accessToken) {
      fetchData();
    }
  }, [contextProps.accessToken]); // Only depend on accessToken to prevent excessive calls

  // ⚡ BEST PRACTICE: Sync URL params with state
  useEffect(() => {
    if (searchText !== initialParams.search) {
      updateURLParams({ search: searchText });
    }
  }, [searchText, initialParams.search, updateURLParams]);

  // ⚡ BEST PRACTICE: Handle search changes
  const handleSearchChange = useCallback((value: string) => {
    setSearchText(value);
    handleSearch(value);
    onSearchChange?.(value);
  }, [handleSearch, onSearchChange]);

  // ⚡ BEST PRACTICE: Handle row selection
  const handleRowSelection = useCallback((selectedRowKeys: React.Key[], selectedRows: any[]) => {
    setSelectedRowKeys(selectedRowKeys);
    if (selectedRows.length === 1) {
      setSelectedExpense(selectedRows[0] as ExpenseData);
    } else {
      setSelectedExpense(null);
    }
  }, []);

  // ⚡ BEST PRACTICE: Handle row click
  const handleRowClick = useCallback((record: any) => {
    setSelectedExpense(record as ExpenseData);
  }, []);

  // ⚡ BEST PRACTICE: Handle close details
  const handleCloseDetails = useCallback(() => {
    setSelectedExpense(null);
    setSelectedRowKeys([]);
  }, []);

  // ⚡ BEST PRACTICE: Create filter groups
  const filterGroups: DataFilterGroup[] = useMemo(() => [
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
  ], [employeeSearchText, showEmployeeDropdown, employeeSearchResults, employeeSearchLoading, selectedEmployees, handleEmployeeFilter]);

  // ⚡ BEST PRACTICE: Create filter label map
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
  }, []);

  // ⚡ BEST PRACTICE: Handle table change
  const handleEnhancedTableChange = useCallback((pagination: any, _filters: any, sorter: any) => {
    handleTableChange(pagination, _filters, sorter);
  }, [handleTableChange]);

  // ⚡ BEST PRACTICE: Create column helper function
  const createColumn = useCallback((key: string, title: string, render?: (value: any, record: any) => React.ReactNode, additionalProps?: any) => {
    return {
      title,
      key: key,
      render,
      ...additionalProps,
    };
  }, []);

  // ⚡ BEST PRACTICE: Show loading state
  if (loading && expenses.length === 0) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
        <Spinner size="lg" />
      </div>
    );
  }

  // ⚡ BEST PRACTICE: Show error state
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
            employee: employeeFilter ? `Employee: ${selectedEmployees.map(e => e.name).join(', ')}` : 'Employee: All',
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
                }
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
            <DataTable
              dataSource={expenses}
              rowKey="id"
              columns={[
                {
                  title: '',
                  key: 'actions',
                  width: 60,
                  render: (_: any, record: ExpenseData) => (
                    <div className="gba:flex gba:justify-start gba:gap-2">
                      <ActionButton
                        data-testid={`expense-request-actions-${record.id}`}
                        flowData={[
                          {
                            category: 'Actions',
                            key: 'view-expense-request',
                            label: 'View Expense Request Details',
                            onClick: () => handleRowClick(record)
                          }
                        ]}
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  ),
                },
                createColumn('employee', 'Employee', (text: any, record: ExpenseData) => (
                  <div data-testid={`expense-request-employee-${record.id}`}>
                    {record.employee}
                  </div>
                )),
                createColumn('employeeCode', 'Employee Code', (text: any, record: ExpenseData) => (
                  <div data-testid={`expense-request-employee-code-${record.id}`}>
                    {record.employeeCode}
                  </div>
                )),
                createColumn('sapNumber', 'SAP Number', (text: any, record: ExpenseData) => (
                  <div data-testid={`expense-request-sap-number-${record.id}`}>
                    {record.sapNumber}
                  </div>
                )),
                createColumn('code', 'Request Number', (text: any, record: ExpenseData) => (
                  <div data-testid={`expense-request-code-${record.id}`}>
                    {record.code}
                  </div>
                )),
                createColumn('title', 'Title', (text: any, record: ExpenseData) => (
                  <div data-testid={`expense-request-title-${record.id}`}>
                    {record.title}
                  </div>
                )),
                createColumn('startDate', 'Start Date', (text: any, record: ExpenseData) => (
                  <div data-testid={`expense-request-start-date-${record.id}`}>
                    {record.startDate && record.startDate !== 'N/A' ? formatDate(record.startDate, 'date.short') : '-'}
                  </div>
                )),
                createColumn('endDate', 'End Date', (text: any, record: ExpenseData) => (
                  <div data-testid={`expense-request-end-date-${record.id}`}>
                    {record.endDate && record.endDate !== 'N/A' ? formatDate(record.endDate, 'date.short') : '-'}
                  </div>
                )),
                createColumn('creationDate', 'Creation Date', (text: any, record: ExpenseData) => (
                  <div data-testid={`expense-request-creation-date-${record.id}`}>
                    {record.creationDate && record.creationDate !== 'N/A' ? formatDate(record.creationDate, 'date.short') : '-'}
                  </div>
                )),
                createColumn('status', 'Status', (text: any, record: ExpenseData) => (
                  <div data-testid={`expense-request-status-${record.id}`}>
                    <Pill
                      label={getExpenseRequestStatusDisplay(record.status).label}
                      type={getExpenseRequestStatusDisplay(record.status).type}
                    />
                  </div>
                )),
                createColumn('totalRemainingAmount', 'Remaining Amount', (text: any, record: ExpenseData) => {
                  const remainingAmount = Number(record.totalRemainingAmount) || 0;
                  const currencyCode = record.currency?.code || '';
                  return (
                    <span data-testid={`expense-request-remaining-amount-${record.id}`} className="gba:text-right">
                      {remainingAmount > 0 ? `${formatNumberFunction(String(remainingAmount))} ${currencyCode}` : '-'}
                    </span>
                  );
                }, { 
                  onCell: () => ({ className: 'gba:text-right' }), 
                  title: <div className="gba:text-right">Remaining Amount</div>
                }),
                createColumn('totalAmount', 'Total Amount', (text: any, record: ExpenseData) => {
                  const totalAmount = record.totalAmount || 0;
                  const currencyCode = record.currency?.code || '';
                  return (
                    <span data-testid={`expense-request-total-amount-${record.id}`} className="gba:text-right">
                      {formatNumberFunction(String(totalAmount))} {currencyCode}
                    </span>
                  );
                }, { 
                  onCell: () => ({ className: 'gba:text-right' }), 
                  title: <div className="gba:text-right">Total Amount</div>
                }),
              ]}
              rowSelection={{
                selectedRowKeys,
                onChange: handleRowSelection,
              }}
              onRow={(record) => ({
                onClick: () => handleRowClick(record),
                style: { cursor: 'pointer' }
              })}
              pagination={{
                current: currentPage,
                pageSize: pageSize,
                total: totalItems,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`
              }}
              onChange={handleEnhancedTableChange}
              loading={loading}
              data-testid="expense-requests-data-table"
            />
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

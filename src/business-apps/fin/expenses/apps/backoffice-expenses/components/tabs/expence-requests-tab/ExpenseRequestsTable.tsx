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
    statusFilter,
    departmentFilter,
    fetchData,
    handleTableChange,
    handleSearch,
    handleStatusFilter,
    handleDepartmentFilter,
  } = useExpenseRequests(contextProps);

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
      id: 'status',
      title: getTranslationFromI18nKeyAndLabel('expense.request.filter.status', 'Status'),
      filters: [
        { id: '', label: getTranslationFromI18nKeyAndLabel('expense.request.filter.all', 'All'), selected: !statusFilter },
        { id: 'CREATED', label: getTranslationFromI18nKeyAndLabel('expense.request.status.created', 'Created'), selected: statusFilter === 'CREATED' },
        { id: 'SUBMITTED', label: getTranslationFromI18nKeyAndLabel('expense.request.status.submitted', 'Submitted'), selected: statusFilter === 'SUBMITTED' },
        { id: 'APPROVED', label: getTranslationFromI18nKeyAndLabel('expense.request.status.approved', 'Approved'), selected: statusFilter === 'APPROVED' },
        { id: 'REJECTED', label: getTranslationFromI18nKeyAndLabel('expense.request.status.rejected', 'Rejected'), selected: statusFilter === 'REJECTED' },
        { id: 'BOOKED', label: getTranslationFromI18nKeyAndLabel('expense.request.status.booked', 'Booked'), selected: statusFilter === 'BOOKED' },
      ]
    },
    {
      id: 'department',
      title: getTranslationFromI18nKeyAndLabel('expense.request.filter.department', 'Department'),
      filters: [
        { id: '', label: getTranslationFromI18nKeyAndLabel('expense.request.filter.all', 'All'), selected: !departmentFilter },
        // Add department options here if available
      ]
    },
  ], [statusFilter, departmentFilter]);

  // ⚡ BEST PRACTICE: Create filter label map
  const filterLabelMap = useMemo(() => ({
    status: getTranslationFromI18nKeyAndLabel('expense.request.filter.status', 'Status'),
    department: getTranslationFromI18nKeyAndLabel('expense.request.filter.department', 'Department'),
  }), []);

  // ⚡ BEST PRACTICE: Create filter getters and setters
  const getFilters = useCallback((filtersToApply?: string[]) => {
    const filters: Record<string, any> = {};
    if (statusFilter) filters.status = statusFilter;
    if (departmentFilter) filters.department = departmentFilter;
    return filters;
  }, [statusFilter, departmentFilter]);

  const setFilters = useCallback((filters: string[]) => {
    // Handle filter updates if needed
  }, []);

  // ⚡ BEST PRACTICE: Handle table change
  const handleEnhancedTableChange = useCallback((pagination: any, _filters: any, sorter: any) => {
    handleTableChange(pagination, _filters, sorter);
  }, [handleTableChange]);

  // ⚡ BEST PRACTICE: Create column helper function
  const createColumn = (key: string, title: string, render: (text: any, record: any) => React.ReactNode, options?: any) => ({
    key,
    title,
    dataIndex: key,
    render,
    ...options
  });

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
    <DataContainer
      dataControllerProps={{
        search: searchText,
        setSearch: handleSearchChange,
        filter: [],
        setFilter: () => {},
      }}
      dataFilterProps={{
        filterGroups: filterGroups,
        onFilterChange: (filterId: string, selected: boolean) => {
          if (filterId === '') {
            // Handle "All" selection
            if (selected) {
              handleStatusFilter('');
              handleDepartmentFilter('');
            }
          } else {
            // Handle specific filter selection
            if (filterId === 'CREATED' || filterId === 'SUBMITTED' || filterId === 'APPROVED' || filterId === 'REJECTED' || filterId === 'BOOKED') {
              handleStatusFilter(selected ? filterId : '');
            } else {
              handleDepartmentFilter(selected ? filterId : '');
            }
          }
        },
      }}
      dataBody={
        <DataTable
          rowKey="id"
          dataSource={expenses}
          columns={[
            {
              title: '',
              key: 'actions',
              align: 'center',
              width: 60,
              render: (_: any, record: any) => {
                const flowData = [
                  {
                    category: 'Actions',
                    key: 'view-expense-request',
                    label: 'View Expense Request Details',
                    onClick: () => {
                      setSelectedExpense(record);
                    }
                  }
                ];

                return (
                  <div className="gba:flex gba:justify-center gba:items-center gba:w-full gba:h-full">
                    <ActionButton
                      onClick={(e) => e.stopPropagation()}
                      flowData={flowData}
                      data-testid={`actions-${record.id}`}
                      size="md"
                    />
                  </div>
                );
              }
            },
            createColumn('employee', 'Employee', (text: any, record: any) => {
              const employee = record.employee || 'N/A';
              return <div data-testid="expense-request-employee-cell">{employee}</div>;
            }),
            createColumn('employeeCode', 'Employee Code', (text: any, record: any) => {
              const employeeCode = record.employeeCode || 'N/A';
              return <div data-testid="expense-request-employee-code-cell">{employeeCode}</div>;
            }),
            createColumn('sapNumber', 'SAP Number', (text: any, record: any) => {
              const sapNumber = record.sapNumber || 'N/A';
              return <div data-testid="expense-request-sap-number-cell">{sapNumber}</div>;
            }),
            createColumn('code', 'Request Number', (text: any, record: any) => {
              const code = record.code || 'N/A';
              return <div data-testid="expense-request-code-cell">{code}</div>;
            }),
            createColumn('title', 'Title', (text: any, record: any) => {
              const title = record.title || 'N/A';
              return <div style={{ fontWeight: 'normal' }} data-testid="expense-request-title-cell">{title}</div>;
            }),
            createColumn('startDate', 'Start Date', (text: any, record: any) => {
              const startDate = record.startDate;
              const formattedDate = startDate && startDate !== 'N/A' ? formatDate(startDate, 'date.short') : 'N/A';
              return <div data-testid="expense-request-start-date-cell">{formattedDate}</div>;
            }),
            createColumn('endDate', 'End Date', (text: any, record: any) => {
              const endDate = record.endDate;
              const formattedDate = endDate && endDate !== 'N/A' ? formatDate(endDate, 'date.short') : 'N/A';
              return <div data-testid="expense-request-end-date-cell">{formattedDate}</div>;
            }),
            createColumn('creationDate', 'Creation Date', (text: any, record: any) => {
              const creationDate = record.creationDate;
              const formattedDate = creationDate && creationDate !== 'N/A' ? formatDate(creationDate, 'date.short') : 'N/A';
              return <div data-testid="expense-request-creation-date-cell">{formattedDate}</div>;
            }),
            createColumn('status', 'Status', (text: any, record: any) => {
              const statusValue = record.status || 'N/A';
              const { label, type } = getExpenseRequestStatusDisplay(statusValue);
              return <Pill label={label} type={type} className="gba:text-center" data-testid="expense-request-status-cell" />;
            }),
            createColumn('totalRemainingAmount', 'Remaining Amount', (text: any, record: any) => {
              const remainingAmount = record.totalRemainingAmount || 0;
              const currencyCode = record.currency || '';
              
              return (
                <span data-testid="expense-request-remaining-amount-cell" className="gba:text-right">
                  {remainingAmount > 0 ? formatNumberFunction(String(remainingAmount)) : '-'}
                </span>
              );
            }, { 
              onCell: () => ({ className: 'gba:text-right' }), 
              title: <div className="gba:text-right">Remaining Amount</div>
            }),
            createColumn('totalAmount', 'Total Amount', (text: any, record: any) => {
              const totalAmount = record.totalAmount || '-';
              return (
                <span data-testid="expense-request-total-amount-cell" className="gba:text-right">
                  {formatNumberFunction(String(totalAmount))} {record.currency}
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
  );
};

export default ExpenseRequestsTable;

/**
 * Expense Requests Table Component
 * Displays a table of expense requests with filtering and view capabilities
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useExpenseRequests } from '../../../hooks/useExpenseRequests';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Alert,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Card,
  CardContent,
  Spinner,
} from '@newwork/nw-design-system';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';

import { ExpenseData } from '../../../types';
import ExpenseDetailDrawer from '../../details/ExpenseDetailDrawer';
import { getExpenseRequestStatusConfig } from '../../../utils/badgeUtils';
import { ExpenseStatus } from '../../../utils/utils';

// Move outside component to prevent re-creation on every render
const AVAILABLE_FILTER_STATUSES: ExpenseStatus[] = [
  ExpenseStatus.PREPARED,
  ExpenseStatus.CREATED,
  ExpenseStatus.ASSIGNED,
  ExpenseStatus.PENDING,
  ExpenseStatus.APPROVED,
  ExpenseStatus.VERIFIED,
  ExpenseStatus.BOOKED,
  ExpenseStatus.TRANSFERRED,
  ExpenseStatus.PAID,
  ExpenseStatus.REJECTED,
  ExpenseStatus.CLOSED,
  ExpenseStatus.DISCARDED,
];

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

    const newURL = `${window.location.pathname}?${newSearchParams.toString()}`;
    window.history.replaceState({}, '', newURL);
  }, []);
  
  // Get expense requests data using the hook
  const { 
    expenses, 
    loading, 
    error,
    departments,
    handleTableChange,
    handleSearch,
    handleStatusFilter,
    handleDepartmentFilter,
    totalItems,
    currentPage,
    pageSize,
    searchTerm: hookSearchTerm,
    statusFilter: hookStatusFilter,
    departmentFilter: hookDepartmentFilter,
  } = useExpenseRequests(contextProps);

  // Sync with parent search prop if provided
  useEffect(() => {
    if (search !== undefined && search !== searchText) {
      setSearchText(search);
    }
  }, [search, searchText]);

  // Handle search changes
  const handleSearchChange = useCallback((value: string) => {
    setSearchText(value);
    handleSearch(value); // Pass to hook for API call
    
    // Notify parent if callback exists
    if (onSearchChange) {
      onSearchChange(value);
    }
  }, [onSearchChange, handleSearch]);

  // Removed old handlers - now using handleFilterChange

  // Handle expense selection
  const handleSelectExpense = useCallback((expense: ExpenseData) => {
    setSelectedExpense(expense);
    setSelectedRowKeys([expense.id]);
  }, []);

  // Handle row selection change
  const handleRowSelectionChange = useCallback((newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
    
    // If a single row is selected, find and set the selected expense
    if (newSelectedRowKeys.length === 1) {
      const selectedExpenseId = newSelectedRowKeys[0];
      const expense = expenses?.find(expense => expense.id === selectedExpenseId);
      if (expense) {
        setSelectedExpense(expense);
      }
    } else {
      // If multiple or no rows selected, clear the selected expense
      setSelectedExpense(null);
    }
  }, [expenses]);

  const handleViewDetails = useCallback((record: ExpenseData) => {
    setSelectedExpense(record);
    setSelectedRowKeys([record.id]);
  }, []);

  // Column definitions removed - now building table manually with Table components

  // Render data body with DataTable
  const renderDataBody = () => {
    if (error) {
      return (
        <div 
          className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center"
          data-testid="expense-requests-error-state"
        >
          <div className="gba:text-red-500 gba:text-lg gba:font-medium gba:mb-2">
            Error Loading Expense Requests
          </div>
          <div className="gba:text-gray-600 gba:mb-4">
            {error}
          </div>
          <Button
            variant="default"
            onClick={() => window.location.reload()}
            data-testid="expense-requests-retry-button"
          >
            Retry
          </Button>
        </div>
      );
    }

    if (!expenses || expenses.length === 0 && !loading) {
      return (
        <div className="gba:text-center gba:p-5" data-testid="expense-requests-empty">
          <p className="gba:text-muted-foreground">No expense requests found.</p>
        </div>
      );
    }

    if (loading) {
      return (
        <div className="gba:text-center gba:p-5" data-testid="expense-requests-loading">
          <div className="gba:inline-block gba:animate-spin gba:rounded-full gba:h-8 gba:w-8 gba:border-b-2 gba:border-gray-900"></div>
          <p className="gba:mt-2 gba:text-muted-foreground">Loading expense requests...</p>
        </div>
      );
    }

    return (
      <Card data-testid="expense-requests-table">
        <CardContent className="gba:p-0">
          {loading && (
            <div className="gba:flex gba:justify-center gba:p-4">
              <Spinner />
            </div>
          )}
          
          <div className="gba:overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="gba:border-b gba:bg-gray-50">
                  <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">Request Number</TableHead>
                  <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">Employee</TableHead>
                  <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">SAP Number</TableHead>
                  <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">Title</TableHead>
                  <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">Status</TableHead>
                  <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">Department</TableHead>
                  <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">Total Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses?.map((record) => (
                  <TableRow 
                    key={record.id}
                    className="gba:border-b gba:hover:bg-gray-50 gba:transition-colors"
                    data-testid={`expense-request-row-${record.id}`}
                  >
                    <TableCell className="gba:py-4 gba:px-6">
                      <button
                        onClick={() => handleViewDetails(record)}
                        className="gba:cursor-pointer gba:hover:bg-gray-100 gba:p-1 gba:rounded"
                        data-testid={`request-number-${record.id}`}
                      >
                        {record.code}
                      </button>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6">{record.employee}</TableCell>
                    <TableCell className="gba:py-4 gba:px-6">{record.sapNumber}</TableCell>
                    <TableCell className="gba:py-4 gba:px-6">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="gba:max-w-[200px] gba:overflow-hidden gba:text-ellipsis gba:whitespace-nowrap">
                              {record.title}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{record.title}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6">
                      {(() => {
                        const { label, variant } = getExpenseRequestStatusConfig(record.status);
                        return (
                          <Badge variant={variant} data-testid={`status-badge-${record.status?.toLowerCase()}`}>
                            {label}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6">{record.department}</TableCell>
                    <TableCell className="gba:py-4 gba:px-6">{record.amount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-4">
            <div className="gba:text-sm gba:text-muted-foreground">
              {totalItems > 0 
                ? `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, totalItems)} of ${totalItems} expense requests`
                : '0-0 of 0 expense requests'}
            </div>
            <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
              <div className="gba:flex gba:items-center gba:space-x-2">
                <p className="gba:text-sm gba:font-medium">Rows per page</p>
                <select
                  value={pageSize}
                  onChange={(e) => handleTableChange(
                    { current: 1, pageSize: Number(e.target.value) },
                    {},
                    {}
                  )}
                  className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                  data-testid="expense-requests-page-size-select"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium">
                Page {currentPage} of {Math.max(1, Math.ceil(totalItems / pageSize))}
              </div>
              <div className="gba:flex gba:items-center gba:space-x-2">
                <Button 
                  variant="outline" 
                  className="gba:h-8 gba:w-8 gba:p-0" 
                  disabled={currentPage === 1}
                  onClick={() => handleTableChange({ current: 1, pageSize }, {}, {})}
                  data-testid="expense-requests-first-page"
                >
                  ⟨⟨
                </Button>
                <Button 
                  variant="outline" 
                  className="gba:h-8 gba:w-8 gba:p-0" 
                  disabled={currentPage === 1}
                  onClick={() => handleTableChange({ current: currentPage - 1, pageSize }, {}, {})}
                  data-testid="expense-requests-prev-page"
                >
                  ⟨
                </Button>
                <Button 
                  variant="outline" 
                  className="gba:h-8 gba:w-8 gba:p-0" 
                  disabled={currentPage === Math.max(1, Math.ceil(totalItems / pageSize))}
                  onClick={() => handleTableChange({ current: currentPage + 1, pageSize }, {}, {})}
                  data-testid="expense-requests-next-page"
                >
                  ⟩
                </Button>
                <Button 
                  variant="outline" 
                  className="gba:h-8 gba:w-8 gba:p-0" 
                  disabled={currentPage === Math.max(1, Math.ceil(totalItems / pageSize))}
                  onClick={() => handleTableChange({ current: Math.max(1, Math.ceil(totalItems / pageSize)), pageSize }, {}, {})}
                  data-testid="expense-requests-last-page"
                >
                  ⟩⟩
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Create proper filter groups using status config mappings
  const filterGroups = [
    {
      id: 'status',
      title: 'Status',
      filters: AVAILABLE_FILTER_STATUSES.map(status => {
        const { label } = getExpenseRequestStatusConfig(status);
        return {
          id: status,
          label: label,
          selected: hookStatusFilter === status
        };
      })
    },
    {
      id: 'department', 
      title: 'Department',
      filters: (departments || []).filter((dept): dept is string => typeof dept === 'string' && dept.length > 0).map(dept => ({
        id: dept,
        label: dept,
        selected: hookDepartmentFilter === dept
      }))
    }
  ];

  // Handle filter changes like leads table
  const handleFilterChange = useCallback((filterId: string, selected: boolean) => {
    // Status filters - check if it's one of our available status values
    if (AVAILABLE_FILTER_STATUSES.includes(filterId as ExpenseStatus)) {
      handleStatusFilter(selected ? filterId : '');
    } 
    // Department filters (any other filterId that's not a status)
    else if (departments?.includes(filterId)) {
      handleDepartmentFilter(selected ? filterId : '');
    }
  }, [departments, handleStatusFilter, handleDepartmentFilter]);

  return (
    <DataContainer
      dataControllerProps={{
        search: searchText,
        setSearch: handleSearchChange,
        placeholder: 'Search by request number, employee, title...',
        filter: [],
        setFilter: () => { /* Placeholder for DataContainer prop */ },
        listTitle: 'Expense Requests',
        listAmount: totalItems,
        debounceDelay: 300,
      }}
      dataFilterProps={{
        filterGroups: filterGroups,
        onFilterChange: handleFilterChange,
      }}
      dataBody={renderDataBody()}
      contentBackground="white"
      dataDetails={selectedExpense ? {
        title: 'Expense Request Details',
        content: (
          <ExpenseDetailDrawer
            visible={true}
            onClose={() => {
              setSelectedExpense(null);
              setSelectedRowKeys([]);
            }}
            expenseId={selectedExpense.id}
            accessToken={accessToken}
          />
        ),
      } : undefined}
      onDetailsPanelClose={() => {
        setSelectedExpense(null);
        setSelectedRowKeys([]);
      }}
      data-testid="expense-requests-container"
    />
  );
};

export default ExpenseRequestsTable;

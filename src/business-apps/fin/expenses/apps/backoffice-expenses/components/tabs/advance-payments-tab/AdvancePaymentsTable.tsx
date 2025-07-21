/**
 * Advance Payments Table Component
 * Displays a table of advance payments with filtering and view capabilities
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useAdvancePayments } from '../../../hooks/useAdvancePayment';
import {
  Button,
  Alert,
  Badge,
  Spinner,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Card,
  CardContent,
} from '@newwork/nw-design-system';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';

import { getAdvancePaymentStatusConfig } from '../../../utils/badgeUtils';
import { ExpenseStatus } from '../../../utils/utils';
import ExpenseDetailDrawer from '../../details/ExpenseDetailDrawer';

interface AdvancePaymentsTableProps extends BusinessAppContextProps {
  search?: string;
  onSearchChange?: (search: string) => void;
}

const AdvancePaymentsTable: React.FC<AdvancePaymentsTableProps> = (props) => {
  const { search, onSearchChange, accessToken } = props;
  
  // Local state management
  const [searchText, setSearchText] = useState<string>(search ?? '');
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20); // ⚡ BEST PRACTICE: Match leads default (20)
  
  // Get advance payments data using the hook with optimized parameters
  const { 
    payments, 
    isLoading, 
    error, 
    totalCount, 
    fetchPayments 
  } = useAdvancePayments({ accessToken });

  // Debounced fetch function to improve performance
  const debouncedFetchPayments = useCallback(
    debounce((searchTerm: string, page: number, size: number, status?: string) => {
      fetchPayments(searchTerm, page, size, status);
    }, 300),
    [fetchPayments]
  );

  // Initial data fetch on component mount - optimized
  useEffect(() => {
    debouncedFetchPayments(searchText, currentPage, pageSize, statusFilter !== '' ? statusFilter : undefined);
  }, []); // Only run once on mount

  // Sync with parent search prop if provided
  useEffect(() => {
    if (search !== undefined && search !== searchText) {
      setSearchText(search);
      setCurrentPage(1);
      debouncedFetchPayments(search, 1, pageSize, statusFilter !== '' ? statusFilter : undefined);
    }
  }, [search, debouncedFetchPayments, pageSize, statusFilter]);

  // Handle search changes with debouncing
  const handleSearchChange = useCallback((value: string) => {
    setSearchText(value);
    setCurrentPage(1);
    debouncedFetchPayments(value, 1, pageSize, statusFilter !== '' ? statusFilter : undefined);
    
    // Notify parent if callback exists
    if (onSearchChange) {
      onSearchChange(value);
    }
  }, [onSearchChange, pageSize, statusFilter, debouncedFetchPayments]);

  // Removed handleStatusChange - now using handleFilterChange

  // Handle payment selection
  const handleSelectPayment = useCallback((payment: any) => {
    setSelectedPayment(payment);
    setSelectedRowKeys([payment.id]);
  }, []);

  // Handle row selection change
  const handleRowSelectionChange = useCallback((newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
    
    // If a single row is selected, find and set the selected payment
    if (newSelectedRowKeys.length === 1) {
      const selectedPaymentId = newSelectedRowKeys[0];
      const payment = payments?.find(payment => payment.id === selectedPaymentId);
      if (payment) {
        setSelectedPayment(payment);
      }
    } else {
      // If multiple or no rows selected, clear the selected payment
      setSelectedPayment(null);
    }
  }, [payments]);

  const handleViewDetails = useCallback((record: any) => {
    setSelectedPayment(record);
    setSelectedRowKeys([record.id]);
  }, []);

  // Column definitions removed - now building table manually with Table components

  // Render data body with optimized loading states
  const renderDataBody = () => {
    if (error) {
      return (
        <Alert variant="destructive" data-testid="advance-payment-error-alert">
          <div>
            <h4 className="gba:font-semibold">API Error</h4>
            <p className="gba:text-sm gba:mt-1">{String(error)}</p>
          </div>
        </Alert>
      );
    }

    if (!payments || payments.length === 0 && !isLoading) {
      return (
        <div className="gba:text-center gba:p-5" data-testid="advance-payments-empty">
          <p className="gba:text-muted-foreground">No advance payments found.</p>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="gba:flex gba:justify-center gba:items-center gba:h-32" data-testid="advance-payments-loading">
          <Spinner size="lg" />
        </div>
      );
    }

    return (
      <Card data-testid="advance-payments-table">
        <CardContent className="gba:p-0">
          {isLoading && (
            <div className="gba:flex gba:justify-center gba:p-4">
              <Spinner />
            </div>
          )}
          
          <div className="gba:overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="gba:border-b gba:bg-gray-50">
                  <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">Expense Plan Code</TableHead>
                  <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">Employee</TableHead>
                  <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">Amount</TableHead>
                  <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments?.map((record) => (
                  <TableRow 
                    key={record.id}
                    className="gba:border-b gba:hover:bg-gray-50 gba:transition-colors"
                    data-testid={`advance-payment-row-${record.id}`}
                  >
                    <TableCell className="gba:py-4 gba:px-6">
                      <button
                        onClick={() => handleViewDetails(record)}
                        className="gba:cursor-pointer gba:hover:bg-gray-100 gba:p-1 gba:rounded"
                        data-testid={`expense-plan-code-${record.id}`}
                      >
                        {record.code || 'N/A'}
                      </button>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6">{record.employeeFullName}</TableCell>
                    <TableCell className="gba:py-4 gba:px-6">{record.amount}</TableCell>
                    <TableCell className="gba:py-4 gba:px-6">
                      {(() => {
                        const { label, variant } = getAdvancePaymentStatusConfig(record.status);
                        return (
                          <Badge variant={variant} data-testid={`status-badge-${record.status?.toLowerCase()}`}>
                            {label}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-4">
            <div className="gba:text-sm gba:text-muted-foreground">
              {totalCount > 0 
                ? `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, totalCount)} of ${totalCount} advance payments`
                : '0-0 of 0 advance payments'}
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
                    debouncedFetchPayments(searchText, 1, newPageSize, statusFilter !== 'all' ? statusFilter : undefined);
                  }}
                  className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                  data-testid="advance-payments-page-size-select"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium">
                Page {currentPage} of {Math.max(1, Math.ceil((totalCount || 0) / pageSize))}
              </div>
              <div className="gba:flex gba:items-center gba:space-x-2">
                <Button 
                  variant="outline" 
                  className="gba:h-8 gba:w-8 gba:p-0" 
                  disabled={currentPage === 1}
                  onClick={() => {
                    setCurrentPage(1);
                    debouncedFetchPayments(searchText, 1, pageSize, statusFilter !== 'all' ? statusFilter : undefined);
                  }}
                  data-testid="advance-payments-first-page"
                >
                  ⟨⟨
                </Button>
                <Button 
                  variant="outline" 
                  className="gba:h-8 gba:w-8 gba:p-0" 
                  disabled={currentPage === 1}
                  onClick={() => {
                    const newPage = currentPage - 1;
                    setCurrentPage(newPage);
                    debouncedFetchPayments(searchText, newPage, pageSize, statusFilter !== 'all' ? statusFilter : undefined);
                  }}
                  data-testid="advance-payments-prev-page"
                >
                  ⟨
                </Button>
                <Button 
                  variant="outline" 
                  className="gba:h-8 gba:w-8 gba:p-0" 
                  disabled={currentPage === Math.max(1, Math.ceil((totalCount || 0) / pageSize))}
                  onClick={() => {
                    const newPage = currentPage + 1;
                    setCurrentPage(newPage);
                    debouncedFetchPayments(searchText, newPage, pageSize, statusFilter !== 'all' ? statusFilter : undefined);
                  }}
                  data-testid="advance-payments-next-page"
                >
                  ⟩
                </Button>
                <Button 
                  variant="outline" 
                  className="gba:h-8 gba:w-8 gba:p-0" 
                  disabled={currentPage === Math.max(1, Math.ceil((totalCount || 0) / pageSize))}
                  onClick={() => {
                    const totalPages = Math.max(1, Math.ceil((totalCount || 0) / pageSize));
                    setCurrentPage(totalPages);
                    debouncedFetchPayments(searchText, totalPages, pageSize, statusFilter !== 'all' ? statusFilter : undefined);
                  }}
                  data-testid="advance-payments-last-page"
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

  // Define available filter statuses for advance payments with comprehensive mapping
  const availableAdvancePaymentStatuses = [
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

  // Create proper filter groups using advance payment status config mappings
  const filterGroups = [
    {
      id: 'status',
      title: 'Status',
      filters: availableAdvancePaymentStatuses.map(status => {
        const { label } = getAdvancePaymentStatusConfig(status);
        return {
          id: status,
          label: label,
          selected: statusFilter === status
        };
      })
    }
  ];

  // Handle filter changes like leads table
  const handleFilterChange = useCallback((filterId: string, selected: boolean) => {
    // Status filters - check if it's one of our available advance payment status values
    if (availableAdvancePaymentStatuses.includes(filterId as ExpenseStatus)) {
      const newStatusFilter = selected ? filterId : '';
      setStatusFilter(newStatusFilter);
      setCurrentPage(1);
      debouncedFetchPayments(searchText, 1, pageSize, newStatusFilter !== '' ? newStatusFilter : undefined);
    }
  }, [availableAdvancePaymentStatuses, searchText, pageSize, debouncedFetchPayments]);

  return (
    <>
      <DataContainer
        dataControllerProps={{
          search: searchText,
          setSearch: handleSearchChange,
          placeholder: 'Search advance payments...',
          filter: [],
          setFilter: () => { /* Placeholder for DataContainer prop */ },
          listTitle: 'Advance Payments',
          listAmount: totalCount || 0,
          debounceDelay: 300,
        }}
        dataFilterProps={{
          filterGroups: filterGroups,
          onFilterChange: handleFilterChange,
        }}
        dataBody={renderDataBody()}
        contentBackground="white"
        data-testid="advance-payments-container"
      />
      
      {/* Use ExpenseDetailDrawer component for consistency */}
      <ExpenseDetailDrawer
        visible={!!selectedPayment}
        onClose={() => {
          setSelectedPayment(null);
          setSelectedRowKeys([]);
        }}
        expenseId={null} // Not needed for advance payments
        accessToken={accessToken}
        type="advance-payment"
        advancePaymentData={selectedPayment}
      />
    </>
  );
};

// Simple debounce utility for performance optimization
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

export default AdvancePaymentsTable;

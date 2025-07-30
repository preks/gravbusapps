import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell, 
  Card, 
  CardContent, 
  Spinner, 
  Button, 
  Badge, 
  Alert,
  Checkbox,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from '@newwork/nw-design-system';
import Pill, { PillType } from '@/components/pill';
import { Modal, message } from 'antd';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { startProcess } from '@/common/utils/start-process';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetAdvancePayments, AdvancePayment } from '../../../hooks/useGetAdvancePayments';
import { getAdvancePaymentStatusDisplay } from '../../../utils';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { PiFileText, PiCurrencyDollar, PiArrowUp, PiArrowDown } from 'react-icons/pi';
import AdvancePaymentDetails from './AdvancePaymentDetails';
import ExpensePlanDetails from '../expense-plans-tab/ExpensePlanDetails';
import ExpenseRequestDetails from '../expense-requests-tab/ExpenseRequestDetails';
import { formatNumberFunction } from '@/common/utils/windowUtils';

const DATA_TEST_ID_PREFIX = 'AdvancePaymentsTable';

// Advance payment specific status badge variant function (proper colors for advance payments)
const getAdvancePaymentStatusBadgeVariant = (status: string) => {
  switch (status.toUpperCase()) {
    case 'PREPARED':
      return 'secondary' as const;
    case 'CREATED':
      return 'secondary' as const;
    case 'ASSIGNED':
      return 'info' as const;
    case 'PENDING':
      return 'info' as const;
    case 'APPROVED':
      return 'warning' as const;
    case 'VERIFIED':
      return 'warning' as const;
    case 'BOOKED':
      return 'warning' as const;
    case 'TRANSFERRED':
      return 'warning' as const;
    case 'PAID':
      return 'success' as const;
    case 'REJECTED':
      return 'info' as const;
    case 'CLOSED':
      return 'success' as const;
    default:
      return 'outline' as const;
  }
};

export interface AdvancePaymentsTableProps extends BusinessAppContextProps {
  search?: string;
  onSearchChange?: (search: string) => void;
  activeFilter?: string[];
  onFilterChange?: (filter: string[]) => void;
  onClearFilters?: () => void;
  filterGroups?: any[];
  handleFilterChange?: (filterId: string, selected: boolean) => void;
  filterLabelMap?: Record<string, string>;
  amountRange?: { min?: number; max?: number } | null;
  advanceRange?: { min?: number; max?: number } | null;
  selectedFilters?: string[];
  removeFilter?: (filterId: string) => void;
}

const AdvancePaymentsTable = React.forwardRef<HTMLDivElement, AdvancePaymentsTableProps>((props, ref) => {
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
    userInfo: props.userInfo
  }), [props.accessToken, props.userInfo]);
  
  const { items, isLoading, error, totalCount, fetchItems } = useGetAdvancePayments(contextProps);
  const [searchText, setSearchText] = useState<string>(props.search ?? '');
  const [selectedItem, setSelectedItem] = useState<AdvancePayment | null>(null);
  const [selectedExpensePlan, setSelectedExpensePlan] = useState<any>(null);
  const [selectedExpenseRequest, setSelectedExpenseRequest] = useState<any>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Use filter props from parent with stable references
  const currentStatusFilter = useMemo(() => props.activeFilter || [], [props.activeFilter]);
  const currentAmountRange = useMemo(() => props.amountRange || null, [props.amountRange]);
  const currentAdvanceRange = useMemo(() => props.advanceRange || null, [props.advanceRange]);
  const filterGroups = useMemo(() => props.filterGroups || [], [props.filterGroups]);
  const filterLabelMap = useMemo(() => props.filterLabelMap || {}, [props.filterLabelMap]);

  // Build fetch parameters
  const fetchParams = useMemo(() => ({
    searchText,
    currentPage,
    pageSize,
    currentStatusFilter,
    currentAmountRange,
    currentAdvanceRange
  }), [searchText, currentPage, pageSize, currentStatusFilter, currentAmountRange, currentAdvanceRange]);

  // Sync search with parent prop
  useEffect(() => {
    if (props.search !== undefined && props.search !== searchText) {
      setSearchText(props.search);
    }
  }, [props.search, searchText]);

  // Trigger fetch when dependencies change
  useEffect(() => {
    if (contextProps.accessToken && contextProps.userInfo?.employeeDetails?.employeeId) {
      fetchItems(
        fetchParams.searchText,
        fetchParams.currentPage,
        fetchParams.pageSize,
        fetchParams.currentStatusFilter,
        fetchParams.currentAmountRange,
        fetchParams.currentAdvanceRange
      );
    } else {
      console.warn('Cannot fetch advance payments: Missing accessToken or employeeId', {
        hasAccessToken: !!contextProps.accessToken,
        hasEmployeeId: !!contextProps.userInfo?.employeeDetails?.employeeId
      });
    }
  }, [contextProps.accessToken, contextProps.userInfo?.employeeDetails?.employeeId, fetchItems, fetchParams]);

  // Create a memoized setSearch function to prevent re-renders
  const handleSearchChange = useCallback((value: string) => {
    setSearchText(value);
    
    // Notify parent component of search change
    if (props.onSearchChange) {
      props.onSearchChange(value);
    }
  }, [props.onSearchChange]);

  // Handle adding a new advance payment
  const handleAddAdvancePayment = useCallback(() => {
    const employeeId = contextProps.userInfo?.employeeDetails?.employeeId;
    if (!employeeId) {
      console.warn('Cannot start process: Employee ID not available. User info may not be fully loaded.');
      message.warning('User information not loaded yet. Please wait a moment and try again.');
      return;
    }
    
    console.log('Starting add advance payment process for employeeId:', employeeId);
    startProcess({
      domain: 'employee-expense',
      processName: 'changeAdvancePayment',
      payload: {
        employeeId: employeeId
      }
    });
  }, [contextProps.userInfo?.employeeDetails?.employeeId]);

  // Handle clicking on a row to view details
  const handleSelectItem = useCallback((item: AdvancePayment) => {
    setSelectedItem(item);
  }, []);

  // Pagination handlers
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when page size changes
  }, []);

  // Handle closing the details panel
  const handleCloseDetails = useCallback(() => {
    setSelectedItem(null);
    setSelectedExpensePlan(null);
    setSelectedExpenseRequest(null);
  }, []);

  // Handle viewing expense plan details
  const handleViewExpensePlanDetails = useCallback((record: AdvancePayment) => {
    if (record.expensePlan) {
      setSelectedExpensePlan(record.expensePlan);
    }
  }, []);

  // Handle viewing expense request details
  const handleViewExpenseRequestDetails = useCallback((record: AdvancePayment) => {
    // For advance payments, we need to get the expense request from the expense plan
    if (record.expensePlan && record.expensePlan.expenseRequest) {
      setSelectedExpenseRequest(record.expensePlan.expenseRequest[0]);
    }
  }, []);

  

  // Render the data body with memoization
  const renderDataBody = useCallback(() => {
    if (isLoading) {
      return (
        <div 
          className="gba:p-6 gba:text-center" 
          data-testid={`${DATA_TEST_ID_PREFIX}-loading-state`}
        >
          <Spinner size="lg" />
        </div>
      );
    }

    if (error) {
      return (
        <div 
          className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center"
          data-testid={`${DATA_TEST_ID_PREFIX}-error-state`}
        >
          <Alert variant="destructive" className="gba:mb-4">
            <div className="gba:font-medium">Error Loading Data</div>
            <div className="gba:text-sm gba:mt-1">{error}</div>
          </Alert>
        </div>
      );
    }

    if (!items || items.length === 0) {
      return (
        <div 
          className="gba:p-6 gba:text-center" 
          data-testid={`${DATA_TEST_ID_PREFIX}-empty-state`}
        >
          <p>No advance payments found. Create your first advance payment to get started.</p>
        </div>
      );
    }

    return (
      <div className="gba:w-full">
        <div className="gba:overflow-x-auto">
          <Table data-testid={`${DATA_TEST_ID_PREFIX}-table`}>
            <TableHeader>
              <TableRow className="gba:border-b gba:bg-gray-50">
                <TableHead
                  className="gba:w-[50px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-3"
                  data-testid={`${DATA_TEST_ID_PREFIX}-actions-header`}
                />
                <TableHead
                  className="gba:w-[25%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6"
                  data-testid={`${DATA_TEST_ID_PREFIX}-expense-plan-header`}
                >
                  Expense Plan
                </TableHead>
                <TableHead
                  className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6"
                  data-testid={`${DATA_TEST_ID_PREFIX}-plan-number-header`}
                >
                  Plan Number
                </TableHead>
                <TableHead
                  className="gba:w-[10%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6"
                  data-testid={`${DATA_TEST_ID_PREFIX}-status-header`}
                >
                  Status
                </TableHead>
                <TableHead
                  className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:text-right"
                  data-testid={`${DATA_TEST_ID_PREFIX}-amount-header`}
                >
                  Amount
                </TableHead>
                <TableHead
                  className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:text-right"
                  data-testid={`${DATA_TEST_ID_PREFIX}-advance-header`}
                >
                  Advance
                </TableHead>
                <TableHead
                  className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6"
                  data-testid={`${DATA_TEST_ID_PREFIX}-payment-method-header`}
                >
                  Payment Method
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isLoading && (!items || items.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={7} className="gba:py-8 gba:text-center">
                    <div className="gba:text-gray-500">
                      No advance payments found. Create your first advance payment to get started.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                items?.map((record) => (
                  <TableRow
                    key={record.id}
                    className={`gba:border-b gba:hover:bg-gray-50 gba:transition-colors gba:cursor-pointer ${selectedItem?.id === record.id ? 'gba:bg-blue-50' : ''}`}
                    onClick={(event: React.MouseEvent) => {
                      if ((event.target as HTMLElement).tagName !== 'INPUT') {
                        handleSelectItem(record);
                      }
                    }}
                    data-testid={`${DATA_TEST_ID_PREFIX}-row-${record.id}`}
                  >
                    <TableCell
                      className="gba:py-4 gba:px-3"
                      data-testid={`${DATA_TEST_ID_PREFIX}-actions-cell-${record.id}`}
                    >
                      <div className="gba:flex gba:justify-start gba:gap-2">
                        <AppActionButton
                          data-testid={`${DATA_TEST_ID_PREFIX}-action-button-${record.id}`}
                          variant="secondary"
                          staticFlowData={[
                            {
                              category: 'Navigations',
                              key: 'view-advance-payment',
                              label: 'View Advance Payment Details',
                              onClick: (e?: React.MouseEvent) => {
                                e?.stopPropagation();
                                handleSelectItem(record);
                              }
                            },
                            ...(record.expensePlanId ? [{
                              category: 'Navigations',
                              key: 'view-plan-details',
                              label: 'View Plan Details',
                              onClick: (e?: React.MouseEvent) => {
                                e?.stopPropagation();
                                handleViewExpensePlanDetails(record);
                              }
                            }] : []),
                            ...(record.expensePlan?.expenseRequest && (record.expensePlan?.expenseRequest as unknown as any[]).length > 0 && (record.expensePlan?.expenseRequest as unknown as any[])[0].id !== null ? [{
                              category: 'Navigations',
                              key: 'view-request-details',
                              label: 'View Request Details',
                              onClick: (e?: React.MouseEvent) => {
                                e?.stopPropagation();
                                handleViewExpenseRequestDetails(record);
                              }
                            }] : [])
                          ]}
                          accessToken={contextProps.accessToken}
                          emptyStateBehavior="disable"
                          deferMainContextRequestsUntilClick
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-expense-plan-cell-${record.id}`}>
                      <div className="gba:font-medium gba:text-sm" data-testid="advance-payment-expense-plan-cell">
                        {record.expensePlan?.title ?? 'No expense plan'}
                      </div>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-plan-number-cell-${record.id}`}>
                      <div className="gba:font-medium gba:text-sm" data-testid="advance-payment-plan-number-cell">
                        {record.expensePlan?.code ?? 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-status-cell-${record.id}`}>
                      {(() => {
                        const statusConfig = getAdvancePaymentStatusDisplay(record.status);
                        return <Pill type={statusConfig.type} label={statusConfig.label} color={statusConfig.color} data-testid="advance-payment-status-cell" />;
                      })()}
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6 gba:text-right" data-testid={`${DATA_TEST_ID_PREFIX}-amount-cell-${record.id}`}>
                      <span data-testid="advance-payment-amount-cell">
                        {record.expensePlan?.totalAmount ? formatNumberFunction(record.expensePlan.totalAmount.toString(), "0.00[,]00") : '0.00'} {record.expensePlan?.currency?.code ?? 'EUR'}
                      </span>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6 gba:text-right" data-testid={`${DATA_TEST_ID_PREFIX}-advance-cell-${record.id}`}>
                      <span data-testid="advance-payment-advance-cell">
                        {formatNumberFunction(record.amount?.toString() ?? '0', "0.00[,]00")} {record.currency?.code ?? 'EUR'}
                      </span>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-payment-method-cell-${record.id}`}>
                      <div className="gba:text-sm" data-testid="advance-payment-method-cell">
                        {record.paymentMethod ? record.paymentMethod.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'Not specified'}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination - Only show if there are multiple pages */}
        {totalCount > pageSize ? (
          <div className="gba:flex gba:items-center gba:justify-between gba:px-6 gba:py-4" data-testid={`${DATA_TEST_ID_PREFIX}-pagination`}>
            <div className="gba:text-sm gba:text-muted-foreground" data-testid={`${DATA_TEST_ID_PREFIX}-pagination-info`}>
              {`${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, totalCount)} of ${totalCount} advance payments`}
            </div>
            <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
              <div className="gba:flex gba:items-center gba:space-x-2">
                <p className="gba:text-sm gba:font-medium">Rows per page</p>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const newPageSize = Number(e.target.value);
                    handlePageSizeChange(newPageSize);
                  }}
                  className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                  data-testid={`${DATA_TEST_ID_PREFIX}-page-size-select`}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium" data-testid={`${DATA_TEST_ID_PREFIX}-page-info`}>
                Page {currentPage} of {Math.ceil(totalCount / pageSize)}
              </div>
              <div className="gba:flex gba:items-center gba:space-x-2">
                <Button
                  variant="outline"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  data-testid={`${DATA_TEST_ID_PREFIX}-first-page-button`}
                >
                  <span className="gba:sr-only">Go to first page</span>
                  ⟨⟨
                </Button>
                <Button
                  variant="outline"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  data-testid={`${DATA_TEST_ID_PREFIX}-previous-page-button`}
                >
                  <span className="gba:sr-only">Go to previous page</span>
                  ⟨
                </Button>
                <Button
                  variant="outline"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                  data-testid={`${DATA_TEST_ID_PREFIX}-next-page-button`}
                >
                  <span className="gba:sr-only">Go to next page</span>
                  ⟩
                </Button>
                <Button
                  variant="outline"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => handlePageChange(Math.ceil(totalCount / pageSize))}
                  disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                  data-testid={`${DATA_TEST_ID_PREFIX}-last-page-button`}
                >
                  <span className="gba:sr-only">Go to last page</span>
                  ⟩⟩
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="gba:flex gba:items-center gba:justify-between gba:px-6 gba:py-4" data-testid={`${DATA_TEST_ID_PREFIX}-pagination-info-single-page`}>
            <div className="gba:text-sm gba:text-muted-foreground">
              {`${totalCount} advance payments`}
            </div>
            <div className="gba:flex gba:items-center gba:space-x-2">
              <p className="gba:text-sm gba:font-medium">Rows per page</p>
              <select
                value={pageSize}
                onChange={(e) => {
                  const newPageSize = Number(e.target.value);
                  handlePageSizeChange(newPageSize);
                }}
                className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                data-testid={`${DATA_TEST_ID_PREFIX}-page-size-select-single`}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        )}
      </div>
    );
  }, [items, isLoading, error, handleSelectItem, handleViewExpensePlanDetails, handleViewExpenseRequestDetails, contextProps.accessToken, totalCount]);

  // Memoize DataContainer props to prevent unnecessary re-renders
  const dataControllerProps = useMemo(() => ({
    search: searchText,
    filter: props.selectedFilters || currentStatusFilter,
    setSearch: handleSearchChange,
    setFilter: (newFilters: any) => {
      // Handle filter changes
      if (props.onFilterChange) {
        props.onFilterChange(newFilters as string[]);
      }
    },
    addButton: {
      onClick: handleAddAdvancePayment,
      label: 'Add',
      'data-testid': 'add-advance-payment-button'
    },
    listTitle: "My Advance Payments",
    listAmount: totalCount ? `${totalCount}` : undefined,
    filterLabelMap: filterLabelMap,
  }), [searchText, props.selectedFilters, currentStatusFilter, handleSearchChange, props.onFilterChange, handleAddAdvancePayment, totalCount, filterLabelMap]);

  const dataFilterProps = useMemo(() => ({
    filterGroups: filterGroups,
    onFilterChange: (filterId: string, selected: boolean) => {
      if (props.handleFilterChange) {
        props.handleFilterChange(filterId, selected);
      }
    }
  }), [filterGroups, props.handleFilterChange]);

  return (
    <div ref={ref}>
      <DataContainer
        dataControllerProps={dataControllerProps}
        dataFilterProps={dataFilterProps}
        hideFilter={false}
        dataBody={renderDataBody()}
        contentBackground="white"
      />

      {/* Advance Payment Details Sheet */}
      <Sheet open={!!selectedItem} onOpenChange={(open) => !open && handleCloseDetails()}>
        <SheetContent className="gba:w-[600px] gba:sm:gba:w-[600px] gba:max-w-none">
          <SheetHeader>
            <SheetTitle className="gba:text-xl gba:font-semibold gba:text-gray-900">
              {selectedItem?.expensePlan?.title || 'Advance Payment Details'}
            </SheetTitle>
          </SheetHeader>
          <div className="gba:mt-6 gba:overflow-y-auto gba:max-h-[calc(100vh-120px)]">
            {selectedItem && (
              <AdvancePaymentDetails 
                payment={selectedItem} 
                onClose={handleCloseDetails} 
                {...contextProps} 
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Expense Plan Details Sheet */}
      <Sheet open={!!selectedExpensePlan} onOpenChange={(open) => !open && handleCloseDetails()}>
        <SheetContent className="gba:w-[600px] gba:sm:gba:w-[600px] gba:max-w-none">
          <SheetHeader>
            <SheetTitle className="gba:text-xl gba:font-semibold gba:text-gray-900">
              {selectedExpensePlan?.title || 'Expense Plan Details'}
            </SheetTitle>
          </SheetHeader>
          <div className="gba:mt-6 gba:overflow-y-auto gba:max-h-[calc(100vh-120px)]">
            {selectedExpensePlan && (
              <ExpensePlanDetails
                selectedItem={selectedExpensePlan}
                onClose={handleCloseDetails}
                accessToken={props.accessToken}
                userInfo={props.userInfo}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Expense Request Details Sheet */}
      <Sheet open={!!selectedExpenseRequest} onOpenChange={(open) => !open && handleCloseDetails()}>
        <SheetContent className="gba:w-[600px] gba:sm:gba:w-[600px] gba:max-w-none">
          <SheetHeader>
            <SheetTitle className="gba:text-xl gba:font-semibold gba:text-gray-900">
              {selectedExpenseRequest?.title || 'Expense Request Details'}
            </SheetTitle>
          </SheetHeader>
          <div className="gba:mt-6 gba:overflow-y-auto gba:max-h-[calc(100vh-120px)]">
            {selectedExpenseRequest && (
              <ExpenseRequestDetails
                selectedItem={selectedExpenseRequest}
                onClose={handleCloseDetails}
                accessToken={props.accessToken}
                userInfo={props.userInfo}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
});

export default React.memo(AdvancePaymentsTable);


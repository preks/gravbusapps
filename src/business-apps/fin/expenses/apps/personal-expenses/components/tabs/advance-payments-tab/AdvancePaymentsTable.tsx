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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from '@newwork/nw-design-system';
import Pill from '@/components/pill';
import { message } from 'antd';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { startProcess } from '@/common/utils/start-process';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetAdvancePayments, AdvancePayment } from '../../../hooks/useGetAdvancePayments';
import { getAdvancePaymentStatusDisplay } from '../../../utils';
import AdvancePaymentDetails from './AdvancePaymentDetails';
import ExpensePlanDetails from '../expense-plans-tab/ExpensePlanDetails';
import ExpenseRequestDetails from '../expense-requests-tab/ExpenseRequestDetails';
import { formatNumberFunction, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { PiArrowUp, PiArrowDown } from 'react-icons/pi';

const DATA_TEST_ID_PREFIX = 'AdvancePaymentsTable';

// Sorting utilities following SOLID principles
interface SortableField<T> {
  key: keyof T;
  type: 'string' | 'number' | 'date';
  nullable?: boolean;
}

class SortingService {
  static createSorter<T>(field: SortableField<T>) {
    return (a: T, b: T) => {
      const aValue = a[field.key];
      const bValue = b[field.key];
      
      // Handle nullable values
      const aSafe = field.nullable ? (aValue ?? 0) : aValue;
      const bSafe = field.nullable ? (bValue ?? 0) : bValue;
      
      switch (field.type) {
        case 'string':
          return String(aSafe).localeCompare(String(bSafe));
        case 'number':
          return Number(aSafe) - Number(bSafe);
        case 'date':
          const aDate = aSafe ? new Date(String(aSafe)).getTime() : 0;
          const bDate = bSafe ? new Date(String(bSafe)).getTime() : 0;
          return aDate - bDate;
        default:
          return 0;
      }
    };
  }
}


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
  tableRefreshTrigger?: number;
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

  // Internal sorting state - managed locally like expense plans table
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | undefined>('descend');
  const [sortConfig, setSortConfig] = useState<{ field: string | null; direction: 'asc' | 'desc' | null }>({ field: null, direction: null });

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

  // Refresh data when tableRefreshTrigger changes (triggered from parent tab)
  useEffect(() => {
    if (props.tableRefreshTrigger && props.tableRefreshTrigger > 0) {
      // Trigger a refresh by calling fetchItems with current parameters
      if (contextProps.accessToken && contextProps.userInfo?.employeeDetails?.employeeId) {
        fetchItems(
          fetchParams.searchText,
          fetchParams.currentPage,
          fetchParams.pageSize,
          fetchParams.currentStatusFilter,
          fetchParams.currentAmountRange,
          fetchParams.currentAdvanceRange
        );
      }
    }
  }, [props.tableRefreshTrigger, contextProps.accessToken, contextProps.userInfo?.employeeDetails?.employeeId, fetchItems, fetchParams]);

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

  const handleSort = useCallback((field: string) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const renderSortIcon = useCallback((field: string) => {
    if (sortConfig.field !== field) {
      return null;
    }
    return sortConfig.direction === 'asc' ? 
      <PiArrowUp className="gba:ml-1 gba:h-3 gba:w-3" /> : 
      <PiArrowDown className="gba:ml-1 gba:h-3 gba:w-3" />;
  }, [sortConfig]);

  const sortedItems = useMemo(() => {
    if (!items || !sortConfig.field || !sortConfig.direction) {
      return items;
    }

    return [...items].sort((a, b) => {
      const aValue = a[sortConfig.field as keyof AdvancePayment];
      const bValue = b[sortConfig.field as keyof AdvancePayment];
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime();
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }
      
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [items, sortConfig]);

  // Render the data body with memoization
  const renderDataBody = useCallback(() => {
    return (
      <div className="gba:pr-6">
        <Card data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
          <CardContent className="gba:p-0">
            {isLoading && (
              <div className="gba:flex gba:justify-center gba:p-4">
                <Spinner />
              </div>
            )}
            
            <div className="gba:overflow-x-auto">
              <Table data-testid={`${DATA_TEST_ID_PREFIX}-table`}>
                <TableHeader>
                  <TableRow className="gba:border-b gba:bg-gray-50">
                    <TableHead
                      className="gba:w-[50px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-3"
                      data-testid={`${DATA_TEST_ID_PREFIX}-actions-header`}
                    />
                    <TableHead
                      className="gba:w-[25%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                      onClick={() => handleSort('expensePlanTitle')}
                      data-testid={`${DATA_TEST_ID_PREFIX}-expense-plan-header`}
                    >
                      <div className="gba:flex gba:items-center">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.initial_expense_plan_select_label', 'Expense Plan')}
                        {renderSortIcon('expensePlanTitle')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                      onClick={() => handleSort('planCode')}
                      data-testid={`${DATA_TEST_ID_PREFIX}-plan-number-header`}
                    >
                      <div className="gba:flex gba:items-center">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_request_filter.plan_number_input', 'Plan Number')}
                        {renderSortIcon('planCode')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[10%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                      onClick={() => handleSort('status')}
                      data-testid={`${DATA_TEST_ID_PREFIX}-status-header`}
                    >
                      <div className="gba:flex gba:items-center">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:expense_table.status', 'Status')}
                        {renderSortIcon('status')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100 gba:text-right"
                      onClick={() => handleSort('amount')}
                      data-testid={`${DATA_TEST_ID_PREFIX}-amount-header`}
                    >
                      <div className="gba:flex gba:items-center gba:justify-end">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.expense_plan_table.amount', 'Amount')}
                        {renderSortIcon('amount')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:text-right"
                      data-testid={`${DATA_TEST_ID_PREFIX}-advance-header`}
                    >
                      <div className="gba:flex gba:items-center gba:justify-end">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:manager_expense_request_list.expense_table.advance', 'Advance')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                      onClick={() => handleSort('paymentMethod')}
                      data-testid={`${DATA_TEST_ID_PREFIX}-payment-method-header`}
                    >
                      <div className="gba:flex gba:items-center">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.add_request_trip_details.payment_method', 'Payment Method')}
                        {renderSortIcon('paymentMethod')}
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!isLoading && (!sortedItems || sortedItems.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={7} className="gba:py-8 gba:text-center">
                        <div className="gba:text-gray-500">
                          {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.no_advance_payments_found', 'No advance payments found. Create your first advance payment to get started.')}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedItems?.map((record) => (
                      <TableRow
                        key={record.id}
                        className={`gba:border-b gba:hover:bg-gray-50 gba:transition-colors gba:cursor-pointer ${selectedItem?.id === record.id ? 'gba:bg-blue-50' : ''}`}
                        onClick={() => handleSelectItem(record)}
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
                                  label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.view_advance_payment_details', 'View Advance Payment Details'),
                                  onClick: (e?: React.MouseEvent) => {
                                    e?.stopPropagation();
                                    handleSelectItem(record);
                                  }
                                },
                                ...(record.expensePlanId ? [{
                                  category: 'Navigations',
                                  key: 'view-plan-details',
                                  label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.expense_plan_flows.view_plan_details', 'View Plan Details'),
                                  onClick: (e?: React.MouseEvent) => {
                                    e?.stopPropagation();
                                    handleViewExpensePlanDetails(record);
                                  }
                                }] : []),
                                ...(record.expensePlan?.expenseRequest && (record.expensePlan?.expenseRequest as unknown as any[]).length > 0 && (record.expensePlan?.expenseRequest as unknown as any[])[0].id !== null ? [{
                                  category: 'Navigations',
                                  key: 'view-request-details',
                                  label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.modal_list_or_flow_button.view_request_details', 'View Request Details'),
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
                            {record.expensePlan?.title ?? getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.no_expense_plan', 'No expense plan')}
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
                          <div className="gba:text-sm gba:font-medium" data-testid="advance-payment-amount-cell">
                            {record.expensePlan?.totalAmount ? 
                              `${formatNumberFunction(record.expensePlan.totalAmount.toString(), "0.00[,]00")} ${record.expensePlan?.currency?.code ?? 'EUR'}` : 
                              '0.00 EUR'
                            }
                          </div>
                        </TableCell>
                        <TableCell className="gba:py-4 gba:px-6 gba:text-right" data-testid={`${DATA_TEST_ID_PREFIX}-advance-cell-${record.id}`}>
                          <div className="gba:text-sm gba:font-medium" data-testid="advance-payment-advance-cell">
                            {formatNumberFunction(record.amount?.toString() ?? '0', "0.00[,]00")} {record.currency?.code ?? 'EUR'}
                          </div>
                        </TableCell>
                        <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-payment-method-cell-${record.id}`}>
                          <div className="gba:text-sm" data-testid="advance-payment-method-cell">
                            {record.paymentMethod ? record.paymentMethod.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'N/A'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalCount > pageSize ? (
              <div className="gba:flex gba:items-center gba:justify-between gba:px-6 gba:py-4" data-testid={`${DATA_TEST_ID_PREFIX}-pagination`}>
                <div className="gba:text-sm gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.showing', 'Showing')} {`${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, totalCount)}`} {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.of', 'of')} {totalCount} {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.advance_payments', getTranslationFromI18nKeyAndLabel('lowcoder:backoffice_expense_landing_page.advance_title', 'Advance Payments'))}
                </div>
                <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
                  <div className="gba:flex gba:items-center gba:space-x-2">
                    <p className="gba:text-sm gba:font-medium">{getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.rows_per_page', 'Rows per page')}</p>
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
                  <div className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium">
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
                      ⟪
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
                  {`${totalCount} ${getTranslationFromI18nKeyAndLabel('lowcoder:backoffice_expense_landing_page.advance_title', 'Advance Payments')}`}
                </div>
                <div className="gba:flex gba:items-center gba:space-x-2">
                  <p className="gba:text-sm gba:font-medium">{getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.rows_per_page', 'Rows per page')}</p>
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
          </CardContent>
        </Card>
      </div>
    );
  }, [sortedItems, isLoading, selectedItem, handleSelectItem, contextProps.accessToken, totalCount, pageSize, currentPage, handlePageChange, handlePageSizeChange, sortConfig, handleSort, renderSortIcon]);

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
      label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule_details.calculation_allowance_code_list.calculation_allowance_code_modal.btn_add', 'Add'),
      'data-testid': 'add-advance-payment-button'
    },
    listTitle: getTranslationFromI18nKeyAndLabel('lowcoder:advance_lists.my_advance_payments.title', 'My Advance Payments'),
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
              {selectedItem?.expensePlan?.title || getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.advance_payment_details', 'Advance Payment Details')}
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
              {selectedExpensePlan?.title || getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_plan.expense_subtitle_details', 'Expense Plan Details')}
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
              {selectedExpenseRequest?.title || getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.modal_list_or_flow_button.view_request_details', 'Expense Request Details')}
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


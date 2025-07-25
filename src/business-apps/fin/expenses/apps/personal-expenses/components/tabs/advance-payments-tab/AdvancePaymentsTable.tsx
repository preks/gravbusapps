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
  Checkbox 
} from '@newwork/nw-design-system';
import { Modal, message } from 'antd';
import { ActionButton } from '@newwork/gravity-ui-catalog';
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

const AdvancePaymentsTable: React.FC<AdvancePaymentsTableProps> = React.memo((props) => {
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

  // Use filter props from parent with stable references
  const currentStatusFilter = useMemo(() => props.activeFilter || [], [props.activeFilter]);
  const currentAmountRange = useMemo(() => props.amountRange || null, [props.amountRange]);
  const currentAdvanceRange = useMemo(() => props.advanceRange || null, [props.advanceRange]);
  const filterGroups = useMemo(() => props.filterGroups || [], [props.filterGroups]);
  const filterLabelMap = useMemo(() => props.filterLabelMap || {}, [props.filterLabelMap]);

  // Build fetch parameters
  const fetchParams = useMemo(() => ({
    searchText,
    currentPage: 1,
    pageSize: 20,
    currentStatusFilter,
    currentAmountRange,
    currentAdvanceRange
  }), [searchText, currentStatusFilter, currentAmountRange, currentAdvanceRange]);

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
                >
                  Actions
                </TableHead>
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
                        <ActionButton
                          onClick={(e) => e.stopPropagation()}
                          flowData={[
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
                          portalContainer={document.body}
                          size="md"
                          data-testid={`${DATA_TEST_ID_PREFIX}-action-button-${record.id}`}
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
                      <Badge variant={getAdvancePaymentStatusBadgeVariant(record.status)} data-testid="advance-payment-status-cell">
                        {getAdvancePaymentStatusDisplay(record.status).label}
                      </Badge>
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
      </div>
    );
  }, [items, isLoading, error, handleSelectItem, handleViewExpensePlanDetails, handleViewExpenseRequestDetails]);

  // Render advance payment details panel
  const renderAdvancePaymentDetails = useMemo(() => {
    if (!selectedItem) return null;
    return <AdvancePaymentDetails payment={selectedItem} onClose={handleCloseDetails} {...contextProps} />;
  }, [selectedItem, handleCloseDetails, contextProps]);

  // Render expense plan details panel
  const renderExpensePlanDetails = useMemo(() => {
    if (!selectedExpensePlan) return null;
    return (
      <ExpensePlanDetails
        selectedItem={selectedExpensePlan}
        onClose={handleCloseDetails}
        accessToken={props.accessToken}
        userInfo={props.userInfo}
      />
    );
  }, [selectedExpensePlan, handleCloseDetails, props.accessToken, props.userInfo]);

  // Render expense request details panel
  const renderExpenseRequestDetails = useMemo(() => {
    if (!selectedExpenseRequest) return null;
    return (
      <ExpenseRequestDetails
        selectedItem={selectedExpenseRequest}
        onClose={handleCloseDetails}
        accessToken={props.accessToken}
        userInfo={props.userInfo}
      />
    );
  }, [selectedExpenseRequest, handleCloseDetails, props.accessToken, props.userInfo]);

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

  const dataDetails = useMemo(() => {
    if (selectedItem) {
      return {
        title: selectedItem.expensePlan?.title ?? 'Advance Payment Details',
        icon: <PiCurrencyDollar />,
        content: renderAdvancePaymentDetails,
        onClose: handleCloseDetails,
        footer: null
      };
    } else if (selectedExpensePlan) {
      return {
        title: selectedExpensePlan.title || 'Expense Plan Details',
        icon: <PiFileText />,
        content: renderExpensePlanDetails,
        onClose: handleCloseDetails,
      };
    } else if (selectedExpenseRequest) {
      return {
        title: selectedExpenseRequest.title || 'Expense Request Details',
        icon: <PiFileText />,
        content: renderExpenseRequestDetails,
        onClose: handleCloseDetails,
      };
    }
    return undefined;
  }, [selectedItem, selectedExpensePlan, selectedExpenseRequest, renderAdvancePaymentDetails, renderExpensePlanDetails, renderExpenseRequestDetails, handleCloseDetails]);

  return (
    <DataContainer
      dataControllerProps={dataControllerProps}
      dataFilterProps={dataFilterProps}
      hideFilter={false}
      dataBody={renderDataBody()}
      contentBackground="white"
      dataDetails={dataDetails}
    />
  );
});

export default AdvancePaymentsTable;


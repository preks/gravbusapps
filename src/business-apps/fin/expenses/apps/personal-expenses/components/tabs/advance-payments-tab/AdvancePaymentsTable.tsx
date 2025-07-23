import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Typography, Alert, Spin } from 'antd';
import { DataTable, ActionButton } from '@newwork/gravity-ui-catalog';
import { startProcess } from '@/common/utils/start-process';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetAdvancePayments, AdvancePayment } from '../../../hooks/useGetAdvancePayments';
import { getAdvancePaymentStatusDisplay } from '../../../utils';
import Pill from '@/components/pill';
import { DollarOutlined, FileTextOutlined } from '@ant-design/icons';
import AdvancePaymentDetails from './AdvancePaymentDetails';
import ExpensePlanDetails from '../expense-plans-tab/ExpensePlanDetails';
import ExpenseRequestDetails from '../expense-requests-tab/ExpenseRequestDetails';
import { formatNumberFunction } from '@/common/utils/windowUtils';

const { Text } = Typography;

// Helper function to format currency
// const formatCurrency = (value: number): string => {
//   return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// };

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
}

const AdvancePaymentsTable: React.FC<AdvancePaymentsTableProps> = (props) => {
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
    userInfo: props.userInfo
  }), [props.accessToken, props.userInfo]);
  
  const { items, isLoading, error, totalCount, fetchItems } = useGetAdvancePayments(contextProps);
  const [searchText, setSearchText] = useState<string>(props.search ?? '');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [selectedItem, setSelectedItem] = useState<AdvancePayment | null>(null);
  const [selectedExpensePlan, setSelectedExpensePlan] = useState<any>(null);
  const [selectedExpenseRequest, setSelectedExpenseRequest] = useState<any>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Use filter props from parent with stable references
  const currentStatusFilter = useMemo(() => props.activeFilter || [], [props.activeFilter]);
  const currentAmountRange = useMemo(() => props.amountRange || null, [props.amountRange]);
  const currentAdvanceRange = useMemo(() => props.advanceRange || null, [props.advanceRange]);
  const filterGroups = useMemo(() => props.filterGroups || [], [props.filterGroups]);
  const filterLabelMap = useMemo(() => props.filterLabelMap || {}, [props.filterLabelMap]);
  


  // Sync search with parent component
  useEffect(() => {
    if (props.search !== undefined && props.search !== searchText) {
      setSearchText(props.search);
      setCurrentPage(1);
      fetchItems(props.search, 1, pageSize, currentStatusFilter, currentAmountRange, currentAdvanceRange);
    }
  }, [props.search, searchText, pageSize, currentStatusFilter, currentAmountRange, currentAdvanceRange]);

  // Initial data load
  useEffect(() => {
    if (contextProps.accessToken && contextProps.userInfo?.employeeDetails?.employeeId) {
      fetchItems(searchText, currentPage, pageSize, currentStatusFilter, currentAmountRange, currentAdvanceRange);
    }
  }, [contextProps.accessToken, contextProps.userInfo?.employeeDetails?.employeeId, fetchItems, searchText, currentPage, pageSize, currentStatusFilter, currentAmountRange, currentAdvanceRange]);

  // Create a memoized setSearch function to prevent re-renders
  const handleSearchChange = useCallback((value: string) => {
    setSearchText(value);
    setCurrentPage(1); // Reset to first page on new search
    fetchItems(value, 1, pageSize, currentStatusFilter, currentAmountRange, currentAdvanceRange);
    
    // Notify parent component of search change
    if (props.onSearchChange) {
      props.onSearchChange(value);
    }
  }, [fetchItems, pageSize, props.onSearchChange, currentStatusFilter, currentAmountRange, currentAdvanceRange]);
  

  // Handle filter changes - only trigger when filters actually change
  useEffect(() => {
    if (contextProps.accessToken && contextProps.userInfo?.employeeDetails?.employeeId) {
      fetchItems(searchText, 1, pageSize, currentStatusFilter, currentAmountRange, currentAdvanceRange);
    }
  }, [currentStatusFilter, currentAmountRange, currentAdvanceRange, contextProps.accessToken, contextProps.userInfo?.employeeDetails?.employeeId, searchText, pageSize, fetchItems]);
  
  // Handle adding a new advance payment
  const handleAddAdvancePayment = useCallback(() => {
    if (contextProps.userInfo?.employeeDetails?.employeeId) {
      startProcess({
        domain: 'employee-expense',
        processName: 'changeAdvancePayment',
        payload: {
          employeeId: contextProps.userInfo.employeeDetails.employeeId
        }
      });
    }
  }, [contextProps.userInfo?.employeeDetails?.employeeId]);

  // Handle table pagination and sorting changes
  const handleTableChange = useCallback((pagination: any) => {
    const { current, pageSize: newPageSize } = pagination;
    setCurrentPage(current ?? 1);
    if (newPageSize !== pageSize) {
      setPageSize(newPageSize);
      fetchItems(searchText, 1, newPageSize, currentStatusFilter, currentAmountRange, currentAdvanceRange);
    } else {
      fetchItems(searchText, current ?? 1, pageSize, currentStatusFilter, currentAmountRange, currentAdvanceRange);
    }
  }, [fetchItems, searchText, pageSize, currentStatusFilter, currentAmountRange, currentAdvanceRange]);

  // Handle row selection
  const handleRowSelectionChange = useCallback((selectedKeys: React.Key[]) => {
    setSelectedRowKeys(selectedKeys);
  }, []);

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
      return <div className="gba:p-6 gba:text-center"><Spin size="large" /></div>;
    }

    if (error) {
      return <Alert message="Error" description={error} type="error" showIcon />;
    }

    if (!items || items.length === 0) {
      return (
        <div className="gba:p-6 gba:text-center">
          <Text>No advance payments found. Create your first advance payment to get started.</Text>
        </div>
      );
    }

    return (
      <DataTable
        dataSource={items}
        rowKey="id"
        loading={isLoading}
        // rowSelection={{
        //   type: 'checkbox',
        //   selectedRowKeys,
        //   onChange: handleRowSelectionChange,
        //   columnWidth: 48,
        // }}
        onRow={(record: any) => ({
          onClick: (event: React.MouseEvent) => {
            // Prevent row click from triggering when clicking on checkbox
            if ((event.target as HTMLElement).tagName !== 'INPUT') {
              handleSelectItem(record as AdvancePayment);
            }
          },
          style: { cursor: 'pointer' }
        })}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: totalCount,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total: number, range: [number, number]) => 
            `${range[0]}-${range[1]} of ${total} items`,
          onChange: (page: number, size: number) => handleTableChange({ current: page, pageSize: size }),
          onShowSizeChange: (current: number, size: number) => handleTableChange({ current, pageSize: size })
        }}
        data-testid="advance-payments-data-table"
        columns={[
          {
            title: '',
            key: 'actions',
            align: 'center',
            width: 60,
            render: (_: any, record: AdvancePayment) => (
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
                data-testid="advance-payment-actions"
                size="md"
              />
            )
          },
          {
            title: 'Expense Plan',
            dataIndex: 'code',
            key: 'code',
            render: (text: any, record: any) => (
              <div data-testid="advance-payment-expense-plan">
                <div className="gba:text-gray-600">
                  {record.expensePlan?.title ?? 'No expense plan'}
                </div>
              </div>
            )
          },
          {
            title: 'Plan Number',
            dataIndex: 'expensePlan',
            key: 'planNumber',
            render: (text: any, record: any) => (
              <div data-testid="advance-payment-plan-number">
                <div>{record.expensePlan?.code ?? 'N/A'}</div>
              </div>
            )
          },
          {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: any) => {
              const statusConfig = getAdvancePaymentStatusDisplay(status);
              return (
                <div data-testid="advance-payment-status">
                  <Pill type={statusConfig.type} label={statusConfig.label} />
                </div>
              );
            }
          },
          {
            title: 'Amount',
            dataIndex: 'expensePlan',
            key: 'amount',
            render: (text: any, record: any) => (
              <div className="gba:text-right" data-testid="advance-payment-amount">
                {formatNumberFunction(record.expensePlan?.totalAmount, "0.00[,]00")} {record.expensePlan?.currency?.code ?? 'EUR'}
              </div>
            )
          },
          {
            title: 'Advance',
            dataIndex: 'amount',
            key: 'advance',
            render: (amount: any, record: any) => (
              <div className="gba:text-right" data-testid="advance-payment-advance">
                {formatNumberFunction(amount, "0.00[,]00")} {record.currency?.code ?? 'EUR'}
              </div>
            )
          },
          {
            title: 'Payment Method',
            dataIndex: 'paymentMethod',
            key: 'paymentMethod',
            render: (method: any) => (
              <div data-testid="advance-payment-method">
                {method ? method.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'Not specified'}
              </div>
            )
          }
        ] as any}
      />
    );
  }, [
    items, 
    isLoading, 
    error, 
    currentPage, 
    pageSize, 
    totalCount, 
    selectedRowKeys, 
    handleRowSelectionChange, 
    handleSelectItem, 
    handleTableChange
  ]);

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

  return (
    <DataContainer
      dataControllerProps={{
        search: searchText,
        filter: currentStatusFilter,
        setSearch: handleSearchChange,
        setFilter: (newFilters) => {
          // Handle status filter changes
          if (props.onFilterChange) {
            props.onFilterChange(newFilters as string[]);
          }
          // If clearing all filters (empty array), also clear range filters
          if (newFilters.length === 0 && props.onClearFilters) {
            props.onClearFilters();
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
      }}
      dataFilterProps={{
        filterGroups: filterGroups,
        onFilterChange: (filterId: string, selected: boolean) => {
          if (props.handleFilterChange) {
            props.handleFilterChange(filterId, selected);
          }
        }
      }}
      hideFilter={false}
      dataBody={renderDataBody()}
      contentBackground="white"
      dataDetails={selectedItem ? {
        title: selectedItem.expensePlan?.title ?? 'Advance Payment Details',
        icon: <DollarOutlined />,
        content: renderAdvancePaymentDetails,
        onClose: handleCloseDetails,
        footer: null // Remove footer close button as it's now in the details component
      } : selectedExpensePlan ? {
        title: selectedExpensePlan.title || 'Expense Plan Details',
        icon: <FileTextOutlined />,
        content: renderExpensePlanDetails,
        onClose: handleCloseDetails,
      } : selectedExpenseRequest ? {
        title: selectedExpenseRequest.title || 'Expense Request Details',
        icon: <FileTextOutlined />,
        content: renderExpenseRequestDetails,
        onClose: handleCloseDetails,
      } : undefined}
    />
  );
};

export default AdvancePaymentsTable;

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Typography, Alert, Spin, message } from 'antd';
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

// Sorting utilities following SOLID principles
interface SortableField<T> {
  key: keyof T;
  type: 'string' | 'number' | 'date';
  nullable?: boolean;
}

class SortingService {
  static createSorter<T>(field: SortableField<T>) {
    return (a: T, b: T) => {
      // Handle nested properties (e.g., 'expensePlan.title')
      const getNestedValue = (obj: any, path: string) => {
        return path.split('.').reduce((current, key) => current?.[key], obj);
      };
      
      const aValue = getNestedValue(a, field.key as string);
      const bValue = getNestedValue(b, field.key as string);
      
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

// Column configuration following SRP
const ADVANCE_PAYMENT_COLUMNS = {
  code: { key: 'code' as keyof AdvancePayment, type: 'string' as const },
  status: { key: 'status' as keyof AdvancePayment, type: 'string' as const },
  amount: { key: 'amount' as keyof AdvancePayment, type: 'number' as const },
  paymentMethod: { key: 'paymentMethod' as keyof AdvancePayment, type: 'string' as const },
  'expensePlan.title': { key: 'expensePlan.title' as string, type: 'string' as const, nullable: true },
  'expensePlan.totalAmount': { key: 'expensePlan.totalAmount' as string, type: 'number' as const, nullable: true },
  'expensePlan.code': { key: 'expensePlan.code' as string, type: 'string' as const, nullable: true },
} as const;

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

const AdvancePaymentsTable: React.FC<AdvancePaymentsTableProps> = React.memo((props) => {
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
  
  // Sorting state - using client-side sorting since server-side sorting is not available for AdvancePayment
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | undefined>('descend');

  // Use filter props from parent with stable references
  const currentStatusFilter = useMemo(() => props.activeFilter || [], [props.activeFilter]);
  const currentAmountRange = useMemo(() => props.amountRange || null, [props.amountRange]);
  const currentAdvanceRange = useMemo(() => props.advanceRange || null, [props.advanceRange]);
  const filterGroups = useMemo(() => props.filterGroups || [], [props.filterGroups]);
  const filterLabelMap = useMemo(() => props.filterLabelMap || {}, [props.filterLabelMap]);

  // Memoize the fetch parameters to prevent unnecessary re-renders
  const fetchParams = useMemo(() => ({
    searchText,
    currentPage,
    pageSize,
    currentStatusFilter,
    currentAmountRange,
    currentAdvanceRange
  }), [searchText, currentPage, pageSize, currentStatusFilter, currentAmountRange, currentAdvanceRange]);

  // Sync search with parent component
  useEffect(() => {
    if (props.search !== undefined && props.search !== searchText) {
      setSearchText(props.search);
      setCurrentPage(1);
    }
  }, [props.search, searchText]);

  // Initial data load and data fetching
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
    }
  }, [contextProps.accessToken, contextProps.userInfo?.employeeDetails?.employeeId, fetchItems, fetchParams]);

  // Create a memoized setSearch function to prevent re-renders
  const handleSearchChange = useCallback((value: string) => {
    setSearchText(value);
    setCurrentPage(1); // Reset to first page on new search
    
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

  // Handle table pagination and sorting changes
  const handleTableChange = useCallback((pagination: any, _filters: any, sorter: any) => {
    const { current, pageSize: newPageSize } = pagination;
    
    // Handle pagination
    if (newPageSize !== pageSize) {
      setPageSize(newPageSize);
      setCurrentPage(1);
    } else if (current !== currentPage) {
      setCurrentPage(current ?? 1);
    }
    
    // Handle client-side sorting (no server request needed)
    if (sorter && sorter.field) {
      setSortField(sorter.field);
      setSortOrder(sorter.order);
    } else {
      setSortField('createdAt');
      setSortOrder('descend');
    }
  }, [pageSize, currentPage]);

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

  // Column factory following OCP
  const createColumn = useCallback((key: keyof typeof ADVANCE_PAYMENT_COLUMNS, title: string, render?: (value: any, record: AdvancePayment) => React.ReactNode) => {
    const field = ADVANCE_PAYMENT_COLUMNS[key];
    return {
      title,
      dataIndex: field.key,
      key: key, // Use the column key, not the field key
      sorter: SortingService.createSorter(field),
      sortOrder: sortField === key ? sortOrder : null,
      render,
    };
  }, [sortField, sortOrder]);

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

  // Memoize the table columns to prevent re-creation on every render
  const tableColumns = useMemo(() => [
    {
      title: '',
      key: 'actions',
      align: 'center' as const,
      width: 60,
      sorter: false,
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
    createColumn('expensePlan.title', 'Expense Plan', (text: any, record: any) => (
      <div data-testid="advance-payment-expense-plan">
        <div className="gba:text-gray-600">
          {record.expensePlan?.title ?? 'No expense plan'}
        </div>
      </div>
    )),
    createColumn('expensePlan.code', 'Plan Number', (text: any, record: any) => (
      <div data-testid="advance-payment-plan-number">
        <div>{record.expensePlan?.code ?? 'N/A'}</div>
      </div>
    )),
    createColumn('status', 'Status', (status: any) => {
      const statusConfig = getAdvancePaymentStatusDisplay(status);
      return (
        <div data-testid="advance-payment-status">
          <Pill type={statusConfig.type} label={statusConfig.label} />
        </div>
      );
    }),
    createColumn('expensePlan.totalAmount', 'Amount', (text: any, record: any) => (
      <div className="gba:text-right" data-testid="advance-payment-amount">
        {formatNumberFunction(record.expensePlan?.totalAmount, "0.00[,]00")} {record.expensePlan?.currency?.code ?? 'EUR'}
      </div>
    )),
    createColumn('amount', 'Advance', (amount: any, record: any) => (
      <div className="gba:text-right" data-testid="advance-payment-advance">
        {formatNumberFunction(amount, "0.00[,]00")} {record.currency?.code ?? 'EUR'}
      </div>
    )),
    createColumn('paymentMethod', 'Payment Method', (method: any) => (
      <div data-testid="advance-payment-method">
        {method ? method.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'Not specified'}
      </div>
    ))
  ], [createColumn, handleSelectItem, handleViewExpensePlanDetails, handleViewExpenseRequestDetails]);

  // Memoize pagination configuration
  const paginationConfig = useMemo(() => ({
    current: currentPage,
    pageSize: pageSize,
    total: totalCount,
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    showTotal: (total: number, range: [number, number]) => 
      `${range[0]}-${range[1]} of ${total} items`,
    onChange: (page: number, size: number) => handleTableChange({ current: page, pageSize: size }, {}, {}),
    onShowSizeChange: (current: number, size: number) => handleTableChange({ current, pageSize: size }, {}, {})
  }), [currentPage, pageSize, totalCount, handleTableChange]);

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
        onRow={(record: any) => ({
          onClick: (event: React.MouseEvent) => {
            // Prevent row click from triggering when clicking on checkbox
            if ((event.target as HTMLElement).tagName !== 'INPUT') {
              handleSelectItem(record as AdvancePayment);
            }
          },
          style: { cursor: 'pointer' }
        })}
        pagination={paginationConfig}
        onChange={handleTableChange}
        data-testid="advance-payments-data-table"
        columns={tableColumns as any}
      />
    );
  }, [items, isLoading, error, handleSelectItem, paginationConfig, handleTableChange, tableColumns]);

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
    filter: currentStatusFilter,
    setSearch: handleSearchChange,
    setFilter: (newFilters: any) => {
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
  }), [searchText, currentStatusFilter, handleSearchChange, props.onFilterChange, props.onClearFilters, handleAddAdvancePayment, totalCount, filterLabelMap]);

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
        icon: <DollarOutlined />,
        content: renderAdvancePaymentDetails,
        onClose: handleCloseDetails,
        footer: null
      };
    } else if (selectedExpensePlan) {
      return {
        title: selectedExpensePlan.title || 'Expense Plan Details',
        icon: <FileTextOutlined />,
        content: renderExpensePlanDetails,
        onClose: handleCloseDetails,
      };
    } else if (selectedExpenseRequest) {
      return {
        title: selectedExpenseRequest.title || 'Expense Request Details',
        icon: <FileTextOutlined />,
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


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
  Typography,
  Select,
} from 'antd';
import { DataTable } from '@newwork/gravity-ui-catalog';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import { EyeOutlined } from '@ant-design/icons';
import Pill from '@/components/pill/Pill';
import { getAdvancePaymentStatusDisplay } from '../../../utils/utils';

const { Text } = Typography;
const { Option } = Select;

interface AdvancePaymentsTableProps extends BusinessAppContextProps {
  search?: string;
  onSearchChange?: (search: string) => void;
}

const AdvancePaymentsTable: React.FC<AdvancePaymentsTableProps> = (props) => {
  const { search, onSearchChange } = props;
  
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
  }), [props.accessToken]);
  
  // Local state management
  const [searchText, setSearchText] = useState<string>(search ?? '');
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Get advance payments data using the hook
  const { 
    payments, 
    isLoading, 
    error, 
    totalCount, 
    fetchPayments 
  } = useAdvancePayments(contextProps);

  // Initial data fetch on component mount
  useEffect(() => {
    fetchPayments(searchText, currentPage, pageSize, statusFilter !== 'all' ? statusFilter : undefined);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync with parent search prop if provided
  useEffect(() => {
    if (search !== undefined && search !== searchText) {
      setSearchText(search);
      fetchPayments(search, currentPage, pageSize, statusFilter !== 'all' ? statusFilter : undefined);
    }
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle search changes
  const handleSearchChange = useCallback((value: string) => {
    setSearchText(value);
    setCurrentPage(1);
    fetchPayments(value, 1, pageSize, statusFilter !== 'all' ? statusFilter : undefined);
    
    // Notify parent if callback exists
    if (onSearchChange) {
      onSearchChange(value);
    }
  }, [onSearchChange, pageSize, statusFilter, fetchPayments]);

  // Handle status filter change
  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
    fetchPayments(searchText, 1, pageSize, value !== 'all' ? value : undefined);
  }, [fetchPayments, searchText, pageSize]);

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

  const handleTableChange = useCallback((pagination: any) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
    fetchPayments(
      searchText, 
      pagination.current, 
      pagination.pageSize, 
      statusFilter !== 'all' ? statusFilter : undefined
    );
  }, [fetchPayments, searchText, statusFilter]);

  const handleViewDetails = useCallback((record: any) => {
    setSelectedPayment(record);
    setSelectedRowKeys([record.id]);
  }, []);

  const columns = [
    {
      title: 'Payment ID',
      dataIndex: 'id',
      key: 'id',
      sortable: true,
      data_testid: 'advance-payment-id',
    },
    {
      title: 'Employee',
      dataIndex: 'employeeFullName',
      key: 'employeeFullName',
      sortable: true,
      data_testid: 'advance-payment-employee',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      sortable: true,
      data_testid: 'advance-payment-amount',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      sortable: true,
      data_testid: 'advance-payment-status',
      render: (status: string) => {
        const { label, type } = getAdvancePaymentStatusDisplay(status);
        return (
          <Pill label={label} type={type} className="gba:text-center" data-testid={`status-pill-${status?.toLowerCase()}`} />
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      data_testid: 'advance-payment-actions',
      render: (_: any, record: any) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={(e) => { e.stopPropagation(); handleViewDetails(record); }}
          title="View Details"
          aria-label="View payment details"
          data-testid={`view-payment-${record.id}`}
        />
      ),
    },
  ] as any;

  // Render data body with DataTable
  const renderDataBody = () => {
    if (error) {
      return (
        <Alert
          message="API Error"
          description={String(error)}
          type="error"
          showIcon
          data-testid="advance-payment-error-alert"
        />
      );
    }

    if (!payments || payments.length === 0 && !isLoading) {
      return (
        <div className="gba:text-center gba:p-5" data-testid="advance-payments-empty">
          <Text>No advance payments found.</Text>
        </div>
      );
    }

    return (
      <DataTable
        dataSource={payments}
        columns={columns}
        loading={isLoading}
        rowKey="id"
        rowSelection={{
          type: 'checkbox',
          selectedRowKeys,
          onChange: handleRowSelectionChange,
          columnWidth: 48,
        }}
        onRow={(record: any) => ({
          onClick: () => handleSelectPayment(record),
          className: 'gba:cursor-pointer',
        })}
        pagination={{
          current: currentPage,
          pageSize,
          total: totalCount,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total: number, range: [number, number]) => `${range[0]}-${range[1]} of ${total} items`,
        }}
        onChange={handleTableChange}
        data-testid="advance-payments-table"
      />
    );
  };

  // Filter controls
  const filterControlsNode = (
    <div className="gba:flex gba:flex-wrap gba:gap-4">
      <div className="gba:w-64">
        <Text strong>Status</Text>
        <Select 
          className="gba:w-full gba:mt-1"
          value={statusFilter}
          onChange={handleStatusChange}
          data-testid="status-filter-select"
        >
          <Option value="all">All Statuses</Option>
          <Option value="PENDING">Pending</Option>
          <Option value="APPROVED">Approved</Option>
          <Option value="REJECTED">Rejected</Option>
          <Option value="PAID">Paid</Option>
        </Select>
      </div>
    </div>
  );

  return (
    <DataContainer
      dataControllerProps={{
        search: searchText,
        setSearch: handleSearchChange,
        placeholder: 'Search advance payments...',
        filter: [],
        setFilter: () => { /* Placeholder for DataContainer prop */ },
        listTitle: 'Advance Payments',
        listAmount: totalCount,
        debounceDelay: 300,
      }}
      dataFilterProps={{
        filterGroups: [],
        children: filterControlsNode,
        onFilterChange: () => {},
      }}
      dataBody={renderDataBody()}
      contentBackground="white"
      dataDetails={selectedPayment ? {
        title: 'Advance Payment Details',
        content: (
          <div className="gba:p-4" data-testid="advance-payment-details">
            <div className="gba:mb-4">
              <Text strong>Payment ID:</Text> {selectedPayment.id}
            </div>
            <div className="gba:mb-4">
              <Text strong>Employee:</Text> {selectedPayment.employeeFullName}
            </div>
            <div className="gba:mb-4">
              <Text strong>Amount:</Text> {selectedPayment.amount}
            </div>
            <div className="gba:mb-4">
              <Text strong>Status:</Text> {selectedPayment.status}
            </div>
            {selectedPayment.description && (
              <div className="gba:mb-4">
                <Text strong>Description:</Text> {selectedPayment.description}
              </div>
            )}
          </div>
        ),
      } : undefined}
      onDetailsPanelClose={() => {
        setSelectedPayment(null);
        setSelectedRowKeys([]);
      }}
      data-testid="advance-payments-container"
    />
  );
};

export default AdvancePaymentsTable;

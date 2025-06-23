import React, { useState, useEffect } from 'react';
import { Typography, Spin, Alert, Select, Space, Button, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { DataTable, Avatar } from '@newwork/gravity-ui-catalog';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import Pill from '@/components/pill/Pill';
import AdvancePaymentDetails from './AdvancePaymentDetails';
import { useGetAdvancePayments, AdvancePaymentItem } from '../../../hooks/useGetAdvancePayments';
import { getAdvancePaymentStatusDisplay } from '../../../utils';

const { Text } = Typography;
const { Option } = Select;

interface AdvancePaymentsTableProps extends BusinessAppContextProps {
  search?: string;
  onSearchChange?: (search: string) => void;
}

const AdvancePaymentsTable: React.FC<AdvancePaymentsTableProps> = (props) => {
  const { search, onSearchChange } = props;
  
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = React.useMemo(() => ({
    accessToken: props.accessToken,
    userInfo: props.userInfo
  }), [props.accessToken, props.userInfo]);
  
  // Local state management
  const [searchTerm, setSearchTerm] = useState<string>(search ?? '');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<AdvancePaymentItem | null>(null);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Sync with parent search prop if provided
  useEffect(() => {
    if (search !== undefined && search !== searchTerm) {
      setSearchTerm(search);
    }
  }, [search, searchTerm]);

  const {
    payments,
    isLoading,
    error,
    totalCount,
    fetchPayments,
  } = useGetAdvancePayments(contextProps);

  // Fetch payments when filters change
  useEffect(() => {
    fetchPayments(searchTerm, page, pageSize, selectedStatus === 'all' ? undefined : selectedStatus);
  }, [fetchPayments, searchTerm, page, pageSize, selectedStatus]);

  // Handle search changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1);
    
    // Notify parent if callback exists
    if (onSearchChange) {
      onSearchChange(value);
    }
  };

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value);
    setPage(1);
  };

  const handleViewDetails = (payment: AdvancePaymentItem) => {
    setSelectedPayment(payment);
  };

  const handleApprovePayment = (paymentId: string) => {
    // Implementation of approval functionality
    // In a real implementation, we would call an API endpoint to approve the payment
    // For now, we'll just refresh the data and close the details panel
    console.log(`Approving payment ${paymentId}`);
    
    // Simulate API call success and refresh data
    fetchPayments(searchTerm, page, pageSize, selectedStatus === 'all' ? undefined : selectedStatus);
    setSelectedPayment(null);
  };

  const handleRejectPayment = (paymentId: string) => {
    // Implementation of rejection functionality
    // In a real implementation, we would call an API endpoint to reject the payment
    // For now, we'll just refresh the data and close the details panel
    console.log(`Rejecting payment ${paymentId}`);
    
    // Simulate API call success and refresh data
    fetchPayments(searchTerm, page, pageSize, selectedStatus === 'all' ? undefined : selectedStatus);
    setSelectedPayment(null);
  };

  const handleTableChange = (pagination: any, _filters: any, _sorter: any) => {
    setPage(pagination.current);
    setPageSize(pagination.pageSize);
  };

  const columns: ColumnsType<AdvancePaymentItem> = [
    {
      title: 'Related Expense Plan',
      dataIndex: 'title',
      key: 'title',
      render: (title: string | undefined, record: AdvancePaymentItem) => (
        <div>
          <Text strong>{title ?? 'N/A'}</Text>
          {record.startDate && record.endDate && (
            <div style={{ fontSize: '12px', color: '#888' }}>
              {new Date(record.startDate).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})} - {new Date(record.endDate).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Employee',
      dataIndex: 'employeeDisplayName',
      key: 'employeeDisplayName',
      render: (_text: any, record: AdvancePaymentItem) => (
        <Space>
          <Avatar src={record.employeePictureThumbnail ? `data:image/gif;base64,${record.employeePictureThumbnail}` : undefined} alt={record.employeeFullName} />
          <Text>{record.employeeDisplayName ?? 'N/A'}</Text>
        </Space>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (amount: number | undefined) => (
        <Text strong>
          {typeof amount === 'number' ? `€${amount.toFixed(2)}` : 'N/A'}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const { label, type } = getAdvancePaymentStatusDisplay(status);
        return <Pill type={type} label={label} data-testid={`status-pill-${status.toLowerCase()}`} />;
      },
    },
    {
      title: '',
      key: 'actions',
      render: (_: any, record: AdvancePaymentItem) => (
        <Space size="middle">
          {(record.status?.toUpperCase() === 'PENDING') && (
            <>
              <Tooltip title="Approve Payment">
                <Button
                  type="primary"
                  style={{ backgroundColor: 'green', borderColor: 'green' }}
                  icon={<CheckOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApprovePayment(record.id);
                  }}
                  data-testid={`approve-payment-${record.id}`}
                />
              </Tooltip>
              <Tooltip title="Reject Payment">
                <Button
                  type="primary"
                  danger
                  icon={<CloseOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRejectPayment(record.id);
                  }}
                  data-testid={`reject-payment-${record.id}`}
                />
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ];

  const renderDataBody = () => {
    if (isLoading && !payments.length) {
      return <Spin tip="Loading advance payments..." className="gba:flex gba:justify-center gba:items-center gba:min-h-[200px]" data-testid="advance-payments-loading" />;
    }
    
    if (error) {
      return <Alert message={`Error fetching advance payments: ${error}`} type="error" showIcon data-testid="advance-payments-error" />;
    }
    
    if (!isLoading && payments.length === 0) {
      return <div className="gba:text-center gba:p-5" data-testid="advance-payments-empty"><Text>No advance payments found.</Text></div>;
    }

    return (
      <DataTable
        columns={columns as any[]}
        dataSource={payments}
        loading={isLoading}
        rowKey="id"
        pagination={{
          current: page,
          pageSize: pageSize,
          total: totalCount,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
        }}
        onChange={handleTableChange}
        onRow={(record: any) => {
          return {
            onClick: () => handleViewDetails(record),
            className: 'gba:cursor-pointer',
          };
        }}
        data-testid="advance-payments-table"
      />
    );
  };

  const filterControlsNode = (
    <Select
      value={selectedStatus}
      onChange={handleStatusChange}
      style={{ width: 200 }}
      placeholder="Filter by status"
      data-testid="status-filter-select"
    >
      <Option value="all">All Statuses</Option>
      <Option value="PENDING">Pending</Option>
      <Option value="APPROVED">Approved</Option>
      <Option value="REJECTED">Rejected</Option>
      <Option value="DRAFT">Draft</Option>
    </Select>
  );

  return (
    <DataContainer
      dataControllerProps={{
        search: searchTerm,
        setSearch: handleSearchChange,
        filter: selectedStatus === 'all' ? [] : [selectedStatus],
        setFilter: (filters: string[]) => { 
          setSelectedStatus(filters[0] || 'all');
          setPage(1);
        },
        placeholder: 'Search by title, code, employee...', 
        actions: [filterControlsNode],
        listTitle: 'Advance Payments',
        listAmount: totalCount,
        debounceDelay: 300,
      }}
      dataFilterProps={{ 
        filterGroups: [],
        onFilterChange: () => {},
      }}
      hideFilter={true} 
      dataBody={renderDataBody()}
      contentBackground="white"
      dataDetails={selectedPayment ? {
        title: 'Advance Payment Details',
        content: (
          <AdvancePaymentDetails
            payment={selectedPayment} 
            onApprove={handleApprovePayment}
            onReject={handleRejectPayment}
            {...contextProps} 
          />
        ),
        onClose: () => setSelectedPayment(null),
      } : undefined}
      data-testid="advance-payments-container"
    />
  );
};

export default AdvancePaymentsTable;

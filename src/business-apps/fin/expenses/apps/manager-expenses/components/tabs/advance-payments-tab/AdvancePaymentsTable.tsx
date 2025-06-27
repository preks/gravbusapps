import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Spin, Alert, Select, Space, Button, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { DataTable, Avatar } from '@newwork/gravity-ui-catalog';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import Pill from '@/components/pill/Pill';
import AdvancePaymentDetails from './AdvancePaymentDetails';
import { useMainViewAdvancePayments, AdvancePayment as AdvancePaymentItem } from '../../../hooks/useMainViewAdvancePayments';
import { getAdvancePaymentStatusDisplay } from '../../../utils';
import { formatDate } from '@/common/utils/windowUtils';
import { formatAmount } from '../../../utils/currencyUtils';

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
  const [currentActionPlanId, setCurrentActionPlanId] = useState<string>('');
  const [pageSize, setPageSize] = useState<number>(10);

  // Sync with parent search prop if provided
  useEffect(() => {
    if (search !== undefined && search !== searchTerm) {
      setSearchTerm(search);
    }
  }, [search, searchTerm]);

  // Use the new main view hook for advance payments
  const {
    payments,
    loading: isLoading,
    error,
    totalCount,
    currentPage,
    setCurrentPage,
    approving,
    rejecting,
    approvePayment,
    rejectPayment,
  } = useMainViewAdvancePayments({
    ...contextProps,
    pageSize,
    searchTerm,
    currentStatusFilter: selectedStatus,
  });
  
  // Handle status filter change
  const handleStatusChange = useCallback((value: string) => {
    setSelectedStatus(value);
    setCurrentPage(1);
  }, [setCurrentPage]);

  // Handle search changes
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    
    // Notify parent if callback exists
    if (onSearchChange) {
      onSearchChange(value);
    }
  }, [onSearchChange, setCurrentPage]);

  const handleViewDetails = useCallback((payment: AdvancePaymentItem) => {
    setSelectedPayment(payment);
  }, []);



  const handleApprovePayment = useCallback((paymentId: string) => {
    // Implementation of approval functionality using the new hook
    console.log(`Approving payment ${paymentId}`);
    setCurrentActionPlanId(paymentId);
    approvePayment(paymentId, "");
    setSelectedPayment(null);
  }, [approvePayment, setCurrentActionPlanId]);

  const handleRejectPayment = useCallback((paymentId: string) => {
    // Implementation of rejection functionality using the new hook
    console.log(`Rejecting payment ${paymentId}`);
    setCurrentActionPlanId(paymentId);
    rejectPayment(paymentId, "Rejected by manager");
    setSelectedPayment(null);
  }, [rejectPayment, setCurrentActionPlanId]);

  const handleTableChange = useCallback((pagination: any, _filters: any, _sorter: any) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
  }, [setCurrentPage]);

  const columns: ColumnsType<AdvancePaymentItem> = [
    {
      title: 'Related Expense Plan',
      dataIndex: 'title',
      key: 'title',
      render: (_: string, record: AdvancePaymentItem) => (
        <div>
          <Text strong>{record.expensePlan?.title ?? 'N/A'}</Text>
          {record.expensePlan?.startDate && record.expensePlan?.endDate && (
            <div style={{ fontSize: '12px', color: '#888' }}>
              {formatDate(record.expensePlan.startDate, 'date.short')} - {formatDate(record.expensePlan.endDate, 'date.short')}
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
          <Avatar src={record.expensePlan?.employee?.pictureThumbnail ? `data:image/gif;base64,${record.expensePlan.employee.pictureThumbnail}` : undefined} alt={record.expensePlan?.employee?.fullName} />
          <Text>{record.expensePlan?.employee?.displayName ?? record.expensePlan?.employee?.fullName ?? 'N/A'}</Text>
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
          {typeof amount === 'number' ? `€${formatAmount(amount)}` : 'N/A'}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusDisplay = getAdvancePaymentStatusDisplay(status);
        return <Pill label={statusDisplay.label} type={statusDisplay.type as any} data-testid={`status-pill-${status.toLowerCase()}`} />;
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
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    handleApprovePayment(record.id);
                  }}
                  loading={approving && record.id === currentActionPlanId}
                  data-testid={`approve-payment-button-${record.id}`}
                />
              </Tooltip>
              <Tooltip title="Reject Payment">
                <Button
                  type="primary"
                  danger
                  icon={<CloseOutlined />}
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    handleRejectPayment(record.id);
                  }}
                  loading={rejecting && record.id === currentActionPlanId}
                  data-testid={`reject-payment-button-${record.id}`}
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
          current: currentPage,
          pageSize: pageSize,
          total: totalCount,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
          onChange: (page, newPageSize) => {
            setCurrentPage(page);
            setPageSize(newPageSize);
          }
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
            setCurrentPage(1);
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

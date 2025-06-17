import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Alert, Button, Typography, Select } from 'antd';
import { DataTable } from '@newwork/gravity-ui-catalog';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import { EyeOutlined } from '@ant-design/icons';
import Pill from '@/components/pill/Pill';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useAdvancePayments } from '../../hooks/useAdvancePayment';
import { getAdvancePaymentStatusDisplay } from '../../utils/utils';

const { Text } = Typography;
const { Option } = Select;

interface AdvancePaymentTabProps extends BusinessAppContextProps {
  onContentHeaderChange?: (header: React.ReactNode) => void;
}

const AdvancePaymentTab: React.FC<AdvancePaymentTabProps> = (props) => {
  const { onContentHeaderChange } = props;
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchText, setSearchText] = useState<string>('');
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { 
    payments, 
    isLoading, 
    error, 
    totalCount, 
    fetchPayments 
  } = useAdvancePayments(props);

  // Initial data fetch on component mount
  useEffect(() => {
    fetchPayments('', currentPage, pageSize);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Create statistics header and pass to parent via onContentHeaderChange
  useEffect(() => {
    if (onContentHeaderChange) {
      const header = (
        <div className="gba:mb-4" data-testid="advance-payment-stats-header">
          <Alert
            message={`${totalCount || 0} Total Advance Payments`}
            type="info"
            showIcon
          />
        </div>
      );
      onContentHeaderChange(header);
    }
  }, [onContentHeaderChange, totalCount]);

  // Handle search change
  const handleSearchChange = useCallback((value: string) => {
    setSearchText(value);
    setCurrentPage(1);
    fetchPayments(value, 1, pageSize);
  }, [fetchPayments, pageSize]);

  // Handle status filter change
  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
    // Add status filter logic here if supported by the hook
    fetchPayments(searchText, 1, pageSize);
  }, [fetchPayments, searchText, pageSize]);

  // Handle payment selection
  const handleSelectPayment = useCallback((payment: any) => {
    setSelectedPayment(payment);
    setSelectedRowKeys([payment.id]);
  }, []);

  // Handle row selection change
  const handleRowSelectionChange = useCallback((newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  }, []);

  const handleTableChange = (pagination: any) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
    fetchPayments(searchText, pagination.current, pagination.pageSize);
  };

  const handleViewDetails = (record: any) => {
    setSelectedPayment(record);
    setSelectedRowKeys([record.id]);
  };

  const columns = [
    {
      title: 'Payment ID',
      dataIndex: 'id',
      key: 'id',
      sortable: true,
    },
    {
      title: 'Employee',
      dataIndex: 'employeeName',
      key: 'employeeName',
      sortable: true,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      sortable: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      sortable: true,
      render: (status: string) => {
        const { label, type } = getAdvancePaymentStatusDisplay(status);
        return (
          <Pill label={label} type={type} className="gba:text-center" />
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetails(record)}
          title="View Details"
          aria-label="View payment details"
        />
      ),
    },
  ] as any;

  // Render data body with DataTable
  const renderDataBody = useMemo(() => {
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
          style: { cursor: 'pointer' }
        })}
        pagination={{
          current: currentPage,
          pageSize,
          total: totalCount,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: (total: number) => `Total ${total} payments`
        }}
        onChange={handleTableChange}
      />
    );
  }, [
    error, payments, columns, isLoading, selectedRowKeys, handleRowSelectionChange,
    handleSelectPayment, currentPage, pageSize, totalCount, handleTableChange
  ]);

  // Filter controls
  const filterControlsNode = useMemo(() => (
    <div className="gba:flex gba:flex-wrap gba:gap-4">
      <div className="gba:w-64">
        <Text strong>Status</Text>
        <Select 
          className="gba:w-full gba:mt-1"
          value={statusFilter}
          onChange={handleStatusChange}
        >
          <Option value="all">All Statuses</Option>
          <Option value="PENDING">Pending</Option>
          <Option value="APPROVED">Approved</Option>
          <Option value="REJECTED">Rejected</Option>
          <Option value="PAID">Paid</Option>
        </Select>
      </div>
    </div>
  ), [statusFilter, handleStatusChange]);

  return (
    <DataContainer
      dataControllerProps={{
        search: searchText,
        setSearch: handleSearchChange,
        placeholder: 'Search advance payments...',
        filter: [],
        setFilter: () => { /* Placeholder for DataContainer prop */ },
        listTitle: 'Advance Payments',
        listAmount: totalCount
      }}
      dataFilterProps={{
        filterGroups: [],
        children: filterControlsNode
      }}
      dataBody={renderDataBody}
      contentBackground="white"
      dataDetails={selectedPayment ? {
        title: 'Advance Payment Details',
        content: (
          <div className="gba:p-4">
            <div className="gba:mb-4">
              <Text strong>Payment ID:</Text> {selectedPayment.id}
            </div>
            <div className="gba:mb-4">
              <Text strong>Employee:</Text> {selectedPayment.employeeName}
            </div>
            <div className="gba:mb-4">
              <Text strong>Amount:</Text> {selectedPayment.amount}
            </div>
            <div className="gba:mb-4">
              <Text strong>Status:</Text> {selectedPayment.status}
            </div>
          </div>
        ),
      } : undefined}
      onDetailsPanelClose={() => {
        setSelectedPayment(null);
        setSelectedRowKeys([]);
      }}
    />
  );
};

export default AdvancePaymentTab;

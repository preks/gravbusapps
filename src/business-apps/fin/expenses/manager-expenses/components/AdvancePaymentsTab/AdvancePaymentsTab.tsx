import React, { useState, useEffect } from 'react';
import { Table, Typography, Spin, Alert, Select, Space, Button, Tooltip, Pagination } from 'antd'; // Removed Input
import type { ColumnsType } from 'antd/es/table';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'; // Removed SearchOutlined
import { Avatar } from '@newwork/gravity-ui-catalog';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import Pill from '@/components/pill/Pill';
import AdvancePaymentDetails from './AdvancePaymentDetails';
import { useGetAdvancePayments, AdvancePaymentItem } from '../../hooks/useGetAdvancePayments';
import { getAdvancePaymentStatusDisplay } from '../../utils';

const { Text } = Typography;
const { Option } = Select;

interface AdvancePaymentsTabProps extends BusinessAppContextProps {
  onContentHeaderChange?: (header: React.ReactNode) => void;
}

const AdvancePaymentsTab: React.FC<AdvancePaymentsTabProps> = (props) => {
  const [search, setSearch] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<AdvancePaymentItem | null>(null);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const {
    payments,
    isLoading,
    error,
    totalCount,
    fetchPayments,
  } = useGetAdvancePayments(props);

  useEffect(() => {
    fetchPayments(search, page, pageSize, selectedStatus === 'all' ? undefined : selectedStatus);
  }, [fetchPayments, search, page, pageSize, selectedStatus]);

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value);
    setPage(1);
  };

  const handleViewDetails = (payment: AdvancePaymentItem) => {
    setSelectedPayment(payment);
  };

  const handleApprovePayment = (paymentId: string) => {
    console.log(`Approving payment ${paymentId}`);
    // TODO: Implement actual API call for approval
    fetchPayments(search, page, pageSize, selectedStatus === 'all' ? undefined : selectedStatus);
    setSelectedPayment(null);
  };

  const handleRejectPayment = (paymentId: string) => {
    console.log(`Rejecting payment ${paymentId}`);
    // TODO: Implement actual API call for rejection
    fetchPayments(search, page, pageSize, selectedStatus === 'all' ? undefined : selectedStatus);
    setSelectedPayment(null);
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
      dataIndex: 'employeeDisplayName', // Changed from employeeName
      key: 'employeeDisplayName', // Changed from employeeName
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
        return <Pill type={type} label={label} />;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: AdvancePaymentItem) => (
        <Space size="middle">
          {(record.status?.toUpperCase() === 'PENDING') && (
            <>
              <Tooltip title="Approve">
                <Button icon={<CheckOutlined />} onClick={() => handleApprovePayment(record.id)} />
              </Tooltip>
              <Tooltip title="Reject">
                <Button icon={<CloseOutlined />} onClick={() => handleRejectPayment(record.id)} />
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ];

  const renderDataBody = () => {
    if (isLoading && !payments.length) return <Spin tip="Loading advance payments..." className="gba:flex gba:justify-center gba:items-center gba:min-h-[200px]" />;
    if (error) return <Alert message={`Error fetching advance payments: ${error}`} type="error" showIcon />;
    if (!isLoading && payments.length === 0) return <div style={{ textAlign: 'center', padding: '20px' }}><Text>No advance payments found.</Text></div>;

    return (
      <div className="gba:p-4">
        <Table
          columns={columns}
          dataSource={payments}
          loading={isLoading}
          rowKey="id"
          pagination={false}
          onRow={(record) => {
            return {
              onClick: () => handleViewDetails(record),
              className: 'gba:cursor-pointer', // Add a pointer cursor for better UX
            };
          }}
        />
        {totalCount > 0 && (
          <Pagination
            current={page}
            pageSize={pageSize}
            total={totalCount}
            onChange={(newPage, newPageSize) => {
              setPage(newPage);
              if (newPageSize) setPageSize(newPageSize);
            }}
            showSizeChanger
            pageSizeOptions={['10', '20', '50']}
            style={{ marginTop: '20px', textAlign: 'right' }}
          />
        )}
      </div>
    );
  };

  const filterControlsNode = (
    <Select
      value={selectedStatus}
      onChange={handleStatusChange}
      style={{ width: 200 }}
      placeholder="Filter by status"
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
        search: search,
        setSearch: (val: string) => { 
          setSearch(val);
          setPage(1); 
        },
        filter: selectedStatus === 'all' ? [] : [selectedStatus],
        setFilter: (filters: string[]) => { 
          setSelectedStatus(filters[0] || 'all');
          setPage(1);
        },
        placeholder: 'Search by title, code, employee...', 
        actions: [filterControlsNode] 
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
            {...props} 
          />
        ),
      } : undefined}
      onDetailsPanelClose={() => {
        setSelectedPayment(null);
        if (props.onContentHeaderChange) {
          props.onContentHeaderChange(null);
        }
      }}
    >
      {/* Children of DataContainer are not typically used when dataDetails is managed like this */}
    </DataContainer>
  );
};

export default AdvancePaymentsTab;

import React, { useMemo } from 'react';
import { Modal, Typography, Empty, Spin, Alert, Input } from 'antd';
import { DataTable } from '@newwork/gravity-ui-catalog';
import { SearchOutlined } from '@ant-design/icons';
import { ApprovalRequest, useGetApprovals } from '../../hooks/useGetApprovals';
import Pill from '@/components/pill/Pill';
import dayjs from 'dayjs';
import { formatAmount } from '../../utils/currencyUtils';

const { Text } = Typography;

interface ApprovalsModalProps {
  visible: boolean;
  onCancel: () => void;
  accessToken: string;
  userInfo?: any;
}

const ApprovalsModal: React.FC<ApprovalsModalProps> = ({
  visible,
  onCancel,
  accessToken,
  userInfo
}) => {
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(() => ({
    accessToken,
    userInfo
  }), [accessToken, userInfo]);
  
  // Use the custom hook to get approvals data
  const {
    approvalRequests,
    searchTerm,
    setSearchTerm,
    pageSize,
    setPageSize,
    totalCount,
    currentPage,
    setCurrentPage,
    isLoading,
    error
  } = useGetApprovals(contextProps);
  

  
  // Define table columns - read-only version
  const columns: any = [
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120, // Set a fixed width for the date column
      render: (date: string, _: ApprovalRequest) => {
        // The date should already be formatted in the hook as "DD.MM.YYYY"
        // Just display it directly
        return (
          <Text data-testid="approval-date">
            {date || '-'}
          </Text>
        );
      },
      sorter: (a: any, b: any) => {
        const dateA = a.createdAt ? dayjs(a.createdAt).valueOf() : 0;
        const dateB = b.createdAt ? dayjs(b.createdAt).valueOf() : 0;
        return dateA - dateB;
      }
    },
    {
      title: 'Request',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: ApprovalRequest) => (
        <div>
          <Text strong>{text}</Text>
          <div>
            <Text type="secondary">{record.employee.fullName}</Text>
          </div>
        </div>
      ),
      sorter: (a: any, b: any) => {
        return (a.title || '').localeCompare(b.title || '');
      }
    },
    {
      title: 'Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount: number) => {
        // Handle undefined or null amount values
        const safeAmount = amount !== undefined && amount !== null ? amount : 0;
        return <Text>{formatAmount(safeAmount)}€</Text>;
      },
      sorter: (a: any, b: any) => {
        const amountA = a.totalAmount !== undefined && a.totalAmount !== null ? a.totalAmount : 0;
        const amountB = b.totalAmount !== undefined && b.totalAmount !== null ? b.totalAmount : 0;
        return amountA - amountB;
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Pill 
          type={status === 'PENDING' ? 'warning' as any : 'default' as any} 
          label={status} 
        />
      ),
    },
  ];
  
  return (
    <Modal
      title={
        <div className="gba:flex gba:justify-between gba:items-center gba:w-full">
          <span>Pending Approvals</span>
          <div className="gba:flex gba:items-center gba:gap-2">
            <Input
              placeholder="Search approvals..."
              prefix={<SearchOutlined />}
              onChange={(e) => setSearchTerm(e.target.value)}
              value={searchTerm}
              style={{ width: 250 }}
              data-testid="approvals-search-input"
            />
          </div>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={1000}
      bodyStyle={{ height: 'calc(90vh - 140px)', overflow: 'auto', padding: '16px' }}
      className="gba:h-[90vh]"
      style={{ paddingBottom: 0, maxWidth: '100vw' }}
      centered
      data-testid="approvals-modal"
    >
      {error && (
        <Alert 
          message="Error" 
          description={error} 
          type="error" 
          showIcon 
          className="gba:mb-4"
          data-testid="approvals-error-alert"
        />
      )}
      
      {isLoading ? (
        <div className="gba:text-center gba:py-8">
          <Spin size="large" data-testid="approvals-loading-spinner" />
        </div>
      ) : approvalRequests.length === 0 ? (
        <div>
          <Empty 
            description="No pending approval requests" 
            data-testid="approvals-empty-state"
          />
          <div className="gba:mt-4 gba:p-4 gba:border gba:border-gray-200 gba:rounded">
            <Text strong>Debug Info:</Text>
            <pre className="gba:mt-2 gba:p-2 gba:bg-gray-100 gba:rounded gba:text-xs gba:overflow-auto">
              {JSON.stringify({ totalCount, currentPage, pageSize, error }, null, 2)}
            </pre>
          </div>
        </div>
      ) : (
        <DataTable
          dataSource={approvalRequests}
          columns={columns}
          rowKey="id"
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: totalCount,
            onChange: setCurrentPage,
            onShowSizeChange: (_, size: number) => setPageSize(size),
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
          }}
          data-testid="approvals-table"
        />
      )}
    </Modal>
  );
};

export default ApprovalsModal;

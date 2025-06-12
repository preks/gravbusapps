import React, { useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { Button, Typography, Space, Spin, Alert, Select } from 'antd'; 
import { CheckOutlined, CloseOutlined, FileTextOutlined } from '@ant-design/icons';
import { DataTable, Avatar } from '@newwork/gravity-ui-catalog';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import Pill from '@/components/pill/Pill';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetExpenseRequests, ExpenseRequest } from '../../hooks/useGetExpenseRequests';
import ExpenseRequestDetails from './ExpenseRequestDetails';
import ExpenseRequestStatistics from './ExpenseRequestStatistics';
import { getExpenseRequestStatusDisplay } from '../../utils';

const { Text } = Typography;
const { Option } = Select;

export interface ExpenseRequestsTabProps extends BusinessAppContextProps {
  onContentHeaderChange?: (header: ReactNode) => void;
}

const ExpenseRequestsTab: React.FC<ExpenseRequestsTabProps> = (props) => {
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
    userInfo: props.userInfo
  }), [props.accessToken, props.userInfo]);
  
  const { requests, isLoading, error, totalCount, fetchRequests, approveRequest, rejectRequest, requestStats, requestStatsLoading, requestStatsError, fetchRequestStatistics } = useGetExpenseRequests(contextProps);
  const [searchText, setSearchText] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Create a memoized setSearch function to prevent re-renders
  useEffect(() => {
    fetchRequests(searchText, currentPage, pageSize, undefined, statusFilter === 'all' ? undefined : statusFilter);
  }, [fetchRequests, searchText, currentPage, pageSize, statusFilter]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchText(value);
    setCurrentPage(1); // Reset to first page, useEffect will fetch
  }, []);

  const handleTableChange = (pagination: any, _filters: any, _sorter: any) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
    // useEffect will fetch
  };

  // Handle status filter change
  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value);
    setCurrentPage(1); // Reset to first page, useEffect will fetch
  }, []);

  // Memoize the content header to prevent unnecessary re-renders
  const contentHeader = useMemo(() => {
    return <ExpenseRequestStatistics requestStats={requestStats} requestStatsLoading={requestStatsLoading} requestStatsError={requestStatsError} fetchRequestStatistics={fetchRequestStatistics} />;
  }, [requestStats, requestStatsLoading, requestStatsError, fetchRequestStatistics]);

  // Update the content header only when it changes
  const onContentHeaderChange = props.onContentHeaderChange;
  useEffect(() => {
    if (onContentHeaderChange) {
      onContentHeaderChange(contentHeader);
    }
  }, [onContentHeaderChange, contentHeader]);

  // Handle request selection
  const handleSelectRequest = useCallback((request: any) => {
    setSelectedRequest(request);
    setSelectedRowKeys([request.id]);
  }, []);
  
  // Handle row selection change
  const handleRowSelectionChange = useCallback((newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
    
    // If a single row is selected, find and set the selected request
    if (newSelectedRowKeys.length === 1) {
      const selectedRequestId = newSelectedRowKeys[0];
      const request = requests?.find(request => request.id === selectedRequestId);
      if (request) {
        setSelectedRequest(request);
      }
    } else {
      // If multiple or no rows selected, clear the selected request
      setSelectedRequest(null);
    }
  }, [requests]);
  
  // Handle approving a request
  const handleApproveRequest = useCallback(async (requestId: string) => {
    const success = await approveRequest(requestId);
    if (success) {
      // Refresh the list after approval
      fetchRequests(searchText, currentPage, pageSize, undefined, statusFilter);
    }
  }, [approveRequest, fetchRequests, searchText, currentPage, pageSize, statusFilter]);
  
  // Handle rejecting a request
  const handleRejectRequest = useCallback(async (requestId: string) => {
    const success = await rejectRequest(requestId);
    if (success) {
      // Refresh the list after rejection
      fetchRequests(searchText, currentPage, pageSize, undefined, statusFilter);
    }
  }, [rejectRequest, fetchRequests, searchText, currentPage, pageSize, statusFilter]);

  const renderDataBody = useCallback(() => {
    if (isLoading) {
      return <div style={{ padding: 24, textAlign: 'center' }}><Spin size="large" /></div>;
    }

    if (error) {
      return <Alert message="Error" description={error} type="error" showIcon />;
    }

    if (!requests || requests.length === 0) {
      return (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <Text>No expense requests found.</Text>
        </div>
      );
    }

    const tableColumns = [
      {
        title: 'Request',
        dataIndex: 'title',
        key: 'title',
        render: (text: string, record: ExpenseRequest) => (
          <div>
            <div style={{ fontWeight: 'bold' }}>{text ?? 'Untitled Request'}</div>
            {record.startDate && record.endDate && (
              <div style={{ fontSize: '12px', color: '#888' }}>
                {new Date(record.startDate).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})} - {new Date(record.endDate).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})}
              </div>
            )}
            <div style={{ fontSize: '12px', color: '#666' }}>Ref: {record.code ?? 'N/A'} | Submitted: {record.requestDate ? new Date(record.requestDate).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'}) : 'N/A'}</div>
          </div>
        )
      },
      {
        title: 'Employee',
        dataIndex: 'employee',
        key: 'employee',
        render: (employee: ExpenseRequest['employee']) => (
          <Space>
            <Avatar src={employee?.pictureThumbnail ? `data:image/gif;base64,${employee.pictureThumbnail}` : undefined} alt={employee?.fullName} />
            <div>
              <div>{employee?.displayName}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>{employee?.department}</div>
            </div>
          </Space>
        )
      },
      {
        title: 'Amount',
        dataIndex: 'totalAmount',
        key: 'totalAmount',
        align: 'right' as const,
        render: (amount: number) => (
          <Text strong>
            {typeof amount === 'number' ? `€${amount.toFixed(2)}` : 'N/A'}
          </Text>
        )
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (status: string) => {
          const { label, type } = getExpenseRequestStatusDisplay(status);
          return <Pill type={type} label={label} />;
        }
      },
      {
        title: '',
        key: 'actions',
        align: 'right' as const,
        className: 'action-buttons',
        render: (_: any, record: ExpenseRequest) => (
          <Space size="middle">
            {record.status?.toUpperCase() === 'PENDING' && (
              <>
                <Button 
                  type="primary" 
                  icon={<CheckOutlined />} 
                  onClick={(e) => { e.stopPropagation(); handleApproveRequest(record.id); }}
                  style={{ backgroundColor: 'green', borderColor: 'green' }} 
                />
                <Button 
                  type="primary" 
                  danger 
                  icon={<CloseOutlined />} 
                  onClick={(e) => { e.stopPropagation(); handleRejectRequest(record.id); }}
                />
              </>
            )}
            
          </Space>
        )
      }
    ];

    return (
      <DataTable 
        dataSource={requests}
        rowKey="id"
        rowSelection={{
          type: 'checkbox',
          selectedRowKeys,
          onChange: handleRowSelectionChange,
          columnWidth: 48,
        }}
        onRow={(record: any) => ({
          onClick: () => handleSelectRequest(record),
          style: { cursor: 'pointer' }
        })}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: totalCount,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'], 
          showTotal: (total: number) => `Total ${total} requests`
        }}
        onChange={handleTableChange}
        columns={tableColumns as any[]}
      />
    );
  }, [
    isLoading, error, requests, selectedRowKeys, handleRowSelectionChange, 
    handleSelectRequest, currentPage, pageSize, totalCount, handleTableChange,
    handleApproveRequest, handleRejectRequest
  ]);

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
          <Option value="DRAFT">Draft</Option>
        </Select>
      </div>
    </div>
  ), [statusFilter, handleStatusChange]);

  return (
    <DataContainer
      dataControllerProps={{
        search: searchText,
        setSearch: handleSearchChange,
        placeholder: 'Search by request title, code, employee...',
        filter: [],
        setFilter: () => { /* Placeholder for DataContainer prop */ },
        listTitle: 'Expense Requests',
        listAmount: totalCount
      }}
      dataFilterProps={{
        filterGroups: [],
        children: filterControlsNode
      }}
      dataBody={renderDataBody()}
      contentBackground="white"
      dataDetails={selectedRequest ? {
        title: 'Expense Request Details',
        content: (
          <ExpenseRequestDetails
            request={selectedRequest} 
            onApprove={handleApproveRequest}
            onReject={handleRejectRequest}
            {...props} 
          />
        ),
      } : undefined}
      onDetailsPanelClose={() => {
        setSelectedRequest(null);
        setSelectedRowKeys([]);
      }}
    />
  );
};

export default ExpenseRequestsTab;

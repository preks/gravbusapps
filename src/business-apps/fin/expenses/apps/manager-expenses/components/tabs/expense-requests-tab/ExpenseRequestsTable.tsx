import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Typography, Space, Spin, Alert, Select } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { DataTable, Avatar } from '@newwork/gravity-ui-catalog';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import Pill from '@/components/pill/Pill';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetExpenseRequests, ExpenseRequest } from '../../../hooks/useGetExpenseRequests';
import ExpenseRequestDetails from './ExpenseRequestDetails';
import { getExpenseRequestStatusDisplay } from '../../../utils';

const { Text } = Typography;
const { Option } = Select;

interface ExpenseRequestsTableProps extends BusinessAppContextProps {
  search?: string;
  onSearchChange?: (search: string) => void;
}

const ExpenseRequestsTable: React.FC<ExpenseRequestsTableProps> = (props) => {
  const { search, onSearchChange } = props;
  
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
    userInfo: props.userInfo
  }), [props.accessToken, props.userInfo]);
  
  // Local state management
  const [searchText, setSearchText] = useState<string>(search ?? '');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedRequest, setSelectedRequest] = useState<ExpenseRequest | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Get expense requests data using the hook
  const {
    requests,
    isLoading,
    error,
    totalCount,
    fetchRequests,
    approveRequest,
    rejectRequest
  } = useGetExpenseRequests(contextProps);

  // Sync with parent search prop if provided
  useEffect(() => {
    if (search !== undefined && search !== searchText) {
      setSearchText(search);
    }
  }, [search, searchText]);

  // Fetch requests when filters change
  useEffect(() => {
    fetchRequests(searchText, currentPage, pageSize, undefined, statusFilter === 'all' ? undefined : statusFilter);
  }, [fetchRequests, searchText, currentPage, pageSize, statusFilter]);

  // Handle search changes
  const handleSearchChange = useCallback((value: string) => {
    setSearchText(value);
    setCurrentPage(1);
    
    // Notify parent if callback exists
    if (onSearchChange) {
      onSearchChange(value);
    }
  }, [onSearchChange]);

  // Handle status filter change
  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  }, []);

  const handleTableChange = (pagination: any, _filters: any, _sorter: any) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
  };

  // Handle request selection
  const handleSelectRequest = useCallback((request: ExpenseRequest) => {
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
      fetchRequests(searchText, currentPage, pageSize, undefined, statusFilter === 'all' ? undefined : statusFilter);
      setSelectedRequest(null);
    }
  }, [approveRequest, fetchRequests, searchText, currentPage, pageSize, statusFilter]);
  
  // Handle rejecting a request
  const handleRejectRequest = useCallback(async (requestId: string) => {
    const success = await rejectRequest(requestId);
    if (success) {
      // Refresh the list after rejection
      fetchRequests(searchText, currentPage, pageSize, undefined, statusFilter === 'all' ? undefined : statusFilter);
      setSelectedRequest(null);
    }
  }, [rejectRequest, fetchRequests, searchText, currentPage, pageSize, statusFilter]);

  // Define table columns
  const columns = [
    {
      title: 'Request',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: ExpenseRequest) => (
        <div>
          <div className="gba:font-bold">{text ?? 'Untitled Request'}</div>
          {record.startDate && record.endDate && (
            <div className="gba:text-xs gba:text-gray-400">
              {new Date(record.startDate).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})} - {new Date(record.endDate).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})}
            </div>
          )}
          <div className="gba:text-xs gba:text-gray-500">
            Ref: {record.code ?? 'N/A'} | Submitted: {record.requestDate ? new Date(record.requestDate).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'}) : 'N/A'}
          </div>
        </div>
      )
    },
    {
      title: 'Employee',
      dataIndex: 'employee',
      key: 'employee',
      render: (employee: ExpenseRequest['employee']) => (
        <Space>
          <Avatar 
            src={employee?.pictureThumbnail ? `data:image/gif;base64,${employee.pictureThumbnail}` : undefined} 
            alt={employee?.fullName} 
            data-testid={`avatar-${employee?.id}`}
          />
          <div>
            <div>{employee?.displayName}</div>
            <div className="gba:text-xs gba:text-gray-500">{employee?.department}</div>
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
        return <Pill type={type} label={label} data-testid={`status-pill-${status?.toLowerCase()}`} />;
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
                data-testid={`approve-request-${record.id}`}
              />
              <Button 
                type="primary" 
                danger 
                icon={<CloseOutlined />} 
                onClick={(e) => { e.stopPropagation(); handleRejectRequest(record.id); }}
                data-testid={`reject-request-${record.id}`}
              />
            </>
          )}
        </Space>
      )
    }
  ];

  const renderDataBody = () => {
    if (isLoading && !requests.length) {
      return (
        <Spin 
          tip="Loading expense requests..." 
          className="gba:flex gba:justify-center gba:items-center gba:min-h-[200px]" 
          data-testid="expense-requests-loading" 
        />
      );
    }

    if (error) {
      return (
        <Alert 
          message={`Error fetching expense requests: ${error}`} 
          type="error" 
          showIcon 
          data-testid="expense-requests-error" 
        />
      );
    }

    if (!requests || requests.length === 0) {
      return (
        <div className="gba:text-center gba:p-5" data-testid="expense-requests-empty">
          <Text>No expense requests found.</Text>
        </div>
      );
    }

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
          className: 'gba:cursor-pointer',
        })}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: totalCount,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total: number, range: [number, number]) => `${range[0]}-${range[1]} of ${total} items`,
        }}
        onChange={handleTableChange}
        columns={columns as any[]}
        data-testid="expense-requests-table"
      />
    );
  };

  const filterControlsNode = (
    <Select
      value={statusFilter}
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
        search: searchText,
        setSearch: handleSearchChange,
        filter: statusFilter === 'all' ? [] : [statusFilter],
        setFilter: (filters: string[]) => {
          setStatusFilter(filters[0] ?? 'all');
          setCurrentPage(1);
        },
        placeholder: 'Search by request title, code, employee...', 
        actions: [filterControlsNode],
        listTitle: 'Expense Requests',
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
      dataDetails={selectedRequest ? {
        title: 'Expense Request Details',
        content: (
          <ExpenseRequestDetails
            request={selectedRequest} 
            onApprove={handleApproveRequest}
            onReject={handleRejectRequest}
            {...contextProps}
          />
        ),
        onClose: () => {
          setSelectedRequest(null);
          setSelectedRowKeys([]);
        }
      } : undefined}
      data-testid="expense-requests-container"
    />
  );
};

export default ExpenseRequestsTable;

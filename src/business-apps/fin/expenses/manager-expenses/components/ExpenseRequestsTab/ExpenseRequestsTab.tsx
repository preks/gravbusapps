import React, { useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { Table, Button, Typography, Space, Spin, Alert, Select } from 'antd';
import { CheckOutlined, CloseOutlined, FileTextOutlined } from '@ant-design/icons';
import { Avatar } from '@newwork/gravity-ui-catalog';
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
  
  const { requests, isLoading, error, totalCount, teamMembers, fetchRequests, approveRequest, rejectRequest } = useGetExpenseRequests(contextProps);
  const [searchText, setSearchText] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Create a memoized setSearch function to prevent re-renders
  const handleSearchChange = useCallback((value: string) => {
    setSearchText(value);
    setCurrentPage(1); // Reset to first page on new search
    fetchRequests(value, 1, pageSize, selectedEmployee, statusFilter);
  }, [fetchRequests, pageSize, selectedEmployee, statusFilter]);
  
  // Create a memoized setFilter function to prevent re-renders
  const handleFilterChange = useCallback(() => {
    // This is empty as we're handling filters separately
  }, []);
  
  // Handle employee filter change
  const handleEmployeeChange = useCallback((value: string) => {
    setSelectedEmployee(value);
    setCurrentPage(1); // Reset to first page on new filter
    fetchRequests(searchText, 1, pageSize, value, statusFilter);
  }, [fetchRequests, searchText, pageSize, statusFilter]);
  
  // Handle status filter change
  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value);
    setCurrentPage(1); // Reset to first page on new filter
    fetchRequests(searchText, 1, pageSize, selectedEmployee, value);
  }, [fetchRequests, searchText, pageSize, selectedEmployee]);

  // Memoize the content header to prevent unnecessary re-renders
  const contentHeader = useMemo(() => {
    return <ExpenseRequestStatistics requests={requests || []} />;
  }, [requests]);

  // Update the content header only when it changes
  const onContentHeaderChange = props.onContentHeaderChange;
  useEffect(() => {
    if (onContentHeaderChange) {
      onContentHeaderChange(contentHeader);
    }
  }, [onContentHeaderChange, contentHeader]);

  // Handle page change
  const handlePageChange = useCallback((page: number, pageSize?: number) => {
    setCurrentPage(page);
    fetchRequests(searchText, page, pageSize ?? 10, selectedEmployee, statusFilter);
  }, [fetchRequests, searchText, selectedEmployee, statusFilter]);
  
  // Handle page size change
  const handlePageSizeChange = useCallback((_: number, size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
    fetchRequests(searchText, 1, size, selectedEmployee, statusFilter);
  }, [fetchRequests, searchText, selectedEmployee, statusFilter]);
  
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
      fetchRequests(searchText, currentPage, pageSize, selectedEmployee, statusFilter);
    }
  }, [approveRequest, fetchRequests, searchText, currentPage, pageSize, selectedEmployee, statusFilter]);
  
  // Handle rejecting a request
  const handleRejectRequest = useCallback(async (requestId: string) => {
    const success = await rejectRequest(requestId);
    if (success) {
      // Refresh the list after rejection
      fetchRequests(searchText, currentPage, pageSize, selectedEmployee, statusFilter);
    }
  }, [rejectRequest, fetchRequests, searchText, currentPage, pageSize, selectedEmployee, statusFilter]);

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

    return (
      <Table 
        dataSource={requests}
        rowKey="id"
        rowSelection={{
          type: 'checkbox',
          selectedRowKeys,
          onChange: handleRowSelectionChange,
          columnWidth: 48,
        }}
        onRow={(record) => ({
          onClick: (event: React.MouseEvent) => {
            // Prevent row click from triggering when clicking on checkbox or action buttons
            if ((event.target as HTMLElement).tagName !== 'INPUT' && 
                !(event.target as HTMLElement).closest('.action-buttons')) {
              handleSelectRequest(record);
            }
          },
          style: { cursor: 'pointer' }
        })}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: totalCount,
          onChange: handlePageChange,
          onShowSizeChange: handlePageSizeChange,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} requests`
        }}
        columns={[
          {
            title: 'REQUEST',
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
            title: 'EMPLOYEE',
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
            title: 'AMOUNT',
            dataIndex: 'totalAmount',
            key: 'totalAmount',
            align: 'right',
            render: (totalAmount: number) => (
              <span style={{ fontWeight: 'bold' }}>€{totalAmount?.toFixed(2) ?? '0.00'}</span>
            )
        },
        {
          title: 'STATUS',
          dataIndex: 'status',
          key: 'status',
          render: (status: string) => {
            const { label, type } = getExpenseRequestStatusDisplay(status);
            return <Pill type={type} label={label} />;
          }
        },
        {
          title: 'ACTIONS',
          key: 'actions',
            width: 120,
          render: (_: any, record: any) => (
              <div className="action-buttons">
                {record.status?.toUpperCase() === 'PENDING' && (
                  <Space>
              <Button 
                      type="primary"
                      icon={<CheckOutlined />}
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApproveRequest(record.id);
                      }}
                    />
                    <Button
                      danger
                      icon={<CloseOutlined />}
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRejectRequest(record.id);
                      }}
                    />
                  </Space>
                )}
                {record.status?.toUpperCase() !== 'PENDING' && (
                  <Button
                icon={<FileTextOutlined />} 
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRequest(record);
                    }}
              >
                    View
              </Button>
                )}
              </div>
          )
        }
      ]}
    />
  );
  }, [isLoading, error, requests, totalCount, selectedRowKeys, currentPage, pageSize, handleRowSelectionChange, handleSelectRequest, handlePageChange, handlePageSizeChange, handleApproveRequest, handleRejectRequest]);

const renderFilters = () => (
  <div className="gba:flex gba:flex-wrap gba:gap-4">
      <div className="gba:w-64">
        <Text strong>Employee</Text>
        <Select
          className="gba:w-full gba:mt-1"
          value={selectedEmployee}
          onChange={handleEmployeeChange}
        >
          <Option value="all">All Employees</Option>
          {teamMembers?.map((employee: { id: string; fullName: string }) => (
            <Option key={employee.id} value={employee.id}>
              {employee.fullName}
            </Option>
          ))}
        </Select>
      </div>
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
);

return (
    <DataContainer
      dataControllerProps={{
        search: searchText,
        filter: [],
        setSearch: handleSearchChange,
        setFilter: handleFilterChange,
      }}
      dataFilterProps={{
        filterGroups: [],
        children: renderFilters()
      }}
      hideFilter={false}
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
        // Adjust width as needed, e.g., width: 400 or '33%'
      } : undefined}
      onDetailsPanelClose={() => {
        setSelectedRequest(null);
        if (props.onContentHeaderChange) {
          props.onContentHeaderChange(null);
        }
      }}
    />
  );
};

export default ExpenseRequestsTab;

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Typography, Space, Spin, Alert } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { DataTable, Avatar } from '@newwork/gravity-ui-catalog';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import Pill from '@/components/pill/Pill';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetExpenseRequests, ExpenseRequest } from '../../../hooks/useGetExpenseRequests';
import { useExpenseRequestFilters } from '../../../hooks/useExpenseRequestFilters';
import { getExpenseRequestStatusDisplay } from '../../../utils';
import ExpenseRequestDetails from './ExpenseRequestDetails';
import { ensureShortDateFormat } from '../../../utils/dateUtils';
import { formatNumberFunction, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

const { Text } = Typography;

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
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedRequest, setSelectedRequest] = useState<ExpenseRequest | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  
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

  // Use the expense request filters hook
  const {
    search: searchText,
    setSearch,
    selectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    getFilters
  } = useExpenseRequestFilters();

  // Sync with parent search prop if provided
  useEffect(() => {
    if (search !== undefined && search !== searchText) {
      setSearch(search);
    }
  }, [search, setSearch]);

  // Fetch requests when filters or pagination changes
  useEffect(() => {
    const filters = getFilters();
    fetchRequests(
      searchText,
      currentPage,
      pageSize,
      undefined, // sortBy
      filters.status ? filters.status[0] : undefined, // status filter
      filters.requestDateStart
    );
  }, [searchText, currentPage, pageSize, getFilters, fetchRequests]);

  // Handle search changes
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setCurrentPage(1);
    
    // Notify parent if callback exists
    if (onSearchChange) {
      onSearchChange(value);
    }
  }, [onSearchChange, setSearch]);

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
      const filters = getFilters();
      fetchRequests(
        search,
        currentPage,
        pageSize,
        undefined,
        filters.status ? filters.status[0] : undefined
      );
      setSelectedRequest(null);
    }
  }, [approveRequest, fetchRequests, search, currentPage, pageSize, getFilters]);
  
  // Handle rejecting a request
  const handleRejectRequest = useCallback(async (requestId: string) => {
    const success = await rejectRequest(requestId);
    if (success) {
      // Refresh the list after rejection
      const filters = getFilters();
      fetchRequests(
        search,
        currentPage,
        pageSize,
        undefined,
        filters.status ? filters.status[0] : undefined
      );
      setSelectedRequest(null);
    }
  }, [rejectRequest, fetchRequests, search, currentPage, pageSize, getFilters]);

  // Define table columns
  const columns = [
    {
      title: getTranslationFromI18nKeyAndLabel('lowcoder:employee_landing_page.request', 'Request'),
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: ExpenseRequest) => (
        <div>
          <div className="gba:font-bold">{text ?? 'Untitled Request'}</div>
          {record.startDate && record.endDate && (
            <div className="gba:text-xs gba:text-gray-400">
              {ensureShortDateFormat(record.startDate)} - {ensureShortDateFormat(record.endDate)}
            </div>
          )}
          <div className="gba:text-xs gba:text-gray-500">
            Ref: {record.code ?? 'N/A'} | {getTranslationFromI18nKeyAndLabel('lowcoder:expense_report_list.submitted', 'Submitted')}: {ensureShortDateFormat(record.requestDate)}
          </div>
        </div>
      )
    },
    {
      title: getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.employee', 'Employee'),
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
      title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.amount', 'Amount'),
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'right' as const,
      render: (amount: number) => (
        <Text strong>
          {typeof amount === 'number' ? `€${formatNumberFunction(amount.toString())}` : 'N/A'}
        </Text>
      )
    },
    {
      title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status'),
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



  // Handle filter changes from the filter sidebar
  const handleFilterChange = useCallback((filterId: string, isSelected: boolean) => {
    if (isSelected) {
      addFilter(filterId);
    } else {
      removeFilter(filterId);
    }
    setCurrentPage(1);
  }, [addFilter, removeFilter]);

  // Get the selected filters array
  const activeFilters = [...selectedFilters];
  
  // Update the URL or any other side effects when filters change
  useEffect(() => {
    const filters = getFilters();
    fetchRequests(
      searchText,
      currentPage,
      pageSize,
      undefined, // sortBy
      filters.status ? filters.status[0] : undefined, // status filter
      filters.requestDateStart
    );
  }, [selectedFilters, searchText, currentPage, pageSize, getFilters, fetchRequests]);

  return (
    <DataContainer
      dataControllerProps={{
        search: searchText,
        setSearch: handleSearchChange,
        filter: activeFilters,
        setFilter: (filters: string[]): void => {
          // Create a set of new filter IDs for easier comparison
          const newFilters = new Set(filters);
          
          // First, remove any filters that are not in the new filters
          selectedFilters.forEach((filter: string) => {
            if (!newFilters.has(filter)) {
              removeFilter(filter);
            }
          });
          
          // Then, add any new filters that aren't already selected
          filters.forEach((filter: string) => {
            if (!selectedFilters.includes(filter)) {
              addFilter(filter);
            }
          });
          
          setCurrentPage(1);
        },
        placeholder: 'Search by request title, code, employee...', 
        filterLabelMap,
        listTitle: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.expense_requests', 'Expense Requests'),
        listAmount: totalCount,
        debounceDelay: 300,
      }}
      dataFilterProps={{ 
        filterGroups,
        onFilterChange: handleFilterChange,
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

import React, { useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { 
  Spin, 
  Alert, 
  Button, 
  Table, 
  Empty
} from 'antd';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import { useGetExpenseRequests } from '../../hooks/useGetExpenseRequests';
import { getExpenseRequestStatusDisplay } from '../../utils';
import { InfoCircleOutlined } from '@ant-design/icons';
import { PiLightning } from 'react-icons/pi';
import Pill, { PillType } from '@/components/pill';
import ExpenseRequestStatistics from './ExpenseRequestStatistics';
import ExpenseRequestDetails from './ExpenseRequestDetails';



export interface ExpenseRequestsTabProps extends BusinessAppContextProps {
  onContentHeaderChange?: (header: ReactNode) => void;
}

const ExpenseRequestsTab: React.FC<ExpenseRequestsTabProps> = (props) => {
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
    userInfo: props.userInfo
  }), [props.accessToken, props.userInfo]);
  
  const { items, isLoading, error, totalCount, fetchItems } = useGetExpenseRequests(contextProps);
  
  // Search and filter states
  const [searchText, setSearchText] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Statistics are now calculated in the ExpenseRequestStatistics component
  
  // No need for client-side filtering as we're using server-side search
  
  // Create memoized content header with statistics component
  const contentHeader = useMemo(() => {
    return items ? <ExpenseRequestStatistics items={items} /> : null;
  }, [items]);
  
  // Update the content header only when it changes
  const onContentHeaderChange = props.onContentHeaderChange;
  useEffect(() => {
    if (onContentHeaderChange) {
      onContentHeaderChange(contentHeader);
    }
  }, [onContentHeaderChange, contentHeader]);
  
  // Create memoized search and filter handlers
  const handleSearchChange = useCallback((value: string) => {
    setSearchText(value);
    setCurrentPage(1); // Reset to first page on new search
    fetchItems(value, 1, pageSize);
  }, [fetchItems, pageSize]);
  
  // Handle page change
  const handlePageChange = useCallback((page: number, pageSize?: number) => {
    setCurrentPage(page);
    fetchItems(searchText, page, pageSize ?? 10);
  }, [fetchItems, searchText]);
  
  // Handle page size change
  const handlePageSizeChange = useCallback((_: number, size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
    fetchItems(searchText, 1, size);
  }, [fetchItems, searchText]);
  
  // Create a memoized setFilter function to prevent re-renders
  const handleFilterChange = useCallback(() => {
    // This is empty as we're handling filters separately
  }, []);
  
  // Handle adding a new expense request
  const handleAddExpenseRequest = useCallback(() => {
    // Add logic to create a new expense request
    console.log('Adding new expense request');
  }, []);
  
  // Helper function to determine status display with memoization
  const getStatusDisplay = useCallback((status: string): { type: PillType; text: string } => {
    const statusConfig = getExpenseRequestStatusDisplay(status);
    return { type: statusConfig.type, text: statusConfig.label };
  }, []);
  
  // Selected item for details panel
  const [selectedItem, setSelectedItem] = useState<typeof items[0] | null>(null);
  
  // Selected row keys for table
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  
  // Handle row selection change
  const handleRowSelectionChange = useCallback((newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  }, []);
  
  // Handle item selection
  const handleSelectItem = useCallback((item: typeof items[0]) => {
    setSelectedItem(item);
  }, []);
  
  // Handle editing an expense request
  const handleEditExpenseRequest = useCallback((item: typeof items[0]) => {
    // Add logic to edit the expense request
    console.log('Editing expense request:', item.id);
  }, []);

  // Render the data body with memoization
  const renderDataBody = useCallback(() => {
    if (isLoading) {
      return <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />;
    }

    if (error) {
      const errorMessage = typeof error === 'string' ? error : (error as Error)?.message || 'Failed to load expense requests.';
      return <Alert message="Error" description={errorMessage} type="error" showIcon />;
    }

    if (!items || items.length === 0) {
      return <Empty 
        description="No expense requests found matching your criteria." 
        style={{ margin: '40px 0' }}
      />;
    }

    return (
      <div className="expense-requests-table">
        <Table
          rowKey="id"
          dataSource={items}
          rowSelection={{
            type: 'checkbox',
            selectedRowKeys,
            onChange: handleRowSelectionChange
          }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: totalCount,
            onChange: handlePageChange,
            onShowSizeChange: handlePageSizeChange,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} items`
          }}
          columns={[
            {
              title: 'TITLE',
              dataIndex: 'title',
              key: 'title',
              render: (text, record) => (
                <div>
                  <div style={{ fontWeight: 'bold' }}>{text}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {record.code}
                  </div>
                </div>
              )
            },
            {
              title: 'TYPE',
              key: 'requestType',
              render: (_, record) => (
                <div>
                  {record.requestType?.value ?? 'General Expense'}
                </div>
              )
            },
            {
              title: 'DATE RANGE',
              key: 'dateRange',
              render: (_, record) => (
                <div>
                  {(record.startDate && record.endDate) 
                    ? `${new Date(record.startDate).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})} - ${new Date(record.endDate).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})}`
                    : 'No dates specified'}
                </div>
              )
            },
            {
              title: 'STATUS',
              dataIndex: 'status',
              key: 'status',
              render: (status) => {
                const { type, text } = getStatusDisplay(status);
                return <Pill type={type} label={text} />;
              }
            },
            {
              title: 'TOTAL AMOUNT',
              dataIndex: 'totalAmount',
              key: 'totalAmount',
              align: 'right',
              render: (amount) => (
                <div style={{ fontWeight: 'bold' }}>
                  €{typeof amount === 'number' ? amount.toFixed(2) : '0.00'}
                </div>
              )
            },
            {
              title: 'REIMBURSABLE',
              dataIndex: 'reimbursableAmount',
              key: 'reimbursableAmount',
              align: 'right',
              render: (amount) => (
                <div>
                  €{typeof amount === 'number' ? amount.toFixed(2) : '0.00'}
                </div>
              )
            },
            {
              title: 'ACTIONS',
              key: 'actions',
              width: 80,
              render: (_, record) => (
                <Button
                  type="text"
                  icon={<PiLightning size={16} />}
                  onClick={() => handleEditExpenseRequest(record)}
                  className="gba:transition-colors gba:duration-300 gba:hover:text-blue-500"
                  aria-label="Edit expense request"
                />
              )
            }
          ]}
          onRow={(record) => ({
            onClick: () => handleSelectItem(record)
          })}
        />
      </div>
    );
  }, [items, isLoading, error, getStatusDisplay, currentPage, pageSize, totalCount, 
      handlePageChange, handlePageSizeChange, selectedRowKeys, handleRowSelectionChange, 
      handleEditExpenseRequest, handleSelectItem]);
      
  // Memoized details panel render function using the new component
  const handleCloseDetails = useCallback(() => {
    setSelectedItem(null);
  }, []);

  const renderExpenseRequestDetails = useCallback(() => {
    if (!selectedItem) return null;
    return (
      <ExpenseRequestDetails 
        request={selectedItem} 
        onClose={handleCloseDetails}
        onEdit={handleEditExpenseRequest}
      />
    );
  }, [selectedItem, handleCloseDetails, handleEditExpenseRequest]);

  return (
      <DataContainer
        dataControllerProps={{
          search: searchText,
          filter: [],
          setSearch: handleSearchChange,
          setFilter: handleFilterChange,
          addButton: {
            onClick: handleAddExpenseRequest,
            label: 'Add',
            'data-testid': 'add-expense-request-button'
          },
          listTitle: "My Expense Requests"
        }}
        dataFilterProps={{}}
        hideFilter={true}
        dataBody={renderDataBody()}
        contentBackground="white"
        dataDetails={selectedItem ? {
          title: `${selectedItem.title}`,
          icon: <InfoCircleOutlined />,
          content: renderExpenseRequestDetails()
        } : undefined}
      />
  );
};

export default ExpenseRequestsTab;

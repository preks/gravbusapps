import React, { useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { Table, Button, Typography, Space, Spin, Alert } from 'antd';
import { FileTextOutlined, FileImageOutlined, CloseOutlined } from '@ant-design/icons';
import { PiLightning } from 'react-icons/pi';
import { useGetExpenseItems } from '../../hooks/useGetExpenseItems';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import Pill from '@/components/pill/Pill';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getExpenseItemStatusDisplay } from '../../utils';
import ExpenseItemDetails from './ExpenseItemDetails';
import ExpenseItemStatistics from './ExpenseItemStatistics';

const { Text } = Typography;

export interface ExpenseItemsTabProps extends BusinessAppContextProps {
  onContentHeaderChange?: (header: ReactNode) => void;
}

const ExpenseItemsTab: React.FC<ExpenseItemsTabProps> = (props) => {
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
    userInfo: props.userInfo
  }), [props.accessToken, props.userInfo]);
  
  const { items, isLoading, error, totalCount, fetchItems } = useGetExpenseItems(contextProps);
  const [searchText, setSearchText] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  
  // Ref to track if component is mounted
  const isMounted = useRef<boolean>(true);
  
  // Set isMounted to false when component unmounts
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Create a memoized setSearch function to prevent re-renders
  const handleSearchChange = useCallback((value: string) => {
    setSearchText(value);
    setCurrentPage(1); // Reset to first page on new search
    fetchItems(value, 1, pageSize);
  }, [fetchItems, pageSize]);
  
  // Create a memoized setFilter function to prevent re-renders
  const handleFilterChange = useCallback(() => {
    // This is empty as we're handling filters separately
  }, []);
  
  // Handle adding a new expense item
  const handleAddExpenseItem = useCallback(() => {
    // Add logic to create a new expense item
    console.log('Adding new expense item');
  }, []);

  // Statistics are now handled by the ExpenseItemStatistics component

  // Memoize the content header to prevent unnecessary re-renders
  const contentHeader = useMemo(() => {
    return <ExpenseItemStatistics items={items || []} />;
  }, [items]);

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
    fetchItems(searchText, page, pageSize ?? 10);
  }, [fetchItems, searchText]);
  
  // Handle page size change
  const handlePageSizeChange = useCallback((_: number, size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
    fetchItems(searchText, 1, size);
  }, [fetchItems, searchText]);

  // Handle item selection
  const handleSelectItem = useCallback((item: any) => {
    setSelectedItem(item);
    setSelectedRowKeys([item.id]);
  }, []);
  
  // Handle row selection change
  const handleRowSelectionChange = useCallback((newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
    
    // If a single row is selected, find and set the selected item
    if (newSelectedRowKeys.length === 1) {
      const selectedItemId = newSelectedRowKeys[0];
      const item = items?.find(item => item.id === selectedItemId);
      if (item) {
        setSelectedItem(item);
      }
    } else {
      // If multiple or no rows selected, clear the selected item
      setSelectedItem(null);
    }
  }, [items]);
  
  // Handle closing the details panel
  const handleCloseDetails = useCallback(() => {
    setSelectedItem(null);
    setSelectedRowKeys([]);
  }, []);

  const renderDataBody = useCallback(() => {
    if (isLoading) {
      return <div style={{ padding: 24, textAlign: 'center' }}><Spin size="large" /></div>;
    }

    if (error) {
      return <Alert message="Error" description={error} type="error" showIcon />;
    }

    if (!items || items.length === 0) {
      return (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <Text>No expense items found. Create your first expense item to get started.</Text>
        </div>
      );
    }

    return (
      <Table 
        dataSource={items} 
        rowKey="id"
        rowSelection={{
          type: 'checkbox',
          selectedRowKeys,
          onChange: handleRowSelectionChange,
          columnWidth: 48,
        }}
        onRow={(record) => ({
          onClick: (event) => {
            // Prevent row click from triggering when clicking on checkbox
            if ((event.target as HTMLElement).tagName !== 'INPUT') {
              handleSelectItem(record);
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
          showTotal: (total) => `Total ${total} items`
        }}
        columns={[
          {
            title: 'ITEM',
            dataIndex: 'title',
            key: 'title',
            render: (text, record) => (
              <div>
                <div style={{ fontWeight: 'bold' }}>{text}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{record.invoiceDate}</div>
              </div>
            )
          },
          {
            title: 'ATTACHMENT',
            dataIndex: 'expenseItemFile',
            key: 'attachment',
            width: 80,
            align: 'center',
            render: (expenseItemFile) => (
              expenseItemFile && expenseItemFile.length > 0 ? (
                <div className="gba:flex gba:items-center gba:justify-center">
                  <FileImageOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                </div>
              ) : (
                <div className="gba:flex gba:items-center gba:justify-center">
                  <FileImageOutlined style={{ fontSize: '24px', color: '#d9d9d9' }} />
                </div>
              )
            )
          },
          {
            title: 'AMOUNT',
            dataIndex: 'reimbursableAmount',
            key: 'amount',
            align: 'right',
            render: (amount) => (
              <span style={{ fontWeight: 'bold' }}>€{amount?.toFixed(2) ?? '0.00'}</span>
            )
          },
          {
            title: 'STATUS',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
              const { label, type } = getExpenseItemStatusDisplay(status);
              return (
                <Pill 
                  label={label} 
                  type={type} 
                  className="gba:text-center"
                />
              );
            }
          },
          {
            title: 'ACTIONS',
            key: 'actions',
            render: () => (
              <Space>
                <Button 
                  type="text" 
                  size="small" 
                  icon={<PiLightning size={18} />}
                  className="gba:transition-colors gba:duration-300 hover:gba:text-blue-500"
                  aria-label="Edit"
                />
              </Space>
            )
          }
        ]}
      />
    );
  }, [items, currentPage, pageSize, handlePageChange, handlePageSizeChange]);

  // Render expense details panel using the ExpenseItemDetails component
  const renderExpenseDetails = useMemo(() => {
    if (!selectedItem) return null;

    return (
      <ExpenseItemDetails 
        selectedItem={selectedItem} 
        onClose={handleCloseDetails}
        {...contextProps}
      />
    );
  }, [selectedItem, handleCloseDetails, contextProps]);

  return (
    <>
      <DataContainer
        dataControllerProps={{
          search: searchText,
          filter: [],
          setSearch: handleSearchChange,
          setFilter: handleFilterChange,
          addButton: {
            onClick: handleAddExpenseItem,
            label: 'Add',
            'data-testid': 'add-expense-item-button'
          },
          listTitle: "My Expense Items"
        }}
        dataFilterProps={{}}
        hideFilter={true}
        dataBody={renderDataBody()}
        contentBackground="white"
        dataDetails={selectedItem ? {
          title: selectedItem.title,
          icon: <FileTextOutlined />,
          content: renderExpenseDetails,
          footer: (
            <Button type="primary" onClick={handleCloseDetails} icon={<CloseOutlined />}>
              Close
            </Button>
          )
        } : undefined}
      />
      {items.length > 0 && (
        <div style={{ textAlign: 'right', padding: '16px 24px' }}>
          <Text type="secondary">Showing {items.length} of {totalCount} items</Text>
        </div>
      )}
    </>
  );
};

export default ExpenseItemsTab;

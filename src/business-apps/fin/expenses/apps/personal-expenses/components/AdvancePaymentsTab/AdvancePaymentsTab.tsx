import React, { useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { Typography, Space, Button, Table, Alert, Spin } from 'antd';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import { useGetAdvancePayments, AdvancePayment } from '../../hooks/useGetAdvancePayments';
import { getAdvancePaymentStatusDisplay } from '../../utils';
import Pill from '@/components/pill';
import { DollarOutlined } from '@ant-design/icons';
import { PiLightning } from 'react-icons/pi';
import AdvancePaymentDetails from './AdvancePaymentDetails';
import AdvancePaymentStatistics from './AdvancePaymentStatistics';

const { Text } = Typography;

export interface AdvancePaymentsTabProps extends BusinessAppContextProps {
  onContentHeaderChange?: (header: ReactNode) => void;
}

const AdvancePaymentsTab: React.FC<AdvancePaymentsTabProps> = (props) => {
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
    userInfo: props.userInfo
  }), [props.accessToken, props.userInfo]);
  
  const { items, isLoading, error, totalCount, fetchItems } = useGetAdvancePayments(contextProps);
  const [searchText, setSearchText] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedItem, setSelectedItem] = useState<AdvancePayment | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  
  // Statistics are now calculated in the AdvancePaymentStatistics component

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
  
  // Handle adding a new advance payment
  const handleAddAdvancePayment = useCallback(() => {
    // Add logic to create a new advance payment
    console.log('Adding new advance payment');
  }, []);

  // Handle row selection change
  const handleRowSelectionChange = useCallback((newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  }, []);
  
  // Handle item selection
  const handleSelectItem = useCallback((item: AdvancePayment) => {
    setSelectedItem(item);
  }, []);
  
  // Handle closing the details panel
  const handleCloseDetails = useCallback(() => {
    setSelectedItem(null);
  }, []);

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
  
  // Create memoized content header with statistics cards
  const contentHeader = useMemo(() => {
    return <AdvancePaymentStatistics payments={items} />;
  }, [items]);

  // Update the content header only when it changes
  const onContentHeaderChange = props.onContentHeaderChange;
  useEffect(() => {
    if (onContentHeaderChange) {
      onContentHeaderChange(contentHeader);
    }
  }, [onContentHeaderChange, contentHeader]);
  
  // Render the data body with memoization
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
          <Text>No advance payments found. Create your first advance payment to get started.</Text>
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
            title: 'EXPENSE PLAN',
            dataIndex: 'code',
            key: 'code',
            render: (text, record) => (
              <div>
                <div style={{ fontWeight: 'bold' }}>{text}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {record.expensePlan?.title ?? 'No expense plan'}
                </div>
              </div>
            )
          },

          {
            title: 'PAYMENT METHOD',
            dataIndex: 'paymentMethod',
            key: 'paymentMethod',
            render: (method) => (
              <div>
                {method ?? 'Not specified'}
              </div>
            )
          },
          {
            title: 'AMOUNT',
            dataIndex: 'amount',
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
              const statusConfig = getAdvancePaymentStatusDisplay(status);
              return <Pill type={statusConfig.type} label={statusConfig.label} />;
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
                  onClick={(e) => {
                    e.stopPropagation();
                    // Add edit logic here
                  }}
                />
              </Space>
            )
          }
        ]}
      />
    );
  }, [items, isLoading, error, currentPage, pageSize, totalCount, selectedRowKeys, handlePageChange, handlePageSizeChange, handleRowSelectionChange, handleSelectItem]);

  // Render advance payment details panel
  const renderAdvancePaymentDetails = useMemo(() => {
    if (!selectedItem) return null;
    return <AdvancePaymentDetails payment={selectedItem} onClose={handleCloseDetails} />;
  }, [selectedItem, handleCloseDetails]);

  return (
    <>
      <DataContainer
        dataControllerProps={{
          search: searchText,
          filter: [],
          setSearch: handleSearchChange,
          setFilter: handleFilterChange,
          addButton: {
            onClick: handleAddAdvancePayment,
            label: 'Add',
            'data-testid': 'add-advance-payment-button'
          },
          listTitle: "My Advance Payments"
        }}
        dataFilterProps={{}}
        hideFilter={true}
        dataBody={renderDataBody()}
        contentBackground="white"
        dataDetails={selectedItem ? {
          title: selectedItem.expensePlan?.title ?? 'Advance Payment Details',
          icon: <DollarOutlined />,
          content: renderAdvancePaymentDetails,
          onClose: handleCloseDetails
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

export default AdvancePaymentsTab;

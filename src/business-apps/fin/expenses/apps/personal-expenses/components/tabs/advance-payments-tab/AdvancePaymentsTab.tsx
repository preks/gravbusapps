import React, { useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { Typography, Space, Button, Alert, Spin } from 'antd';
import { DataTable } from '@newwork/gravity-ui-catalog';
import { startProcess } from '@/common/utils/start-process';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import { useGetAdvancePayments, AdvancePayment } from '../../../hooks/useGetAdvancePayments';
import { getAdvancePaymentStatusDisplay } from '../../../utils';
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
    if (contextProps.userInfo?.employeeDetails?.employeeId) {
      startProcess({
        domain: 'employee-expense',
        processName: 'changeAdvancePayment',
        payload: {
          employeeId: contextProps.userInfo.employeeDetails.employeeId
        }
      });
    }
  }, [contextProps.userInfo?.employeeDetails?.employeeId]);

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

  // Handle table change for DataTable component
  const handleTableChange = useCallback((
    pagination: any,
    _filters?: any,
    _sorter?: any
  ) => {
    const { current, pageSize } = pagination;
    setCurrentPage(current);
    setPageSize(pageSize);
    fetchItems(searchText, current, pageSize);
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
      <DataTable
        dataSource={items}
        rowKey="id"
        loading={isLoading}
        rowSelection={{
          type: 'checkbox',
          selectedRowKeys,
          onChange: handleRowSelectionChange,
          columnWidth: 48,
        }}
        onRow={(record: any) => ({
          onClick: (event) => {
            // Prevent row click from triggering when clicking on checkbox
            if ((event.target as HTMLElement).tagName !== 'INPUT') {
              handleSelectItem(record as AdvancePayment);
            }
          },
          style: { cursor: 'pointer' }
        })}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: totalCount,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: (total) => `Total ${total} items`
        }}
        onChange={handleTableChange}
        data-testid="advance-payments-data-table"
        columns={[
          {
            title: 'Expense Plan',
            dataIndex: 'code',
            key: 'code',
            render: (text, record: any) => (
              <div>
                <div style={{ fontWeight: 'bold' }}>{text}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {record.expensePlan?.title ?? 'No expense plan'}
                </div>
              </div>
            )
          },

          {
            title: 'Payment Method',
            dataIndex: 'paymentMethod',
            key: 'paymentMethod',
            render: (method) => (
              <div>
                {method ?? 'Not specified'}
              </div>
            )
          },
          {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            align: 'right',
            render: (amount) => (
              <span style={{ fontWeight: 'bold' }}>€{amount?.toFixed(2) ?? '0.00'}</span>
            )
          },
          {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
              const statusConfig = getAdvancePaymentStatusDisplay(status);
              return <Pill type={statusConfig.type} label={statusConfig.label} />;
            }
          },
          {
            title: 'Actions',
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
  }, [items, isLoading, error, currentPage, pageSize, totalCount, selectedRowKeys, handleRowSelectionChange, handleSelectItem, handleTableChange]);

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
          listTitle: "My Advance Payments",
          listAmount: totalCount ? `${totalCount}` : undefined
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

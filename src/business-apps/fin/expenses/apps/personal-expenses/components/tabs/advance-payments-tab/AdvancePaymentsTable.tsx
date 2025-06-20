import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Typography, Space, Button, Alert, Spin } from 'antd';
import { DataTable } from '@newwork/gravity-ui-catalog';
import { startProcess } from '@/common/utils/start-process';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetAdvancePayments, AdvancePayment } from '../../../hooks/useGetAdvancePayments';
import { getAdvancePaymentStatusDisplay } from '../../../utils';
import Pill from '@/components/pill';
import { DollarOutlined } from '@ant-design/icons';
import { PiLightning } from 'react-icons/pi';
import AdvancePaymentDetails from './AdvancePaymentDetails';

const { Text } = Typography;

// Helper function to format currency
const formatCurrency = (value: number): string => {
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export interface AdvancePaymentsTableProps extends BusinessAppContextProps {
  search?: string;
  onSearchChange?: (search: string) => void;
}

const AdvancePaymentsTable: React.FC<AdvancePaymentsTableProps> = (props) => {
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
    userInfo: props.userInfo
  }), [props.accessToken, props.userInfo]);
  
  const { items, isLoading, error, totalCount, fetchItems } = useGetAdvancePayments(contextProps);
  const [searchText, setSearchText] = useState<string>(props.search ?? '');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [selectedItem, setSelectedItem] = useState<AdvancePayment | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Sync search with parent component
  useEffect(() => {
    if (props.search !== undefined && props.search !== searchText) {
      setSearchText(props.search);
      setCurrentPage(1);
      fetchItems(props.search, 1, pageSize);
    }
  }, [props.search, searchText, pageSize]);

  // Initial data load
  useEffect(() => {
    if (contextProps.accessToken && items.length === 0) {
      fetchItems(searchText, currentPage, pageSize);
    }
  }, [contextProps.accessToken]);

  // Create a memoized setSearch function to prevent re-renders
  const handleSearchChange = useCallback((value: string) => {
    setSearchText(value);
    setCurrentPage(1); // Reset to first page on new search
    fetchItems(value, 1, pageSize);
    
    // Notify parent component of search change
    if (props.onSearchChange) {
      props.onSearchChange(value);
    }
  }, [fetchItems, pageSize, props.onSearchChange]);
  
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

  // Handle table pagination and sorting changes
  const handleTableChange = useCallback((pagination: any) => {
    const { current, pageSize: newPageSize } = pagination;
    setCurrentPage(current ?? 1);
    if (newPageSize !== pageSize) {
      setPageSize(newPageSize);
      fetchItems(searchText, 1, newPageSize);
    } else {
      fetchItems(searchText, current ?? 1, pageSize);
    }
  }, [fetchItems, searchText, pageSize]);

  // Handle row selection
  const handleRowSelectionChange = useCallback((selectedKeys: React.Key[]) => {
    setSelectedRowKeys(selectedKeys);
  }, []);

  // Handle clicking on a row to view details
  const handleSelectItem = useCallback((item: AdvancePayment) => {
    setSelectedItem(item);
  }, []);

  // Handle closing the details panel
  const handleCloseDetails = useCallback(() => {
    setSelectedItem(null);
  }, []);
  
  // Render the data body with memoization
  const renderDataBody = useCallback(() => {
    if (isLoading) {
      return <div className="gba:p-6 gba:text-center"><Spin size="large" /></div>;
    }

    if (error) {
      return <Alert message="Error" description={error} type="error" showIcon />;
    }

    if (!items || items.length === 0) {
      return (
        <div className="gba:p-6 gba:text-center">
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
          onClick: (event: React.MouseEvent) => {
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
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total: number, range: [number, number]) => 
            `${range[0]}-${range[1]} of ${total} items`,
          onChange: (page: number, size: number) => handleTableChange({ current: page, pageSize: size }),
          onShowSizeChange: (current: number, size: number) => handleTableChange({ current, pageSize: size })
        }}
        data-testid="advance-payments-data-table"
        columns={[
          {
            title: 'Expense Plan',
            dataIndex: 'code',
            key: 'code',
            render: (text: any, record: any) => (
              <div data-testid="advance-payment-expense-plan">
                <div className="gba:font-bold">{text}</div>
                <div className="gba:text-xs gba:text-gray-600">
                  {record.expensePlan?.title ?? 'No expense plan'}
                </div>
              </div>
            )
          },
          {
            title: 'Payment Method',
            dataIndex: 'paymentMethod',
            key: 'paymentMethod',
            render: (method: any) => (
              <div data-testid="advance-payment-method">
                {method ?? 'Not specified'}
              </div>
            )
          },
          {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            align: 'right' as const,
            render: (amount: any) => (
              <span className="gba:font-bold" data-testid="advance-payment-amount">
                €{formatCurrency(amount ?? 0)}
              </span>
            )
          },
          {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: any) => {
              const statusConfig = getAdvancePaymentStatusDisplay(status);
              return (
                <div data-testid="advance-payment-status">
                  <Pill type={statusConfig.type} label={statusConfig.label} />
                </div>
              );
            }
          },
          {
            title: 'Actions',
            key: 'actions',
            render: () => (
              <Space data-testid="advance-payment-actions">
                <Button 
                  type="text" 
                  size="small" 
                  icon={<PiLightning size={18} />}
                  className="gba:transition-colors gba:duration-300 hover:gba:text-blue-500"
                  aria-label="Edit"
                  data-testid="edit-advance-payment-button"
                  onClick={(e: React.MouseEvent) => {
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
  }, [
    items, 
    isLoading, 
    error, 
    currentPage, 
    pageSize, 
    totalCount, 
    selectedRowKeys, 
    handleRowSelectionChange, 
    handleSelectItem, 
    handleTableChange
  ]);

  // Render advance payment details panel
  const renderAdvancePaymentDetails = useMemo(() => {
    if (!selectedItem) return null;
    return <AdvancePaymentDetails payment={selectedItem} onClose={handleCloseDetails} {...contextProps} />;
  }, [selectedItem, handleCloseDetails, contextProps]);

  return (
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
        onClose: handleCloseDetails,
        footer: null // Remove footer close button as it's now in the details component
      } : undefined}
    />
  );
};

export default AdvancePaymentsTable;

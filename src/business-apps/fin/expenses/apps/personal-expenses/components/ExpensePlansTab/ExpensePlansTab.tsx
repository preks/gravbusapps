import React, { useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetExpensePlans } from '../../hooks/useGetExpensePlans';
import { getExpensePlanStatusDisplay } from '../../utils';
import ExpensePlanDetails from './ExpensePlanDetails';
import ExpensePlanStatistics from './ExpensePlanStatistics';
import { 
  Spin, 
  Alert, 
  Table, 
  Button, 
  Space, 
  Typography 
} from 'antd';
import { 
  FileTextOutlined 
} from '@ant-design/icons';
import { PiLightning } from 'react-icons/pi';
import Pill from '@/components/pill/Pill';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';

const { Text } = Typography;

export interface ExpensePlansTabProps extends BusinessAppContextProps {
  onContentHeaderChange?: (header: ReactNode) => void;
}

const ExpensePlansTab: React.FC<ExpensePlansTabProps> = (props) => {
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
    userInfo: props.userInfo
  }), [props.accessToken, props.userInfo]);
  
  const { items: plans, isLoading, error, totalCount, fetchItems } = useGetExpensePlans(contextProps);
  
  // Search and filter states
  const [searchText, setSearchText] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  
  // No need for statistics calculations here, moved to ExpensePlanStatistics component
  
  // No need for client-side filtering as we're using server-side search
  
  // Create memoized content header with statistics component
  const contentHeader = useMemo(() => {
    return <ExpensePlanStatistics plans={plans} />;
  }, [plans]);
  
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
  
  // Handle adding a new expense plan
  const handleAddExpensePlan = useCallback(() => {
    // Add logic to create a new expense plan
    console.log('Adding new expense plan');
  }, []);
  
  // Using getExpensePlanStatusDisplay directly from utils
  
  // Selected item for details panel
  const [selectedItem, setSelectedItem] = useState<typeof plans[0] | null>(null);
  
  // Selected row keys for table
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  
  // Handle row selection change
  const handleRowSelectionChange = useCallback((newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  }, []);
  
  // Handle item selection
  const handleSelectItem = useCallback((item: typeof plans[0]) => {
    setSelectedItem(item);
  }, []);
  
  // Handle closing the details panel
  const handleCloseDetails = useCallback(() => {
    setSelectedItem(null);
  }, []);
  
  // Render the data body with memoization
  const renderDataBody = useCallback(() => {
    if (isLoading) {
      return <div style={{ padding: 24, textAlign: 'center' }}><Spin size="large" /></div>;
    }
    
    if (error) {
      return <Alert 
        message="Error Loading Expense Plans" 
        description={error}
        type="error" 
        showIcon 
      />;
    }
    
    if (!plans || plans.length === 0) {
      return (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <Text>No expense plans found. Create your first expense plan to get started.</Text>
        </div>
      );
    }
    
    return (
      <Table 
        dataSource={plans} 
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
            title: 'TITLE',
            dataIndex: 'title',
            key: 'title',
            render: (text, record) => (
              <div>
                <div style={{ fontWeight: 'bold' }}>{text}</div>
                {(record.startDate && record.endDate) && (
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {`${new Date(record.startDate).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})} - ${new Date(record.endDate).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})}`}
                  </div>
                )}
              </div>
            )
          },
          {
            title: 'COST CENTER',
            dataIndex: ['costCenter', 'name'],
            key: 'costCenter',
            render: (text) => (
              <div>
                {text ?? 'No Cost Center'}
              </div>
            )
          },
          {
            title: 'TRIP TYPE',
            key: 'tripType',
            render: (_, record) => {
              // Try to get request type from the new field structure
              if (record.requestType?.value) {
                return record.requestType.value;
              }
              // Fallback to additionalProperties if requestType is not available
              const additionalProps = record.additionalProperties as Record<string, unknown> | null;
              const tripType = additionalProps?.tripType ?? additionalProps?.travelType;
              return tripType ?? 'Business Travel';
            }
          },

          {
            title: 'AMOUNT',
            dataIndex: 'totalAmount',
            key: 'amount',
            align: 'right',
            render: (amount, record) => {
              let currencySymbol = '€'; // Default to Euro symbol
              if (record.currency?.value) {
                currencySymbol = record.currency.value === 'European euro' ? '€' : record.currency.value.charAt(0);
              }
              // Add null check for totalAmount
              const formattedAmount = typeof amount === 'number' ? amount.toFixed(2) : '0.00';
              return <span style={{ fontWeight: 'bold' }}>{currencySymbol}{formattedAmount}</span>;
            }
          },
          {
            title: 'STATUS',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
              const statusConfig = getExpensePlanStatusDisplay(status);
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
  }, [plans, isLoading, error, currentPage, pageSize, totalCount, selectedRowKeys, handlePageChange, handlePageSizeChange, handleRowSelectionChange, handleSelectItem]);

  // Render expense plan details using the separate component
  const renderExpensePlanDetails = useMemo(() => {
    return <ExpensePlanDetails 
      selectedItem={selectedItem} 
      onClose={handleCloseDetails} 
      accessToken={props.accessToken}
      userInfo={props.userInfo}
    />;
  }, [selectedItem, handleCloseDetails, props.accessToken, props.userInfo]);

  return (
      <DataContainer
        dataControllerProps={{
          search: searchText,
          filter: [],
          setSearch: handleSearchChange,
          setFilter: handleFilterChange,
          addButton: {
            onClick: handleAddExpensePlan,
            label: 'Add',
            'data-testid': 'add-expense-plan-button'
          },
          listTitle: "My Expense Plans"
        }}
        dataFilterProps={{}}
        hideFilter={true}
        dataBody={renderDataBody()}
        contentBackground="white"
        dataDetails={selectedItem ? {
          title: selectedItem.title,
          icon: <FileTextOutlined />,
          content: renderExpensePlanDetails,
          onClose: handleCloseDetails,
          footer: null // Remove footer close button as it's now in the details component
        } : undefined}
      />
  );
};

export default ExpensePlansTab;

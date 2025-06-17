import React, { useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetExpensePlans, ExpensePlan } from '../../hooks/useGetExpensePlans';
import { getExpensePlanStatusDisplay } from '../../utils';
import ExpensePlanDetails from './ExpensePlanDetails';
import ExpensePlanStatistics from './ExpensePlanStatistics';
import { startProcess } from '@/common/utils/start-process';
import { 
  Spin, 
  Alert, 
  Button, 
  Space, 
  Typography
} from 'antd';
import { DataTable } from '@newwork/gravity-ui-catalog';
import { 
  FileTextOutlined,
  EyeOutlined
} from '@ant-design/icons';
import Pill from '@/components/pill/Pill';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';

// Helper function to format currency values
const formatCurrency = (value: number): string => {
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

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
  
  // Create a memoized setFilter function to prevent re-renders
  const handleFilterChange = useCallback(() => {
    // This is empty as we're handling filters separately
  }, []);

  // Handle adding a new expense plan
  const handleAddExpensePlan = useCallback(() => {
    if (contextProps.userInfo?.employeeDetails?.employeeId) {
      startProcess({
        domain: 'employee-expense',
        processName: 'changeExpensePlan',
        payload: {
          employeeId: contextProps.userInfo.employeeDetails.employeeId
        }
      });
    }
  }, [contextProps.userInfo?.employeeDetails?.employeeId]);

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return amount?.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  };
  
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
  
  // Handle table change for DataTable component
  const handleTableChange = useCallback(
    (pagination: any, _filters?: any, _sorter?: any) => {
      const { current, pageSize } = pagination;
      setCurrentPage(current);
      setPageSize(pageSize);
      fetchItems(searchText, current, pageSize);
    },
    [fetchItems, searchText]
  );

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
      <DataTable 
        dataSource={plans} 
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
              handleSelectItem(record as ExpensePlan);
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
        data-testid="expense-plans-data-table"
        columns={[
          {
            title: 'Title',
            dataIndex: 'title',
            key: 'title',
            render: (text, record: any) => (
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
            title: 'Cost Center',
            dataIndex: ['costCenter', 'name'],
            key: 'costCenter',
            render: (text: string, record: any) => (
              <div>
                {text ?? 'No Cost Center'}
              </div>
            )
          },
          {
            title: 'Trip Type',
            key: 'tripType',
            render: (_, record: any) => {
              // Try to get request type from the new field structure
              if (record.requestType?.value) {
                return <span>{String(record.requestType.value)}</span>;
              }
              // Fall back to the old structure using additionalProperties
              return <span>{record.requestType?.value ? String(record.requestType.value) : 'Unknown'}</span>;
            }
          },

          {
            title: 'Amount',
            dataIndex: 'totalAmount',
            key: 'amount',
            align: 'right',
            render: (amount: number, record: any) => {
              let currencySymbol = '€'; // Default to Euro symbol
              if (record.currency?.value) {
                currencySymbol = record.currency.value === 'European euro' ? '€' : record.currency.value.charAt(0);
              }
              return `${currencySymbol}${formatCurrency(amount)}`;
            }
          },
          {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
              const statusConfig = getExpensePlanStatusDisplay(status);
              return <Pill type={statusConfig.type} label={statusConfig.label} />;
            }
          },
          {
            title: 'Actions',
            key: 'actions',
            render: (_, record: any) => (
              <Space size="small">
                <Button 
                  icon={<FileTextOutlined />}
                  shape="circle"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle view documents action
                    console.log('View documents for', record.id);
                  }}
                  data-testid={`view-documents-${record.id}`}
                />
                <Button 
                  icon={<EyeOutlined />}
                  shape="circle"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectItem(record as ExpensePlan);
                  }}
                  data-testid={`view-details-${record.id}`}
                />
              </Space>
            )
          }
        ]}
      />
    );
  }, [plans, isLoading, error, currentPage, pageSize, totalCount, selectedRowKeys, handleRowSelectionChange, handleSelectItem, handleTableChange]);

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
          listTitle: "My Expense Plans",
          listAmount: totalCount ? `${totalCount}` : undefined
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

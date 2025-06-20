import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetExpensePlans, ExpensePlan } from '../../../hooks/useGetExpensePlans';
import { getExpensePlanStatusDisplay } from '../../../utils';
import ExpensePlanDetails from './ExpensePlanDetails';
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

const { Text } = Typography;

// Helper function to format currency values
const formatCurrency = (value: number): string => {
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export interface ExpensePlansTableProps extends BusinessAppContextProps {
  search?: string;
  onSearchChange?: (search: string) => void;
}

const ExpensePlansTable: React.FC<ExpensePlansTableProps> = (props) => {
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
    userInfo: props.userInfo
  }), [props.accessToken, props.userInfo]);
  
  const { items: plans, isLoading, error, totalCount, fetchItems } = useGetExpensePlans(contextProps);
  
  // Search and pagination states
  const [search, setSearch] = useState<string>(props.search || '');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  
  // Selected item and row states
  const [selectedItem, setSelectedItem] = useState<ExpensePlan | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Initial data loading
  useEffect(() => {
    if (contextProps.accessToken && (!plans || plans.length === 0)) {
      fetchItems(search, currentPage, pageSize);
    }
  }, [contextProps.accessToken, plans]);

  // Handle add expense plan
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

  // Handle search change
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setCurrentPage(1); // Reset to first page on new search
    fetchItems(value, 1, pageSize);
    
    // Notify parent component
    if (props.onSearchChange) {
      props.onSearchChange(value);
    }
  }, [fetchItems, pageSize, props]);

  // Handle filter change (placeholder for future use)
  const handleFilterChange = useCallback(() => {
    // Placeholder for filter functionality
  }, []);

  // Handle table change for pagination
  const handleTableChange = useCallback((pagination: any, _filters: any, _sorter: any) => {
    console.log('Pagination changed:', { 
      current: pagination.current, 
      pageSize: pagination.pageSize,
      total: pagination.total 
    });
    
    // Update state
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
    
    // Load the data for the selected page with the new page size
    fetchItems(search, pagination.current, pagination.pageSize);
  }, [fetchItems, search]);

  // Handle item selection
  const handleSelectItem = useCallback((item: ExpensePlan) => {
    setSelectedItem(item);
    setSelectedRowKeys([item.id]);
  }, []);
  
  // Handle row selection change
  const handleRowSelectionChange = useCallback((newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
    
    // If a single row is selected, find and set the selected item
    if (newSelectedRowKeys.length === 1) {
      const selectedItemId = newSelectedRowKeys[0];
      const item = plans?.find(plan => plan.id === selectedItemId);
      if (item) {
        setSelectedItem(item);
      }
    } else {
      // If multiple or no rows selected, clear the selected item
      setSelectedItem(null);
    }
  }, [plans]);
  
  // Handle closing the details panel
  const handleCloseDetails = useCallback(() => {
    setSelectedItem(null);
    setSelectedRowKeys([]);
  }, []);

  // Render the data body
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
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`
        }}
        onChange={handleTableChange}
        data-testid="expense-plans-data-table"
        columns={[
          {
            title: 'Title',
            dataIndex: 'title',
            key: 'title',
            render: (text: string, record: ExpensePlan) => (
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
            render: (text: string) => (
              <div>
                {text ?? 'No Cost Center'}
              </div>
            )
          },
          {
            title: 'Trip Type',
            key: 'tripType',
            render: (_: any, record: ExpensePlan) => {
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
            render: (amount: number, record: ExpensePlan) => {
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
            render: (_: any, record: ExpensePlan) => (
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
                    handleSelectItem(record);
                  }}
                  data-testid={`view-details-${record.id}`}
                />
              </Space>
            )
          }
        ] as any}
      />
    );
  }, [plans, isLoading, error, currentPage, pageSize, totalCount, selectedRowKeys, handleRowSelectionChange, handleSelectItem, handleTableChange]);

  // Render expense plan details using the separate component
  const renderExpensePlanDetails = useMemo(() => {
    if (!selectedItem) return null;

    return (
      <ExpensePlanDetails 
        selectedItem={selectedItem} 
        onClose={handleCloseDetails} 
        accessToken={props.accessToken}
        userInfo={props.userInfo}
      />
    );
  }, [selectedItem, handleCloseDetails, props.accessToken, props.userInfo]);

  return (
    <>
      <DataContainer
        dataControllerProps={{
          search: search,
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
    </>
  );
};

export default ExpensePlansTable;

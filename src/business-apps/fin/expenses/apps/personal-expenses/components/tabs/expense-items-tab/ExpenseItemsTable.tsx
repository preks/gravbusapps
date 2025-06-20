import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Typography, Space, Spin, Alert } from 'antd';
import { DataTable } from '@newwork/gravity-ui-catalog';
import { FileTextOutlined, FileImageOutlined } from '@ant-design/icons';
import { PiLightning } from 'react-icons/pi';
import { useGetExpenseItems, ExpenseFilter } from '../../../hooks/useGetExpenseItems';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import Pill from '@/components/pill/Pill';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getExpenseItemStatusDisplay, ExpenseStatus } from '../../../utils';
import { startProcess } from '@/common/utils/start-process';
import ExpenseItemDetails from './ExpenseItemDetails';
import { useExpenseFilters } from '../../../hooks/useExpenseFilters';

const { Text } = Typography;

export interface ExpenseItemsTableProps extends BusinessAppContextProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  filters?: string[];
  onFilterChange?: (filterId: string, selected: boolean) => void;
  onAddExpenseItem?: () => void;
  selectedFilters?: string[];
  addFilter?: (filterId: string) => void;
  removeFilter?: (filterId: string) => void;
}

const ExpenseItemsTable: React.FC<ExpenseItemsTableProps> = (props) => {
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
    userInfo: props.userInfo
  }), [props.accessToken, props.userInfo]);
  
  // Use our simplified expense filters hook
  const {
    search,
    setSearch,
    selectedFilters: localSelectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter: localAddFilter,
    removeFilter: localRemoveFilter,
  } = useExpenseFilters();

  // Use shared filter state or fallback to local state
  const currentSelectedFilters = props.selectedFilters || localSelectedFilters;

  // Create filter groups with the current selected filters
  const currentFilterGroups = useMemo(() => {
    return filterGroups.map(group => ({
      ...group,
      filters: group.filters?.map(filter => ({
        ...filter,
        selected: currentSelectedFilters.includes(filter.id)
      })) || []
    }));
  }, [filterGroups, currentSelectedFilters]);

  // Get expense items with the filters
  const { items, isLoading, error, totalCount, fetchItems } = useGetExpenseItems(contextProps);
  
  // Create a custom getFilters function that uses shared state when available
  const getCurrentFilters = useCallback((): ExpenseFilter => {
    const activeFilters = currentSelectedFilters;
    const filter: ExpenseFilter = {};
    
    // Define filter options
    const TIME_PERIOD_OPTIONS = ['last30days', 'last90days', 'last180days'];
    const EXPENSE_TYPE_OPTIONS = ['expense', 'trip'];
    const OTHER_OPTIONS = ['noreceiptfilter'];
    
    // Extract filters by types
    const timePeriod = activeFilters.find(f => TIME_PERIOD_OPTIONS.includes(f)) || null;
    const statusFilters = activeFilters.filter(f => 
      Object.values(ExpenseStatus).map(s => s.toLowerCase()).includes(f));
    const expenseTypes = activeFilters.filter(f => EXPENSE_TYPE_OPTIONS.includes(f));
    const otherFilters = activeFilters.filter(f => OTHER_OPTIONS.includes(f));
    
    // Process status filters
    if (statusFilters.length > 0) {
      const statuses = statusFilters.map(f => f.toUpperCase());
      filter.status = statuses;
    }
    
    // Process Other filters (No receipt)
    if (otherFilters.includes('noreceiptfilter')) {
      filter.noReceipt = true;
    }
    
    // Process time period filters
    if (timePeriod) {
      const today = new Date();
      const endDate = new Date(today).toISOString().split('T')[0]; 
      
      let startDate = new Date(today);
      if (timePeriod === 'last30days') {
        startDate.setDate(today.getDate() - 30);
      } else if (timePeriod === 'last90days') {
        startDate.setDate(today.getDate() - 90);
      } else if (timePeriod === 'last180days') {
        startDate.setDate(today.getDate() - 180);
      }
      
      filter.expenseDateStart = startDate.toISOString().split('T')[0];
      filter.expenseDateEnd = endDate;
    }
    
    // Process expense type filters
    if (expenseTypes.length > 0) {
      const selectedType = expenseTypes[0];
      filter.expenseClass = { value: selectedType === 'expense' ? 'Expense' : 'Trip' };
    }
    
    return filter;
  }, [currentSelectedFilters]);
  
  // State declarations
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  
  // Initialize search from props
  useEffect(() => {
    if (props.search !== undefined && props.search !== search) {
      setSearch(props.search);
    }
  }, [props.search, search, setSearch]);

  // Initialize filters from props
  useEffect(() => {
    if (props.filters) {
      // Clear existing filters first
      localSelectedFilters.forEach(f => localRemoveFilter(f));
      
      // Add new filters
      props.filters.forEach(filter => localAddFilter(filter));
    }
  }, [props.filters, localAddFilter, localRemoveFilter, localSelectedFilters]);

  // Watch for changes in shared filter state and refetch data
  useEffect(() => {
    if (props.selectedFilters) {
      console.log('Shared filter state changed, refetching data:', props.selectedFilters);
      const filters = getCurrentFilters();
      fetchItems(search, currentPage, pageSize, filters);
    }
  }, [props.selectedFilters, getCurrentFilters, fetchItems, search, currentPage, pageSize]);

  // Initial data loading
  useEffect(() => {
    if (contextProps.accessToken && (!items || items.length === 0)) {
      const filters = getCurrentFilters();
      fetchItems(search, currentPage, pageSize, filters);
    }
  }, [contextProps.accessToken, items]);

  // Create a memoized search change handler
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setCurrentPage(1); // Reset to first page on new search
    // Apply filters when search changes
    const filters = getCurrentFilters();
    fetchItems(value, 1, pageSize, filters);
    
    // Notify parent component
    if (props.onSearchChange) {
      props.onSearchChange(value);
    }
  }, [fetchItems, pageSize, getCurrentFilters, props, setSearch]);

  // Handle filter changes
  const handleFilterChange = useCallback((filterId: string, selected: boolean) => {
    // Apply the filter change based on selection
    if (selected) {
      // Add the filter using shared or local state
      (props.addFilter || localAddFilter)(filterId);
    } else {
      // Remove the filter using shared or local state
      (props.removeFilter || localRemoveFilter)(filterId);
    }
    
    setCurrentPage(1); // Reset to first page when filters change
    
    // Calculate the immediate ExpenseFilter object
    const filter = getCurrentFilters(); // Use current filters from hook
    
    // Fetch with new filters
    fetchItems(search, 1, pageSize, filter);
    
    // Call parent change handler if provided
    if (props.onFilterChange) {
      props.onFilterChange(filterId, selected);
    }
  }, [currentSelectedFilters, localAddFilter, localRemoveFilter, search, pageSize, fetchItems, props, getCurrentFilters]);

  // Handle adding a new expense item
  const handleAddExpenseItem = useCallback(() => {
    if (props.onAddExpenseItem) {
      props.onAddExpenseItem();
    } else if (contextProps.userInfo?.employeeDetails?.employeeId) {
      startProcess({
        domain: 'employee-expense',
        processName: 'changeExpenseItem',
        payload: {
          employeeId: contextProps.userInfo.employeeDetails.employeeId
        }
      });
    }
  }, [contextProps.userInfo?.employeeDetails?.employeeId, props]);

  // Handle table change for pagination, filters, and sorting
  const handleTableChange = useCallback((pagination: any, _filters: any, _sorter: any) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
    const filters = getCurrentFilters();
    fetchItems(search, pagination.current, pagination.pageSize, filters);
  }, [search, fetchItems, getCurrentFilters]);

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
      <DataTable 
        dataSource={items} 
        rowKey="id"
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
              handleSelectItem(record);
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
        data-testid="expense-items-data-table"
        columns={[
          {
            title: 'Item',
            dataIndex: 'title',
            key: 'title',
            render: (text: string, record: any) => (
              <div>
                <div style={{ fontWeight: 'bold' }}>{text}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{record.invoiceDate}</div>
              </div>
            )
          },
          {
            title: 'Attachment',
            dataIndex: 'expenseItemFile',
            key: 'attachment',
            width: 80,
            align: 'center',
            render: (expenseItemFile: any[]) => (
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
            title: 'Amount',
            dataIndex: 'reimbursableAmount',
            key: 'amount',
            align: 'right',
            render: (amount: number) => (
              <span style={{ fontWeight: 'bold' }}>€{amount?.toFixed(2) ?? '0.00'}</span>
            )
          },
          {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
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
                />
              </Space>
            )
          }
        ] as any}
      />
    );
  }, [items, currentPage, pageSize, handleTableChange, isLoading, error, selectedRowKeys, handleRowSelectionChange, handleSelectItem, totalCount]);

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
          search: search,
          filter: currentSelectedFilters,
          setSearch: handleSearchChange,
          setFilter: (newFilters) => {
            // Handle filter removal when X is clicked or filters are cleared
            const filtersToRemove = currentSelectedFilters.filter(f => !newFilters.includes(f));
            filtersToRemove.forEach(filterId => (props.removeFilter || localRemoveFilter)(filterId));
            console.log('Filters removed:', filtersToRemove);
            
            // Always fetch new data with the remaining filters
            setCurrentPage(1); // Reset to first page
            
            // Build filters based on newFilters (remaining filters)
            const filter = getCurrentFilters();
            
            console.log('Fetching with remaining filters:', filter);
            fetchItems(search, 1, pageSize, filter);
          },
          addButton: {
            onClick: handleAddExpenseItem,
            label: 'Add',
            'data-testid': 'add-expense-item-button'
          },
          listTitle: "My Expense Items",
          listAmount: totalCount ? `${totalCount}` : undefined,
          filterLabelMap: filterLabelMap,
        }}
        dataFilterProps={{
          filterGroups: currentFilterGroups,
          onFilterChange: handleFilterChange,
        }}
        hideFilter={false}
        dataBody={renderDataBody()}
        contentBackground="white"
        dataDetails={selectedItem ? {
          title: selectedItem.title,
          icon: <FileTextOutlined />,
          content: renderExpenseDetails,
          onClose: handleCloseDetails
        } : undefined}
      />
    </>
  );
};

export default ExpenseItemsTable;

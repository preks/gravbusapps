import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDebounce } from '@/common/hooks/useDebounce';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { Alert, Empty } from 'antd';
import { DataTable, ActionButton } from '@newwork/gravity-ui-catalog';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import { useGetExpenseRequests } from '../../../hooks/useGetExpenseRequests';
import { useExpenseRequestFilters, ExpenseRequestFilter, ExpenseRequestStatus } from '../../../hooks/useExpenseRequestFilters';
import { getExpenseRequestStatusDisplay, ExpenseStatus } from '../../../utils';
import { InfoCircleOutlined } from '@ant-design/icons';
import Pill, { PillType } from '@/components/pill';
import ExpenseRequestDetails from './ExpenseRequestDetails';
import { formatDate, formatNumberFunction } from '@/common/utils/windowUtils'

export interface ExpenseRequestsTableProps extends BusinessAppContextProps {
  items?: any[];
  isLoading?: boolean;
  error?: string | null;
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
  onTableChange?: (pagination: any, filters: any, sorter: any) => void;
  search?: string;
  onSearchChange?: (search: string) => void;
  selectedFilters?: string[];
  setFilters?: (filters: string[]) => void;
  filterGroups?: any[];
  handleFilterChange?: (filterId: string, selected: boolean) => void;
  clearFilters?: () => void;
  filterLabelMap?: Record<string, string>;
  onAddExpenseRequest?: () => void;
}

const DEFAULT_PAGE_SIZE = 20;

const ExpenseRequestsTable: React.FC<ExpenseRequestsTableProps> = React.memo((props) => {
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
    userInfo: props.userInfo
  }), [props.accessToken, props.userInfo]);
  
  // Use props passed from parent instead of hook directly
  const {
    items = [],
    isLoading = false,
    error = null,
    totalCount = 0,
    currentPage = 1,
    pageSize = DEFAULT_PAGE_SIZE,
    onTableChange,
    search = '',
    onSearchChange,
    selectedFilters = [],
    setFilters,
    filterGroups = [],
    handleFilterChange,
    clearFilters,
    filterLabelMap = {},
    onAddExpenseRequest
  } = props;

  // Local search state for immediate UI feedback
  const [searchInput, setSearchInput] = useState(search || '');
  
  // Debounced search term for API calls
  const debouncedSearchTerm = useDebounce(searchInput, 300);

  // Selected item for details panel
  const [selectedItem, setSelectedItem] = useState<typeof items[0] | null>(null);

  // Selected row keys for table
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Sync local search input with prop changes
  useEffect(() => {
    setSearchInput(search || '');
  }, [search]);

  // Call parent callback when debounced search changes
  useEffect(() => {
    if (onSearchChange && debouncedSearchTerm !== search) {
      onSearchChange(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, onSearchChange, search]);

  // Handle search input changes (immediate UI update)
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
  }, []);

  // Handle filter changes
  const handleFilterChangeCallback = useCallback((filterId: string, selected: boolean) => {
    if (handleFilterChange) {
      handleFilterChange(filterId, selected);
    }
  }, [handleFilterChange]);

  // Enhanced table change handler for pagination
  const handleEnhancedTableChange = useCallback((pagination: any, _filters: any, _sorter: any) => {
    if (onTableChange) {
      onTableChange(pagination, _filters, _sorter);
    }
  }, [onTableChange]);

  // Memoize pagination configuration
  const paginationConfig = useMemo(() => ({
    current: currentPage,
    pageSize: pageSize,
    total: totalCount,
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    showTotal: (total: number, range: [number, number]) => 
      `${range[0]}-${range[1]} of ${total} items`,
    onChange: (page: number, size: number) => handleEnhancedTableChange({ current: page, pageSize: size }, {}, {}),
    onShowSizeChange: (current: number, size: number) => handleEnhancedTableChange({ current, pageSize: size }, {}, {})
  }), [currentPage, pageSize, totalCount, handleEnhancedTableChange]);

  // Helper function to determine status display with memoization
  const getStatusDisplay = useCallback((status: string): { type: PillType; text: string } => {
    const statusConfig = getExpenseRequestStatusDisplay(status);
    return { type: statusConfig.type, text: statusConfig.label };
  }, []);

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

  // Handle closing the details panel
  const handleCloseDetails = useCallback(() => {
    setSelectedItem(null);
  }, []);

  // Render the data body with memoization
  const renderDataBody = useCallback(() => {
    // Show error message if there's an error
    if (error) {
      const errorMessage = typeof error === 'string' ? error : (error as Error)?.message || 'Failed to load expense requests.';
      return <Alert message="Error" description={errorMessage} type="error" showIcon />;
    }

    // Show empty state only when not loading and there are no items
    if (!isLoading && (!items || items.length === 0)) {
      return <Empty 
        description="No expense requests found matching your criteria." 
        style={{ margin: '40px 0' }}
      />;
    }
    
    // Always render the table, but use the loading prop to show loading state
    // This keeps the table visible during loading for better UX

    return (
      <div className="expense-requests-table">
        <DataTable
          rowKey="id"
          dataSource={items}
          loading={isLoading}
          pagination={paginationConfig}
          onChange={handleEnhancedTableChange}
          data-testid="expense-requests-data-table"
          columns={[
                        {
              title: '',
              key: 'actions',
              width: 60,
              align: 'center',
              render: (_: any, record: any) => (
                <ActionButton
                  onClick={(e) => e.stopPropagation()}
                  flowData={[
                    {
                      category: 'Actions',
                      key: 'edit',
                      label: 'Edit',
                      onClick: (e?: React.MouseEvent) => {
                        e?.stopPropagation();
                        handleEditExpenseRequest(record as any);
                      }
                    },
                    {
                      category: 'Navigations',
                      key: 'view',
                      label: 'View Details',
                      onClick: (e?: React.MouseEvent) => {
                        e?.stopPropagation();
                        handleSelectItem(record as any);
                      }
                    },
                    {
                      category: 'Actions',
                      key: 'delete',
                      label: 'Delete',
                      onClick: (e?: React.MouseEvent) => {
                        e?.stopPropagation();
                        console.log('Delete expense request:', record.id);
                      }
                    }
                  ]}
                  portalContainer={document.body}
                  data-testid={`actions-${record.id}`}
                  size="md"
                />
              )
            },
            {
              title: 'Request Number',
              dataIndex: 'code',
              key: 'code',
              render: (code: string) => (
                <div>
                  {code || 'N/A'}
                </div>
              )
            },
            {
              title: 'Title',
              dataIndex: 'title',
              key: 'title',
              render: (text: string) => (
                <div>
                  {text}
                </div>
              )
            },
            {
              title: 'Start Date',
              dataIndex: 'startDate',
              key: 'startDate',
              render: (startDate: string) => (
                <div>
                  {startDate ? formatDate(startDate, 'date.long') : '-'}
                </div>
              )
            },
            {
              title: 'End Date',
              dataIndex: 'endDate',
              key: 'endDate',
              render: (endDate: string) => (
                <div>
                  {endDate ? formatDate(endDate, 'date.long') : '-'}
                </div>
              )
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (status: any) => {
                const { type, text } = getStatusDisplay(status);
                return <Pill type={type} label={text} />;
              }
            },
            {
              title: 'Reimbursable Amount',
              dataIndex: 'reimbursableAmount',
              key: 'reimbursableAmount',
              align: 'right',
              render: (amount: number, record: any) => {
                const currencyCode = record.currency?.code || '';
                const formattedAmount = amount && amount !== 0 ? `${formatNumberFunction(String(amount ?? '0'))} ${currencyCode}` : '-';
                
                return (
                  <div className="gba:text-right" data-testid={`reimbursable-amount-${record.id}`}>
                    {formattedAmount}
                  </div>
                );
              }
            },
            {
              title: 'Advance',
              dataIndex: 'advanceAmount',
              key: 'advanceAmount',
              align: 'right',
              render: (amount: number, record: any) => {
                const advanceAmountValue = record.expensePlan?.advancePaymentAggregate?.aggregate?.sum?.amount;
                const advanceAmount = advanceAmountValue && advanceAmountValue !== 0 ? advanceAmountValue : '-';
                
                // Use expense plan currency if available, otherwise fall back to main currency
                const currencyCode = advanceAmountValue && advanceAmountValue !== 0 && record.expensePlan?.currency?.code ? record.expensePlan.currency.code : record.currency?.code || '';
                const formattedAmount = `${formatNumberFunction(String(advanceAmount))} ${currencyCode}`;
                
                return (
                  <div className="gba:text-right" data-testid={`total-amount-${record.id}`}>
                    {formattedAmount}
                  </div>
                );
              }
            },
            
          ]}
          onRow={(record: any) => ({
            onClick: () => handleSelectItem(record as any)
          })}
        />
      </div>
    );
  }, [items, isLoading, error, paginationConfig, 
      handleEnhancedTableChange, selectedRowKeys, handleRowSelectionChange, 
      handleEditExpenseRequest, handleSelectItem]);

  // Memoized details panel render function using the new component
  const renderExpenseRequestDetails = useCallback(() => {
    if (!selectedItem) return null;
    return (
      <ExpenseRequestDetails 
        selectedItem={selectedItem} 
        onClose={handleCloseDetails}
        accessToken={contextProps.accessToken}
        userInfo={contextProps.userInfo}
      />
    );
  }, [selectedItem, handleCloseDetails, contextProps.accessToken, contextProps.userInfo]);

  const dataControllerProps = useMemo(() => ({
    search: searchInput,
    setSearch: handleSearchChange,
    filter: selectedFilters,
    setFilter: (newFilters: string[]) => {
      // Create a set of new filter IDs for easier comparison
      const newFiltersSet = new Set(newFilters);
      
      // First, remove any filters that are not in the new filters
      selectedFilters.forEach((filter: string) => {
        if (!newFiltersSet.has(filter)) {
          handleFilterChangeCallback(filter, false);
        }
      });
      
      // Then, add any new filters that aren't already selected
      newFilters.forEach((filter: string) => {
        if (!selectedFilters.includes(filter)) {
          handleFilterChangeCallback(filter, true);
        }
      });
    },
    addButton: {
      onClick: onAddExpenseRequest || (() => {}),
      label: 'Add',
      'data-testid': 'add-expense-request-button'
    },
    listTitle: "My Expense Requests",
    listAmount: totalCount ? `${totalCount}` : undefined,
    filterLabelMap: filterLabelMap,
  }), [search, selectedFilters, handleSearchChange, handleFilterChangeCallback, totalCount, filterLabelMap, onAddExpenseRequest]);

  const dataFilterProps = useMemo(() => ({
    filterGroups: filterGroups,
    onFilterChange: handleFilterChangeCallback,
  }), [filterGroups, handleFilterChangeCallback]);

  const dataDetails = useMemo(() => {
    if (selectedItem) {
      return {
        title: selectedItem.title ?? 'Expense Request Details',
        icon: <InfoCircleOutlined />,
        content: renderExpenseRequestDetails(),
        onClose: handleCloseDetails
      };
    }
    return undefined;
  }, [selectedItem, renderExpenseRequestDetails, handleCloseDetails]);

  return (
    <DataContainer
      dataControllerProps={dataControllerProps}
      dataFilterProps={dataFilterProps}
      hideFilter={false}
      dataBody={renderDataBody()}
      contentBackground="white"
      floatingDetails={true}
      dataDetails={dataDetails}
    />
  );
});

export default ExpenseRequestsTable;

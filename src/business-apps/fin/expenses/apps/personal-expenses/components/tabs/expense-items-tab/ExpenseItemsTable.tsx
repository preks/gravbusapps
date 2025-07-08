import { formatNumberFunction, getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Typography, Spin, Alert } from 'antd';
import { DataTable, ActionButton } from '@newwork/gravity-ui-catalog';
import { FileTextOutlined, FileImageOutlined } from '@ant-design/icons';
import { useGetExpenseItems, ExpenseFilter } from '../../../hooks/useGetExpenseItems';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import { DataFilterGroup } from '@/components/data-filter/DataFilter';
import Pill from '@/components/pill/Pill';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getExpenseItemStatusDisplay } from '../../../utils';
import ExpenseItemDetails from './ExpenseItemDetails';

const { Text } = Typography;

export interface ExpenseItemsTableProps extends BusinessAppContextProps {
  onAddExpenseItem: () => void;
  selectedFilters: string[];
  addFilter: (filterId: string) => void;
  removeFilter: (filterId: string) => void;
  clearFilters: () => void;
  filterGroups: DataFilterGroup[];
  filterLabelMap: Record<string, string>;
  getFilters: (filtersToApply?: string[]) => ExpenseFilter;
  setFilters: (filters: string[]) => void;
}

const ExpenseItemsTable: React.FC<ExpenseItemsTableProps> = React.memo((props) => {
  const {
    onAddExpenseItem,
    selectedFilters,
    addFilter,
    removeFilter,
    clearFilters,
    filterGroups,
    filterLabelMap,
    getFilters,
    setFilters,
    ...contextProps
  } = props;

  const [search, setSearch] = useState('');

  // Sorting state
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { items, isLoading, error, totalCount, fetchItems } = useGetExpenseItems(contextProps);

  useEffect(() => {
    const apiFilters = getFilters(selectedFilters);
    fetchItems(search, currentPage, pageSize, apiFilters, sortField, sortOrder);
  }, [fetchItems, currentPage, pageSize, search, selectedFilters, getFilters, sortField, sortOrder]);

  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setCurrentPage(1);
  }, [setSearch]);

  const handleFilterChange = useCallback((filterId: string, selected: boolean) => {
    if (selected) {
      addFilter(filterId);
    } else {
      removeFilter(filterId);
    }
    setCurrentPage(1);
  }, [addFilter, removeFilter]);

  const handleAddExpenseItem = useCallback(() => {
    onAddExpenseItem();
  }, [onAddExpenseItem]);

  const handleTableChange = useCallback((pagination: any) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
  }, []);

  const handleSelectItem = useCallback((item: any) => {
    setSelectedItem(item);
    setSelectedRowKeys([item.id]);
  }, []);

  const handleRowSelectionChange = useCallback((newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
    if (newSelectedRowKeys.length === 1) {
      const selectedItemId = newSelectedRowKeys[0];
      const item = items?.find(i => i.id === selectedItemId);
      setSelectedItem(item);
    } else {
      setSelectedItem(null);
    }
  }, [items]);

  const handleCloseDetails = useCallback(() => {
    setSelectedItem(null);
    setSelectedRowKeys([]);
  }, []);

  const renderDataBody = useCallback(() => {
    if (isLoading && !items?.length) {
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
        onChange={handleEnhancedTableChange}
        loading={isLoading}
        data-testid="expense-items-data-table"
        columns={[
          {
            title: '',
            key: 'actions',
            align: 'center',
            width: 60,
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
                      console.log('Edit expense item:', record.id);
                    }
                  },
                  {
                    category: 'Navigations',
                    key: 'view',
                    label: 'View Details',
                    onClick: (e?: React.MouseEvent) => {
                      e?.stopPropagation();
                      handleSelectItem(record);
                    }
                  },
                  {
                    category: 'Actions',
                    key: 'delete',
                    label: 'Delete',
                    onClick: (e?: React.MouseEvent) => {
                      e?.stopPropagation();
                      console.log('Delete expense item:', record.id);
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
            title: 'Title',
            dataIndex: 'title',
            key: 'title',
            sorter: (a: any, b: any) => a.title.localeCompare(b.title),
            sortOrder: sortField === 'title' ? sortOrder : null,
            render: (text: string) => <div style={{ fontWeight: 'bold' }} data-testid="expense-title-cell">{text}</div>
          },
          {
            title: 'Invoice Date',
            dataIndex: 'invoiceDate',
            key: 'invoiceDate',
            sorter: (a: any, b: any) => new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime(),
            sortOrder: sortField === 'invoiceDate' ? sortOrder : null,
            render: (date: string) => {
              const formattedDate = date
                ? formatDate(date, 'date.long')
                : getTranslationFromI18nKeyAndLabel('lowcoder:expense_summary_request.no_creation_date', 'No creation date');
              return <div style={{ fontSize: '12px', color: '#666' }} data-testid="expense-invoice-date-cell">{formattedDate}</div>;
            }
          },
          {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            sorter: (a: any, b: any) => a.status.localeCompare(b.status),
            sortOrder: sortField === 'status' ? sortOrder : null,
            render: (status: string) => {
              const { label, type } = getExpenseItemStatusDisplay(status);
              return <Pill label={label} type={type} className="gba:text-center" data-testid="expense-status-cell" />;
            }
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
                  <FileTextOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                </div>
              ) : (
                <div className="gba:flex gba:items-center gba:justify-center">
                  <FileImageOutlined style={{ fontSize: '24px', color: '#d9d9d9' }} />
                </div>
              )
            )
          },
          {
            title: 'Reimbursable Amount',
            dataIndex: 'reimbursableAmount',
            key: 'reimbursableAmount',
            sorter: (a: any, b: any) => (a.reimbursableAmount ?? 0) - (b.reimbursableAmount ?? 0),
            sortOrder: sortField === 'reimbursableAmount' ? sortOrder : null,
            onCell: () => ({ className: 'gba:text-right gba:font-bold' }),
            render: (amount: number, record: any) => (
              <span data-testid="expense-amount-cell">
                {formatNumberFunction(String(amount ?? '0'))} {record.currencyCode}
              </span>
            )
          }
        ] as any}
      />
    );
  }, [items, isLoading, error, totalCount, currentPage, pageSize, handleTableChange, selectedRowKeys, handleRowSelectionChange, handleSelectItem]);

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

  const currentFilterGroups = useMemo(() => {
    return filterGroups.map(group => ({
      ...group,
      filters: (group.filters || []).map(filter => ({ ...filter, selected: selectedFilters.includes(filter.id) }))
    }));
  }, [filterGroups, selectedFilters]);

  // Enhanced table change handler for sorting
  const handleEnhancedTableChange = (pagination: any, _filters: any, sorter: any) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
    if (sorter && sorter.field) {
      setSortField(sorter.field);
      setSortOrder(sorter.order);
    } else {
      setSortField(null);
      setSortOrder(null);
    }
  };

  return (
    <DataContainer
      dataControllerProps={{
        listTitle: 'Expense Items',
        listAmount: totalCount ? `${totalCount}` : undefined,
        search: search,
        setSearch: handleSearchChange,
        placeholder: 'Search by description, amount, or status...',
        filter: selectedFilters,
        setFilter: setFilters,

        filterLabelMap: filterLabelMap,
        addButton: {
          onClick: handleAddExpenseItem,
          label: '',
        },
      }}
      dataFilterProps={{
        filterGroups: currentFilterGroups,
        onFilterChange: handleFilterChange as (filterId: string, selected: boolean) => void,
      }}
      dataBody={renderDataBody()}
      dataDetails={selectedItem ? {
        title: selectedItem.title,
        icon: <FileTextOutlined />,
        content: renderExpenseDetails,
        onClose: handleCloseDetails
      } : undefined}
    />
  );
});

export default ExpenseItemsTable;

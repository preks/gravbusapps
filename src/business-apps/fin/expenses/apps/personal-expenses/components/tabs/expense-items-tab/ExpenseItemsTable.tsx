import { formatNumberFunction, getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Typography, Spin, Alert, message } from 'antd';
import { DataTable, ActionButton } from '@newwork/gravity-ui-catalog';
import { PlusSquareIcon } from '@/components/dataController/DataController';
import { FileTextOutlined, FileImageOutlined } from '@ant-design/icons';
import { useGetExpenseItems, ExpenseFilter } from '../../../hooks/useGetExpenseItems';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import { DataFilterGroup } from '@/components/data-filter/DataFilter';
import Pill from '@/components/pill/Pill';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getExpenseItemStatusDisplay } from '../../../utils';
import ExpenseItemDetails from './ExpenseItemDetails';
import { startProcess } from '@/common/utils/start-process';


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
  availableStatuses: string[];
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
    availableStatuses,
    ...contextProps
  } = props;

  const [search, setSearch] = useState('');

  // Sorting state
  const [sortField, setSortField] = useState<string>('expenseDate');
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | undefined>('descend');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { items, isLoading, error, totalCount, fetchItems } = useGetExpenseItems(contextProps);

  useEffect(() => {
    const apiFilters = getFilters(selectedFilters);
    fetchItems(search, currentPage, pageSize, apiFilters, sortField, sortOrder);
  }, [fetchItems, currentPage, pageSize, search, selectedFilters, getFilters, sortField, sortOrder]);

  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Build status filter group dynamically from availableStatuses (from allItems, not filtered items)
  const statusFilterGroup = useMemo(() => ({
    id: 'status',
    title: 'Status',
    multiSelect: true,
    filters: availableStatuses.map((status: string) => ({
      id: status.toLowerCase(),
      label: (() => {
        const displayLabel = getExpenseItemStatusDisplay(status).label;
        const statusLabel = status.charAt(0) + status.slice(1).toLowerCase();
        return displayLabel.toLowerCase() !== statusLabel.toLowerCase()
          ? `${displayLabel} (${statusLabel})`
          : displayLabel;
      })(),
      selected: selectedFilters.includes(status.toLowerCase()),
    })),
  }), [availableStatuses, selectedFilters]);

  // Override filterGroups to inject the dynamic status group
  const dynamicFilterGroups = useMemo(() => {
    return filterGroups.map(group =>
      group.id === 'status' ? statusFilterGroup : group
    );
  }, [filterGroups, statusFilterGroup]);
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
  }, []);

  const handleRowSelectionChange = useCallback((newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedItem(null);
    setSelectedRowKeys([]);
  }, []);

  // Handlers for the top buttons
  const handleCreateExpenseRequest = useCallback(() => {
    if (!selectedRowKeys.length) return;
    const selectedItems = items?.filter((item: any) => selectedRowKeys.includes(item.id)) || [];
    // Only allow creation if all items are in 'CREATED' status (draft)
    const allDraft = selectedItems.every((item: any) => item.status === 'CREATED');
    if (!allDraft) {
      message.warning(
        getTranslationFromI18nKeyAndLabel(
          'gba.expenseItems.createRequestDraftOnly',
          'An Expense Request can be started only with items in status draft.'
        )
      );
      return;
    }
    const expenseItems = selectedItems.map((element: any) => ({
      itemId: element.id,
      currencyId: element.currencyId
    }));
    const payload = {
      employeeId: contextProps.userInfo?.employeeDetails?.employeeId,
      expenseItems
    };
    // Log payload for create button
    startProcess({
      domain: 'employee-expense',
      processName: 'changeExpenseItem',
      payload,
      builderType: 'NATIVE_SCREEN'
    });
  }, [selectedRowKeys, items, contextProps.userInfo]);

  const handleDeleteSelection = useCallback((ids?: string[]) => {
    const targetIds = ids || selectedRowKeys;
    console.log('handleDeleteSelection - ids:', targetIds);
    if (!targetIds.length) return;
    const selectedItems = items?.filter((item: any) => targetIds.includes(item.id)) || [];
    const allAllowed = selectedItems.every((item: any) => item.status === 'CREATED' || item.status === 'ASSIGNED');
    if (!allAllowed) {
      message.warning('You can only discard items with status "Created" or "Assigned".');
      return;
    }
    const payload = {
      employeeId: contextProps.userInfo?.employeeDetails?.employeeId,
      expenseItemsIds: targetIds
    };
    startProcess({
      domain: 'employee-expense',
      processName: 'discardExpenseItems',
      payload,
    });
  }, [selectedRowKeys, items, contextProps.userInfo]);

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
          renderCell: (_checked, _record, _index, originNode) => (
            <div onClick={(e) => e.stopPropagation()}>{originNode}</div>
          ),
        }}
        onRow={(record: any) => ({
          onClick: (event) => {
            const target = event.target as HTMLElement;
            const isCheckboxColumn = target.closest('.ant-table-selection-column');
            const isActionButton = target.closest('[class*="ant-dropdown-trigger"]');

            if (!isCheckboxColumn && !isActionButton) {
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
                  ...(record.status === 'CREATED' || record.status === 'ASSIGNED') 
                 ?  [
                  {
                    category: 'Actions',
                    key: 'edit',
                    label: 'Edit',
                    onClick: () => {
                      startProcess({
                        domain: 'employee-expense',
                        processName: 'changeExpenseItem',
                        payload: {
                          employeeId: contextProps.userInfo?.employeeDetails?.employeeId,
                          expenseItemIds: [record.id]
                        },
                        builderType: 'NATIVE_SCREEN'
                      });
                    }
                  }
                 ] : [],
                  {
                    category: 'Navigations',
                    key: 'view',
                    label: 'View Details',
                    onClick: () => {
                      handleSelectItem(record);
                    }
                  },
                  ...(record.status === 'CREATED' || record.status === 'ASSIGNED'
                    ? [
                        {
                          category: 'Actions',
                          key: 'discard',
                          label: 'Discard Expense Item',
                          onClick: () => {
                            handleDeleteSelection([record.id]);
                          }
                        }
                      ]
                    : [])
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
            title: getTranslationFromI18nKeyAndLabel('gba.expenseItems.expenseDate', 'Expense Date'),
            dataIndex: 'expenseDate',
            key: 'expenseDate',
            sorter: (a: any, b: any) => new Date(a.expenseDate).getTime() - new Date(b.expenseDate).getTime(),
            sortOrder: sortField === 'expenseDate' ? sortOrder : null,
            render: (date: string) => {
              const formattedDate = date
                ? formatDate(date, 'date.long')
                : getTranslationFromI18nKeyAndLabel('lowcoder:expense_summary_request.no_creation_date', 'No creation date');
              return <div style={{ fontSize: '12px', color: '#666' }} data-testid="expense-expense-date-cell">{formattedDate}</div>;
            },
            width: 140,
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
            render: (amount: number, record: any) => {
  // Only use currency.code from the nested currency object from the query result
  const currency = record.currency?.code || '';
  return (
    <span data-testid="expense-amount-cell">
      {currency} {formatNumberFunction(String(amount ?? '0'))}
    </span>
  );
}
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
        accessToken={props.accessToken}
        userInfo={props.userInfo}
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
      setSortField('');
      setSortOrder(undefined);
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
        actions: [
          ...(selectedRowKeys.length > 0
            ? [
                <button
                  key="create-expense-request"
                  className="gba:btn gba:btn-primary"
                  data-testid="create-expense-request-btn"
                  onClick={handleCreateExpenseRequest}
                >
                  Create Expense Request (from Selection)
                </button>,
                <button
                  key="delete-selection"
                  className="gba:btn gba:btn-danger"
                  data-testid="delete-selection-btn"
                  onClick={() => handleDeleteSelection()}
                >
                  Delete Selection
                </button>
              ]
            : []),
          <button
            key="add-expense-item"
            className="gba:btn gba:btn-primary gba:inline-flex gba:items-center"
            data-testid="add-expense-item-btn"
            onClick={handleAddExpenseItem}
          >
            <PlusSquareIcon className="gba:mr-2" />
            {getTranslationFromI18nKeyAndLabel('gba.expenseItems.add', 'Add')}
          </button>
        ],
      }}
      dataFilterProps={{
        filterGroups: dynamicFilterGroups, // Now uses only existing statuses with correct labels
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

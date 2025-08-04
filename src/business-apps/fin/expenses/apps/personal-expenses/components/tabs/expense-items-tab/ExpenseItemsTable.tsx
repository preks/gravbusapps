import { formatNumberFunction, getTranslationFromI18nKeyAndLabel, formatDate, getDateFormat } from '@/common/utils/windowUtils';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell, 
  Card, 
  CardContent, 
  Spinner, 
  Button, 
  Alert,
  Checkbox,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from '@newwork/nw-design-system';
import Pill from '@/components/pill';
import { PiFileText, PiImage, PiArrowUp, PiArrowDown } from 'react-icons/pi';
import dayjs from 'dayjs';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { useGetExpenseItems, ExpenseFilter } from '../../../hooks/useGetExpenseItems';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import { DataFilterGroup } from '@/components/data-filter/DataFilter';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getExpenseItemStatusDisplay } from '../../../utils';
import ExpenseItemDetails from './ExpenseItemDetails';
import { startProcess } from '@/common/utils/start-process';
import { notification } from 'antd';


const DATA_TEST_ID_PREFIX = 'ExpenseItemsTable';


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
  amountRange?: { min?: number; max?: number } | null;
  tableRefreshTrigger?: number;
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

  // Get all selected filters (including date range) - use props instead of hook
  const allSelectedFilters = selectedFilters;

  // Server-side sorting state - properly managed for server-side sorting
  const [sortField, setSortField] = useState<string>('expenseDate');
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | undefined>('descend');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { items, isLoading, error, totalCount, fetchItems } = useGetExpenseItems(contextProps);

  useEffect(() => {
    const apiFilters = getFilters(allSelectedFilters);
    fetchItems(search, currentPage, pageSize, apiFilters, sortField, sortOrder);
  }, [fetchItems, currentPage, pageSize, search, allSelectedFilters, getFilters, sortField, sortOrder]);

  // Refresh data when tableRefreshTrigger changes (triggered from parent tab)
  useEffect(() => {
    if (props.tableRefreshTrigger && props.tableRefreshTrigger > 0) {
      const apiFilters = getFilters(allSelectedFilters);
      fetchItems(search, currentPage, pageSize, apiFilters, sortField, sortOrder);
    }
  }, [props.tableRefreshTrigger, fetchItems, search, currentPage, pageSize, allSelectedFilters, getFilters, sortField, sortOrder]);

  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

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

  const handleSelectItem = useCallback((item: any) => {
    setSelectedItem(item);
    setIsSheetOpen(true);
  }, []);

  const handleRowSelectionChange = useCallback((itemId: string, checked: boolean) => {
    setSelectedRowKeys(prev => {
      if (checked) {
        return [...prev, itemId];
      } else {
        return prev.filter(key => key !== itemId);
      }
    });
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedRowKeys(items?.map(item => item.id) || []);
    } else {
      setSelectedRowKeys([]);
    }
  }, [items]);

  const handleCloseDetails = useCallback(() => {
    setSelectedItem(null);
    setSelectedRowKeys([]);
    setIsSheetOpen(false);
  }, []);

  // Handlers for the top buttons
  const handleCreateExpenseRequest = useCallback(() => {
    if (!selectedRowKeys.length) return;
    const selectedItems = items?.filter((item: any) => selectedRowKeys.includes(item.id)) || [];
    
    // Check if all items are in 'CREATED' status (draft)
    const allDraft = selectedItems.every((item: any) => item.status === 'CREATED');
    if (!allDraft) {
      const errorMessage = getTranslationFromI18nKeyAndLabel(
        'gba.expenseItems.createRequestDraftOnly',
        'An Expense Request can be started only with items in status DRAFT.'
      );
      notification.error({
        message: getTranslationFromI18nKeyAndLabel(
          'gba.expenseItems.createRequestError',
          'Cannot Create Expense Request'
        ),
        description: errorMessage,
        placement: 'bottomRight',
        duration: 5,
        className: 'gba:error-toast'
      });
      return;
    }
    
    // Check if all items have the same currency
    const currencies = selectedItems.map((item: any) => item.currency?.code || item.currencyId);
    const uniqueCurrencies = [...new Set(currencies)];
    if (uniqueCurrencies.length > 1) {
      const errorMessage = getTranslationFromI18nKeyAndLabel(
        'gba.expenseItems.createRequestCurrencyMismatch',
        'All selected items must have the same currency to create an expense request.'
      );
      notification.error({
        message: getTranslationFromI18nKeyAndLabel(
          'gba.expenseItems.createRequestError',
          'Cannot Create Expense Request'
        ),
        description: errorMessage,
        placement: 'bottomRight',
        duration: 5,
        className: 'gba:error-toast'
      });
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
      processName: 'changeExpenseRequest',
      payload,
    });
  }, [selectedRowKeys, items, contextProps.userInfo]);

  const handleDeleteSelection = useCallback((ids?: string[]) => {
    const targetIds = ids || selectedRowKeys;
    if (!targetIds.length) return;
    const selectedItems = items?.filter((item: any) => targetIds.includes(item.id)) || [];
    const allAllowed = selectedItems.every((item: any) => item.status === 'CREATED' || item.status === 'ASSIGNED');
    if (!allAllowed) {
      const errorMessage = getTranslationFromI18nKeyAndLabel(
        'gba.expenseItems.deleteSelectionStatusError',
        'You can only discard items with status "Created" or "Assigned".'
      );
      notification.error({
        message: getTranslationFromI18nKeyAndLabel(
          'gba.expenseItems.deleteSelectionError',
          'Cannot Delete Selection'
        ),
        description: errorMessage,
        placement: 'bottomRight',
        duration: 5,
        className: 'gba:error-toast'
      });
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

  // Enhanced server-side sorting handler
  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      // Cycle through: ascend -> descend -> clear
      if (sortOrder === 'ascend') {
        setSortOrder('descend');
      } else if (sortOrder === 'descend') {
        setSortField('');
        setSortOrder(undefined);
      } else {
        setSortOrder('ascend');
      }
    } else {
      setSortField(field);
      setSortOrder('ascend');
    }
    setCurrentPage(1);
  }, [sortField, sortOrder]);

  // Helper function to render sort icon
  const renderSortIcon = useCallback((field: string) => {
    if (sortField !== field) return null;
    if (sortOrder === 'ascend') return <PiArrowUp className="gba:inline gba:ml-1" size={12} />;
    if (sortOrder === 'descend') return <PiArrowDown className="gba:inline gba:ml-1" size={12} />;
    return null;
  }, [sortField, sortOrder]);

  // Handle pagination
  const handlePaginationChange = useCallback((page: number, newPageSize?: number) => {
    const targetPageSize = newPageSize || pageSize;
    setCurrentPage(page);
    setPageSize(targetPageSize);
  }, [pageSize]);

  // Show error state
  if (error) {
    return (
      <div 
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center"
        data-testid={`${DATA_TEST_ID_PREFIX}-error-state`}
      >
        <Alert variant="destructive" className="gba:mb-4">
          <div className="gba:text-lg gba:font-medium gba:mb-2">
            {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.error_loading_expense_items','Error Loading Expense Items')}
          </div>
          <div className="gba:text-gray-600">
            {error}
          </div>
        </Alert>
        <Button
          variant="default"
          onClick={() => {
            const apiFilters = getFilters(allSelectedFilters);
            fetchItems(search, currentPage, pageSize, apiFilters, sortField, sortOrder);
          }}
          data-testid={`${DATA_TEST_ID_PREFIX}-retry-button`}
        >
          {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.retry','Retry')}
        </Button>
      </div>
    );
  }

  return (
    <>
      <DataContainer
      dataControllerProps={{
        listTitle: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense_items','Expense Items'),
        listAmount: totalCount ? `${totalCount}` : undefined,
        search: search,
        setSearch: handleSearchChange,
        placeholder: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.search_by_description_amount_status','Search by description, amount, or status...'),
        filter: allSelectedFilters,
        setFilter: setFilters,
        filterLabelMap: filterLabelMap,
        addButton: {
          onClick: handleAddExpenseItem,
          label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.add','Add'),
          'data-testid': 'add-expense-item-button',
        },
        actions: [
          ...(selectedRowKeys.length > 0
            ? [
                <Button
                  key="create-expense-request"
                  variant="default"
                  data-testid="create-expense-request-btn"
                  onClick={handleCreateExpenseRequest}
                  className="gba:inline-flex gba:items-center gba:gap-2"
                >
                  {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.create_expense_request','Create Expense Request')} ({selectedRowKeys.length})
                </Button>,
                <Button
                  key="delete-selection"
                  variant="destructive"
                  data-testid="delete-selection-btn"
                  onClick={() => handleDeleteSelection()}
                  className="gba:inline-flex gba:items-center gba:gap-2"
                >
                  {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.delete_selection','Delete Selection')} ({selectedRowKeys.length})
                </Button>
              ]
            : []),
        ],
      }}
      dataFilterProps={{
        filterGroups: filterGroups,
        onFilterChange: handleFilterChange as (filterId: string, selected: boolean) => void,
      }}
      contentBackground="white"
      dataBody={
        <div className="gba:pr-6">
          <Card data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
            <CardContent className="gba:p-0">
              {isLoading && (
                <div className="gba:flex gba:justify-center gba:p-4">
                  <Spinner />
                </div>
              )}
              
              <div className="gba:overflow-x-auto">
                <Table data-testid={`${DATA_TEST_ID_PREFIX}-table`}>
                  <TableHeader>
                    <TableRow className="gba:border-b gba:bg-gray-50">
                      <TableHead
                        className="gba:w-[40px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-3"
                        data-testid={`${DATA_TEST_ID_PREFIX}-selection-header`}
                      >
                        <Checkbox
                          checked={selectedRowKeys.length === items?.length && items?.length > 0}
                          onCheckedChange={handleSelectAll}
                          data-testid={`${DATA_TEST_ID_PREFIX}-select-all-checkbox`}
                        />
                      </TableHead>
                      <TableHead
                        className="gba:w-[50px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-3"
                        data-testid={`${DATA_TEST_ID_PREFIX}-actions-header`}
                      >
                        {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.actions','Actions')}
                      </TableHead>
                      <TableHead
                        className="gba:w-[25%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                        onClick={() => handleSort('title')}
                        data-testid={`${DATA_TEST_ID_PREFIX}-title-header`}
                      >
                        <div className="gba:flex gba:items-center">
                          {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.title','Title')}
                          {renderSortIcon('title')}
                        </div>
                      </TableHead>
                      <TableHead
                        className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                        onClick={() => handleSort('expenseDate')}
                        data-testid={`${DATA_TEST_ID_PREFIX}-expense-date-header`}
                      >
                        <div className="gba:flex gba:items-center">
                          {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense_date','Expense Date')}
                          {renderSortIcon('expenseDate')}
                        </div>
                      </TableHead>
                      <TableHead
                        className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                        onClick={() => handleSort('status')}
                        data-testid={`${DATA_TEST_ID_PREFIX}-status-header`}
                      >
                        <div className="gba:flex gba:items-center">
                          {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.status','Status')}
                          {renderSortIcon('status')}
                        </div>
                      </TableHead>
                      <TableHead
                        className="gba:w-[10%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6"
                        data-testid={`${DATA_TEST_ID_PREFIX}-attachment-header`}
                      >
                        {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.attachment','Attachment')}
                      </TableHead>
                      <TableHead
                        className="gba:w-[18%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                        onClick={() => handleSort('reimbursableAmount')}
                        data-testid={`${DATA_TEST_ID_PREFIX}-amount-header`}
                      >
                        <div className="gba:flex gba:items-center">
                          {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.reimbursable_amount','Reimbursable Amount')}
                          {renderSortIcon('reimbursableAmount')}
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!isLoading && (!items || items.length === 0) ? (
                      <TableRow>
                        <TableCell colSpan={7} className="gba:py-8 gba:text-center">
                          <div className="gba:text-gray-500">
                            {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.no_expense_items_found','No expense items found. Create your first expense item to get started.')}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      items?.map((record) => (
                        <TableRow
                          key={record.id}
                          className={`gba:border-b gba:hover:bg-gray-50 gba:transition-colors gba:cursor-pointer ${selectedItem?.id === record.id ? 'gba:bg-blue-50' : ''}`}
                          onClick={() => handleSelectItem(record)}
                          data-testid={`${DATA_TEST_ID_PREFIX}-row-${record.id}`}
                        >
                          <TableCell
                            className="gba:py-4 gba:px-3"
                            data-testid={`${DATA_TEST_ID_PREFIX}-selection-cell-${record.id}`}
                          >
                            <Checkbox
                              checked={selectedRowKeys.includes(record.id)}
                              onCheckedChange={(checked) => handleRowSelectionChange(record.id, checked as boolean)}
                              onClick={(e) => e.stopPropagation()}
                              data-testid={`${DATA_TEST_ID_PREFIX}-selection-checkbox-${record.id}`}
                            />
                          </TableCell>
                          <TableCell
                            className="gba:py-4 gba:px-3"
                            data-testid={`${DATA_TEST_ID_PREFIX}-actions-cell-${record.id}`}
                          >
                            <div className="gba:flex gba:justify-start gba:gap-2">
                             <AppActionButton
                              data-testid={`${DATA_TEST_ID_PREFIX}-update-expense-item-button-${record.id}`}
                              variant="secondary"
                              staticFlowData={[
                                ...(record.status === 'CREATED' || record.status === 'ASSIGNED') ? [
                                {
                                  category: 'Actions',
                                  key: 'update-expense-item',
                                  label: 'Update Expense Item',
                                  onClick: () => {
                                    startProcess({
                                      domain: 'employee-expense',
                                      processName: 'changeExpenseItem',
                                      payload: {
                                          psi_taskPayload: {
                                           initialParameters: {
                                            employeeId: contextProps.userInfo?.employeeDetails?.employeeId,
                                            expenseId: record.id
                                          }
                                      }
                                     },
                                      builderType: 'NATIVE_SCREEN'
                                    });
                                  }
                                }]: [],
                                ...(record.status === 'CREATED' || record.status === 'ASSIGNED') ? [
                                {
                                  category: 'Actions',
                                  key: 'delete-expense-item',
                                  label: 'Delete Expense Item',
                                  onClick: () => {
                                    startProcess({
                                      domain: 'employee-expense',
                                      processName: 'discardExpenseItems',
                                      payload: {
                                        employeeId:  contextProps.userInfo?.employeeDetails?.employeeId,
                                        expenseItemsIds: [record.id]
                                      }
                                    });
                                  }
                                }]: [],
                                {
                                  category: 'Navigations',
                                  key: 'view-expense-item-details',
                                  label: 'View Expense Item Details',
                                  onClick: (e?: React.MouseEvent) => {
                                    e?.stopPropagation();
                                    handleSelectItem(record);
                                  },
                                },
                              ]}
                              prefixDataTestId={`${DATA_TEST_ID_PREFIX}-update-expense-item`}
                              accessToken={contextProps.accessToken}
                              emptyStateBehavior="disable"
                              deferMainContextRequestsUntilClick
                              onClick={(e) => e.stopPropagation()}
                            />
                            </div>
                          </TableCell>
                          <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-title-cell-${record.id}`}>
                            <div className="gba:font-medium gba:text-sm" data-testid="expense-title-cell">
                              {record.title}
                            </div>
                          </TableCell>
                          <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-expense-date-cell-${record.id}`}>
                            {record.expenseDate ? (
                              <div className="gba:text-sm" data-testid="expense-expense-date-cell">
                                {(() => {
                                  try {
                                    return dayjs(record.expenseDate).format(getDateFormat('dayjs.date.long'));
                                  } catch (error) {
                                    return 'N/A';
                                  }
                                })()}
                              </div>
                            ) : (
                              <span className="gba:text-sm gba:text-gray-500" data-testid="expense-expense-date-cell">
                                N/A
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-status-cell-${record.id}`}>
                            {(() => {
                              const statusConfig = getExpenseItemStatusDisplay(record.status);
                              return <Pill type={statusConfig.type} label={statusConfig.label} color={statusConfig.color} data-testid="expense-status-cell" />;
                            })()}
                          </TableCell>
                          <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-attachment-cell-${record.id}`}>
                            <div className="gba:flex gba:items-center gba:justify-center">
                              {record.expenseItemFile && record.expenseItemFile.length > 0 ? (
                                <PiFileText size={24} className="gba:text-blue-500" />
                              ) : (
                                <PiImage size={24} className="gba:text-gray-300" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="gba:py-4 gba:px-6 gba:text-right" data-testid={`${DATA_TEST_ID_PREFIX}-amount-cell-${record.id}`}>
                            <span data-testid="expense-amount-cell">
                              {formatNumberFunction(String(record.reimbursableAmount ?? '0'))} {record.currency?.code || ''}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination - Only show if there are multiple pages */}
              {totalCount > pageSize ? (
                <div className="gba:flex gba:items-center gba:justify-between gba:px-6 gba:py-4" data-testid={`${DATA_TEST_ID_PREFIX}-pagination`}>
                  <div className="gba:text-sm gba:text-muted-foreground" data-testid={`${DATA_TEST_ID_PREFIX}-pagination-info`}>
                    {`${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, totalCount)} ${getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.of','of')} ${totalCount} ${getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense_items_count','expense items')}`}
                  </div>
                  <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
                    <div className="gba:flex gba:items-center gba:space-x-2">
                      <p className="gba:text-sm gba:font-medium">{getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.rows_per_page','Rows per page')}</p>
                      <select
                        value={pageSize}
                        onChange={(e) => handlePaginationChange(1, Number(e.target.value))}
                        className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                        data-testid={`${DATA_TEST_ID_PREFIX}-page-size-select`}
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                    <div className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium" data-testid={`${DATA_TEST_ID_PREFIX}-page-info`}>
                      {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.page','Page')} {currentPage} {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.of','of')} {Math.ceil(totalCount / pageSize)}
                    </div>
                    <div className="gba:flex gba:items-center gba:space-x-2">
                      <Button
                        variant="outline"
                        className="gba:h-8 gba:w-8 gba:p-0"
                        onClick={() => handlePaginationChange(1)}
                        disabled={currentPage === 1}
                        data-testid={`${DATA_TEST_ID_PREFIX}-first-page-button`}
                      >
                        <span className="gba:sr-only">Go to first page</span>
                        ⟨⟨
                      </Button>
                      <Button
                        variant="outline"
                        className="gba:h-8 gba:w-8 gba:p-0"
                        onClick={() => handlePaginationChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        data-testid={`${DATA_TEST_ID_PREFIX}-previous-page-button`}
                      >
                        <span className="gba:sr-only">Go to previous page</span>
                        ⟨
                      </Button>
                      <Button
                        variant="outline"
                        className="gba:h-8 gba:w-8 gba:p-0"
                        onClick={() => handlePaginationChange(currentPage + 1)}
                        disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                        data-testid={`${DATA_TEST_ID_PREFIX}-next-page-button`}
                      >
                        <span className="gba:sr-only">Go to next page</span>
                        ⟩
                      </Button>
                      <Button
                        variant="outline"
                        className="gba:h-8 gba:w-8 gba:p-0"
                        onClick={() => handlePaginationChange(Math.ceil(totalCount / pageSize))}
                        disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                        data-testid={`${DATA_TEST_ID_PREFIX}-last-page-button`}
                      >
                        <span className="gba:sr-only">Go to last page</span>
                        ⟩⟩
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="gba:flex gba:items-center gba:justify-between gba:px-6 gba:py-4" data-testid={`${DATA_TEST_ID_PREFIX}-pagination-info-single-page`}>
                  <div className="gba:text-sm gba:text-muted-foreground">
                    {`${totalCount} expense items`}
                  </div>
                  <div className="gba:flex gba:items-center gba:space-x-2">
                    <p className="gba:text-sm gba:font-medium">Rows per page</p>
                    <select
                      value={pageSize}
                      onChange={(e) => handlePaginationChange(1, Number(e.target.value))}
                      className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                      data-testid={`${DATA_TEST_ID_PREFIX}-page-size-select-single`}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      }
    />

    {/* Sheet for details */}
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      <SheetContent className="gba:w-[600px] gba:sm:gba:w-[600px] gba:max-w-none">
        <SheetHeader>
          <SheetTitle className="gba:text-xl gba:font-semibold gba:text-gray-900">
            {selectedItem?.title || 'Expense Item Details'}
          </SheetTitle>
        </SheetHeader>
        <div className="gba:mt-6 gba:px-6 gba:overflow-y-auto gba:max-h-[calc(100vh-120px)]">
          {selectedItem && (
            <ExpenseItemDetails
              selectedItem={selectedItem}
              onClose={handleCloseDetails}
              accessToken={props.accessToken}
              userInfo={props.userInfo}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  </>
  );
});

export default ExpenseItemsTable;

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { ExpensePlan } from '../../../hooks/useGetExpensePlans';
import { getExpensePlanStatusDisplay } from '../../../utils';
import ExpensePlanDetails from './ExpensePlanDetails';
import ExpenseRequestDetails from '../expense-requests-tab/ExpenseRequestDetails';
import { startProcess } from '@/common/utils/start-process';
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
  Badge, 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from '@newwork/nw-design-system';
import Pill, { PillType } from '@/components/pill';
import { Modal } from 'antd';
import { formatNumberFunction, getDateFormat, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { PiArrowUp, PiArrowDown } from 'react-icons/pi';
import dayjs from 'dayjs';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import { DataFilterGroup } from '@/components/data-filter/DataFilter';
import { useExpensePlanFileService } from '../../../utils/expensePlanFileService';
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';

const DATA_TEST_ID_PREFIX = 'ExpensePlansTable';

export interface ExpensePlansTableProps extends BusinessAppContextProps {
  items: ExpensePlan[] | undefined;
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  onTableChange: (pagination: any, filters: any, sorter: any) => void;
  search: string;
  onSearchChange: (search: string) => void;
  selectedFilters: string[];
  setFilters: (filters: string[]) => void;
  filterGroups: DataFilterGroup[];
  handleFilterChange: (filterId: string, selected: boolean) => void;
  clearFilters: () => void;
  filterLabelMap: Record<string, string>;
  addFilter: (filterId: string, selected: boolean) => void;
  removeFilter: (filterId: string) => void;
  tableRefreshTrigger?: number;
}

const ExpensePlansTable: React.FC<ExpensePlansTableProps> = React.memo((props) => {
  const {
    items: plans,
    isLoading,
    error,
    totalCount,
    currentPage,
    pageSize,
    onTableChange,
    search,
    selectedFilters,
    ...contextProps
  } = props;

  // Track if any filters are active to show conditional messages
  const hasActiveFilters = useMemo(() => {
    return search || selectedFilters.length > 0;
  }, [search, selectedFilters]);

  // Server-side sorting state - managed by parent component
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | undefined>('descend');

  const [selectedItem, setSelectedItem] = useState<ExpensePlan | null>(null);
  const [selectedExpenseRequest, setSelectedExpenseRequest] = useState<any>(null);
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false);
  const [printPdfUrl, setPrintPdfUrl] = useState<string>('');
  const [printLoading, setPrintLoading] = useState<boolean>(false);
  
  // Use the file service hook
  const { printExpensePlan, isMounted } = useExpensePlanFileService(props);

  const handleSelectItem = useCallback((item: ExpensePlan) => {
    setSelectedItem(item);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedItem(null);
    setSelectedExpenseRequest(null);
  }, []);

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
    // Reset to first page when sorting changes
    if (onTableChange) {
      onTableChange({ current: 1, pageSize }, {}, { field, order: sortOrder === 'ascend' ? 'descend' : 'ascend' });
    }
  }, [sortField, sortOrder, onTableChange, pageSize]);

  // Helper function to render sort icon
  const renderSortIcon = useCallback((field: string) => {
    if (sortField !== field) return null;
    if (sortOrder === 'ascend') return <PiArrowUp className="gba:ml-1 gba:h-3 gba:w-3" />;
    if (sortOrder === 'descend') return <PiArrowDown className="gba:ml-1 gba:h-3 gba:w-3" />;
    return null;
  }, [sortField, sortOrder]);

  const handlePrintPlan = useCallback(async (record: ExpensePlan) => {
    setPrintLoading(true);
    setPrintModalOpen(true);

    try {
      const result = await printExpensePlan(record);
      
      if (result.success && result.pdfUrl && isMounted.current) {
        setPrintPdfUrl(result.pdfUrl);
      } else if (!result.success) {
        console.error('Error printing plan:', result.error);
      }
    } catch (error) {
      console.error('Error fetching print PDF:', error);
    } finally {
      if (isMounted.current) {
        setPrintLoading(false);
      }
    }
  }, [printExpensePlan, isMounted]);

  const handleAddExpensePlan = useCallback(() => {
    const employeeId = contextProps.userInfo?.employeeDetails?.employeeId;
    if (!employeeId) {
      console.warn('Cannot start process: Employee ID not available. User info may not be fully loaded.');
      // TODO: Replace with nw-design-system toast when available
      console.warn('User information not loaded yet. Please wait a moment and try again.');
      return;
    }

    startProcess({
      domain: 'employee-expense',
      processName: 'changeExpensePlan',
      payload: {
        employeeId: employeeId,
      },
      builderType: 'NATIVE_SCREEN'
    });
  }, [contextProps.userInfo]);

  const handleViewExpenseRequestDetails = useCallback((record: ExpensePlan) => {
    const url = buildPlatformUrl('/platform/fin/expenses/expense-request-record', { 
      expenseRequestId: record.expenseRequest[0].id
    });
    navigateTo(url);
  }, []);

  const handleViewExpensePlanDetails = useCallback((record: ExpensePlan) => {
    const url = buildPlatformUrl('/platform/fin/expenses/expense-plan-record', { 
      expensePlanId: record.id
    });
    navigateTo(url);
  }, []);

  // Enhanced table change handler for server-side sorting
  const handleEnhancedTableChange = useCallback((pagination: any, _filters: any, sorter: any) => {
    if (onTableChange) {
      // Update sorting state if sorter is provided
      if (sorter && sorter.field) {
        setSortField(sorter.field);
        setSortOrder(sorter.order);
      }
      onTableChange(pagination, _filters, sorter);
    }
  }, [onTableChange]);

  const handlePaginationChange = useCallback((page: number, newPageSize?: number) => {
    const pagination = {
      current: page,
      pageSize: newPageSize || pageSize,
      total: totalCount
    };
    onTableChange(pagination, {}, {});
  }, [pageSize, totalCount, onTableChange]);

  // Watch for table refresh trigger from parent
  useEffect(() => {
    if (props.tableRefreshTrigger && props.tableRefreshTrigger > 0) {
      // Trigger a table refresh by calling onTableChange with current state
      const pagination = {
        current: currentPage,
        pageSize: pageSize,
        total: totalCount
      };
      onTableChange(pagination, {}, {});
    }
  }, [props.tableRefreshTrigger, currentPage, pageSize, totalCount, onTableChange]);

  const renderDataBody = useMemo(() => {
    return (
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
                      className="gba:w-[50px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-3"
                      data-testid={`${DATA_TEST_ID_PREFIX}-actions-header`}
                    />
                    <TableHead
                      className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                      onClick={() => handleSort('code')}
                      data-testid={`${DATA_TEST_ID_PREFIX}-code-header`}
                    >
                      <div className="gba:flex gba:items-center">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_request_filter.plan_number_input', 'Plan Number')}
                        {renderSortIcon('code')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[25%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                      onClick={() => handleSort('title')}
                      data-testid={`${DATA_TEST_ID_PREFIX}-title-header`}
                    >
                      <div className="gba:flex gba:items-center">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.expense_table.title', 'Title')}
                        {renderSortIcon('title')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                      onClick={() => handleSort('planDate')}
                      data-testid={`${DATA_TEST_ID_PREFIX}-plan-date-header`}
                    >
                      <div className="gba:flex gba:items-center">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.plan_details.plan_date', 'Plan Date')}
                        {renderSortIcon('planDate')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                      onClick={() => handleSort('startDate')}
                      data-testid={`${DATA_TEST_ID_PREFIX}-start-date-header`}
                    >
                      <div className="gba:flex gba:items-center">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.expense_plan_table.start_date', 'Start Date')}
                        {renderSortIcon('startDate')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                      onClick={() => handleSort('endDate')}
                      data-testid={`${DATA_TEST_ID_PREFIX}-end-date-header`}
                    >
                      <div className="gba:flex gba:items-center">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.expense_plan_table.end_date', 'End Date')}
                        {renderSortIcon('endDate')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[10%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                      onClick={() => handleSort('status')}
                      data-testid={`${DATA_TEST_ID_PREFIX}-status-header`}
                    >
                      <div className="gba:flex gba:items-center">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status')}
                        {renderSortIcon('status')}
                      </div> 
                    </TableHead>
                    <TableHead
                      className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100 gba:text-right"
                      onClick={() => handleSort('reimbursableAmount')}
                      data-testid={`${DATA_TEST_ID_PREFIX}-reimbursable-amount-header`}
                    >
                      <div className="gba:flex gba:items-center gba:justify-end">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_request.reimbursable', 'Reimbursable Amount')}
                        {renderSortIcon('reimbursableAmount')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100 gba:text-right"
                      onClick={() => handleSort('advancePaymentPaidAmount')}
                      data-testid={`${DATA_TEST_ID_PREFIX}-paid-advance-header`}
                    >
                      <div className="gba:flex gba:items-center gba:justify-end">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.expense_plan_table.paid_advance', 'Paid Advance')}
                        {renderSortIcon('advancePaymentPaidAmount')}
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!isLoading && (!plans || plans.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={9} className="gba:py-8 gba:text-center">
                        <div className="gba:text-gray-500">
                          {hasActiveFilters 
                            ? getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.no_data_found','No data available')
                            : getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.no_plan_data', 'No expense plans found. Create your first expense plan to get started.')
                          }
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    plans?.map((record) => (
                      <TableRow
                        key={record.id}
                        className={`gba:border-b gba:hover:bg-gray-50 gba:transition-colors gba:cursor-pointer ${selectedItem?.id === record.id ? 'gba:bg-blue-50' : ''}`}
                        onClick={() => handleSelectItem(record)}
                        data-testid={`${DATA_TEST_ID_PREFIX}-row-${record.id}`}
                      >
                        <TableCell
                          className="gba:py-4 gba:px-3"
                          data-testid={`${DATA_TEST_ID_PREFIX}-actions-cell-${record.id}`}
                        >
                          <div 
                            className="gba:flex gba:justify-start gba:gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <AppActionButton
                              data-testid={`${DATA_TEST_ID_PREFIX}-update-expense-plan-button-${record.id}`}
                              size="icon"
                              staticFlowData={[
                                ...(record.status === 'CREATED' || record.status === 'REJECTED') ? [
                                  {
                                    category: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.actions','Actions'),
                                    key: 'update-plan',
                                    label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.expense_plan_flows.update_plan', 'Update Plan'),
                                    onClick: () => {
                                      startProcess({
                                        domain: 'employee-expense',
                                        processName: 'changeExpensePlan',
                                        payload: {
                                          employeeId:  contextProps.userInfo?.employeeDetails?.employeeId,
                                          expensePlanId: record.id
                                        },
                                        builderType: 'NATIVE_SCREEN'
                                      });
                                    }
                                  }
                                ] : [],
                                ...((record.status === 'APPROVED' || record.status === 'CLOSED') && (record.employeeDocument && record.employeeDocument.file && record.employeeDocument.file.trim() !== '')) ? [
                                  {
                                    category: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.actions','Actions'),
                                    key: 'print',
                                    label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.expense_plan_flows.print', 'Print'),
                                    onClick: () => {
                                      handlePrintPlan(record);
                                    }
                                  }
                                ] : [],
                                ...(record.status === 'APPROVED') ? [
                                  {
                                    category: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.actions','Actions'),
                                    key: 'request-advance',
                                    label: getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.add_trip_info_to_plan.skip_advance_payment_label', 'Request Advance Payment'),
                                    onClick: () => {
                                      startProcess({
                                        domain: 'employee-expense',
                                        processName: 'changeAdvancePayment',
                                        payload: {
                                          employeeId:  contextProps.userInfo?.employeeDetails?.employeeId,
                                          expensePlan: record.id
                                        },
                                      });
                                    }
                                  }
                                ] : [],
                                ...(record.status === 'APPROVED' || record.expenseRequest.length > 0) ? [
                                  {
                                    category: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.actions','Actions'),
                                    key: 'create-expense-request',
                                    label: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.create_expense_request', 'Create Expense Request'),
                                    onClick: () => {
                                      startProcess({
                                        domain: 'employee-expense',
                                        processName: 'changeExpenseRequest',
                                        payload: {
                                          employeeId:  contextProps.userInfo?.employeeDetails?.employeeId,
                                          expensePlanId: record.id
                                        },
                                        builderType: 'NATIVE_SCREEN'
                                      });
                                    }
                                  }
                                ] : [],
                                {
                                  category: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.navigations','Navigations'),
                                  key: 'view-plan-details',
                                  label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.expense_plan_flows.view_plan_details_btn', 'View Plan Details'),
                                  onClick: (e?: React.MouseEvent) => {
                                    e?.stopPropagation();
                                    handleViewExpensePlanDetails(record);
                                  },
                                },
                                ...(record.expenseRequest && (record.expenseRequest as unknown as any[]).length > 0 && (record.expenseRequest as unknown as any[])[0].id !== null) ? [
                                  {
                                    category: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.navigations','Navigations'),
                                    key: 'view-request-details',
                                    label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.modal_list_or_flow_button.view_request_details', 'View Request Details'),
                                    onClick: (e?: React.MouseEvent) => {
                                      e?.stopPropagation();
                                      handleViewExpenseRequestDetails(record);
                                    },
                                  }
                                ] : [],
                              ]}
                              prefixDataTestId={`${DATA_TEST_ID_PREFIX}-update-expense-plan`}
                              accessToken={contextProps.accessToken}
                              emptyStateBehavior="disable"
                              deferMainContextRequestsUntilClick={true}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-code-cell-${record.id}`}>
                          <div className="gba:font-medium gba:text-sm" data-testid="expense-plan-code-cell">
                            {record.code}
                          </div>
                        </TableCell>
                        <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-title-cell-${record.id}`}>
                          <div className="gba:font-medium gba:text-sm" data-testid="expense-plan-title-cell">
                            {record.title}
                          </div>
                        </TableCell>
                        <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-plan-date-cell-${record.id}`}>
                          {record.planDate ? (
                            <div className="gba:text-sm" data-testid="expense-plan-plan-date-cell">
                              {(() => {
                                try {
                                  return dayjs(record.planDate).format(getDateFormat('date.short'));
                                } catch (error) {
                                  return 'N/A';
                                }
                              })()}
                            </div>
                          ) : (
                            <span className="gba:text-sm gba:text-gray-500" data-testid="expense-plan-plan-date-cell">
                              N/A
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-start-date-cell-${record.id}`}>
                          {record.startDate ? (
                            <div className="gba:text-sm" data-testid="expense-plan-start-date-cell">
                              {(() => {
                                try {
                                  return dayjs(record.startDate).format(getDateFormat('date.short'));
                                } catch (error) {
                                  return 'N/A';
                                }
                              })()}
                            </div>
                          ) : (
                            <span className="gba:text-sm gba:text-gray-500" data-testid="expense-plan-start-date-cell">
                              N/A
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-end-date-cell-${record.id}`}>
                          {record.endDate ? (
                            <div className="gba:text-sm" data-testid="expense-plan-end-date-cell">
                              {(() => {
                                try {
                                  return dayjs(record.endDate).format(getDateFormat('date.short'));
                                } catch (error) {
                                  return 'N/A';
                                }
                              })()}
                            </div>
                          ) : (
                            <span className="gba:text-sm gba:text-gray-500" data-testid="expense-plan-end-date-cell">
                              N/A
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-status-cell-${record.id}`}>
                          {(() => {
                            const statusConfig = getExpensePlanStatusDisplay(record.status);
                            return <Pill type={statusConfig.type} label={statusConfig.label} color={statusConfig.color} data-testid="expense-plan-status-cell" />;
                          })()}
                        </TableCell>
                        <TableCell className="gba:py-4 gba:px-6 gba:text-right" data-testid={`${DATA_TEST_ID_PREFIX}-reimbursable-amount-cell-${record.id}`}>
                          <div className="gba:text-sm gba:font-medium" data-testid="expense-plan-reimbursable-amount-cell">
                            {record.reimbursableAmount ? 
                              `${formatNumberFunction(String(record.reimbursableAmount))} ${record.currency?.code || 'EUR'}` : 
                              '0.00 EUR'
                            }
                          </div>
                        </TableCell>
                        <TableCell className="gba:py-4 gba:px-6 gba:text-right" data-testid={`${DATA_TEST_ID_PREFIX}-paid-advance-cell-${record.id}`}>
                          <div className="gba:text-sm gba:font-medium" data-testid="expense-plan-paid-advance-cell">
                            {record.advancePaymentPaidAmount && record.advancePaymentPaidAmount > 0 ? 
                              `${formatNumberFunction(String(record.advancePaymentPaidAmount))} ${record.currency?.code || 'EUR'}` : 
                              '-'
                            }
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalCount > pageSize ? (
              <div className="gba:flex gba:items-center gba:justify-between gba:px-6 gba:py-4" data-testid={`${DATA_TEST_ID_PREFIX}-pagination`}>
                <div className="gba:text-sm gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.showing', 'Showing')} {`${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, totalCount)}`} {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.of', 'of')} {totalCount} {getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.expense_plans', 'Expense Plans')}
                </div>
                <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
                  <div className="gba:flex gba:items-center gba:space-x-2">
                    <p className="gba:text-sm gba:font-medium">{getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.rows_per_page', 'Rows per page')}</p>
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
                  <div className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium">
                    Page {currentPage} of {Math.ceil(totalCount / pageSize)}
                  </div>
                  <div className="gba:flex gba:items-center gba:space-x-2">
                    <Button
                      variant="outline"
                      className="gba:h-8 gba:w-8 gba:p-0"
                      onClick={() => handlePaginationChange(1)}
                      disabled={currentPage <= 1}
                      data-testid={`${DATA_TEST_ID_PREFIX}-first-page-button`}
                    >
                      <span className="gba:sr-only">Go to first page</span>
                      ⟪
                    </Button>
                    <Button
                      variant="outline"
                      className="gba:h-8 gba:w-8 gba:p-0"
                      onClick={() => handlePaginationChange(currentPage - 1)}
                      disabled={currentPage <= 1}
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
                  {`${totalCount} ${getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.expense_plans', 'Expense Plans')}`}
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
    );
  }, [plans, isLoading, selectedItem, handleSelectItem, contextProps.accessToken, totalCount, pageSize, currentPage, handlePaginationChange, sortField, sortOrder, handleSort, renderSortIcon]);

  return (
    <div>
      <DataContainer
        dataControllerProps={{
          search: props.search,
          setSearch: props.onSearchChange,
          filter: props.selectedFilters,
          setFilter: props.setFilters,
          filterLabelMap: props.filterLabelMap,
          placeholder: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.employee_report_filter.job_search','Search') + '...',
          addButton: {
            onClick: handleAddExpensePlan,
            label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule_details.calculation_allowance_period_list.calculation_allowance_period_modal.btn_add', 'Add'),
            'data-testid': 'add-expense-plan-button',
          },
          listTitle: getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.title','My Expense Plans'),
          listAmount: totalCount ? `${totalCount}` : undefined,
        }}
        dataFilterProps={{
          filterGroups: props.filterGroups,
          onFilterChange: props.handleFilterChange,
        }}
        hideFilter={false}
        dataBody={renderDataBody}
        contentBackground="white"
      />

      {/* Expense Plan Details Sheet */}
      <Sheet open={!!selectedItem} onOpenChange={(open) => !open && handleCloseDetails()}>
        <SheetContent className="gba:w-[600px] gba:sm:gba:w-[600px] gba:max-w-none">
          <SheetHeader>
            <SheetTitle className="gba:text-xl gba:font-semibold gba:text-gray-900">
              {selectedItem?.title || getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_plan.expense_subtitle_details','Expense Plan Details')}
            </SheetTitle>
          </SheetHeader>
          <div className="gba:mt-6 gba:overflow-y-auto gba:max-h-[calc(100vh-120px)]">
            {selectedItem && (
              <ExpensePlanDetails
                selectedItem={selectedItem}
                onClose={handleCloseDetails}
                accessToken={props.accessToken}
                userInfo={props.userInfo}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Expense Request Details Sheet */}
      <Sheet open={!!selectedExpenseRequest} onOpenChange={(open) => !open && handleCloseDetails()}>
        <SheetContent className="gba:w-[600px] gba:sm:gba:w-[600px] gba:max-w-none">
          <SheetHeader>
            <SheetTitle className="gba:text-xl gba:font-semibold gba:text-gray-900">
              {selectedExpenseRequest?.title || getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.modal_list_or_flow_button.expense_request_details','Expense Request Details')}
            </SheetTitle>
          </SheetHeader>
          <div className="gba:mt-6 gba:overflow-y-auto gba:max-h-[calc(100vh-120px)]">
            {selectedExpenseRequest && (
              <ExpenseRequestDetails
                selectedItem={selectedExpenseRequest}
                onClose={handleCloseDetails}
                accessToken={props.accessToken}
                userInfo={props.userInfo}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Print Modal */}
      <Modal
        open={printModalOpen}
        title="Print Expense Plan"
        footer={null}
        onCancel={() => {
          setPrintModalOpen(false);
          setPrintPdfUrl('');
        }}
        width="90vw"
        style={{ top: 20 }}
        destroyOnHidden={true}
        data-testid="print-plan-modal"
      >
        {printLoading ? (
          <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
            <Spinner />
          </div>
        ) : (
          <iframe
            src={printPdfUrl}
            style={{ width: '100%', height: 'calc(90vh - 55px)', border: 'none' }}
            title="Print Preview"
            data-testid="print-plan-iframe"
          />
        )}
      </Modal>
    </div>
  );
});

export default ExpensePlansTable;

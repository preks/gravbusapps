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


// Sorting utilities following SOLID principles
interface SortableField<T> {
  key: keyof T;
  type: 'string' | 'number' | 'date';
  nullable?: boolean;
}

class SortingService {
  static createSorter<T>(field: SortableField<T>) {
    return (a: T, b: T) => {
      const aValue = a[field.key];
      const bValue = b[field.key];
      
      // Handle nullable values
      const aSafe = field.nullable ? (aValue ?? 0) : aValue;
      const bSafe = field.nullable ? (bValue ?? 0) : bValue;
      
      switch (field.type) {
        case 'string':
          return String(aSafe).localeCompare(String(bSafe));
        case 'number':
          return Number(aSafe) - Number(bSafe);
        case 'date':
          const aDate = aSafe ? new Date(String(aSafe)).getTime() : 0;
          const bDate = bSafe ? new Date(String(bSafe)).getTime() : 0;
          return aDate - bDate;
        default:
          return 0;
      }
    };
  }
}

// Column configuration following SRP
const EXPENSE_PLAN_COLUMNS = {
  code: { key: 'code' as keyof ExpensePlan, type: 'string' as const },
  title: { key: 'title' as keyof ExpensePlan, type: 'string' as const },
  planDate: { key: 'planDate' as keyof ExpensePlan, type: 'date' as const, nullable: true },
  startDate: { key: 'startDate' as keyof ExpensePlan, type: 'date' as const, nullable: true },
  endDate: { key: 'endDate' as keyof ExpensePlan, type: 'date' as const, nullable: true },
  status: { key: 'status' as keyof ExpensePlan, type: 'string' as const },
  reimbursableAmount: { key: 'reimbursableAmount' as keyof ExpensePlan, type: 'number' as const, nullable: true },
  advancePaymentPaidAmount: { key: 'advancePaymentPaidAmount' as keyof ExpensePlan, type: 'number' as const, nullable: true },
} as const;

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
    ...contextProps
  } = props;

  // Internal sorting state - managed locally like expense items table
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | undefined>('descend');
  const [sortConfig, setSortConfig] = useState<{ field: string | null; direction: 'asc' | 'desc' | null }>({ field: null, direction: null });

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

  const handleSort = useCallback((field: string) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const renderSortIcon = useCallback((field: string) => {
    if (sortConfig.field !== field) {
      return null;
    }
    return sortConfig.direction === 'asc' ? 
      <PiArrowUp className="gba:ml-1 gba:h-3 gba:w-3" /> : 
      <PiArrowDown className="gba:ml-1 gba:h-3 gba:w-3" />;
  }, [sortConfig]);

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

  // Enhanced table change handler for sorting - manages state internally
  const handleEnhancedTableChange = useCallback((pagination: any, _filters: any, sorter: any) => {
    // Handle pagination
    onTableChange(pagination, _filters, sorter);
    
    // Handle sorting - update internal state only
    if (sorter && sorter.field) {
      setSortField(sorter.field);
      setSortOrder(sorter.order);
    } else {
      // Reset to default sorting (creation date descending)
      setSortField('createdAt');
      setSortOrder('descend');
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

  // Column factory following OCP
  const createColumn = useCallback((key: keyof typeof EXPENSE_PLAN_COLUMNS, title: string, render?: (value: any, record: ExpensePlan) => React.ReactNode) => {
    const field = EXPENSE_PLAN_COLUMNS[key];
    return {
      title,
      dataIndex: field.key,
      key: field.key,
      sorter: SortingService.createSorter(field),
      sortOrder: sortField === field.key ? sortOrder : null,
      render,
    };
  }, [sortField, sortOrder]);

  const sortedPlans = useMemo(() => {
    if (!plans || !sortConfig.field || !sortConfig.direction) {
      return plans;
    }

    return [...plans].sort((a, b) => {
      const aValue = a[sortConfig.field as keyof ExpensePlan];
      const bValue = b[sortConfig.field as keyof ExpensePlan];
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime();
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }
      
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [plans, sortConfig]);

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
                           {getTranslationFromI18nKeyAndLabel('expense.plans.table.planNumber', 'Plan Number')}
                           {renderSortIcon('code')}
                         </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[25%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                      onClick={() => handleSort('title')}
                      data-testid={`${DATA_TEST_ID_PREFIX}-title-header`}
                    >
                                               <div className="gba:flex gba:items-center">
                           {getTranslationFromI18nKeyAndLabel('expense.plans.table.title', 'Title')}
                           {renderSortIcon('title')}
                         </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                      onClick={() => handleSort('planDate')}
                      data-testid={`${DATA_TEST_ID_PREFIX}-plan-date-header`}
                    >
                                               <div className="gba:flex gba:items-center">
                           {getTranslationFromI18nKeyAndLabel('expense.plans.table.planDate', 'Plan Date')}
                           {renderSortIcon('planDate')}
                         </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                      onClick={() => handleSort('startDate')}
                      data-testid={`${DATA_TEST_ID_PREFIX}-start-date-header`}
                    >
                                               <div className="gba:flex gba:items-center">
                           {getTranslationFromI18nKeyAndLabel('expense.plans.table.startDate', 'Start Date')}
                           {renderSortIcon('startDate')}
                         </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                      onClick={() => handleSort('endDate')}
                      data-testid={`${DATA_TEST_ID_PREFIX}-end-date-header`}
                    >
                                               <div className="gba:flex gba:items-center">
                           {getTranslationFromI18nKeyAndLabel('expense.plans.table.endDate', 'End Date')}
                           {renderSortIcon('endDate')}
                         </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[10%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                      onClick={() => handleSort('status')}
                      data-testid={`${DATA_TEST_ID_PREFIX}-status-header`}
                    >
                                               <div className="gba:flex gba:items-center">
                           {getTranslationFromI18nKeyAndLabel('expense.plans.table.status', 'Status')}
                           {renderSortIcon('status')}
                         </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100 gba:text-right"
                      onClick={() => handleSort('reimbursableAmount')}
                      data-testid={`${DATA_TEST_ID_PREFIX}-reimbursable-amount-header`}
                    >
                                               <div className="gba:flex gba:items-center gba:justify-end">
                           {getTranslationFromI18nKeyAndLabel('expense.plans.table.reimbursableAmount', 'Reimbursable Amount')}
                           {renderSortIcon('reimbursableAmount')}
                         </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100 gba:text-right"
                      onClick={() => handleSort('advancePaymentPaidAmount')}
                      data-testid={`${DATA_TEST_ID_PREFIX}-paid-advance-header`}
                    >
                                               <div className="gba:flex gba:items-center gba:justify-end">
                           {getTranslationFromI18nKeyAndLabel('expense.plans.table.paidAdvance', 'Paid Advance')}
                           {renderSortIcon('advancePaymentPaidAmount')}
                         </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!isLoading && (!sortedPlans || sortedPlans.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={9} className="gba:py-8 gba:text-center">
                                                 <div className="gba:text-gray-500">
                           {getTranslationFromI18nKeyAndLabel('expense.plans.table.noData', 'No expense plans found. Create your first expense plan to get started.')}
                         </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedPlans?.map((record) => (
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
                          <div className="gba:flex gba:justify-start gba:gap-2">
                            <AppActionButton
                              data-testid={`${DATA_TEST_ID_PREFIX}-update-expense-plan-button-${record.id}`}
                              variant="secondary"
                              staticFlowData={[
                                ...(record.status === 'CREATED' || record.status === 'REJECTED') ? [
                                                                     {
                                     category: 'Actions',
                                     key: 'update-plan',
                                     label: getTranslationFromI18nKeyAndLabel('expense.plans.actions.updatePlan', 'Update Plan'),
                                    onClick: () => {
                                      startProcess({
                                        domain: 'employee-expense',
                                        processName: 'changeExpensePlan',
                                        payload: {
                                          employeeId:  contextProps.userInfo?.employeeDetails?.employeeId,
                                          expensePlanId: record.id
                                        },
                                      });
                                    }
                                  }
                                ] : [],
                                ...((record.status === 'APPROVED' || record.status === 'CLOSED') && (record.employeeDocument && record.employeeDocument.file && record.employeeDocument.file.trim() !== '')) ? [
                                                                     {
                                     category: 'Actions',
                                     key: 'print',
                                     label: getTranslationFromI18nKeyAndLabel('expense.plans.actions.print', 'Print'),
                                    onClick: () => {
                                      handlePrintPlan(record);
                                    }
                                  }
                                ] : [],
                                ...(record.status === 'APPROVED') ? [
                                                                     {
                                     category: 'Actions',
                                     key: 'request-advance',
                                     label: getTranslationFromI18nKeyAndLabel('expense.plans.actions.requestAdvance', 'Request Advance Payment'),
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
                                     category: 'Actions',
                                     key: 'create-expense-request',
                                     label: getTranslationFromI18nKeyAndLabel('expense.plans.actions.createExpenseRequest', 'Create Expense Request'),
                                    onClick: () => {
                                      startProcess({
                                        domain: 'employee-expense',
                                        processName: 'changeExpenseRequest',
                                        payload: {
                                          employeeId:  contextProps.userInfo?.employeeDetails?.employeeId,
                                          expensePlanId: record.id
                                        },
                                      });
                                    }
                                  }
                                ] : [],
                                                                 {
                                   category: 'Navigations',
                                   key: 'view-plan-details',
                                   label: getTranslationFromI18nKeyAndLabel('expense.plans.navigation.viewPlanDetails', 'View Plan Details'),
                                  onClick: (e?: React.MouseEvent) => {
                                    e?.stopPropagation();
                                    handleViewExpensePlanDetails(record);
                                  },
                                },
                                ...(record.expenseRequest && (record.expenseRequest as unknown as any[]).length > 0 && (record.expenseRequest as unknown as any[])[0].id !== null) ? [
                                                                     {
                                     category: 'Navigations',
                                     key: 'view-request-details',
                                     label: getTranslationFromI18nKeyAndLabel('expense.plans.navigation.viewRequestDetails', 'View Request Details'),
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
                              deferMainContextRequestsUntilClick
                              onClick={(e) => e.stopPropagation()}
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
                            {record.advancePaymentPaidAmount ? 
                              `${formatNumberFunction(String(record.advancePaymentPaidAmount))} ${record.currency?.code || 'EUR'}` : 
                              '0.00 EUR'
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
                                     {getTranslationFromI18nKeyAndLabel('expense.plans.pagination.showing', 'Showing')} {`${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, totalCount)}`} {getTranslationFromI18nKeyAndLabel('expense.plans.pagination.of', 'of')} {totalCount} {getTranslationFromI18nKeyAndLabel('expense.plans.pagination.expensePlans', 'expense plans')}
                </div>
                <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
                  <div className="gba:flex gba:items-center gba:space-x-2">
                    <p className="gba:text-sm gba:font-medium">{getTranslationFromI18nKeyAndLabel('expense.plans.pagination.rowsPerPage', 'Rows per page')}</p>
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
                  {`${totalCount} expense plans`}
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
  }, [sortedPlans, isLoading, selectedItem, handleSelectItem, contextProps.accessToken, totalCount, pageSize, currentPage, handlePaginationChange]);

  return (
    <div>
      <DataContainer
        dataControllerProps={{
          search: props.search,
          setSearch: props.onSearchChange,
          filter: props.selectedFilters,
          setFilter: props.setFilters,
          filterLabelMap: props.filterLabelMap,
          addButton: {
            onClick: handleAddExpensePlan,
            label: 'Add',
            'data-testid': 'add-expense-plan-button',
          },
          listTitle: 'My Expense Plans',
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
              {selectedItem?.title || 'Expense Plan Details'}
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
              {selectedExpenseRequest?.title || 'Expense Request Details'}
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

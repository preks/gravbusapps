import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Avatar, 
  AvatarImage, 
  AvatarFallback, 
  Button, 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell, 
  Spinner
} from '@newwork/nw-design-system';
import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import Pill from '@/components/pill/Pill';
import { useMainViewExpensePlans, ExpensePlan, SortField } from '../../../hooks/useMainViewExpensePlans';
import { getExpensePlanStatusDisplay, ExpenseStatus } from '../../../utils';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { formatCurrency } from '../../../utils/currencyUtils';
import { useCurrencyStore } from '../../../store/useCurrencyStore';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { startProcess } from '@/common/utils/start-process';

interface ExpensePlansTableProps extends BusinessAppContextProps {
  search?: string;
  onSearchChange?: (search: string) => void;
  employeeId?: string;
  activeFilter?: ExpenseStatus[] | null;
  onFilterChange?: (filter: ExpenseStatus[] | null) => void;
  onClearFilters?: () => void;
  onViewDetails?: (plan: ExpensePlan) => void;
  currencyFilter?: string | null;
}

const DATA_TEST_ID_PREFIX = 'ExpensePlansTable';

const ExpensePlansTable: React.FC<ExpensePlansTableProps> = (props) => {
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
    userInfo: props.userInfo
  }), [props.accessToken, props.userInfo]);

  // Use parent's filter state directly
  const currentStatusFilter = props.activeFilter || [];
  
  // Use the currency store for consistent currency handling
  const { primaryCurrency } = useCurrencyStore();
  const currentCurrencyFilter = primaryCurrency || null;
  
  // Set up local state
  const [pageSize, setPageSize] = useState<number>(10);

  // Get expense plans data and functions
  const {
    plans: expensePlans,
    loading,
    error,
    totalCount,
    currentPage,
    setCurrentPage,
    sorting,
    updateSorting
  } = useMainViewExpensePlans({
    ...contextProps,
    pageSize,
    searchTerm: props.search || '',
    currentStatusFilter: currentStatusFilter,
    currentCurrencyFilter: currentCurrencyFilter,
  });

  // Reset page to 1 when filter changes (fixes pagination issue when switching filters)
  const prevFilterRef = useRef<ExpenseStatus[] | null>(null);
  useEffect(() => {
    const currentFilterStr = JSON.stringify(currentStatusFilter);
    const prevFilterStr = JSON.stringify(prevFilterRef.current);
    
    // Only reset page if filter actually changed (not on initial render)
    if (prevFilterRef.current !== null && currentFilterStr !== prevFilterStr) {
      setCurrentPage(1);
    }
    
    // Update the ref with current filter
    prevFilterRef.current = currentStatusFilter;
  }, [currentStatusFilter, setCurrentPage]);

  // Handle viewing details for a plan
  const handleViewDetails = useCallback((plan: ExpensePlan) => {
    if (props.onViewDetails) {
      props.onViewDetails(plan);
    }
  }, [props.onViewDetails]);

  // Pagination handlers - used directly in the component
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, [setCurrentPage]);
  
  // Sorting handler
  const handleSort = useCallback((field: SortField) => {
    updateSorting(field);
  }, [updateSorting]);

  // Render sort indicator
  const renderSortIndicator = useCallback((field: SortField) => {
    if (sorting.field === field) {
      return sorting.order === 'ASC' ? 
        <ArrowUpOutlined className="gba:ml-1 gba:text-blue-500" /> : 
        <ArrowDownOutlined className="gba:ml-1 gba:text-blue-500" />;
    }
    return null;
  }, [sorting]);

  // Handle page size changes in the pagination controls
  const handlePageSizeChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const size = parseInt(event.target.value, 10);
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
  }, [setPageSize, setCurrentPage]);

  // Show error state
  if (error) {
    return (
      <div 
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center"
        data-testid={`${DATA_TEST_ID_PREFIX}-error-state`}
      >
        <div className="gba:text-gray-600 gba:mb-4">
          {error.message}
        </div>
        <Button
          variant="default"
          onClick={() => window.location.reload()}
          data-testid={`${DATA_TEST_ID_PREFIX}-retry-button`}
        >
          Retry
        </Button>
      </div>
    );
  }

  // Show loading state
  if (loading && !expensePlans.length) {
    return (
      <div className="gba:flex gba:justify-center gba:p-8" data-testid="expense-plans-loading">
        <Spinner />
      </div>
    );
  }

  // Show empty state
  if (!expensePlans || expensePlans.length === 0) {
    return (
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center">
        <div className="gba:text-gray-500 gba:text-lg gba:font-medium gba:mb-2">
          No expense plans found
        </div>
        <div className="gba:text-gray-400 gba:mb-4">
          No expense plans match your current criteria.
        </div>
      </div>
    );
  }

  return (
    <div data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      {/* Table with border containing both table and pagination */}
      <div className="gba:border gba:border-gray-200 gba:rounded-md gba:shadow-sm">
        {/* Table with horizontal scrolling */}
        <div className="gba:overflow-x-auto">
          <Table data-testid={`${DATA_TEST_ID_PREFIX}-table`}>
          <TableHeader>
            <TableRow>
              <TableHead className="gba:w-[8%]" data-testid={`${DATA_TEST_ID_PREFIX}-actions-header`}></TableHead>
              <TableHead 
                className="gba:w-[25%] gba:cursor-pointer gba:select-none" 
                onClick={() => handleSort('title')}
                data-testid={`${DATA_TEST_ID_PREFIX}-title-header`}
              >
                <div className="gba:flex gba:items-center">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:backoffice_expense_landing_page.plan_info_pl', 'Plans')}
                  {renderSortIndicator('title')}
                </div>
              </TableHead>
              <TableHead 
                className="gba:w-[15%] gba:cursor-pointer gba:select-none" 
                onClick={() => handleSort('startDate')}
                data-testid={`${DATA_TEST_ID_PREFIX}-start-date-header`}
              >
                <div className="gba:flex gba:items-center">
                  Start Date
                  {renderSortIndicator('startDate')}
                </div>
              </TableHead>
              <TableHead 
                className="gba:w-[15%] gba:cursor-pointer gba:select-none" 
                onClick={() => handleSort('endDate')}
                data-testid={`${DATA_TEST_ID_PREFIX}-end-date-header`}
              >
                <div className="gba:flex gba:items-center">
                  End Date
                  {renderSortIndicator('endDate')}
                </div>
              </TableHead>
              <TableHead 
                className="gba:w-[20%] gba:cursor-pointer gba:select-none" 
                onClick={() => handleSort('employee.fullName')}
                data-testid={`${DATA_TEST_ID_PREFIX}-employee-header`}
              >
                <div className="gba:flex gba:items-center">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.employee', 'Employee')}
                  {renderSortIndicator('employee.fullName')}
                </div>
              </TableHead>
              <TableHead 
                className="gba:w-[15%] gba:cursor-pointer gba:select-none" 
                onClick={() => handleSort('createdAt')}
                data-testid={`${DATA_TEST_ID_PREFIX}-creation-date-header`}
              >
                <div className="gba:flex gba:items-center">
                  Creation Date
                  {renderSortIndicator('createdAt')}
                </div>
              </TableHead>
              <TableHead 
                className="gba:w-[18%] gba:text-right gba:cursor-pointer gba:select-none" 
                onClick={() => handleSort('totalAmount')}
                data-testid={`${DATA_TEST_ID_PREFIX}-amount-header`}
              >
                <div className="gba:flex gba:items-center gba:justify-end">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:sales_hub.amount', 'Amount')}
                  {renderSortIndicator('totalAmount')}
                </div>
              </TableHead>
              <TableHead 
                className="gba:w-[18%] gba:cursor-pointer gba:select-none" 
                onClick={() => handleSort('status')}
                data-testid={`${DATA_TEST_ID_PREFIX}-status-header`}
              >
                <div className="gba:flex gba:items-center">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status')}
                  {renderSortIndicator('status')}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expensePlans.map((plan: ExpensePlan) => {
              const display = getExpensePlanStatusDisplay(plan.status as ExpenseStatus);
              return (
                <TableRow 
                  key={plan.id} 
                  data-testid={`${DATA_TEST_ID_PREFIX}-row-${plan.id}`}
                  className="gba:cursor-pointer gba:hover:bg-gray-50"
                  onClick={() => handleViewDetails(plan)}
                >
                  <TableCell data-testid={`${DATA_TEST_ID_PREFIX}-actions-cell-${plan.id}`}>
                    <div className="gba:flex gba:justify-start gba:gap-2">
                      <AppActionButton
                        data-testid={`${DATA_TEST_ID_PREFIX}-update-plan-button-${plan.id}`}
                        variant="secondary"
                        staticFlowData={[
                          ...(plan.status === 'CREATED' || plan.status === 'REJECTED') ? [
                            {
                              category: 'Actions',
                              key: 'update-expense-plan',
                              label: 'Update Expense Plan',
                              onClick: () => {
                                startProcess({
                                  domain: 'employee-expense',
                                  processName: 'changeExpensePlan',
                                  payload: {
                                    employeeId: contextProps.userInfo?.employeeDetails?.employeeId,
                                    expensePlanId: plan.id
                                  },
                                  builderType: 'NATIVE_SCREEN'
                                });
                              }
                            }
                          ] : [],
                          ...(plan.status === 'APPROVED' || plan.status === 'CLOSED') ? [
                            {
                              category: 'Actions',
                              key: 'print-expense-plan',
                              label: 'Print',
                              onClick: () => {
                                // TODO: Implement print functionality
                                console.log('Print expense plan:', plan.id);
                              }
                            }
                          ] : [],
                          ...(plan.status === 'CREATED' || plan.status === 'CLOSED') ? [
                            {
                              category: 'Actions',
                              key: 'request-advance-payment',
                              label: 'Request Advance Payment',
                              onClick: () => {
                                startProcess({
                                  domain: 'employee-expense',
                                  processName: 'changeAdvancePayment',
                                  payload: {
                                    employeeId: contextProps.userInfo?.employeeDetails?.employeeId,
                                    expensePlan: plan.id
                                  },
                                  builderType: 'NATIVE_SCREEN'
                                });
                              }
                            }
                          ] : [],
                          ...(plan.status === 'APPROVED') ? [
                            {
                              category: 'Actions',
                              key: 'create-expense-request',
                              label: 'Create Expense Request',
                              onClick: () => {
                                startProcess({
                                  domain: 'employee-expense',
                                  processName: 'changeExpenseRequest',
                                  payload: {
                                    employeeId: contextProps.userInfo?.employeeDetails?.employeeId,
                                    expensePlanId: plan.id
                                  },
                                  builderType: 'NATIVE_SCREEN'
                                });
                              }
                            }
                          ] : [],
                          {
                            category: 'Navigations',
                            key: 'view-expense-plan-details',
                            label: 'View Plan Details',
                            onClick: (e?: React.MouseEvent) => {
                              e?.stopPropagation();
                              handleViewDetails(plan);
                            },
                          },
                        ]}
                        prefixDataTestId={`${DATA_TEST_ID_PREFIX}-update-plan`}
                        accessToken={contextProps.accessToken}
                        emptyStateBehavior="disable"
                        deferMainContextRequestsUntilClick
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="gba:text-left">
                    <div className="gba:font-medium gba:text-sm">{plan.title}</div>
                    <div className="gba:text-xs gba:text-gray-500">{plan.code}</div>
                  </TableCell>
                  <TableCell className="gba:text-sm">
                    {plan.startDate ? (() => {
                      try {
                        const date = new Date(plan.startDate);
                        return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
                      } catch (error) {
                        return 'N/A';
                      }
                    })() : 'N/A'}
                  </TableCell>
                  <TableCell className="gba:text-sm">
                    {plan.endDate ? (() => {
                      try {
                        const date = new Date(plan.endDate);
                        return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
                      } catch (error) {
                        return 'N/A';
                      }
                    })() : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Avatar className="gba:h-6 gba:w-6">
                        <AvatarImage 
                          src={plan.employee?.pictureThumbnail ? `data:image/gif;base64,${plan.employee.pictureThumbnail}` : undefined} 
                          alt={plan.employee?.fullName} 
                        />
                        <AvatarFallback>
                          {plan.employee?.displayName?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="gba:font-medium gba:text-sm">{plan.employee?.displayName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="gba:text-sm">
                    {plan.createdAt ? (() => {
                      try {
                        const date = new Date(plan.createdAt);
                        return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
                      } catch (error) {
                        return 'N/A';
                      }
                    })() : 'N/A'}
                  </TableCell>
                  <TableCell className="gba:text-right">
                    <span className="gba:font-medium gba:text-sm">
                      {typeof plan.totalAmount === 'number' ? formatCurrency(plan.totalAmount, currentCurrencyFilter || plan.currency || 'EUR') : 'N/A'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Pill type={display.type as any} label={display.label} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </div>

        {/* Pagination - Always show when there are records */}
        {totalCount > 0 && (
        <div className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-4 gba:border-t gba:border-gray-200" data-testid={`${DATA_TEST_ID_PREFIX}-pagination`}>
          <div className="gba:text-sm gba:text-gray-600" data-testid={`${DATA_TEST_ID_PREFIX}-pagination-info`}>
            {`${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, totalCount)} of ${totalCount} expense plans`}
          </div>
          <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
            <div className="gba:flex gba:items-center gba:space-x-2">
              <p className="gba:text-sm gba:font-medium">Rows per page</p>
              <select
                className="gba:h-8 gba:rounded-md gba:border gba:border-gray-300 gba:bg-white gba:px-2 gba:text-sm"
                value={pageSize}
                onChange={handlePageSizeChange}
                data-testid={`${DATA_TEST_ID_PREFIX}-page-size-select`}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium" data-testid={`${DATA_TEST_ID_PREFIX}-page-info`}>
              Page {currentPage} of {Math.ceil(totalCount / pageSize)}
            </div>
            <div className="gba:flex gba:items-center gba:space-x-2">
              <Button
                variant="outline"
                className="gba:h-8 gba:w-8 gba:p-0"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                data-testid={`${DATA_TEST_ID_PREFIX}-first-page-button`}
              >
                <span className="gba:sr-only">Go to first page</span>
                ⟪⟪
              </Button>
              <Button
                variant="outline"
                className="gba:h-8 gba:w-8 gba:p-0"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                data-testid={`${DATA_TEST_ID_PREFIX}-previous-page-button`}
              >
                <span className="gba:sr-only">Go to previous page</span>
                ⟪
              </Button>
              <Button
                variant="outline"
                className="gba:h-8 gba:w-8 gba:p-0"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                data-testid={`${DATA_TEST_ID_PREFIX}-next-page-button`}
              >
                <span className="gba:sr-only">Go to next page</span>
                ⟫
              </Button>
              <Button
                variant="outline"
                className="gba:h-8 gba:w-8 gba:p-0"
                onClick={() => handlePageChange(Math.ceil(totalCount / pageSize))}
                disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                data-testid={`${DATA_TEST_ID_PREFIX}-last-page-button`}
              >
                <span className="gba:sr-only">Go to last page</span>
                ⟫⟫
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default React.memo(ExpensePlansTable);

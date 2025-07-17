import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Badge, 
  Avatar, 
  AvatarImage, 
  AvatarFallback, 
  Button, 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger, 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell, 
  Spinner,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Input,
  Label
} from '@newwork/nw-design-system';
import { PiCheck, PiX, PiFileText, PiCaretUp, PiCaretDown } from 'react-icons/pi';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import Pill from '@/components/pill/Pill';
import ExpensePlanDetails from './ExpensePlanDetails';
import { useMainViewExpensePlans, ExpensePlan } from '../../../hooks/useMainViewExpensePlans';

import { getExpensePlanStatusDisplay, ExpenseStatus } from '../../../utils';
import { formatDate, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { formatAmount, formatCurrency } from '../../../utils/currencyUtils';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';

interface ExpensePlansTableProps extends BusinessAppContextProps {
  search?: string;
  onSearchChange?: (search: string) => void;
  employeeId?: string;
  activeFilter?: ExpenseStatus[] | null;
  onFilterChange?: (filter: ExpenseStatus[] | null) => void;
  onClearFilters?: () => void;
  onViewDetails?: (plan: ExpensePlan) => void;
}

const DATA_TEST_ID_PREFIX = 'ExpensePlansTable';

const ExpensePlansTable: React.FC<ExpensePlansTableProps> = (props) => {
  const { search } = props;
  
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = React.useMemo(() => ({
    accessToken: props.accessToken,
    userInfo: props.userInfo
  }), [props.accessToken, props.userInfo]);
  
  // Local search state only - parent controls filters
  const [searchTerm, setSearchTerm] = useState<string>(props.search || '');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>(searchTerm);
  
  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Sync search from parent
  useEffect(() => {
    if (props.search !== undefined) {
      setSearchTerm(props.search);
    }
  }, [props.search]);

    // Use parent's filter state directly
  const currentStatusFilter = props.activeFilter || [];
  

   
  // Handle clearing all filters
  const handleClearFilters = useCallback(() => {
    
    // Reset search term
    setSearchTerm('');
    if (props.onSearchChange) {
      props.onSearchChange('');
    }
    
    // Reset status filter 
    if (props.onFilterChange) {
      props.onFilterChange(null);
    }
    
    // If parent provided a clear all function, use it
    if (props.onClearFilters) {
      props.onClearFilters();
    }
  }, [props.onSearchChange, props.onFilterChange, props.onClearFilters]);


  
  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return searchTerm || (currentStatusFilter && currentStatusFilter.length > 0);
  }, [searchTerm, currentStatusFilter]);

  // Set up local state
  const [pageSize, setPageSize] = useState<number>(10);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [approvalComments, setApprovalComments] = useState<string>('');
  const [isRejectModalVisible, setIsRejectModalVisible] = useState<boolean>(false);
  const [isApproveModalVisible, setIsApproveModalVisible] = useState<boolean>(false);
  const [currentActionPlanId, setCurrentActionPlanId] = useState<string>('');



  // Get expense plans data and functions - only log when activeFilter actually changes
  const filterChanged = JSON.stringify(props.activeFilter) !== JSON.stringify(currentStatusFilter);
  if (filterChanged) {
    console.log('🔥 Filter changed in table:', { from: currentStatusFilter, to: props.activeFilter });
  }
  
  const {
    plans,
    loading: isLoading,
    error,
    totalCount,
    currentPage,
    setCurrentPage,
    approving,
    rejecting,
    approvePlan,
    rejectPlan,
  } = useMainViewExpensePlans({
    ...contextProps,
    pageSize,
    searchTerm: debouncedSearchTerm,
    currentStatusFilter: currentStatusFilter,
  });

  // Reset page to 1 when filter changes (fixes pagination issue when switching filters)
  useEffect(() => {
    setCurrentPage(1);
  }, [currentStatusFilter, setCurrentPage]);

  // Notify parent of search changes if callback exists
  const onSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    if (props.onSearchChange) {
      props.onSearchChange(value);
    }
  }, [props]);

  // Handle viewing details for a plan
  const handleViewDetails = useCallback((plan: ExpensePlan) => {
    if (props.onViewDetails) {
      props.onViewDetails(plan);
    }
  }, [props.onViewDetails]);

  // Handle filter changes and notify parent
  const handleDataFilterChange = useCallback((filterId: string, isSelected: boolean) => {
    
    // Reset to first page when filters change
    setCurrentPage(1);
    
    if (props.onFilterChange) {
      let newFilter: ExpenseStatus[] | null = null;
      
      if (isSelected) {
        // Add the status to the current filter array
        const currentFilters = currentStatusFilter || [];
        newFilter = [...currentFilters, filterId as ExpenseStatus];
      } else {
        // Remove the status from the current filter array
        const currentFilters = currentStatusFilter || [];
        newFilter = currentFilters.filter(status => status !== filterId);
        if (newFilter.length === 0) {
          newFilter = null;
        }
      }
      
      props.onFilterChange(newFilter);
    }
  }, [currentStatusFilter]);





  // Modal management for approve/reject
  const showApproveModal = useCallback((planId: string) => {
    setCurrentActionPlanId(planId);
    setIsApproveModalVisible(true);
  }, []);

  const showRejectModal = useCallback((planId: string) => {
    setCurrentActionPlanId(planId);
    setIsRejectModalVisible(true);
  }, []);

  const handleApproveConfirm = useCallback(async () => {
    await approvePlan(currentActionPlanId, approvalComments);
    setIsApproveModalVisible(false);
    setApprovalComments('');
    setCurrentActionPlanId('');
  }, [approvePlan, currentActionPlanId, approvalComments]);

  const handleRejectConfirm = useCallback(async () => {
    if (!rejectReason.trim()) {
      return;
    }
    await rejectPlan(currentActionPlanId, rejectReason);
    setIsRejectModalVisible(false);
    setRejectReason('');
    setCurrentActionPlanId('');
  }, [rejectPlan, currentActionPlanId, rejectReason]);

  const handleApprovePlan = useCallback((planId: string) => {
      showApproveModal(planId);
  }, [showApproveModal]);

  const handleRejectPlan = useCallback((planId: string) => {
    showRejectModal(planId);
  }, [showRejectModal]);

  // Handle pagination changes
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, [setCurrentPage]);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  }, []);

  // Show error state
  if (error) {
        return (
      <div 
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center"
        data-testid={`${DATA_TEST_ID_PREFIX}-error-state`}
      >
        <div className="gba:text-red-500 gba:text-lg gba:font-medium gba:mb-2">
          Error Loading Expense Plans
        </div>
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
  if (isLoading && !plans.length) {
        return (
      <div className="gba:flex gba:justify-center gba:p-8">
        <Spinner />
      </div>
    );
  }

  // Show empty state
  if (!plans || plans.length === 0) {
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
      {/* Table */}
      <div className="gba:overflow-x-auto">
        <Table data-testid={`${DATA_TEST_ID_PREFIX}-table`}>
          <TableHeader>
            <TableRow>
              <TableHead className="gba:w-[60px]"></TableHead>
              <TableHead className="gba:w-[200px]">
                {getTranslationFromI18nKeyAndLabel('lowcoder:backoffice_expense_landing_page.plan_info_pl', 'Plans')}
              </TableHead>
              <TableHead className="gba:w-[120px]">
                Start Date
              </TableHead>
              <TableHead className="gba:w-[120px]">
                End Date
              </TableHead>
              <TableHead className="gba:w-[200px]">
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.employee', 'Employee')}
              </TableHead>
              <TableHead className="gba:w-[120px]">
                Creation Date
              </TableHead>
              <TableHead className="gba:w-[150px] gba:text-right">
                {getTranslationFromI18nKeyAndLabel('lowcoder:sales_hub.amount', 'Amount')}
              </TableHead>
              <TableHead className="gba:w-[150px]">
                {getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status')}
              </TableHead>

            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => {
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
                        contextsArray={[FlowContextName.leadEntity]}
                        externalContextData={{
                          planId: plan.id
                        }}
                        prefixDataTestId={`${DATA_TEST_ID_PREFIX}-update-plan`}
                        accessToken={props.accessToken}
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
                      {typeof plan.totalAmount === 'number' ? formatCurrency(plan.totalAmount, plan.currency || 'EUR') : 'N/A'}
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

      {/* Pagination */}
      {totalCount > pageSize && (
        <div className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-4 gba:border-t gba:border-gray-200" data-testid={`${DATA_TEST_ID_PREFIX}-pagination`}>
          <div className="gba:text-sm gba:text-gray-600" data-testid={`${DATA_TEST_ID_PREFIX}-pagination-info`}>
            {`${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, totalCount)} of ${totalCount} expense plans`}
          </div>
          <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
            <div className="gba:flex gba:items-center gba:space-x-2">
              <p className="gba:text-sm gba:font-medium">Rows per page</p>
              <select
                value={pageSize}
                onChange={(e) => {
                  const newPageSize = Number(e.target.value);
                  setPageSize(newPageSize);
                  setCurrentPage(1);
                }}
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
              Page {currentPage} of {Math.ceil(totalCount / pageSize)}
            </div>
            <div className="gba:flex gba:items-center gba:space-x-2">
              <Button
                variant="outline"
                className="gba:h-8 gba:w-8 gba:p-0"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                data-testid={`${DATA_TEST_ID_PREFIX}-first-page-button`}
              >
                <span className="gba:sr-only">Go to first page</span>
                ⟨⟨
              </Button>
              <Button
                variant="outline"
                className="gba:h-8 gba:w-8 gba:p-0"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                data-testid={`${DATA_TEST_ID_PREFIX}-previous-page-button`}
              >
                <span className="gba:sr-only">Go to previous page</span>
                ⟨
              </Button>
              <Button
                variant="outline"
                className="gba:h-8 gba:w-8 gba:p-0"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                data-testid={`${DATA_TEST_ID_PREFIX}-next-page-button`}
              >
                <span className="gba:sr-only">Go to next page</span>
                ⟩
              </Button>
              <Button
                variant="outline"
                className="gba:h-8 gba:w-8 gba:p-0"
                onClick={() => setCurrentPage(Math.ceil(totalCount / pageSize))}
                disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                data-testid={`${DATA_TEST_ID_PREFIX}-last-page-button`}
              >
                <span className="gba:sr-only">Go to last page</span>
                ⟩⟩
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default React.memo(ExpensePlansTable);

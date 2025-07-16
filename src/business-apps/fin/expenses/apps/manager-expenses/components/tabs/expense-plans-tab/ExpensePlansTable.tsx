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
import { useExpensePlanFilters } from '../../../hooks/useExpensePlanFilters';
import { getExpensePlanStatusDisplay, ExpenseStatus } from '../../../utils';
import { formatDate, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { formatAmount } from '../../../utils/currencyUtils';

interface ExpensePlansTableProps extends BusinessAppContextProps {
  search?: string;
  onSearchChange?: (search: string) => void;
  employeeId?: string;
  activeFilter?: ExpenseStatus | null;
  onFilterChange?: (filter: ExpenseStatus | null) => void;
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
  
  // Use the expense plan filters hook for filter management
  const {
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
    statusFilter,
    setStatusFilter,
    filterGroups,
    handleDataFilterChange: originalHandleDataFilterChange,
    filterLabelMap,
  } = useExpensePlanFilters();

  // Sync activeFilter prop with statusFilter state on initial load
  useEffect(() => {
    if (props.activeFilter !== undefined && statusFilter === null) {
      console.log('Initial sync of statusFilter from props:', props.activeFilter);
      setStatusFilter(props.activeFilter);
    }
  }, [props.activeFilter]);

  // Only update statusFilter when it's different from the prop and not a direct user action
  const isFilterControlled = props.activeFilter !== undefined;
  const currentStatusFilter = isFilterControlled ? props.activeFilter : statusFilter;
  
  // Handle clearing all filters
  const handleClearFilters = useCallback(() => {
    console.log('Clearing all filters from table');
    
    // Reset search term
    setSearchTerm('');
    if (props.onSearchChange) {
      props.onSearchChange('');
    }
    
    // Reset status filter based on control mode
    if (isFilterControlled) {
      if (props.onFilterChange) {
        props.onFilterChange(null);
      }
    } else {
      setStatusFilter(null);
    }
    
    // Reset all filter states and ensure 'All Statuses' is checked
    if (originalHandleDataFilterChange) {
      // First clear all filters
      originalHandleDataFilterChange('all_statuses', false);
      // Then explicitly check 'All Statuses'
      setTimeout(() => {
        originalHandleDataFilterChange('all_statuses', true);
      }, 0);
    }
    
    // If parent provided a clear all function, use it
    if (props.onClearFilters) {
      props.onClearFilters();
    }
  }, [props.onSearchChange, props.onFilterChange, props.onClearFilters, originalHandleDataFilterChange, isFilterControlled]);

  // Handle filter changes and notify parent
  const handleDataFilterChange = useCallback((filterId: string, isSelected: boolean) => {
    const newFilter = isSelected ? filterId as ExpenseStatus : null;
    console.log('Filter changed:', { filterId, isSelected, newFilter });
    
    // Update local state if not controlled
    if (!isFilterControlled) {
      setStatusFilter(newFilter);
    }
    
    // Always notify parent
    if (props.onFilterChange) {
      props.onFilterChange(newFilter);
    }
    
    // Call original handler if it exists
    if (originalHandleDataFilterChange) {
      originalHandleDataFilterChange(filterId, isSelected);
    }
  }, [originalHandleDataFilterChange, props.onFilterChange, isFilterControlled]);
  
  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return searchTerm || currentStatusFilter !== null;
  }, [searchTerm, currentStatusFilter]);

  // Synchronize search from parent if provided
  useEffect(() => {
    if (search !== undefined) {
      setSearchTerm(search);
    }
  }, [search]);

  // Set up local state
  const [pageSize, setPageSize] = useState<number>(10);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [approvalComments, setApprovalComments] = useState<string>('');
  const [isRejectModalVisible, setIsRejectModalVisible] = useState<boolean>(false);
  const [isApproveModalVisible, setIsApproveModalVisible] = useState<boolean>(false);
  const [currentActionPlanId, setCurrentActionPlanId] = useState<string>('');

  // Get expense plans data and functions
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
    currentStatusFilter: statusFilter,
  });

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

  // Debug logging for approval and rejection actions
  useEffect(() => {
    if (approving || rejecting) {
      console.log('ExpensePlansTable - Action in progress:', { 
        approving, 
        rejecting, 
        currentActionPlanId 
      });
    }
  }, [approving, rejecting, currentActionPlanId]);



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
              <TableHead className="gba:w-[300px]">
                {getTranslationFromI18nKeyAndLabel('lowcoder:backoffice_expense_landing_page.plan_info_pl', 'Plans')}
              </TableHead>
              <TableHead className="gba:w-[200px]">
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.employee', 'Employee')}
              </TableHead>
              <TableHead className="gba:w-[150px] gba:text-right">
                {getTranslationFromI18nKeyAndLabel('lowcoder:sales_hub.amount', 'Amount')}
              </TableHead>
              <TableHead className="gba:w-[150px]">
                {getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status')}
              </TableHead>
              <TableHead className="gba:w-[120px] gba:text-right">Actions</TableHead>
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
                  <TableCell className="gba:text-left">
                    <div>
                      <div className="gba:font-medium gba:text-sm">{plan.title}</div>
                      {plan.startDate && plan.endDate && (
                        <div className="gba:text-xs gba:text-gray-500">
                          {new Date(plan.startDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })} - {new Date(plan.endDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })}
                        </div>
                      )}
                    </div>
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
                  <TableCell className="gba:text-right">
                    <span className="gba:font-medium gba:text-sm">
                      {typeof plan.totalAmount === 'number' ? `€${formatAmount(plan.totalAmount)}` : 'N/A'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Pill type={display.type as any} label={display.label} />
                  </TableCell>
                  <TableCell className="gba:text-right">
                    <div className="gba:flex gba:justify-end gba:gap-2">
                      {plan.status === ExpenseStatus.PENDING && (
                        <>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        showApproveModal(plan.id);
                                      }}
                                      disabled={approving && currentActionPlanId === plan.id}
                                      data-testid={`${DATA_TEST_ID_PREFIX}-approve-${plan.id}`}
                                    >
                                      <PiCheck className="gba:h-4 gba:w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Approve Expense Plan</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to approve this expense plan? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <div className="gba:space-y-4">
                                      <div>
                                        <Label htmlFor="approval-comments">Comments (optional)</Label>
                                        <Input
                                          id="approval-comments"
                                          placeholder="Add approval comments..."
                                          value={approvalComments}
                                          onChange={(e) => setApprovalComments(e.target.value)}
                                        />
                                      </div>
                                    </div>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={handleApproveConfirm}>
                                        Approve
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Approve Plan</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        showRejectModal(plan.id);
                                      }}
                                      disabled={rejecting && currentActionPlanId === plan.id}
                                      data-testid={`${DATA_TEST_ID_PREFIX}-reject-${plan.id}`}
                                    >
                                      <PiX className="gba:h-4 gba:w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Reject Expense Plan</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Please provide a reason for rejecting this expense plan.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <div className="gba:space-y-4">
                                      <div>
                                        <Label htmlFor="reject-reason">Reason *</Label>
                                        <Input
                                          id="reject-reason"
                                          placeholder="Enter rejection reason..."
                                          value={rejectReason}
                                          onChange={(e) => setRejectReason(e.target.value)}
                                          required
                                        />
                                      </div>
                                    </div>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={handleRejectConfirm}
                                        disabled={!rejectReason.trim()}
                                      >
                                        Reject
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Reject Plan</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalCount > pageSize && (
        <div className="gba:flex gba:items-center gba:justify-between gba:mt-4">
          <div className="gba:text-sm gba:text-gray-500">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} items
          </div>
          <div className="gba:flex gba:items-center gba:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="gba:text-sm gba:px-2">
              Page {currentPage} of {Math.ceil(totalCount / pageSize)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= Math.ceil(totalCount / pageSize)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensePlansTable;

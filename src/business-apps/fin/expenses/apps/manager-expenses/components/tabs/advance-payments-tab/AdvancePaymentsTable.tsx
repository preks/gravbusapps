import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead, Button, Avatar, AvatarImage, AvatarFallback, Tooltip, TooltipTrigger, TooltipContent, Alert } from '@newwork/nw-design-system';
import { PiCheck, PiX } from 'react-icons/pi';
import type { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import Pill from '@/components/pill/Pill';
import AdvancePaymentDetails from './AdvancePaymentDetails';
import { useMainViewAdvancePayments, type AdvancePayment as AdvancePaymentItem } from '../../../hooks/useMainViewAdvancePayments';
import { getAdvancePaymentStatusDisplay } from '../../../utils';
import { formatDate, formatNumberFunction, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useAdvancePaymentFilters } from '../../../hooks/useAdvancePaymentFilters';



interface AdvancePaymentsTableProps extends BusinessAppContextProps {}

const AdvancePaymentsTable: React.FC<AdvancePaymentsTableProps> = (props) => {
  
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = React.useMemo(() => ({
    accessToken: props.accessToken,
    userInfo: props.userInfo
  }), [props.accessToken, props.userInfo]);
  
  // Use the advance payment filters hook for filter management
  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    filterGroups,
    handleDataFilterChange,
    filterLabelMap,
  } = useAdvancePaymentFilters();

  // Local state management
  const [selectedPayment, setSelectedPayment] = useState<AdvancePaymentItem | null>(null);
  const [currentActionPlanId, setCurrentActionPlanId] = useState<string>('');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);



  // Use the new main view hook for advance payments
  const {
    payments,
    loading: isLoading,
    error,
    totalCount,
    approving,
    rejecting,
    approvePayment,
    rejectPayment,
  } = useMainViewAdvancePayments({
    ...contextProps,
    pageSize,
    searchTerm: searchTerm,
    currentStatusFilter: statusFilter || undefined,
  });
  
  // Filter payments based on search and status (already handled by the hook)
  const filteredPayments = useMemo(() => payments, [payments]);

  // Handle table pagination and sorting changes
  const handleTableChange = useCallback((pagination: any) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
  }, []);

  const handleApprovePayment = useCallback(async (paymentId: string) => {
    setCurrentActionPlanId(paymentId);
    try {
      await approvePayment(paymentId, 'Approved');
    } finally {
      setCurrentActionPlanId('');
    }
  }, [approvePayment]);

  const handleRejectPayment = useCallback(async (paymentId: string) => {
    setCurrentActionPlanId(paymentId);
    try {
      await rejectPayment(paymentId, 'Rejected');
    } finally {
      setCurrentActionPlanId('');
    }
  }, [rejectPayment]);



  // Render the table
  const renderDataBody = useCallback(() => {
    if (error) {
      return (
        <Alert variant="destructive">
          <div className="gba:font-medium">Error loading advance payments</div>
          <div className="gba:text-sm">{error.message || 'An error occurred while loading advance payments.'}</div>
        </Alert>
      );
    }

    if (!isLoading && filteredPayments.length === 0) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:h-64">
          <span className="gba:text-gray-500">No advance payments found.</span>
        </div>
      );
    }

    return (
      <Table data-testid="advance-payments-table">
        <TableHeader>
          <TableRow>
            <TableHead className="gba:w-[300px]">
              Related Expense Plan
            </TableHead>
            <TableHead className="gba:w-[200px]">
              Employee
            </TableHead>
            <TableHead className="gba:w-[150px] gba:text-right">
              Amount
            </TableHead>
            <TableHead className="gba:w-[150px]">
              Status
            </TableHead>
            <TableHead className="gba:w-[120px] gba:text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredPayments.map((record) => (
            <TableRow 
              key={record.id}
              className="gba:cursor-pointer gba:hover:bg-gray-50"
              onClick={() => setSelectedPayment(record)}
            >
              <TableCell className="gba:text-left">
                <div>
                  <div className="gba:font-medium gba:text-sm">{record.expensePlan?.title ?? 'N/A'}</div>
                  {record.expensePlan?.startDate && record.expensePlan?.endDate && (
                    <div className="gba:text-xs gba:text-gray-500">
                      {new Date(record.expensePlan.startDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })} - {new Date(record.expensePlan.endDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Avatar className="gba:h-6 gba:w-6">
                    <AvatarImage 
                      src={record.expensePlan?.employee?.pictureThumbnail ? `data:image/gif;base64,${record.expensePlan.employee.pictureThumbnail}` : undefined} 
                      alt={record.expensePlan?.employee?.fullName} 
                    />
                    <AvatarFallback>
                      {record.expensePlan?.employee?.displayName?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="gba:font-medium gba:text-sm">{record.expensePlan?.employee?.displayName ?? record.expensePlan?.employee?.fullName ?? 'N/A'}</span>
                </div>
              </TableCell>
              <TableCell className="gba:text-right">
                <span className="gba:font-medium gba:text-sm">
                  {typeof record.amount === 'number' ? `€${formatNumberFunction(record.amount.toString())}` : 'N/A'}
                </span>
              </TableCell>
              <TableCell>
                <Pill label={getAdvancePaymentStatusDisplay(record.status).label} type={getAdvancePaymentStatusDisplay(record.status).type as any} data-testid={`status-pill-${record.status.toLowerCase()}`} />
              </TableCell>
              <TableCell className="gba:text-right">
                <div className="gba:flex gba:gap-2 gba:justify-end">
                  {record.status?.toUpperCase() === 'PENDING' && (
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentActionPlanId(record.id);
                              approvePayment(record.id, "");
                              setSelectedPayment(null);
                            }}
                            disabled={approving && record.id === currentActionPlanId}
                            data-testid={`approve-payment-button-${record.id}`}
                          >
                            <PiCheck className="gba:h-4 gba:w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Approve Payment</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentActionPlanId(record.id);
                              rejectPayment(record.id, "Rejected by manager");
                              setSelectedPayment(null);
                            }}
                            disabled={rejecting && record.id === currentActionPlanId}
                            data-testid={`reject-payment-button-${record.id}`}
                          >
                            <PiX className="gba:h-4 gba:w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Reject Payment</TooltipContent>
                      </Tooltip>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }, [error, isLoading, filteredPayments, approvePayment, rejectPayment, approving, rejecting, currentActionPlanId]);

  return (
    <div className="gba:h-full gba:flex gba:flex-col">
      <DataContainer
        contentBackground="white"
        floatingDetails={true}
        dataControllerProps={{
          search: searchTerm,
          setSearch: setSearchTerm,
          debounceDelay: 300,
          filter: statusFilter ? [statusFilter] : [],
          setFilter: (newFilters: string[]) => {
            setStatusFilter(newFilters.length > 0 ? newFilters[0] : null);
          },
          filterLabelMap: filterLabelMap,
          listTitle: (
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span>{getTranslationFromI18nKeyAndLabel('lowcoder:backoffice_expense_landing_page.advance_title', 'Advance Payments')}</span>
                <span className="gba:text-gray-500">({totalCount})</span>
              </div>
            </div>
          ),
        }}
        dataFilterProps={{
          filterGroups: filterGroups,
          onFilterChange: handleDataFilterChange,
        }}
        hideFilter={false}
        dataBody={renderDataBody()}
        dataDetails={selectedPayment ? {
          title: 'Advance Payment Details',
          content: (
            <AdvancePaymentDetails
              payment={selectedPayment} 
              onApprove={handleApprovePayment}
              onReject={handleRejectPayment}
              {...contextProps} 
            />
          ),
          onClose: () => setSelectedPayment(null),
        } : undefined}
        data-testid="advance-payments-container"
      />
    </div>
  );
};

export default AdvancePaymentsTable;

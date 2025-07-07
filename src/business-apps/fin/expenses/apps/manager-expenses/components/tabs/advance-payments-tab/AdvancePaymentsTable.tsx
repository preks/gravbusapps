import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Typography, Alert, Space, Button, Tooltip } from 'antd';

import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { DataTable, Avatar } from '@newwork/gravity-ui-catalog';
import type { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import Pill from '@/components/pill/Pill';
import AdvancePaymentDetails from './AdvancePaymentDetails';
import { useMainViewAdvancePayments, type AdvancePayment as AdvancePaymentItem } from '../../../hooks/useMainViewAdvancePayments';
import { getAdvancePaymentStatusDisplay } from '../../../utils';
import { formatDate, formatNumberFunction, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { formatAmount } from '../../../utils/currencyUtils';
import { useAdvancePaymentFilters } from '../../../hooks/useAdvancePaymentFilters';

const { Text } = Typography;

interface AdvancePaymentsTableProps extends BusinessAppContextProps {
  search?: string;
}

const AdvancePaymentsTable: React.FC<AdvancePaymentsTableProps> = (props) => {
  const { search } = props;
  
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = React.useMemo(() => ({
    accessToken: props.accessToken,
    userInfo: props.userInfo
  }), [props.accessToken, props.userInfo]);
  
  // Use the advance payment filters hook for filter management
  const {
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
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

  // Sync with parent search prop if provided
  useEffect(() => {
    if (search !== undefined && search !== searchTerm) {
      setSearchTerm(search);
    }
  }, [search, searchTerm, setSearchTerm]);

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
    searchTerm: debouncedSearchTerm || '',
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

  const columns = [
    {
      title: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.advance_payments_tab.related_expense_plan', 'Related Expense Plan'),
      dataIndex: 'title',
      key: 'title',
      render: (_: string, record: AdvancePaymentItem) => (
        <div>
          <Text strong>{record.expensePlan?.title ?? 'N/A'}</Text>
          {record.expensePlan?.startDate && record.expensePlan?.endDate && (
            <div style={{ fontSize: '12px', color: '#888' }}>
              {formatDate(record.expensePlan.startDate, 'date.short')} - {formatDate(record.expensePlan.endDate, 'date.short')}
            </div>
          )}
        </div>
      )
    },
    {
      title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_config_calculation_rule_list.expense_table.employee', 'Employee'),
      dataIndex: 'employeeDisplayName',
      key: 'employeeDisplayName',
      render: (_text: any, record: AdvancePaymentItem) => (
        <Space>
          <Avatar src={record.expensePlan?.employee?.pictureThumbnail ? `data:image/gif;base64,${record.expensePlan.employee.pictureThumbnail}` : undefined} alt={record.expensePlan?.employee?.fullName} />
          <Text>{record.expensePlan?.employee?.displayName ?? record.expensePlan?.employee?.fullName ?? 'N/A'}</Text>
        </Space>
      ),
    },
    {
      title: getTranslationFromI18nKeyAndLabel('lowcoder:travel_region_rule.travel_region_rule_details_list.amount', 'Amount'),
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (amount: number | undefined) => (
        <Text strong>
          {typeof amount === 'number' ? `€${formatNumberFunction(amount.toString())}` : 'N/A'}
        </Text>
      ),
    },
    {
      title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.expense_plan_table.status', 'Status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusDisplay = getAdvancePaymentStatusDisplay(status);
        return <Pill label={statusDisplay.label} type={statusDisplay.type as any} data-testid={`status-pill-${status.toLowerCase()}`} />;
      },
    },
    {
      title: '',
      key: 'actions',
      render: (_: any, record: AdvancePaymentItem) => (
        <Space size="middle">
          {(record.status?.toUpperCase() === 'PENDING') && (
            <>
              <Tooltip title="Approve Payment">
                <Button
                  type="primary"
                  style={{ backgroundColor: 'green', borderColor: 'green' }}
                  icon={<CheckOutlined />}
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    // Implementation of approval functionality using the new hook
                    console.log(`Approving payment ${record.id}`);
                    setCurrentActionPlanId(record.id);
                    approvePayment(record.id, "");
                    setSelectedPayment(null);
                  }}
                  loading={approving && record.id === currentActionPlanId}
                  data-testid={`approve-payment-button-${record.id}`}
                />
              </Tooltip>
              <Tooltip title="Reject Payment">
                <Button
                  type="primary"
                  danger
                  icon={<CloseOutlined />}
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    // Implementation of rejection functionality using the new hook
                    console.log(`Rejecting payment ${record.id}`);
                    setCurrentActionPlanId(record.id);
                    rejectPayment(record.id, "Rejected by manager");
                    setSelectedPayment(null);
                  }}
                  loading={rejecting && record.id === currentActionPlanId}
                  data-testid={`reject-payment-button-${record.id}`}
                />
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ];

  // Render the table
  const renderDataBody = useCallback(() => {
    if (error) {
      return (
        <Alert
          message="Error loading advance payments"
          description={error.message || 'An error occurred while loading advance payments.'}
          type="error"
          showIcon
        />
      );
    }

    if (!isLoading && filteredPayments.length === 0) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:h-64">
          <Text type="secondary">No advance payments found</Text>
        </div>
      );
    }

    return (
      <DataTable
        columns={columns}
        dataSource={filteredPayments}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: totalCount,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
        }}
        onChange={handleTableChange}
        scroll={{ x: 'max-content' }}
        data-testid="advance-payments-table"
      />
    );
  }, [error, isLoading, filteredPayments, columns, currentPage, pageSize, totalCount, handleTableChange]);

  return (
    <div className="gba:h-full gba:flex gba:flex-col">
      <DataContainer
        dataControllerProps={{
          search: searchTerm,
          setSearch: setSearchTerm,
          debounceDelay: 300,
          filter: statusFilter ? [statusFilter] : [],
          setFilter: (newFilters: string[]) => {
            setStatusFilter(newFilters.length > 0 ? newFilters[0] : null);
          },
          filterLabelMap: filterLabelMap,
          listTitle: 'Advance Payments',
          listAmount: totalCount ? `${totalCount}` : undefined,
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

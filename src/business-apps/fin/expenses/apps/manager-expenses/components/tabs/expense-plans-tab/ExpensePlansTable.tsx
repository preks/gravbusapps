import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Spin, Alert, Space, Button, Tooltip, Modal, Input } from 'antd';
import { DataTable, Avatar } from '@newwork/gravity-ui-catalog';
import { CheckOutlined, CloseOutlined, FileTextOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import Pill from '@/components/pill/Pill';
import ExpensePlanDetails from './ExpensePlanDetails';
import { useMainViewExpensePlans, ExpensePlan } from '../../../hooks/useMainViewExpensePlans';
import { useExpensePlanFilters } from '../../../hooks/useExpensePlanFilters';
import { getExpensePlanStatusDisplay, ExpenseStatus } from '../../../utils';
import { formatDate } from '@/common/utils/windowUtils';
import { formatAmount } from '../../../utils/currencyUtils';

const { Text } = Typography;

interface ExpensePlansTableProps extends BusinessAppContextProps {
  search?: string;
  onSearchChange?: (search: string) => void;
  employeeId?: string;
}

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
    handleDataFilterChange,
    filterLabelMap,
  } = useExpensePlanFilters();

  // Synchronize search from parent if provided
  useEffect(() => {
    if (search !== undefined) {
      setSearchTerm(search);
    }
  }, [search]);

  // Set up local state
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedPlan, setSelectedPlan] = useState<ExpensePlan | null>(null);
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
    setSelectedPlan(plan);
  }, []);

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

  // Handle closing details panel
  const handleCloseDetails = useCallback(() => {
    setSelectedPlan(null);
  }, []);

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
    if (selectedPlan?.id === currentActionPlanId) {
      setSelectedPlan(null);
    }
  }, [approvePlan, currentActionPlanId, approvalComments, selectedPlan?.id]);

  const handleRejectConfirm = useCallback(async () => {
    if (!rejectReason.trim()) {
      return;
    }
    await rejectPlan(currentActionPlanId, rejectReason);
    setIsRejectModalVisible(false);
    setRejectReason('');
    setCurrentActionPlanId('');
    if (selectedPlan?.id === currentActionPlanId) {
      setSelectedPlan(null);
    }
  }, [rejectPlan, currentActionPlanId, rejectReason, selectedPlan?.id]);

  const handleApprovePlan = useCallback((planId: string) => {
    if (selectedPlan) {
      approvePlan(planId);
      setSelectedPlan(null);
    } else {
      showApproveModal(planId);
    }
  }, [selectedPlan, approvePlan, showApproveModal]);

  const handleRejectPlan = useCallback((planId: string) => {
    showRejectModal(planId);
  }, [showRejectModal]);

  // Handle pagination and sorting changes
  const handleTableChange = useCallback((pagination: any, _tableFilters: any, _sorter: any) => {
    setCurrentPage(pagination.current ?? 1);
    setPageSize(pagination.pageSize ?? 10);
  }, [setCurrentPage]);

  // Table columns definition
  const columns = [
    {
      title: 'Plan',
      dataIndex: 'title',
      key: 'title',
      render: (value: any, record: any) => {
        return (
          <Button
            type="link"
            onClick={() => handleViewDetails(record)}
            style={{ padding: 0, height: 'auto', lineHeight: 'inherit', textAlign: 'left', display: 'block', whiteSpace: 'normal'}}
            aria-label={`View details for plan ${value}`}
            className="gba:plan-details-button"
            data-testid={`plan-details-button-${record.id}`}
          >
            <Text strong>{value}</Text>
            {record.startDate && record.endDate && (
              <div style={{ fontSize: '12px', color: '#888', fontWeight: 'normal' }}>
                {formatDate(record.startDate, 'date.short')} - {formatDate(record.endDate, 'date.short')}
              </div>
            )}
          </Button>
        );
      },
    },
    {
      title: 'Employee',
      dataIndex: 'employee',
      key: 'employee',
      render: (_text: any, record: any) => {
        const employee = record.employee;
        return (
          <Space>
            <Avatar src={employee?.pictureThumbnail ? `data:image/gif;base64,${employee.pictureThumbnail}` : undefined} alt={employee?.fullName} />
            <Text>{employee?.displayName}</Text>
          </Space>
        );
      },
    },
    {
      title: 'Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'right' as const,
      render: (totalAmount: number) => {
        return (
          <Text>
            {typeof totalAmount === 'number' ? `€${formatAmount(totalAmount)}` : 'N/A'}
          </Text>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const display = getExpensePlanStatusDisplay(status as ExpenseStatus);
        return <Pill type={display.type as any} label={display.label} />;
      },
    },
    {
      title: '',
      key: 'actions',
      align: 'right' as const,
      render: (_text: any, record: any) => {
        return (
          <Space size="middle">
            {record.status === ExpenseStatus.PENDING && (
              <Tooltip title="Approve Plan">
                <Button
                  type="primary"
                  style={{ backgroundColor: 'green', borderColor: 'green' }}
                  icon={<CheckOutlined />}
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    handleApprovePlan(record.id);
                  }}
                  loading={approving && currentActionPlanId === record.id}
                  data-testid={`approve-plan-button-${record.id}`}
                />
              </Tooltip>
            )}
            {record.status === ExpenseStatus.PENDING && (
              <Tooltip title="Reject Plan">
                <Button
                  type="primary"
                  danger
                  icon={<CloseOutlined />}
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    handleRejectPlan(record.id);
                  }}
                  loading={rejecting && currentActionPlanId === record.id}
                  data-testid={`reject-plan-button-${record.id}`}
                />
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];

  // Render the data body with error handling and loading states
  const renderDataBody = useCallback(() => {
    // Add debugging info
    const debugInfo = (
      <div className="gba:mb-4" data-testid="expense-plans-debug-info">
        {(() => { 
          console.log('ExpensePlansTable - rendering with data:', { 
            plansCount: plans.length, 
            totalCount, 
            currentPage, 
            pageSize,
            searchTerm: debouncedSearchTerm,
            statusFilter 
          });
          return null;
        })()}
      </div>
    );
    
    if (isLoading && !plans.length) return <>
      {debugInfo}
      <Spin tip="Loading expense plans..." data-testid="expense-plans-loading" />
    </>;
    
    if (error) return <>
      {debugInfo}
      <Alert message={`Error: ${error.message}`} type="error" showIcon data-testid="expense-plans-error" />
    </>;
    
    if (!plans || plans.length === 0) return <>
      {debugInfo}
      <Alert message="No expense plans found matching your criteria." type="info" showIcon data-testid="expense-plans-empty" />
    </>;

    return (
      <>
        {debugInfo}
        <DataTable
          columns={columns}
          dataSource={plans}
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
          data-testid="expense-plans-table"
        />
      </>
    );
  }, [plans, isLoading, error, currentPage, pageSize, totalCount, columns, handleTableChange]);

  return (
    <div className="gba:h-full gba:flex gba:flex-col">
      <DataContainer
        contentBackground="white"
        dataControllerProps={{
          search: searchTerm,
          setSearch: onSearchChange,
          debounceDelay: 300,
          filter: statusFilter ? [statusFilter] : [],
          setFilter: (newFilters: string[]) => {
            setStatusFilter(newFilters.length > 0 ? newFilters[0] as ExpenseStatus : null);
          },
          filterLabelMap: filterLabelMap,
          listTitle: 'Expense Plans',
          listAmount: totalCount ? `${totalCount}` : undefined,
        }}
        dataFilterProps={{
          filterGroups: filterGroups,
          onFilterChange: handleDataFilterChange,
        }}
        hideFilter={false}
        floatingDetails={true}
        dataBody={renderDataBody()}
        contentBackground="white"
        dataDetails={selectedPlan ? {
          title: selectedPlan.title || 'Expense Plan Details',
          icon: <FileTextOutlined />,
          content: (
            <ExpensePlanDetails
              {...props}
              plan={selectedPlan}
              onApprove={handleApprovePlan}
              onReject={handleRejectPlan}
            />
          ),
          onClose: handleCloseDetails,
          footer: null // Remove footer close button as it's now in the details component
        } : undefined}
      />

      <Modal
        title="Approve Expense Plan"
        open={isApproveModalVisible}
        onOk={handleApproveConfirm}
        onCancel={() => setIsApproveModalVisible(false)}
        confirmLoading={approving}
        data-testid="approve-plan-modal"
      >
        <Input.TextArea
          rows={4}
          placeholder="Optional: Add approval comments..."
          value={approvalComments}
          onChange={(e) => setApprovalComments(e.target.value)}
          data-testid="approval-comments-input"
        />
      </Modal>

      <Modal
        title="Reject Expense Plan"
        open={isRejectModalVisible}
        onOk={handleRejectConfirm}
        onCancel={() => setIsRejectModalVisible(false)}
        confirmLoading={rejecting}
        okButtonProps={{ disabled: !rejectReason.trim() }}
        data-testid="reject-plan-modal"
      >
        <p>Please provide a reason for rejecting this expense plan:</p>
        <Input.TextArea
          placeholder="Rejection reason"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          rows={4}
          required
          data-testid="rejection-reason-input"
        />
      </Modal>
    </div>
  );
};

export default ExpensePlansTable;

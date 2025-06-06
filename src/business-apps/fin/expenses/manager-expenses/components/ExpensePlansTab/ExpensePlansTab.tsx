import React, { useState, useEffect } from 'react';
import { Typography, Spin, Alert, Space, Button, Tooltip, Modal, Input } from 'antd';
import { DataTable, Avatar } from '@newwork/gravity-ui-catalog';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import { DebouncedDataController, DebouncedDataControllerProps } from '@/components/dataController';
// DataFilter, DataFilterGroup, DataFilterValue are no longer directly used here as filter logic is in useExpensePlanFilters hook
import Pill from '@/components/pill/Pill';
import ExpensePlanDetails from './ExpensePlanDetails';
import useGetExpensePlans, { ExpensePlan } from '../../hooks/useGetExpensePlans';
import { useExpensePlanFilters } from '../../hooks/useExpensePlanFilters';
import { getExpensePlanStatusDisplay, ExpenseStatus } from '../../utils';
import ExpensePlanStatisticsDisplay from './ExpensePlanStatistics';

const { Text } = Typography;

interface ExpensePlansTabProps extends BusinessAppContextProps {
  onContentHeaderChange?: (header: React.ReactNode) => void;
  employeeId?: string;
}

const ExpensePlansTab: React.FC<ExpensePlansTabProps> = (props) => {
  const { accessToken, userInfo, onContentHeaderChange } = props;
  const [selectedPlan, setSelectedPlan] = useState<ExpensePlan | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [approvalComments, setApprovalComments] = useState<string>('');
  const [isRejectModalVisible, setIsRejectModalVisible] = useState<boolean>(false);
  const [isApproveModalVisible, setIsApproveModalVisible] = useState<boolean>(false);
  const [planIdToAction, setPlanIdToAction] = useState<string>('');
  // pageSize is managed locally and passed to the hook
  const [pageSize, setPageSize] = useState<number>(10);

  const {
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
    statusFilter,
    setStatusFilter,
    filterGroups: hookFilterGroups, // Renamed to avoid conflict if local one is needed later
    handleDataFilterChange: hookHandleDataFilterChange,
    filterLabelMap,
  } = useExpensePlanFilters();

  const {
    loading: isLoading,
    error,
    plans,
    totalCount,
    currentPage: hookCurrentPage, // Renamed to avoid conflict if a local currentPage were ever needed
    setCurrentPage: setHookCurrentPage, // Renamed setter from the hook
    approving,
    rejecting,
    approvePlan,
    rejectPlan,
    planStats,
    statsLoading,
    statsError,
    fetchPlanStatistics,
    // fetchPlans, // This is the raw fetch function, might not be needed directly if setCurrentPage works
  } = useGetExpensePlans({
    accessToken,
    userInfo,
    pageSize, // Pass pageSize from local state
    // employeeId: props.employeeId, // Hook uses manager's ID from userInfo for this view
    searchTerm: debouncedSearchTerm, // Pass searchTerm directly
    currentStatusFilter: statusFilter, // Pass statusFilter directly
  });





  useEffect(() => {
    if (onContentHeaderChange) {
      const headerContent = (
        <ExpensePlanStatisticsDisplay
          planStats={planStats}
          statsLoading={statsLoading}
          statsError={statsError}
          fetchPlanStatistics={fetchPlanStatistics}
        />
      );
      onContentHeaderChange(headerContent);
    }
  }, [planStats, statsLoading, statsError, onContentHeaderChange, fetchPlanStatistics]);

  const handleViewDetails = (plan: ExpensePlan) => {
    setSelectedPlan(plan);
  };

  const showApproveModal = (planId: string) => {
    setPlanIdToAction(planId);
    setIsApproveModalVisible(true);
  };

  const showRejectModal = (planId: string) => {
    setPlanIdToAction(planId);
    setIsRejectModalVisible(true);
  };

  const handleApproveConfirm = async () => {
    await approvePlan(planIdToAction, approvalComments);
    setIsApproveModalVisible(false);
    setApprovalComments('');
    setPlanIdToAction('');
    if (selectedPlan?.id === planIdToAction) {
      setSelectedPlan(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectReason.trim()) {
      return;
    }
    await rejectPlan(planIdToAction, rejectReason);
    setIsRejectModalVisible(false);
    setRejectReason('');
    setPlanIdToAction('');
    if (selectedPlan?.id === planIdToAction) {
      setSelectedPlan(null);
    }
  };

  const handleApprovePlan = (planId: string) => {
    if (selectedPlan) {
      approvePlan(planId);
      setSelectedPlan(null);
    } else {
      showApproveModal(planId);
    }
  };

  const handleTableChange = (pagination: any, _tableFilters: any, _sorter: any) => {
    setHookCurrentPage(pagination.current); // Use the setter from the hook
    setPageSize(pagination.pageSize); // Update local pageSize, which is a prop to the hook
    // TODO: Handle filters and sorter if needed
  };

  const handleRejectPlan = (planId: string) => {
    showRejectModal(planId);
  };

  const columns = [
    {
      title: 'Plan',
      dataIndex: 'title',
      key: 'title',
      render: (value: string, recordAsUnknown: unknown) => {
        const record = recordAsUnknown as ExpensePlan;
        return (
          <Button
            type="link"
            onClick={() => handleViewDetails(record)}
            style={{ padding: 0, height: 'auto', lineHeight: 'inherit', textAlign: 'left', display: 'block', whiteSpace: 'normal'}}
            aria-label={`View details for plan ${value}`}
            className="gba:plan-details-button"
          >
            <Text strong>{value}</Text>
            {record.startDate && record.endDate && (
              <div style={{ fontSize: '12px', color: '#888', fontWeight: 'normal' }}>
                {new Date(record.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} - {new Date(record.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
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
      render: (_text: any, recordAsUnknown: unknown) => { // _text is the value from dataIndex 'employee', which we don't directly use here
        const record = recordAsUnknown as ExpensePlan;
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
      render: (totalAmount: number /*, recordAsUnknown: unknown */) => { // record is not used here, so commented out
        // const _record = recordAsUnknown as ExpensePlan;
        return (
          <Text>
            {typeof totalAmount === 'number' ? `€${totalAmount.toFixed(2)}` : 'N/A'}
          </Text>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string /*, recordAsUnknown: unknown */) => { // record is not used here
        // const _record = recordAsUnknown as ExpensePlan;
        const display = getExpensePlanStatusDisplay(status as ExpenseStatus);
        return <Pill type={display.type as any} label={display.label} />;
      },
    },
    {
      title: '',
      key: 'actions',
      align: 'right' as const,
      render: (_text: any, recordAsUnknown: unknown) => {
        const record = recordAsUnknown as ExpensePlan;
        return (
          <Space size="middle">
            {/* View Details button removed */}
            {record.status === ExpenseStatus.PENDING && (
              <Tooltip title="Approve Plan">
                <Button
                  type="primary"
                  style={{ backgroundColor: 'green', borderColor: 'green' }}
                  icon={<CheckOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApprovePlan(record.id);
                  }}
                  loading={approving && planIdToAction === record.id}
                />
              </Tooltip>
            )}
            {record.status === ExpenseStatus.PENDING && (
              <Tooltip title="Reject Plan">
                <Button
                  type="primary"
                  danger
                  icon={<CloseOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRejectPlan(record.id);
                  }}
                  loading={rejecting && planIdToAction === record.id}
                />
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];

  const renderDataBody = () => {
    if (isLoading) return <Spin tip="Loading expense plans..." />;
    if (error) return <Alert message={`Error: ${error.message}`} type="error" showIcon />;
    if (!plans || plans.length === 0) return <Text>No expense plans found matching your criteria.</Text>;

    return (
      <DataTable
        columns={columns}
        dataSource={plans}
        rowKey="id"
        loading={isLoading} // DataTable uses a direct loading prop
        pagination={{
          current: hookCurrentPage, // Use currentPage from the hook
          pageSize: pageSize, // Use local pageSize state
          total: totalCount,
          showSizeChanger: true,
        }}
        onChange={handleTableChange} // Handles pagination, filter, sort changes
        // onView prop does not exist; row click is handled in the 'PLAN' column render
        scroll={{ x: 'max-content' }} // Ensures horizontal scroll if content overflows
      />
    );
  };

  return (
    <>
      <DataContainer<DebouncedDataControllerProps>
        contentBackground="white"
        dataControllerComponent={DebouncedDataController}
        dataControllerProps={{
          actualSearch: searchTerm,
          setActualSearch: setSearchTerm,
          debounceDelay: 300,
          search: '', // kept as per DebouncedDataController expectation, though primary search is debouncedSearchTerm
          setSearch: setSearchTerm, // allow DebouncedDataController to update the immediate search term if needed by its internal input
          filter: statusFilter ? [statusFilter] : [], // Pass the current status filter as an array of strings or empty array
          setFilter: (newFilters: string[]) => { // DebouncedDataController likely passes string[]
            // Assuming single filter selection for status for now
            // If newFilters has something, take the first one. Otherwise, set to null.
            // This might need adjustment based on how DebouncedDataController handles setFilter with single-select like filters
            setStatusFilter(newFilters.length > 0 ? newFilters[0] as ExpenseStatus : null);
          },
          filterLabelMap: filterLabelMap,
          listTitle: 'Expense Plans',
          listAmount: totalCount,
        }}
        dataFilterProps={{
          filterGroups: hookFilterGroups,
          onFilterChange: hookHandleDataFilterChange,
        }}
        hideFilter={false}
        dataBody={renderDataBody()}
        dataDetails={selectedPlan ? {
          title: 'Expense Plan Details',
          content: (
            <ExpensePlanDetails
              {...props}
              plan={selectedPlan}
              onApprove={handleApprovePlan}
              onReject={handleRejectPlan}
            />
          ),
        } : undefined}
        onDetailsPanelClose={() => {
          setSelectedPlan(null);
        }}
      />

      <Modal
        title="Approve Expense Plan"
        open={isApproveModalVisible} // Changed visible to open
        onOk={handleApproveConfirm}
        onCancel={() => setIsApproveModalVisible(false)}
        confirmLoading={approving}
      >
        <Input.TextArea
          rows={4}
          placeholder="Optional: Add approval comments..." // Kept one placeholder
          value={approvalComments}
          onChange={(e) => setApprovalComments(e.target.value)}
        />
      </Modal>

      <Modal
        title="Reject Expense Plan"
        open={isRejectModalVisible}
        onOk={handleRejectConfirm}
        onCancel={() => setIsRejectModalVisible(false)}
        confirmLoading={rejecting}
        okButtonProps={{ disabled: !rejectReason.trim() }}
      >
        <p>Please provide a reason for rejecting this expense plan:</p>
        <Input.TextArea
          placeholder="Rejection reason"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          rows={4}
          required
        />
      </Modal>
    </>
  );
};

export default ExpensePlansTab;

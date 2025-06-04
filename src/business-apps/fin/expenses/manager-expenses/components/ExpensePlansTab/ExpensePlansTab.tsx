import React, { useState } from 'react';
import { Table, Typography, Spin, Alert, Select, Space, Button, Tooltip, Modal, Input } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { Avatar } from '@newwork/gravity-ui-catalog';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import Pill from '@/components/pill/Pill';
import ExpensePlanDetails from './ExpensePlanDetails';
import useGetExpensePlans, { ExpensePlan } from '../../hooks/useGetExpensePlans';
import { getExpensePlanStatusDisplay } from '../../utils';

const { Text } = Typography;
const { Option } = Select;



interface ExpensePlansTabProps extends BusinessAppContextProps {
  onContentHeaderChange?: (header: React.ReactNode) => void;
  employeeId?: string;
}

const ExpensePlansTab: React.FC<ExpensePlansTabProps> = (props) => {
  const { accessToken, userInfo } = props;
  const [selectedPlan, setSelectedPlan] = useState<ExpensePlan | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [approvalComments, setApprovalComments] = useState<string>('');
  const [isRejectModalVisible, setIsRejectModalVisible] = useState<boolean>(false);
  const [isApproveModalVisible, setIsApproveModalVisible] = useState<boolean>(false);
  const [planIdToAction, setPlanIdToAction] = useState<string>('');
  
  const {
    loading: isLoading,
    error,
    plans,
    totalCount,
    currentPage: page,
    search,
    statusFilter: selectedStatus,
    employeeFilter: selectedEmployee,
    approving,
    rejecting,
    handleSearch: handleSearchChange,
    handleStatusFilter: handleStatusChange,
    handleEmployeeFilter: handleEmployeeChange,
    approvePlan,
    rejectPlan
  } = useGetExpensePlans({
    accessToken,
    userInfo,
    pageSize: 10
  });

  // Extract team members from plans for the filter dropdown
  const teamMembers = React.useMemo(() => {
    const uniqueEmployees = new Map();
    plans.forEach(plan => {
      if (plan.employee && !uniqueEmployees.has(plan.employee.id)) {
        uniqueEmployees.set(plan.employee.id, {
          id: plan.employee.id,
          fullName: plan.employee.fullName,
          department: plan.employee.department?.name || 'Unknown'
        });
      }
    });
    return Array.from(uniqueEmployees.values());
  }, [plans]);

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
      return; // Don't proceed if reason is empty
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

  const handleRejectPlan = (planId: string) => {
    showRejectModal(planId);
  };

  const columns: ColumnsType<ExpensePlan> = [
    {
      title: 'PLAN',
      dataIndex: 'title',
      key: 'title',
      render: (value: string, record: ExpensePlan) => (
        <div>
          <Text strong>{value}</Text>
          {record.startDate && record.endDate && (
            <div style={{ fontSize: '12px', color: '#888' }}>
              {new Date(record.startDate).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})} - {new Date(record.endDate).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Employee',
      dataIndex: 'employee',
      key: 'employee',
      render: (employee: ExpensePlan['employee']) => (
        <Space>
          <Avatar src={employee?.pictureThumbnail ? `data:image/gif;base64,${employee.pictureThumbnail}` : undefined} alt={employee?.fullName} />
          <Text>{employee?.displayName}</Text>
        </Space>
      ),
    },

    {
      title: 'Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'right',
      render: (totalAmount: number) => (
        <Text>
          {typeof totalAmount === 'number' ? `€${totalAmount.toFixed(2)}` : 'N/A'}
        </Text>
      ),
    },

    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const { label, type } = getExpensePlanStatusDisplay(status);
        return <Pill type={type} label={label} />;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: string, record: any) => (
        <Space>
          {record.status === 'PENDING' && (
            <>
              <Tooltip title="Approve">
                <Button 
                  type="text" 
                  icon={<CheckOutlined style={{ color: '#52c41a' }} />} 
                  onClick={() => handleApprovePlan(record.id)}
                />
              </Tooltip>
              <Tooltip title="Reject">
                <Button 
                  type="text" 
                  icon={<CloseOutlined style={{ color: '#ff4d4f' }} />} 
                  onClick={() => handleRejectPlan(record.id)}
                />
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ];

  const renderDataBody = () => {
    if (isLoading) return <Spin />;
    if (error) return <Alert type="error" message={error.message} />;
    if (!plans || plans.length === 0) return <Text>No expense plans found.</Text>;

    return (
      <Table
        dataSource={plans}
        columns={columns}
        rowKey="id"
        onRow={(record) => {
          return {
            onClick: () => handleViewDetails(record),
            className: 'gba:cursor-pointer',
          };
        }}
        pagination={{
          current: page,
          pageSize: 10,
          total: totalCount,
          onChange: () => {
            // Pagination is handled by the hook
          },
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} items`,
        }}
      />
    );
  };

  const renderFilters = () => (
    <div className="gba:flex gba:flex-wrap gba:gap-4">
      <div className="gba:w-64">
        <Text strong>Employee</Text>
        <Select
          className="gba:w-full"
          value={selectedEmployee ?? 'all'}
          onChange={handleEmployeeChange}
        >
          <Option value="all">All Employees</Option>
          {teamMembers.map(member => (
            <Option key={member.id} value={member.id}>{member.fullName}</Option>
          ))}
        </Select>
      </div>
      <div className="gba:w-48">
        <Text strong>Status</Text>
        <Select
          className="gba:w-full"
          value={selectedStatus ?? 'all'}
          onChange={handleStatusChange}
        >
          <Option value="all">All Statuses</Option>
          <Option value="PENDING">Pending</Option>
          <Option value="APPROVED">Approved</Option>
          <Option value="REJECTED">Rejected</Option>
          <Option value="DRAFT">Draft</Option>
        </Select>
      </div>
    </div>
  );

  return (
    <>
      <DataContainer
        dataControllerProps={{
          search: search,
          filter: [],
          setSearch: handleSearchChange,
          setFilter: () => {}
        }}
        dataFilterProps={{
          filterGroups: [],
          children: renderFilters()
        }}
        hideFilter={false}
        dataBody={renderDataBody()}
        contentBackground="white"
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
          // Adjust width as needed, e.g., width: 400 or '33%'
        } : undefined}
        onDetailsPanelClose={() => {
          setSelectedPlan(null);
          if (props.onContentHeaderChange) {
            props.onContentHeaderChange(null);
          }
        }}
      />

      {/* Modals remain outside DataContainer, which is fine */}
      <Modal
        title="Approve Expense Plan"
        open={isApproveModalVisible}
        onOk={handleApproveConfirm}
        onCancel={() => setIsApproveModalVisible(false)}
        confirmLoading={approving}
      >
        <p>Are you sure you want to approve this expense plan?</p>
        <Input.TextArea
          placeholder="Add optional comments"
          value={approvalComments}
          onChange={(e) => setApprovalComments(e.target.value)}
          rows={4}
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

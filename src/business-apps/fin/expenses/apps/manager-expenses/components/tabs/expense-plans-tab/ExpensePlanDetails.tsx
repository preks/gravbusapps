import React from 'react';
import { Typography, Button, Descriptions } from 'antd';
import { CheckOutlined, CloseCircleOutlined } from '@ant-design/icons';
import Pill from '@/components/pill/Pill';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { formatDate } from '@/common/utils/windowUtils';

const { Title, Text } = Typography;

export interface ExpensePlanDetailsProps extends BusinessAppContextProps {
  plan: any;
  onApprove: (planId: string) => void;
  onReject: (planId: string) => void;
}

const ExpensePlanDetails: React.FC<ExpensePlanDetailsProps> = ({
  plan,
  onApprove,
  onReject
}) => {
  const getPillType = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'completed';
      case 'REJECTED': return 'error';
      case 'DRAFT': return 'draft';
      default: return 'waiting';
    }
  };

  const handleApprove = () => {
    onApprove(plan.id);
  };

  const handleReject = () => {
    onReject(plan.id);
  };

  // Helper function to render budget items if they exist
  const renderBudgetItems = () => {
    if (!plan.budgetItems || plan.budgetItems.length === 0) {
      return <Text type="secondary">No budget items defined</Text>;
    }

    return (
      <div className="gba:space-y-2">
        {plan.budgetItems.map((item: any) => (
          <div key={`${item.category}-${item.amount}`} className="gba:border gba:rounded gba:p-2">
            <div className="gba:flex gba:justify-between">
              <Text strong>{item.category}</Text>
              <Text>€{item.amount.toFixed(2)}</Text>
            </div>
            {item.description && <Text type="secondary">{item.description}</Text>}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="gba:p-6">

      <div className="gba:mb-6">
        <Pill 
          type={getPillType(plan.status)}
          label={plan.status}
        />
      </div>

      <Descriptions bordered column={1} size="small" className="gba:mb-6">
        <Descriptions.Item label="Title">{plan.title}</Descriptions.Item>
        <Descriptions.Item label="Employee">{plan.employee?.fullName}</Descriptions.Item>
        <Descriptions.Item label="Department">{plan.employee?.department}</Descriptions.Item>
        <Descriptions.Item label="Start Date">{plan.startDate ? formatDate(plan.startDate, 'date.short') : '-'}</Descriptions.Item>
        <Descriptions.Item label="End Date">{plan.endDate ? formatDate(plan.endDate, 'date.short') : '-'}</Descriptions.Item>
        <Descriptions.Item label="Total Amount">€{plan.amount?.toFixed(2)}</Descriptions.Item>
        <Descriptions.Item label="Description">{plan.description ?? 'No description provided'}</Descriptions.Item>
      </Descriptions>

      <div className="gba:mb-6">
        <Title level={5} className="gba:mb-2">Budget Items</Title>
        {renderBudgetItems()}
      </div>

      {plan.status === 'PENDING' && (
        <div className="gba:mt-6 gba:flex gba:justify-end gba:gap-4">
          <Button 
            danger
            icon={<CloseCircleOutlined />}
            onClick={handleReject}
          >
            Reject
          </Button>
          <Button 
            type="primary"
            icon={<CheckOutlined />}
            onClick={handleApprove}
          >
            Approve
          </Button>
        </div>
      )}
    </div>
  );
};

export default ExpensePlanDetails;

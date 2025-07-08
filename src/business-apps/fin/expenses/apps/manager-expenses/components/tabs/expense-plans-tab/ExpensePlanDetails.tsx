import React from 'react';
import { Descriptions, Divider, Typography, Button, Space } from 'antd';
import { CheckOutlined, CloseCircleOutlined } from '@ant-design/icons';
import Pill from '@/components/pill/Pill';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { PiCalendarDuotone, PiClock, PiPath, PiArrowRight } from 'react-icons/pi';
import dayjs from 'dayjs';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

const { Text, Title } = Typography;

export interface ExpensePlanDetailsProps extends BusinessAppContextProps {
  plan: any;
  onApprove: (planId: string) => void;
  onReject: (planId: string) => void;
}

// Helper function to format currency
const formatCurrency = (amount: number, currencyValue = 'European euro') => {
  const currencySymbol = currencyValue === 'European euro' ? '€' : currencyValue?.charAt(0) || '€';
  return `${currencySymbol}${amount?.toFixed(2) || '0.00'}`;
};

// Helper function to get status display info
const getExpensePlanStatusDisplay = (status: string) => {
  type PillType = 'draft' | 'completed' | 'waiting' | 'task' | 'error';
  
  const statusMap: Record<string, { label: string; type: PillType }> = {
    DRAFT: { label: 'Draft', type: 'draft' },
    PENDING: { label: 'Pending Approval', type: 'waiting' },
    APPROVED: { label: 'Approved', type: 'completed' },
    REJECTED: { label: 'Rejected', type: 'error' },
    PAID: { label: 'Paid', type: 'completed' },
  };

  return statusMap[status] || { label: status, type: 'waiting' };
};

const ExpensePlanDetails: React.FC<ExpensePlanDetailsProps> = ({
  plan,
  onApprove,
  onReject
}) => {
  // Get trip type
  const getTripType = () => {
    if (plan.requestType?.value) {
      return plan.requestType.value;
    }
    const additionalProps = plan.additionalProperties as Record<string, unknown> | null;
    const tripType = additionalProps?.tripType ?? additionalProps?.travelType;
    return tripType ?? 'Business Travel';
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
      return null;
    }

    return (
      <div className="gba:space-y-2 gba:mt-4">
        <Title level={5} className="gba:mb-2">Budget Items</Title>
        {plan.budgetItems.map((item: any) => (
          <div key={`${item.category}-${item.amount}`} className="gba:border gba:rounded gba:p-2">
            <div className="gba:flex gba:justify-between">
              <Text strong>{item.category}</Text>
              <Text>{formatCurrency(item.amount, plan.currency?.value)}</Text>
            </div>
            {item.description && <Text type="secondary">{item.description}</Text>}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="gba:p-4 gba:relative gba:mb-6">
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
        <div>
          <Title level={4} className="gba:mb-1">{plan.title}</Title>
          <Text type="secondary">{plan.code || ''}</Text>
        </div>
        <Pill 
          type={getExpensePlanStatusDisplay(plan.status).type} 
          label={getExpensePlanStatusDisplay(plan.status).label}
          className="gba:text-base"
          data-testid="expense-plan-status-pill"
        />
      </div>
      
      {plan.startDate && plan.endDate && (
        <div className="gba:flex gba:items-center gba:mb-2">
          <PiCalendarDuotone className="gba:mr-2" />
          <Text className="gba:text-sm">
            {getTranslationFromI18nKeyAndLabel('expense.plan.duration', 'Duration')}: {' '}
            {dayjs(plan.startDate).format('DD.MM.YYYY')} {' → '} 
            {dayjs(plan.endDate).format('DD.MM.YYYY')}
          </Text>
        </div>
      )}
      
      {plan.planDate && (
        <div className="gba:flex gba:items-center gba:mb-2">
          <PiClock className="gba:mr-2" />
          <Text className="gba:text-sm">
            {getTranslationFromI18nKeyAndLabel('expense.plan.planDate', 'Plan Date')}: {' '}
            {dayjs(plan.planDate).format('DD.MM.YYYY')}
          </Text>
        </div>
      )}
      
      {plan.decisionDate && (
        <div className="gba:flex gba:items-center gba:mb-4">
          <PiPath className="gba:mr-2" />
          <Text className="gba:text-sm">
            {getTranslationFromI18nKeyAndLabel('expense.plan.decisionDate', 'Decision Date')}: {' '}
            {dayjs(plan.decisionDate).format('DD.MM.YYYY')}
          </Text>
        </div>
      )}
      
      {plan.description && (
        <Text className="gba:block gba:mb-4">{plan.description}</Text>
      )}
      
      <Descriptions size="small" column={1}>
        {plan.employee && (
          <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('expense.plan.requester', 'Requester')}>
            {plan.employee.fullName}
          </Descriptions.Item>
        )}
        
        {plan.employee?.employeePosition?.supervisor && (
          <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('expense.plan.manager', 'Manager')}>
            {plan.employee.employeePosition.supervisor.fullName}
          </Descriptions.Item>
        )}
        
        {plan.costCenter && (
          <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('expense.plan.costCenter', 'Cost Center')}>
            {plan.costCenter.name}
          </Descriptions.Item>
        )}
        
        {plan.project && (
          <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('expense.plan.project', 'Project')}>
            {plan.project.name}
          </Descriptions.Item>
        )}
        
        <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('expense.plan.tripType', 'Trip Type')}>
          {getTripType()}
        </Descriptions.Item>
        
        <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('expense.plan.amount', 'Total Amount')}>
          {typeof plan.totalAmount === 'number' ? formatCurrency(plan.totalAmount, plan.currency?.value) : '-'}
        </Descriptions.Item>
        
        {plan.advancePaymentPaidAmount > 0 && (
          <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('expense.plan.advancePayment', 'Advance Payment')}>
            {formatCurrency(plan.advancePaymentPaidAmount, plan.currency?.value)}
          </Descriptions.Item>
        )}
      </Descriptions>

      {renderBudgetItems()}
      
      <Divider className="gba:my-4" />
      
      <div className="gba:flex gba:justify-between gba:mt-4">
        {plan.status === 'PENDING' && (
          <Space>
            <Button 
              danger
              onClick={handleReject}
              icon={<CloseCircleOutlined />}
              data-testid="reject-plan-button"
            >
              {getTranslationFromI18nKeyAndLabel('expense.plan.reject', 'Reject')}
            </Button>
            <Button 
              type="primary"
              onClick={handleApprove}
              icon={<CheckOutlined />}
              data-testid="approve-plan-button"
            >
              {getTranslationFromI18nKeyAndLabel('expense.plan.approve', 'Approve')}
            </Button>
          </Space>
        )}
        
        <Button 
          type="primary" 
          icon={<PiArrowRight />}
          onClick={() => {
            // Navigate to the expense plan record page
            const url = `/platform/fin/expenses/expense-plan-record?expensePlanId=${plan.id}`;
            window.location.href = url;
          }}
          data-testid="view-expense-plan-details-button"
        >
          {getTranslationFromI18nKeyAndLabel('expense.plan.details.view', 'View Full Details')}
        </Button>
      </div>
    </div>
  );
};

export default ExpensePlanDetails;

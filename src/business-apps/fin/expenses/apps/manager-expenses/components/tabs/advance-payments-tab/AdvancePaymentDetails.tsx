import React from 'react';
import { Typography, Button, Descriptions } from 'antd';
import { CheckOutlined, CloseCircleOutlined } from '@ant-design/icons';
import Pill from '@/components/pill/Pill';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { formatDate } from '@/common/utils/windowUtils';
import { formatAmount } from '../../../utils/currencyUtils';

const { Title } = Typography;

export interface AdvancePaymentDetailsProps extends BusinessAppContextProps {
  payment: any;
  onApprove: (paymentId: string) => void;
  onReject: (paymentId: string) => void;
}

const AdvancePaymentDetails: React.FC<AdvancePaymentDetailsProps> = ({
  payment,
  onApprove,
  onReject
}) => {
  const getTextType = (daysRemaining: number) => {
    if (daysRemaining < 0) return 'danger';
    if (daysRemaining < 7) return 'warning';
    return undefined;
  };

  const getDaysRemainingText = (daysRemaining: number) => {
    return daysRemaining < 0 ? 
      `${Math.abs(daysRemaining)} days overdue` : 
      `${daysRemaining} days`;
  };

  const getPillType = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'completed';
      case 'REJECTED': return 'error';
      case 'DRAFT': return 'draft';
      default: return 'waiting';
    }
  };

  const handleApprove = () => {
    onApprove(payment.id);
  };

  const handleReject = () => {
    onReject(payment.id);
  };

  // Helper function to calculate days remaining until due date
  const calculateDaysRemaining = () => {
    if (!payment.dueDate) return null;
    
    const dueDate = new Date(payment.dueDate);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const daysRemaining = calculateDaysRemaining();

  return (
    <div className="gba:p-6">
      <div className="gba:mb-6">
        <Pill 
          type={getPillType(payment.status)}
          label={payment.status}
        />
      </div>

      <Descriptions bordered column={1} size="small" className="gba:mb-6">
        <Descriptions.Item label="Title">{payment.title}</Descriptions.Item>
        <Descriptions.Item label="Employee">{payment.employee?.fullName}</Descriptions.Item>
        <Descriptions.Item label="Department">{payment.employee?.department}</Descriptions.Item>
        <Descriptions.Item label="Request Date">{payment.requestDate ? formatDate(payment.requestDate, 'date.short') : '-'}</Descriptions.Item>
        <Descriptions.Item label="Due Date">{payment.dueDate ? formatDate(payment.dueDate, 'date.short') : '-'}</Descriptions.Item>
        {daysRemaining !== null && (
          <Descriptions.Item label="Days Remaining">
            <Typography.Text type={getTextType(daysRemaining)}>
              {getDaysRemainingText(daysRemaining)}
            </Typography.Text>
          </Descriptions.Item>
        )}
        <Descriptions.Item label="Amount">€{payment.amount ? formatAmount(payment.amount) : '0,00'}</Descriptions.Item>
        <Descriptions.Item label="Purpose">{payment.purpose ?? 'No purpose provided'}</Descriptions.Item>
        <Descriptions.Item label="Description">{payment.description ?? 'No description provided'}</Descriptions.Item>
      </Descriptions>

      {payment.status === 'APPROVED' && payment.approvedBy && (
        <div className="gba:mb-6">
          <Title level={5} className="gba:mb-2">Approval Information</Title>
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Approved By">{payment.approvedBy ?? 'Unknown'}</Descriptions.Item>
            <Descriptions.Item label="Approved Date">{payment.approvedDate ? formatDate(payment.approvedDate, 'date.short') : '-'}</Descriptions.Item>
            <Descriptions.Item label="Comments">{payment.approvalComments ?? 'No comments'}</Descriptions.Item>
          </Descriptions>
        </div>
      )}

      {payment.status === 'REJECTED' && payment.rejectedBy && (
        <div className="gba:mb-6">
          <Title level={5} className="gba:mb-2">Rejection Information</Title>
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Rejected By">{payment.rejectedBy}</Descriptions.Item>
            <Descriptions.Item label="Rejected Date">{payment.rejectedDate ? formatDate(payment.rejectedDate, 'date.short') : '-'}</Descriptions.Item>
            <Descriptions.Item label="Rejection Reason">{payment.rejectionReason ?? 'No reason provided'}</Descriptions.Item>
          </Descriptions>
        </div>
      )}

      {payment.status === 'PENDING' && (
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

export default AdvancePaymentDetails;

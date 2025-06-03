import React from 'react';
import { Button, Descriptions, Divider } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { ExpenseRequest } from '../../hooks/useGetExpenseRequests';
import Pill from '@/components/pill';
import { getExpenseRequestStatusDisplay } from '../../utils';

interface ExpenseRequestDetailsProps {
  request: ExpenseRequest;
  onClose: () => void;
  onEdit?: (request: ExpenseRequest) => void;
}

const ExpenseRequestDetails: React.FC<ExpenseRequestDetailsProps> = ({ 
  request, 
  onClose,
  onEdit
}) => {
  const getStatusDisplay = (status: string) => {
    return getExpenseRequestStatusDisplay(status);
  };

  return (
    <div className="gba:relative">
      <Button 
        type="text" 
        icon={<CloseOutlined />} 
        onClick={onClose} 
        className="gba:absolute gba:top-2 gba:right-2 gba:z-10" 
        aria-label="Close details"
      />
      
      <Descriptions title="Expense Request Details" bordered column={1}>
        <Descriptions.Item label="Title">{request.title}</Descriptions.Item>
        <Descriptions.Item label="Request Number">{request.code}</Descriptions.Item>
        <Descriptions.Item label="Request Type">
          {request.requestType?.value ?? 'General Expense'}
        </Descriptions.Item>
        <Descriptions.Item label="Date Range">
          {(request.startDate && request.endDate) 
            ? `${new Date(request.startDate).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})} - ${new Date(request.endDate).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})}`
            : 'No dates specified'}
        </Descriptions.Item>
        <Descriptions.Item label="Status">
          {(() => {
            const { type, label } = getStatusDisplay(request.status);
            return <Pill type={type} label={label} />;
          })()}
        </Descriptions.Item>
        <Descriptions.Item label="Total Amount">
          €{typeof request.totalAmount === 'number' ? request.totalAmount.toFixed(2) : '0.00'}
        </Descriptions.Item>
        <Descriptions.Item label="Reimbursable Amount">
          €{typeof request.reimbursableAmount === 'number' ? request.reimbursableAmount.toFixed(2) : '0.00'}
        </Descriptions.Item>
        {request.nonReimbursableAmount > 0 && (
          <Descriptions.Item label="Non-Reimbursable Amount">
            €{typeof request.nonReimbursableAmount === 'number' ? request.nonReimbursableAmount.toFixed(2) : '0.00'}
          </Descriptions.Item>
        )}
      </Descriptions>
      
      <Divider />
    </div>
  );
};

export default ExpenseRequestDetails;
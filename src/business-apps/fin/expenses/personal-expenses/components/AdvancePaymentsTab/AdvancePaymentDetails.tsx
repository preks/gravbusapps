import React from 'react';
import { Descriptions, Button, Divider } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { AdvancePayment } from '../../hooks/useGetAdvancePayments';
import { getAdvancePaymentStatusDisplay } from '../../utils';
import Pill from '@/components/pill';

interface AdvancePaymentDetailsProps {
  payment: AdvancePayment;
  onClose: () => void;
}

const AdvancePaymentDetails: React.FC<AdvancePaymentDetailsProps> = ({ payment, onClose }) => {
  return (
    <div className="gba:relative">
      <Button 
        type="text" 
        icon={<CloseOutlined />} 
        onClick={onClose} 
        className="gba:absolute gba:top-2 gba:right-2 gba:z-10" 
        aria-label="Close details" 
      />
      <Descriptions bordered column={1}>
        <Descriptions.Item label="Code">{payment.code}</Descriptions.Item>
        <Descriptions.Item label="Description">{payment.description ?? 'No description'}</Descriptions.Item>
        <Descriptions.Item label="Expense Plan">
          {payment.expensePlan ? `${payment.expensePlan.code} - ${payment.expensePlan.title}` : 'No expense plan'}
        </Descriptions.Item>
        <Descriptions.Item label="Amount">
          <span style={{ fontWeight: 'bold' }}>€{payment.amount?.toFixed(2) ?? '0.00'}</span>
        </Descriptions.Item>
        <Descriptions.Item label="Status">
          <Pill 
            label={getAdvancePaymentStatusDisplay(payment.status).label} 
            type={getAdvancePaymentStatusDisplay(payment.status).type} 
            className="gba:text-center"
          />
        </Descriptions.Item>
        {payment.costCenter && (
          <Descriptions.Item label="Cost Center">
            {payment.costCenter.name}
          </Descriptions.Item>
        )}
        <Descriptions.Item label="Payment Method">
          {payment.paymentMethod ?? 'Not specified'}
        </Descriptions.Item>
      </Descriptions>
      <Divider />
    </div>
  );
};

export default AdvancePaymentDetails;
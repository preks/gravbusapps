import React from 'react';
import { Descriptions, Divider, Button } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import Pill from '@/components/pill/Pill';
import { getExpensePlanStatusDisplay } from '../../utils';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

export interface ExpensePlanDetailsProps extends BusinessAppContextProps {
  selectedItem: any;
  onClose: () => void;
}

const ExpensePlanDetails: React.FC<ExpensePlanDetailsProps> = ({
  selectedItem,
  onClose
}) => {
  if (!selectedItem) return null;

  return (
    <div className="gba:p-4 gba:relative">
      <Button 
        type="text" 
        icon={<CloseOutlined />} 
        onClick={onClose} 
        className="gba:absolute gba:top-2 gba:right-2 gba:z-10" 
        aria-label="Close details"
      />
      <Descriptions bordered column={1}>
        <Descriptions.Item label="Title">{selectedItem.title}</Descriptions.Item>
        <Descriptions.Item label="Code">{selectedItem.code}</Descriptions.Item>
        <Descriptions.Item label="Trip Type">
          {(() => {
            // Try to get request type from the new field structure
            if (selectedItem.requestType?.value) {
              return selectedItem.requestType.value as React.ReactNode;
            }
            // Fallback to additionalProperties if requestType is not available
            const additionalProps = selectedItem.additionalProperties as Record<string, unknown> | null;
            const tripType = additionalProps?.tripType ?? additionalProps?.travelType;
            return (tripType ?? 'Business Travel') as React.ReactNode;
          })()}
        </Descriptions.Item>
        <Descriptions.Item label="Date Range">
          {(selectedItem.startDate && selectedItem.endDate) 
            ? `${new Date(selectedItem.startDate).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})} - ${new Date(selectedItem.endDate).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})}`
            : 'No dates specified'}
        </Descriptions.Item>
        <Descriptions.Item label="Amount">
          {(() => {
            let currencySymbol = '€'; // Default to Euro symbol
            if (selectedItem.currency?.value) {
              currencySymbol = selectedItem.currency.value === 'European euro' ? '€' : selectedItem.currency.value.charAt(0);
            }
            // Add null check for totalAmount
            const amount = typeof selectedItem.totalAmount === 'number' ? selectedItem.totalAmount.toFixed(2) : '0.00';
            return <span style={{ fontWeight: 'bold' }}>{currencySymbol}{amount}</span>;
          })()}
        </Descriptions.Item>
        <Descriptions.Item label="Status">
          <Pill 
            label={getExpensePlanStatusDisplay(selectedItem.status).label} 
            type={getExpensePlanStatusDisplay(selectedItem.status).type} 
            className="gba:text-center"
          />
        </Descriptions.Item>
        {selectedItem.costCenter && (
          <Descriptions.Item label="Cost Center">
            {selectedItem.costCenter.name}
          </Descriptions.Item>
        )}
        {selectedItem.advancePaymentPaidAmount > 0 && (
          <Descriptions.Item label="Advance Payment">
            {(() => {
              let currencySymbol = '€'; // Default to Euro symbol
              if (selectedItem.currency?.value) {
                currencySymbol = selectedItem.currency.value === 'European euro' ? '€' : selectedItem.currency.value.charAt(0);
              }
              // Add null check for advancePaymentPaidAmount
              const amount = typeof selectedItem.advancePaymentPaidAmount === 'number' ? selectedItem.advancePaymentPaidAmount.toFixed(2) : '0.00';
              return <span style={{ fontWeight: 'bold' }}>{currencySymbol}{amount}</span>;
            })()}
          </Descriptions.Item>
        )}
      </Descriptions>
      <Divider />
    </div>
  );
};

export default ExpensePlanDetails;
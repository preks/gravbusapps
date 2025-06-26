import React from 'react';
import { Descriptions, Divider, Typography, Button } from 'antd';
import Pill from '@/components/pill/Pill';
import { getExpensePlanStatusDisplay } from '../../../utils';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { PiCalendarDuotone, PiClock, PiPath, PiArrowRight } from 'react-icons/pi';
import dayjs from 'dayjs';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

export interface ExpenseRequestDetailsProps extends BusinessAppContextProps {
  selectedItem: any;
  onClose: () => void;
}

const { Title, Text } = Typography;

const ExpenseRequestDetails: React.FC<ExpenseRequestDetailsProps> = ({
  selectedItem,
  onClose
}) => {
  if (!selectedItem) return null;
  
  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    let currencySymbol = '€'; // Default to Euro symbol
    if (selectedItem.currency?.value) {
      currencySymbol = selectedItem.currency.value === 'European euro' ? '€' : selectedItem.currency.value.charAt(0);
    }
    return `${currencySymbol}${amount.toFixed(2)}`;
  };
  
  // Get trip type
  const getTripType = () => {
    if (selectedItem.requestType?.value) {
      return selectedItem.requestType.value;
    }
    const additionalProps = selectedItem.additionalProperties as Record<string, unknown> | null;
    const tripType = additionalProps?.tripType ?? additionalProps?.travelType;
    return tripType ?? 'Business Travel';
  };

  return (
    <div className="gba:p-4 gba:relative gba:mb-6">
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
        <div>
          <Title level={4} className="gba:mb-1">{selectedItem.title}</Title>
          <Text type="secondary">{selectedItem.code}</Text>
        </div>
        <Pill 
          type={getExpensePlanStatusDisplay(selectedItem.status).type} 
          label={getExpensePlanStatusDisplay(selectedItem.status).label}
          className="gba:text-base"
          data-testid="expense-request-status-pill"
        />
      </div>
      
      {selectedItem.startDate && selectedItem.endDate && (
        <div className="gba:flex gba:items-center gba:mb-2">
          <PiCalendarDuotone className="gba:mr-2" />
          <Text className="gba:text-sm">
            {getTranslationFromI18nKeyAndLabel('expense.request.duration', 'Duration')}: {' '}
            {dayjs(selectedItem.startDate).format('DD.MM.YYYY')} {' → '} 
            {dayjs(selectedItem.endDate).format('DD.MM.YYYY')}
          </Text>
        </div>
      )}
      
      {selectedItem.requestDate && (
        <div className="gba:flex gba:items-center gba:mb-2">
          <PiClock className="gba:mr-2" />
          <Text className="gba:text-sm">
            {getTranslationFromI18nKeyAndLabel('expense.request.requestDate', 'Request Date')}: {' '}
            {dayjs(selectedItem.requestDate).format('DD.MM.YYYY')}
          </Text>
        </div>
      )}
      
      {selectedItem.decisionDate && (
        <div className="gba:flex gba:items-center gba:mb-4">
          <PiPath className="gba:mr-2" />
          <Text className="gba:text-sm">
            {getTranslationFromI18nKeyAndLabel('expense.request.decisionDate', 'Decision Date')}: {' '}
            {dayjs(selectedItem.decisionDate).format('DD.MM.YYYY')}
          </Text>
        </div>
      )}
      
      {selectedItem.description && (
        <Text className="gba:block gba:mb-4">{selectedItem.description}</Text>
      )}
      
      <Descriptions size="small" column={1}>
        {selectedItem.employee && (
          <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('expense.request.requester', 'Requester')}>
            {selectedItem.employee.fullName}
          </Descriptions.Item>
        )}
        
        {selectedItem.employee?.employeePosition?.supervisor && (
          <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('expense.request.manager', 'Manager')}>
            {selectedItem.employee.employeePosition.supervisor.fullName}
          </Descriptions.Item>
        )}
        
        {selectedItem.costCenter && (
          <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('expense.request.costCenter', 'Cost Center')}>
            {selectedItem.costCenter.name}
          </Descriptions.Item>
        )}
        
        {selectedItem.project && (
          <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('expense.request.project', 'Project')}>
            {selectedItem.project.name}
          </Descriptions.Item>
        )}
        
        <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('expense.request.tripType', 'Trip Type')}>
          {getTripType()}
        </Descriptions.Item>
        
        <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('expense.request.amount', 'Total Amount')}>
          {typeof selectedItem.totalAmount === 'number' ? formatCurrency(selectedItem.totalAmount) : '-'}
        </Descriptions.Item>
        
        {selectedItem.advancePaymentPaidAmount > 0 && (
          <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('expense.request.advancePayment', 'Advance Payment')}>
            {formatCurrency(selectedItem.advancePaymentPaidAmount)}
          </Descriptions.Item>
        )}
      </Descriptions>
      <Divider />
      
      <div className="gba:flex gba:justify-end gba:mt-4">
        <Button 
          type="primary" 
          icon={<PiArrowRight />}
          onClick={() => {
            // Navigate to the expense request record page
            const url = `/platform/fin/expenses/expense-request-record?expenseRequestId=${selectedItem.id}`;
            window.location.href = url;
          }}
          data-testid="view-expense-request-details-button"
        >
          {getTranslationFromI18nKeyAndLabel('expense.request.details.view', 'View Full Details')}
        </Button>
      </div>
    </div>
  );
};

export default ExpenseRequestDetails;
import React from 'react';
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Badge,
  Separator,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@newwork/nw-design-system';
import { getExpensePlanStatusDisplay } from '../../../utils';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { PiCalendarDuotone, PiClock, PiPath, PiArrowRight } from 'react-icons/pi';
import dayjs from 'dayjs';
import { getTranslationFromI18nKeyAndLabel, getDateFormat } from '@/common/utils/windowUtils';
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';

export interface ExpenseRequestDetailsProps extends BusinessAppContextProps {
  selectedItem: any;
  onClose: () => void;
}

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
    <div className="gba:p-6 gba:space-y-6" data-testid="expense-request-details-content">
      {/* Header Section */}
      <div className="gba:flex gba:justify-between gba:items-start gba:mb-6">
        <div className="gba:flex-1">
          <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900 gba:mb-1" data-testid="expense-request-title">
            {selectedItem.title}
          </h2>
          <p className="gba:text-sm gba:text-gray-500" data-testid="expense-request-code">
            {selectedItem.code}
          </p>
        </div>
        <Badge 
          variant={
            getExpensePlanStatusDisplay(selectedItem.status).type === 'completed' ? 'success' : 
            getExpensePlanStatusDisplay(selectedItem.status).type === 'error' ? 'destructive' : 
            getExpensePlanStatusDisplay(selectedItem.status).type === 'task' ? 'warning' : 
            getExpensePlanStatusDisplay(selectedItem.status).type === 'waiting' ? 'secondary' : 'default'
          }
          className="gba:text-sm"
          data-testid="expense-request-status-badge"
        >
          {getExpensePlanStatusDisplay(selectedItem.status).label}
        </Badge>
      </div>
      
      {/* Date Information */}
      <Card>
        <CardContent className="gba:p-4 gba:space-y-3">
          {selectedItem.startDate && selectedItem.endDate && (
            <div className="gba:flex gba:items-center gba:space-x-2">
              <PiCalendarDuotone className="gba:text-gray-500" />
              <span className="gba:text-sm gba:text-gray-700">
                {getTranslationFromI18nKeyAndLabel('expense.request.duration', 'Duration')}: {' '}
                {dayjs(selectedItem.startDate).format(getDateFormat('date.short'))} {' → '} 
                {dayjs(selectedItem.endDate).format(getDateFormat('date.short'))}
              </span>
            </div>
          )}
          
          {selectedItem.requestDate && (
            <div className="gba:flex gba:items-center gba:space-x-2">
              <PiClock className="gba:text-gray-500" />
              <span className="gba:text-sm gba:text-gray-700">
                {getTranslationFromI18nKeyAndLabel('expense.request.requestDate', 'Request Date')}: {' '}
                {dayjs(selectedItem.requestDate).format(getDateFormat('date.short'))}
              </span>
            </div>
          )}
          
          {selectedItem.decisionDate && (
            <div className="gba:flex gba:items-center gba:space-x-2">
              <PiPath className="gba:text-gray-500" />
              <span className="gba:text-sm gba:text-gray-700">
                {getTranslationFromI18nKeyAndLabel('expense.request.decisionDate', 'Decision Date')}: {' '}
                {dayjs(selectedItem.decisionDate).format(getDateFormat('date.short'))}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Description */}
      {selectedItem.description && (
        <Card>
          <CardHeader>
            <CardTitle className="gba:text-base">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="gba:text-sm gba:text-gray-700" data-testid="expense-request-description">
              {selectedItem.description}
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Details Information */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:text-base">Request Details</CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          <div className="gba:grid gba:grid-cols-1 gba:gap-4">
            {selectedItem.employee && (
              <div className="gba:flex gba:justify-between gba:items-center">
                <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                  {getTranslationFromI18nKeyAndLabel('expense.request.requester', 'Requester')}
                </span>
                <span className="gba:text-sm gba:text-gray-900">{selectedItem.employee.fullName}</span>
              </div>
            )}
            
            {selectedItem.employee?.employeePosition?.supervisor && (
              <div className="gba:flex gba:justify-between gba:items-center">
                <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                  {getTranslationFromI18nKeyAndLabel('expense.request.manager', 'Manager')}
                </span>
                <span className="gba:text-sm gba:text-gray-900">{selectedItem.employee.employeePosition.supervisor.fullName}</span>
              </div>
            )}
            
            {selectedItem.costCenter && (
              <div className="gba:flex gba:justify-between gba:items-center">
                <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                  {getTranslationFromI18nKeyAndLabel('expense.request.costCenter', 'Cost Center')}
                </span>
                <span className="gba:text-sm gba:text-gray-900">{selectedItem.costCenter.name}</span>
              </div>
            )}
            
            {selectedItem.project && (
              <div className="gba:flex gba:justify-between gba:items-center">
                <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                  {getTranslationFromI18nKeyAndLabel('expense.request.project', 'Project')}
                </span>
                <span className="gba:text-sm gba:text-gray-900">{selectedItem.project.name}</span>
              </div>
            )}
            
            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                {getTranslationFromI18nKeyAndLabel('expense.request.tripType', 'Trip Type')}
              </span>
              <span className="gba:text-sm gba:text-gray-900">{getTripType()}</span>
            </div>
            
            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                {getTranslationFromI18nKeyAndLabel('expense.request.amount', 'Total Amount')}
              </span>
              <span className="gba:text-sm gba:font-semibold gba:text-gray-900">
                {typeof selectedItem.totalAmount === 'number' ? formatCurrency(selectedItem.totalAmount) : '-'}
              </span>
            </div>
            
            {(() => {
              const advanceAmountValue = selectedItem.expensePlan?.advancePaymentAggregate?.aggregate?.sum?.amount;
              const advanceAmount = advanceAmountValue && advanceAmountValue > 0 ? advanceAmountValue : null;
              
              return advanceAmount ? (
                <div className="gba:flex gba:justify-between gba:items-center">
                  <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                    {getTranslationFromI18nKeyAndLabel('expense.request.advancePayment', 'Advance Payment')}
                  </span>
                  <span className="gba:text-sm gba:font-semibold gba:text-gray-900">
                    {formatCurrency(advanceAmount)}
                  </span>
                </div>
              ) : null;
            })()}
          </div>
        </CardContent>
      </Card>
      
      <Separator />
      
      {/* Action Button */}
      <div className="gba:flex gba:justify-end">
        <Button 
          variant="default"
          onClick={() => {
            // Navigate to the expense request record page
            const url = buildPlatformUrl('/platform/fin/expenses/expense-request-record', { expenseRequestId: selectedItem.id });
            navigateTo(url);
          }}
          data-testid="view-expense-request-details-button"
        >
          <PiArrowRight className="gba:mr-2" />
          {getTranslationFromI18nKeyAndLabel('expense.request.details.view', 'View Full Details')}
        </Button>
      </div>
    </div>
  );
};

export default ExpenseRequestDetails;
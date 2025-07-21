import React from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Separator,
  Button,
  Badge
} from '@newwork/nw-design-system';
import { PiCheck, PiX, PiCalendarDuotone, PiClock, PiPath, PiArrowRight } from 'react-icons/pi';
import Pill from '@/components/pill/Pill';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import dayjs from 'dayjs';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';



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

  // Helper function to get department safely
  const getDepartment = () => {
    // Check the nested organizational unit structure first (from API response)
    if (plan.employee?.employeePosition?.organizationalUnit?.name) {
      return plan.employee.employeePosition.organizationalUnit.name;
    }
    // Fallback to direct department field
    if (plan.employee?.department) {
      return plan.employee.department;
    }
    // Fallback to additional properties
    if (plan.employee?.additionalProperties?.department) {
      return plan.employee.additionalProperties.department;
    }
    return 'Not specified';
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
        <h5 className="gba:text-base gba:font-medium gba:mb-2">Budget Items</h5>
        {plan.budgetItems.map((item: any) => (
          <div key={`${item.category}-${item.amount}`} className="gba:border gba:rounded gba:p-2">
            <div className="gba:flex gba:justify-between">
              <span className="gba:font-medium">{item.category}</span>
              <span>{formatCurrency(item.amount, plan.currency?.value)}</span>
            </div>
            {item.description && <p className="gba:text-sm gba:text-gray-600 gba:mt-1">{item.description}</p>}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="gba:p-4 gba:relative gba:mb-6">
      <CardHeader className="gba:pb-2">
        <div className="gba:flex gba:justify-between gba:items-center">
          <div>
            <CardTitle className="gba:text-lg gba:mb-1">{plan.title}</CardTitle>
            <p className="gba:text-sm gba:text-gray-600">{plan.code || ''}</p>
          </div>
          <Pill 
            type={getExpensePlanStatusDisplay(plan.status).type} 
            label={getExpensePlanStatusDisplay(plan.status).label}
            className="gba:text-base"
            data-testid="expense-plan-status-pill"
          />
        </div>
      </CardHeader>
      
      <CardContent className="gba:space-y-2">
        {plan.startDate && plan.endDate && (
          <div className="gba:flex gba:items-center">
            <PiCalendarDuotone className="gba:mr-2" />
            <span className="gba:text-sm">
              {getTranslationFromI18nKeyAndLabel('expense.plan.duration', 'Duration')}: {' '}
              {dayjs(plan.startDate).format('DD.MM.YYYY')} {' → '} 
              {dayjs(plan.endDate).format('DD.MM.YYYY')}
            </span>
          </div>
        )}
        
        {plan.planDate && (
          <div className="gba:flex gba:items-center">
            <PiClock className="gba:mr-2" />
            <span className="gba:text-sm">
              {getTranslationFromI18nKeyAndLabel('expense.plan.planDate', 'Plan Date')}: {' '}
              {dayjs(plan.planDate).format('DD.MM.YYYY')}
            </span>
          </div>
        )}
        
        {plan.decisionDate && (
          <div className="gba:flex gba:items-center">
            <PiPath className="gba:mr-2" />
            <span className="gba:text-sm">
              {getTranslationFromI18nKeyAndLabel('expense.plan.decisionDate', 'Decision Date')}: {' '}
              {dayjs(plan.decisionDate).format('DD.MM.YYYY')}
            </span>
          </div>
        )}
        
        {plan.description && (
          <p className="gba:block gba:mb-4">{plan.description}</p>
        )}
      
        <div className="gba:space-y-3">
          {plan.employee && (
            <div className="gba:flex gba:justify-between">
              <span className="gba:font-medium">{getTranslationFromI18nKeyAndLabel('expense.plan.requester', 'Requester')}</span>
              <span>{plan.employee.fullName}</span>
            </div>
          )}
          
          {plan.employee && (
            <div className="gba:flex gba:justify-between">
              <span className="gba:font-medium">{getTranslationFromI18nKeyAndLabel('expense.plan.department', 'Department')}</span>
              <span>{getDepartment()}</span>
            </div>
          )}
          
          {plan.employee?.employeePosition?.supervisor && (
            <div className="gba:flex gba:justify-between">
              <span className="gba:font-medium">{getTranslationFromI18nKeyAndLabel('expense.plan.manager', 'Manager')}</span>
              <span>{plan.employee.employeePosition.supervisor.fullName}</span>
            </div>
          )}
          
          {plan.costCenter && (
            <div className="gba:flex gba:justify-between">
              <span className="gba:font-medium">{getTranslationFromI18nKeyAndLabel('expense.plan.costCenter', 'Cost Center')}</span>
              <span>{plan.costCenter.name}</span>
            </div>
          )}
          
          {plan.project && (
            <div className="gba:flex gba:justify-between">
              <span className="gba:font-medium">{getTranslationFromI18nKeyAndLabel('expense.plan.project', 'Project')}</span>
              <span>{plan.project.name}</span>
            </div>
          )}
          
          <div className="gba:flex gba:justify-between">
            <span className="gba:font-medium">{getTranslationFromI18nKeyAndLabel('expense.plan.tripType', 'Trip Type')}</span>
            <span>{getTripType()}</span>
          </div>
          
          <div className="gba:flex gba:justify-between">
            <span className="gba:font-medium">{getTranslationFromI18nKeyAndLabel('expense.plan.amount', 'Total Amount')}</span>
            <span>{typeof plan.totalAmount === 'number' ? formatCurrency(plan.totalAmount, plan.currency?.value) : '-'}</span>
          </div>
          
          {plan.advancePaymentPaidAmount > 0 && (
            <div className="gba:flex gba:justify-between">
              <span className="gba:font-medium">{getTranslationFromI18nKeyAndLabel('expense.plan.advancePayment', 'Advance Payment')}</span>
              <span>{formatCurrency(plan.advancePaymentPaidAmount, plan.currency?.value)}</span>
            </div>
          )}
        </div>

        {renderBudgetItems()}
      </CardContent>
      
      <Separator className="gba:my-4" />
      
      <div className="gba:flex gba:justify-between gba:mt-4 gba:px-4 gba:pb-4">
        {plan.status === 'PENDING' && (
          <div className="gba:flex gba:gap-2">
            <Button 
              variant="destructive"
              onClick={handleReject}
              data-testid="reject-plan-button"
            >
              <PiX className="gba:mr-2" />
              {getTranslationFromI18nKeyAndLabel('expense.plan.reject', 'Reject')}
            </Button>
            <Button 
              variant="default"
              onClick={handleApprove}
              data-testid="approve-plan-button"
            >
              <PiCheck className="gba:mr-2" />
              {getTranslationFromI18nKeyAndLabel('expense.plan.approve', 'Approve')}
            </Button>
          </div>
        )}
        
        <Button 
          variant="default"
          onClick={() => {
            // Navigate to the expense plan record page
            const url = buildPlatformUrl('/platform/fin/expenses/expense-plan-record', { expensePlanId: plan.id });
            navigateTo(url);
          }}
          data-testid="view-expense-plan-details-button"
        >
          <PiArrowRight className="gba:mr-2" />
          {getTranslationFromI18nKeyAndLabel('expense.plan.details.view', 'View Full Details')}
        </Button>
      </div>
    </Card>
  );
};

export default ExpensePlanDetails;

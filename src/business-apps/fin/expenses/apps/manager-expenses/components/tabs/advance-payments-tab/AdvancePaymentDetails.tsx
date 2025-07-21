import React from 'react';
import { Button } from '@newwork/nw-design-system';
import { PiArrowRight } from 'react-icons/pi';
import Pill from '@/components/pill/Pill';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';
import { formatAmount } from '../../../utils/currencyUtils';

export interface AdvancePaymentDetailsProps extends BusinessAppContextProps {
  payment: any;
  onApprove: (paymentId: string) => void;
  onReject: (paymentId: string) => void;
}

// Shared component for expense details view (same as in other components)
interface ExpenseDetailsViewProps {
  title: string;
  code: string;
  status: string;
  requester: string;
  department: string;
  tripType: string;
  totalAmount: string;
  onViewDetails: () => void;
}

const ExpenseDetailsView: React.FC<ExpenseDetailsViewProps> = ({
  title,
  code,
  status,
  requester,
  department,
  tripType,
  totalAmount,
  onViewDetails
}) => {
  // Helper function to get status display info
  const getStatusDisplay = (status: string) => {
    type PillType = 'draft' | 'completed' | 'waiting' | 'task' | 'error';
    
    const statusMap: Record<string, { label: string; type: PillType }> = {
      DRAFT: { label: 'Draft', type: 'draft' },
      PENDING: { label: 'Pending Approval', type: 'waiting' },
      APPROVED: { label: 'Approved', type: 'completed' },
      REJECTED: { label: 'Rejected', type: 'error' },
      PAID: { label: 'Paid', type: 'completed' },
      CREATED: { label: 'Created', type: 'waiting' },
    };

    return statusMap[status] || { label: status, type: 'waiting' };
  };

  return (
    <div className="gba:p-6">
      <div className="gba:mb-6">
        <h3 className="gba:text-lg gba:font-medium gba:mb-2">{title}</h3>
        <p className="gba:text-sm gba:text-gray-600 gba:mb-4">{code}</p>
        <Pill 
          type={getStatusDisplay(status).type} 
          label={getStatusDisplay(status).label}
        />
      </div>

      <div className="gba:mb-6">
        <div className="gba:space-y-4">
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div>
              <div className="gba:text-sm gba:font-medium gba:text-gray-500">Requester</div>
              <div className="gba:text-sm">{requester}</div>
            </div>
            <div>
              <div className="gba:text-sm gba:font-medium gba:text-gray-500">Department</div>
              <div className="gba:text-sm">{department}</div>
            </div>
            <div>
              <div className="gba:text-sm gba:font-medium gba:text-gray-500">Purpose</div>
              <div className="gba:text-sm">{tripType}</div>
            </div>
            <div>
              <div className="gba:text-sm gba:font-medium gba:text-gray-500">Total Amount</div>
              <div className="gba:text-sm">{totalAmount}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="gba:flex gba:justify-end gba:mt-6">
        <Button 
          variant="default"
          onClick={onViewDetails}
          data-testid="view-full-details-button"
          className="gba:flex gba:items-center gba:gap-2"
        >
          <PiArrowRight className="gba:w-4 gba:h-4" />
          {getTranslationFromI18nKeyAndLabel('expense.details.view', 'View Full Details')}
        </Button>
      </div>
    </div>
  );
};

const AdvancePaymentDetails: React.FC<AdvancePaymentDetailsProps> = ({
  payment,
  onApprove,
  onReject
}) => {
  // Helper function to get department safely
  const getDepartment = () => {
    // Check the expense plan employee first (primary source)
    if (payment.expensePlan?.employee?.employeePosition?.organizationalUnit?.name) {
      return payment.expensePlan.employee.employeePosition.organizationalUnit.name;
    }
    if (payment.expensePlan?.employee?.department) {
      return payment.expensePlan.employee.department;
    }
    // Fallback to payment employee
    if (payment.employee?.employeePosition?.organizationalUnit?.name) {
      return payment.employee.employeePosition.organizationalUnit.name;
    }
    if (payment.employee?.department) {
      return payment.employee.department;
    }
    // Fallback to additional properties
    if (payment.employee?.additionalProperties?.department) {
      return payment.employee.additionalProperties.department;
    }
    return 'Not specified';
  };

  const handleViewDetails = () => {
    const url = buildPlatformUrl('/platform/fin/expenses/advance-payment-record', { advancePaymentId: payment.id });
    navigateTo(url);
  };

  return (
    <ExpenseDetailsView
      title={payment.expensePlan?.title || 'No title'}
      code={payment.expensePlan?.code || ''}
      status={payment.status}
      requester={payment.expensePlan?.employee?.fullName || payment.employee?.fullName || 'Unknown'}
      department={getDepartment()}
      tripType={payment.purpose || 'Advance Payment'}
      totalAmount={payment.amount ? `€${formatAmount(payment.amount)}` : '€0,00'}
      onViewDetails={handleViewDetails}
    />
  );
};

export default AdvancePaymentDetails;

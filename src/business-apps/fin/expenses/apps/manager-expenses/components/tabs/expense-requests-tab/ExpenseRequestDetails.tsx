import React from 'react';
import { Button } from '@newwork/nw-design-system';
import { PiArrowRight } from 'react-icons/pi';
import Pill from '@/components/pill/Pill';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { formatCurrency } from '../../../utils/currencyUtils';

export interface ExpenseRequestDetailsProps extends BusinessAppContextProps {
  request: any;
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
}

const ExpenseRequestDetails: React.FC<ExpenseRequestDetailsProps> = ({
  request
}) => {
  // Helper function to format date safely
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return '-';
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      return '-';
    }
  };

  // Helper function to get department safely
  const getDepartment = () => {
    // Check the nested organizational unit structure first (from API response)
    if (request.employee?.employeePosition?.organizationalUnit?.name) {
      return request.employee.employeePosition.organizationalUnit.name;
    }
    // Fallback to direct department field
    if (request.employee?.department) {
      return request.employee.department;
    }
    // Fallback to additional properties
    if (request.employee?.additionalProperties?.department) {
      return request.employee.additionalProperties.department;
    }
    return 'Not specified';
  };

  // Handle view full details navigation
  const handleViewFullDetails = () => {
    const url = buildPlatformUrl('/platform/fin/expenses/expense-request-record', { expenseRequestId: request.id });
    navigateTo(url);
  };

  return (
    <div className="gba:p-6">
      <div className="gba:mb-6">
        <Pill 
          type={request.status === 'APPROVED' ? 'completed' :
                request.status === 'REJECTED' ? 'error' :
                request.status === 'DRAFT' ? 'draft' : 'waiting'}
          label={request.status}
        />
      </div>

      <div className="gba:mb-6">
        <h3 className="gba:text-lg gba:font-medium gba:mb-4">Request Details</h3>
        <div className="gba:space-y-4">
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div>
              <div className="gba:text-sm gba:font-medium gba:text-gray-500">Title</div>
              <div className="gba:text-sm">{request.title || 'No title'}</div>
            </div>
            <div>
              <div className="gba:text-sm gba:font-medium gba:text-gray-500">Employee</div>
              <div className="gba:text-sm">{request.employee?.fullName || request.employee?.displayName || 'Unknown'}</div>
            </div>
            <div>
              <div className="gba:text-sm gba:font-medium gba:text-gray-500">Department</div>
              <div className="gba:text-sm">{getDepartment()}</div>
            </div>
            <div>
              <div className="gba:text-sm gba:font-medium gba:text-gray-500">Request Date</div>
              <div className="gba:text-sm">{formatDate(request.requestDate)}</div>
            </div>
            <div>
              <div className="gba:text-sm gba:font-medium gba:text-gray-500">Amount</div>
              <div className="gba:text-sm">{formatCurrency(request.amount)}</div>
            </div>
          </div>
          <div>
            <div className="gba:text-sm gba:font-medium gba:text-gray-500">Description</div>
            <div className="gba:text-sm">{request.description || 'No description provided'}</div>
          </div>
        </div>
      </div>

      <div className="gba:flex gba:justify-end gba:mt-6">
        <Button 
          variant="default"
          onClick={handleViewFullDetails}
          data-testid="view-expense-request-details-button"
          className="gba:flex gba:items-center gba:gap-2"
        >
          <PiArrowRight className="gba:w-4 gba:h-4" />
          {getTranslationFromI18nKeyAndLabel('expense.request.details.view', 'View Full Details')}
        </Button>
      </div>
    </div>
  );
};

export default ExpenseRequestDetails;

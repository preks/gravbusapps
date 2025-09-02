import React from 'react';
import { Button } from '@newwork/nw-design-system';
import { PiArrowRight, PiCheckCircle, PiXCircle } from 'react-icons/pi';
import Pill from '@/components/pill/Pill';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';
import { useCurrencyStore } from '../../../store/useCurrencyStore';
import { formatCurrency } from '../../../utils/currencyUtils';

export interface ExpenseRequestDetailsProps extends BusinessAppContextProps {
  request: any;
  onApprove?: (requestId: string) => Promise<void>;
  onReject?: (requestId: string) => Promise<void>;
}

// Shared component for expense details view
interface ExpenseDetailsViewProps {
  title: string;
  code: string;
  status: string;
  requester: string;
  department: string;
  tripType: string;
  totalAmount: string;
  onViewDetails: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  canApprove: boolean;
  canReject: boolean;
}

const ExpenseDetailsView: React.FC<ExpenseDetailsViewProps> = ({
  title,
  code,
  status,
  requester,
  department,
  tripType,
  totalAmount,
  onViewDetails,
  onApprove,
  onReject,
  canApprove,
  canReject
}) => {
  // Helper function to get status display info
  const getStatusDisplay = (status: string) => {
    type PillType = "draft" | "completed" | "waiting" | "task" | "error";

    const statusMap: Record<string, { label: string; type: PillType }> = {
      DRAFT: { label: "Draft", type: "draft" },
      PENDING: { label: "Pending Approval", type: "waiting" },
      APPROVED: { label: "Approved", type: "completed" },
      REJECTED: { label: "Rejected", type: "error" },
      PAID: { label: "Paid", type: "completed" },
      CREATED: { label: "Created", type: "waiting" },
    };

    return statusMap[status] || { label: status, type: "waiting" };
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
        <h3 className="gba:text-lg gba:font-medium gba:mb-4">
          Request Details
        </h3>
        <div className="gba:space-y-4">
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div>
              <div className="gba:text-sm gba:font-medium gba:text-gray-500">
                Requester
              </div>
              <div className="gba:text-sm">{requester}</div>
            </div>
            <div>
              <div className="gba:text-sm gba:font-medium gba:text-gray-500">
                Department
              </div>
              <div className="gba:text-sm">{department}</div>
            </div>
            <div>
              <div className="gba:text-sm gba:font-medium gba:text-gray-500">
                Trip Type
              </div>
              <div className="gba:text-sm">{tripType}</div>
            </div>
            <div>
              <div className="gba:text-sm gba:font-medium gba:text-gray-500">
                Total Amount
              </div>
              <div className="gba:text-sm">{totalAmount}</div>
            </div>
          </div>
          <div>
            <div className="gba:text-sm gba:font-medium gba:text-gray-500">
              Description
            </div>
            <div className="gba:text-sm">
              {request.description || "No description provided"}
            </div>
          </div>
        </div>
      </div>

      <div className="gba:mt-8 gba:flex gba:justify-end gba:gap-3">
        {canApprove && onApprove && (
          <Button 
            variant="default" 
            onClick={onApprove} 
            className="gba:flex gba:items-center gba:gap-2 gba:bg-green-500 gba:text-white gba:hover:bg-green-600" 
            data-testid="expense-request-approve-button"
          >
            {getTranslationFromI18nKeyAndLabel('expense_request_approve', 'Approve')}
            <PiCheckCircle className="gba:h-4 gba:w-4" />
          </Button>
        )}
        {canReject && onReject && (
          <Button 
            variant="destructive" 
            onClick={onReject} 
            className="gba:flex gba:items-center gba:gap-2" 
            data-testid="expense-request-reject-button"
          >
            {getTranslationFromI18nKeyAndLabel('expense_request_reject', 'Reject')}
            <PiXCircle className="gba:h-4 gba:w-4" />
          </Button>
        )}
        <Button onClick={onViewDetails} className="gba:flex gba:items-center gba:gap-2" data-testid="expense-request-view-details-button">
          {getTranslationFromI18nKeyAndLabel('expense_request_view_details', 'View Details')}
          <PiArrowRight className="gba:h-4 gba:w-4" />
        </Button>
      </div>
    </div>
  );
};

const ExpenseRequestDetails: React.FC<ExpenseRequestDetailsProps> = ({
  request,
  onApprove,
  onReject,
}) => {
  // Use the currency store
  const { primaryCurrency } = useCurrencyStore();

  // Helper function to get department safely
  const getDepartment = () => {
    return request.employee?.department || "Not specified";
  };

  const handleViewDetails = () => {
    const url = buildPlatformUrl(
      "/platform/fin/expenses/expense-request-record",
      { expenseRequestId: request.id }
    );
    navigateTo(url);
  };

  // Determine if approval/rejection actions are available based on status
  const canApprove = request.status === 'IN_APPROVAL' || request.status === 'VERIFICATION_REQUIRED';
  const canReject = request.status === 'IN_APPROVAL' || request.status === 'VERIFICATION_REQUIRED';

  const handleApprove = () => {
    if (onApprove) {
      onApprove(request.id);
    }
  };

  const handleReject = () => {
    if (onReject) {
      onReject(request.id);
    }
  };

  return (
    <ExpenseDetailsView
      title={request.title}
      code={request.code || ""}
      status={request.status}
      requester={request.employee?.fullName || "Unknown"}
      department={getDepartment()}
      tripType="Business Travel"
      totalAmount={typeof request.amount === 'number' ? formatCurrency(request.amount, primaryCurrency || request.currency) : '-'}
      onViewDetails={handleViewDetails}
      onApprove={handleApprove}
      onReject={handleReject}
      canApprove={canApprove}
      canReject={canReject}
    />
  );
};

export default ExpenseRequestDetails;

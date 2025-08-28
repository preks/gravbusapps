import React from 'react';
import { Button } from '@newwork/nw-design-system';
import { PiArrowRight } from 'react-icons/pi';
import Pill from '@/components/pill/Pill';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';
import { useCurrencyStore } from '../../../store/useCurrencyStore';
import { formatCurrency } from '../../../utils/currencyUtils';

export interface ExpensePlanDetailsProps extends BusinessAppContextProps {
  plan: any;
  onApprove?: (planId: string) => Promise<void>;
  onReject?: (planId: string) => Promise<void>;
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
          {getTranslationFromI18nKeyAndLabel(
            "expense.details.view",
            "View Full Details"
          )}
        </Button>
      </div>
    </div>
  );
};

const ExpensePlanDetails: React.FC<ExpensePlanDetailsProps> = ({
  plan,
  onApprove,
  onReject,
}) => {
  // Use the currency store for global currency state management
  const { primaryCurrency } = useCurrencyStore();

  // Get trip type
  const getTripType = () => {
    if (plan.requestType?.value) {
      return plan.requestType.value;
    }
    const additionalProps = plan.additionalProperties as Record<
      string,
      unknown
    > | null;
    const tripType = additionalProps?.tripType ?? additionalProps?.travelType;
    return tripType ?? "Business Travel";
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
    return "Not specified";
  };

  const handleViewDetails = () => {
    const url = buildPlatformUrl("/platform/fin/expenses/expense-plan-record", {
      expensePlanId: plan.id,
    });
    navigateTo(url);
  };

  return (
    <ExpenseDetailsView
      title={plan.title || "No title"}
      code={plan.code || ""}
      status={plan.status}
      requester={
        plan.employee?.fullName || plan.employee?.displayName || "Unknown"
      }
      department={getDepartment()}
      tripType={getTripType()}
      totalAmount={typeof plan.totalAmount === 'number' ? formatCurrency(plan.totalAmount, primaryCurrency || plan.currency?.value) : '-'}
      onViewDetails={handleViewDetails}
    />
  );
};

export default ExpensePlanDetails;

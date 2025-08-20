export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  pictureThumbnail?: string;
  employeePosition?: {
    jobPosition?: {
      name: string;
    };
  };
}

export interface RequestType {
  code: string;
  value: string;
}

export interface Currency {
  code: string;
}

export interface CostCenter {
  code: string;
  name: string;
}

export interface ExpensePlan {
  employee: Employee;
  code: string;
  requestType: RequestType;
  currency: Currency;
  totalAmount: number;
  title: string;
}

export interface AdvancePaymentData {
  expensePlanId: string;
  expensePlan: ExpensePlan;
  amount: number;
  description?: string;
  currency: Currency;
  paymentMethod: string;
  costCenter: CostCenter;
}

export interface AdvancePaymentApprovalProps {
  isOpen?: boolean; // Made optional with default value
  onClose?: () => void; // Made optional with default value
  onApprove?: (message?: string) => void; // Made optional with default value
  onReject?: (message?: string) => void; // Made optional with default value
  paymentId?: string; // Made optional since we can get it from additionalData
  accessToken: string;
  additionalData?: {
    psi_taskPayload?: {
      advancePayment?: {
        id: string;
      };
    };
  };
}

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
  isOpen?: boolean;
  onClose?: () => void;
  onApprove?: (message?: string) => void;
  onReject?: (message?: string) => void;
  paymentId?: string;
  accessToken: string;
  additionalData?: {
    psi_taskPayload?: {
      advancePayment?: {
        id: string;
      };
    };
  };
}

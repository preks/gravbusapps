export interface ExpensePlanRecordProps {
  value: string;
  translations?: {
    value: string;
    localeCode: string;
  }[];
  code?: string;
}

export interface ExpensePlanItem {
  code: string | null;
  title: string;
  expenseGroup: {
    value: string;
  };
  expenseClass: {
    value: string;
  };
  expenseDate: string;
  totalAmount: number;
  reimbursableAmount: number;
  nonDeductibleAmount: number;
  deductibleAmount: number;
}

export interface ExpenseAllowance {
  allowanceDate: string;
  travelRegion: {
    value: string;
  };
  dayRate: number;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  overnight: boolean;
  overnightAccommodation: boolean;
  deductionLimit: number;
}

export interface ExpenseRequestTrip {
  tripOrder: number;
  tripDateTime: string;
  tripDirection: string;
  address: string;
  pointType: string;
  country: {
    value: string;
  };
  travelRegion: {
    value: string;
  };
}

export interface AdvancePayment {
  code: string | null;
  description: string | null;
  decisionDate: string | null;
  amount: number;
  currency: {
    code: string;
  };
  paymentMethod: string;
  status: string;
  transactionDate: string | null;
  transactionNumber: string | null;
  transactionConfirmed: boolean;
  transactionConfirmedByEmployee: string | null;
}

export interface ExpensePlanComment {
  comment: string;
  commentDate: string;
  commentType: string;
}

export interface ExpensePlanRecord {
  code: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  planDate: string;
  decisionDate: string | null;
  requestType: {
    value: string;
  };
  costCenter: {
    name: string;
  };
  project: {
    name: string;
  };
  currency: {
    code: string;
  };
  status: string;
  employee: {
    fullName: string;
    pictureThumbnail?: string;
    employeePosition?: {
      supervisor?: {
        fullName: string;
      };
    };
  };
  totalAmount: number;
  reimbursableAmount: number;
  nonReimbursableAmount: number;
  deductibleAmount: number;
  nonDeductibleAmount: number;
  expenseRequest: any[];
  expensePlanComment: ExpensePlanComment[];
  expensePlanItem: ExpensePlanItem[];
  expenseAllowance: ExpenseAllowance[];
  expenseRequestTrip: ExpenseRequestTrip[];
  advancePayment: AdvancePayment[];
}

export interface ExpensePlanRecordResponse {
  data: {
    ExpensePlan: ExpensePlanRecord[];
  };
}

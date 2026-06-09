export interface ExpensePlanRecordProps {
  value: string
  translations?: {
    value: string
    localeCode: string
  }[]
  code?: string
}

/** Plan-level amount aggregates from ExpensePlanByPk (backend-computed). */
export interface ExpensePlanAmountTotals {
  totalAmount: number
  reimbursableAmount: number
  nonReimbursableAmount: number
  deductibleAmount: number
  nonDeductibleAmount: number
}

export interface ExpensePlanItem {
  id?: string
  code: string | null
  title: string
  costCenter?: {
    name: string | null
  } | null
  currency: {
    code: string
  }
  expenseGroup: {
    value: string
  }
  expenseClass?: {
    id: string
    code: string
    value: string
    objectValue?: any
  }
  expenseDate: string
  totalAmount: number
  reimbursableAmount: number
  nonDeductibleAmount: number
  deductibleAmount: number
}

export interface ExpenseAllowance {
  allowanceDate: string
  travelRegion: {
    value: string
  }
  dayRate: number
  breakfast: boolean
  lunch: boolean
  dinner: boolean
  overnight: boolean
  overnightAccommodation: boolean
  deductionLimit: number
}

export interface ExpenseRequestTrip {
  tripOrder: number
  tripDateTime: string
  tripDirection: string
  address: string
  pointType: string
  country: {
    value: string
  }
  travelRegion: {
    value: string
  }
}

export interface AdvancePaymentComment {
  commentType?: string
  commentDate: string
  comment: string
  id: string
  authorEmployee: {
    fullName: string
    firstName: string
    lastName: string
    pictureThumbnail: string
  }
}

export interface AdvancePayment {
  code: string | null
  description: string | null
  decisionDate: string | null
  amount: number
  currency: {
    code: string
  }
  paymentMethod: string
  status: string
  transactionDate: string | null
  transactionNumber: string | null
  transactionConfirmed: boolean
  transactionConfirmedByEmployee: string | null
  advancePaymentComment: AdvancePaymentComment[]
}

export interface ExpensePlanComment {
  comment: string
  commentDate: string
  commentType: string
  authorEmployee: {
    fullName: string
    firstName: string
    lastName: string
    pictureThumbnail: string
  }
}

export interface ExpensePlanRecord {
  code: string
  title: string
  description: string
  startDate: string
  endDate: string
  planDate: string
  decisionDate: string | null
  requestType: {
    value: string
  }
  costCenter: {
    name: string
  }
  project: {
    name: string
  }
  currency: {
    code: string
  }
  status: string
  employee: {
    fullName: string
    firstName: string
    lastName: string
    pictureThumbnail?: string
    employeePosition?: {
      costCenter?: {
        name: string
      }
      supervisor?: {
        firstName: string
        lastName: string
        fullName: string
      }
    }
  }
  totalAmount: number
  reimbursableAmount: number
  nonReimbursableAmount: number
  deductibleAmount: number
  nonDeductibleAmount: number
  expenseRequest: any[]
  expensePlanComment: ExpensePlanComment[]
  expensePlanItem: ExpensePlanItem[]
  expenseAllowance: ExpenseAllowance[]
  expenseRequestTrip: ExpenseRequestTrip[]
  advancePayment: AdvancePayment[]
}

export interface ExpensePlanRecordResponse {
  data: {
    ExpensePlan: ExpensePlanRecord[]
  }
}

import { ExpenseRequest } from './expenseRequestType'

export interface ExpensePlanRecordProps {
  value: string
  translations?: {
    value: string
    localeCode: string
  }[]
  code?: string
}

export interface ExpensePlanItem {
  code: string | null
  title: string
  expenseGroup: {
    value: string
  }
  expenseClass: {
    value: string
  }
  /** ISO 8601 date string (e.g., "2024-03-15T10:30:00.000Z") */
  expenseDate: string
  totalAmount: number
  reimbursableAmount: number
  nonDeductibleAmount: number
  deductibleAmount: number
}

export interface ExpenseAllowance {
  /** ISO 8601 date string (e.g., "2024-03-15T10:30:00.000Z") */
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
  /** ISO 8601 date string (e.g., "2024-03-15T10:30:00.000Z") */
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

export interface AdvancePayment {
  code: string | null
  description: string | null
  /** ISO 8601 date string (e.g., "2024-03-15T10:30:00.000Z") */
  decisionDate: string | null
  amount: number
  currency: {
    code: string
  }
  paymentMethod: string
  status: string
  /** ISO 8601 date string (e.g., "2024-03-15T10:30:00.000Z") */
  transactionDate: string | null
  transactionNumber: string | null
  transactionConfirmed: boolean
  transactionConfirmedByEmployee: string | null
}

export interface ExpensePlanComment {
  comment: string
  /** ISO 8601 date string (e.g., "2024-03-15T10:30:00.000Z") */
  commentDate: string
  commentType: string
}

export interface ExpensePlanRecord {
  code: string
  title: string
  description: string
  /** ISO 8601 date string (e.g., "2024-03-15T10:30:00.000Z") */
  startDate: string
  /** ISO 8601 date string (e.g., "2024-03-15T10:30:00.000Z") */
  endDate: string
  /** ISO 8601 date string (e.g., "2024-03-15T10:30:00.000Z") */
  planDate: string
  /** ISO 8601 date string (e.g., "2024-03-15T10:30:00.000Z") */
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
    pictureThumbnail?: string
    employeePosition?: {
      supervisor?: {
        fullName: string
      }
    }
  }
  totalAmount: number
  reimbursableAmount: number
  nonReimbursableAmount: number
  deductibleAmount: number
  nonDeductibleAmount: number
  expenseRequest: ExpenseRequest[]
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

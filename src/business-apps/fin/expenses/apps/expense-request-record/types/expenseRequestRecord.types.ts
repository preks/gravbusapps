export interface ExpenseRequestRecordProps {
  value: string
  translations?: {
    value: string
    localeCode: string
  }[]
  code?: string
}

export interface ExpensePosition {
  positionOrder: number
  totalAmount: number
  reimbursableAmount: number
  nonReimbursableAmount: number
  deductibleAmount: number
  nonDeductibleAmount: number
  expenseGroup: {
    value: string
    translations?: Array<{
      localeCode: string
      value: string
    }>
  }
  costCenter?: {
    name: string
  }
}

export interface ExpenseRequestItem {
  id: string
  code: string | null
  title: string
  status: string
  expenseGroup: {
    value: string
  }
  expenseClass: {
    value: string
  }
  expensePosition: ExpensePosition[]
  currency: {
    code: string
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

export interface ExpenseRequestTripType {
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
}

export interface ExpenseRequestComment {
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

export interface ExpensePlan {
  code: string
  title: string
  description: string
  startDate: string
  endDate: string
  planDate: string
  totalAmount: number
  reimbursableAmount: number
  nonReimbursableAmount: number
  deductibleAmount: number
  nonDeductibleAmount: number
  advancePayment: AdvancePayment[]
}

export interface ExpenseRequestRecord {
  code: string
  title: string
  description: string
  startDate: string
  endDate: string
  requestDate: string
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
    id: string
    fullName: string
    firstName?: string
    lastName?: string
    pictureThumbnail?: string
    employeePosition?: {
      supervisor?: {
        fullName: string
        firstName?: string
        lastName?: string
      }
    }
  }
  expensePlan: ExpensePlan
  totalAmount: number
  reimbursableAmount: number
  nonReimbursableAmount: number
  deductibleAmount: number
  nonDeductibleAmount: number
  employeeDocument?: {
    id: string
    file: string
    name?: string
    mimeType?: string
  }
  expenseRequest: any[]
  expenseRequestComment: ExpenseRequestComment[]
  expenseRequestItem: ExpenseRequestItem[]
  expenseAllowance: ExpenseAllowance[]
  expenseRequestTrip: ExpenseRequestTripType[]
}

export interface ExpenseRequestRecordResponse {
  data: {
    ExpenseRequest: ExpenseRequestRecord[]
  }
}

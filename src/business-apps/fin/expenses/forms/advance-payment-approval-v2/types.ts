export interface Employee {
  id: string
  firstName: string
  lastName: string
  pictureThumbnail?: string
  employeePosition?: {
    jobPosition?: {
      name: string
    }
  }
}

export interface RequestType {
  code: string
  value: string
}

export interface Currency {
  code: string
}

export interface CostCenter {
  code: string
  name: string
}

export interface ExpensePlan {
  id: string
  employee: Employee
  code: string
  requestType: RequestType
  currency: Currency
  totalAmount: number
  title: string
  description?: string
}

export interface AdvancePaymentComment {
  id: string
  commentDate: string
  comment: string
  commentType: string
  authorEmployee?: string
  advancePayment?: string
}

export interface AdvancePaymentData {
  id: string
  expensePlanId: string
  expensePlan: ExpensePlan
  amount: number
  description?: string
  currency: Currency
  paymentMethod: string
  costCenter: CostCenter
  code?: string
  status?: string
  decisionDate?: string
  transactionDate?: string
  transactionNumber?: string
  transactionConfirmed?: boolean
  advancePaymentComment?: AdvancePaymentComment[]
}

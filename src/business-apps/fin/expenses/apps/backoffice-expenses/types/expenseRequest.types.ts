export interface ExpenseData {
  id: string
  expenseId: string
  employeeCode: string
  code: string
  sapNumber: string
  employee: string
  title: string
  creationDate: string
  startDate: string
  endDate: string
  requestDate: string
  reporter: string
  type: string
  amount: string
  advance: number | string
  status: string
  payableAmount: string
  paymentMethod: string
  employeeId: string
  version: string
  currency: { code?: string }
  currencyRef: string
  typeRef: string
  requestTypeRef: string
  totalRemainingAmount: number | string
  userId: string
  expenseRuleId: string
  totalAmount: number
  reimbursableAmount?: number
  nonReimbursableAmount?: number
  employeeDocumentId: string | null
  documentData: any
  employeeDocument?: {
    id: string
    file: string
    name: string
    mimeType: string
    createdAt: string
    documentGroup: string
    type: string
    employee: {
      id: string
    }
  }
  department?: string
  expensePlan?: {
    advancePaymentTotalAmount?: number
    code?: string
    advancePaymentAggregate?: {
      aggregate: {
        sum: {
          amount: number
        }
      }
    }
    advancePayment?: Array<{
      amount: number
      currency?: {
        value?: string
        code?: string
      }
    }>
  }
}

export interface ExpenseRequest {
  id: string
  version?: number
  code?: string
  currencyRef?: string
  requestDate?: string
  requestTypeRef?: string
  createdAt?: string
  status?: string
  title?: string
  totalAmount?: number
  reimbursableAmount?: number
  nonReimbursableAmount?: number
  totalRemainingAmount?: number
  endDate?: string
  startDate?: string
  decisionDate?: string
  updatedAt?: string
  employeeId?: string
  currency?: { code?: string }
  employee?: {
    firstName?: string
    lastName?: string
    code?: string
    hrReferenceCode?: string
    id?: string
    userId?: string
    additionalProperties?: any
    employeePosition?: {
      firstName?: string
      lastName?: string
      costCenter?: {
        id: string
        name: string
      }
    }
  }
  employeeDocumentId?: string
  employeeDocument?: any
  expenseRuleId?: string
  expensePlan?: any
  requestType?: any
}

export interface ExpenseRequestQueryData {
  ExpenseRequest: ExpenseRequest[]
  total: {
    aggregate: {
      count: number
    }
  }
}

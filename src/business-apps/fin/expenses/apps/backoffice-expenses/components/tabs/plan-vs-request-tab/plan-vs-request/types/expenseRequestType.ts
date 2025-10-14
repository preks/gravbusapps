/**
 * Document data structure for expense requests
 */
export interface DocumentData {
  name?: string
  url?: string
  size?: number
  type?: string
  uploadDate?: string
  [key: string]: unknown
}

/**
 * Additional employee properties
 */
export interface EmployeeAdditionalProperties {
  departmentId?: string
  positionTitle?: string
  [key: string]: unknown
}

/**
 * Employee document structure
 */
export interface EmployeeDocument {
  id: string
  documentUrl?: string
  documentName?: string
  documentType?: string
  uploadedAt?: string
  [key: string]: unknown
}

/**
 * Expense plan structure
 */
export interface ExpensePlan {
  id: string
  code?: string
  title?: string
  startDate?: string
  endDate?: string
  totalAmount?: number
  currencyRef?: string
  status?: string
  requestTypeRef?: string
  [key: string]: unknown
}

/**
 * Request type catalog entry
 */
export interface RequestType {
  code?: string
  value?: string
  objectValue?: unknown
  translations?: Array<{
    localeCode?: string
    value?: string
  }>
  [key: string]: unknown
}

/**
 * Currency catalog entry with objectValue for badge utilities
 */
export interface CurrencyCatalog {
  code?: string
  value?: string
  objectValue?: unknown // Required for badge utilities per coding guidelines
  symbol?: string
  [key: string]: unknown
}

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
  currency: string
  currencyRef: string
  typeRef: string
  totalRemainingAmount: number | string
  userId: string
  expenseRuleId: string
  totalAmount: number
  employeeDocumentId: string | null
  documentData: DocumentData | null
  department?: string
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
  nonReimbursableAmount?: number
  totalRemainingAmount?: number
  endDate?: string
  startDate?: string
  decisionDate?: string
  updatedAt?: string
  employeeId?: string
  currency?: CurrencyCatalog
  employee?: {
    firstName?: string
    lastName?: string
    code?: string
    id?: string
    userId?: string
    additionalProperties?: EmployeeAdditionalProperties
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
  employeeDocument?: EmployeeDocument
  expenseRuleId?: string
  expensePlan?: ExpensePlan
  requestType?: RequestType
}

export interface ExpenseRequestQueryData {
  ExpenseRequest: ExpenseRequest[]
  total: {
    aggregate: {
      count: number
    }
  }
}

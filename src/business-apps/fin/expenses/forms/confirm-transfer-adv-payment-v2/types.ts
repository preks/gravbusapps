export interface Employee {
  id: string
  userId: string
  firstName: string
  lastName: string
  pictureThumbnail: string
  employeePosition: EmployeePosition
}

export interface EmployeePosition {
  supervisor: Employee
  jobPosition: JobPosition
  organizationalUnit: OrganizationalUnit
}

export interface JobPosition {
  name: string
}

export interface OrganizationalUnit {
  name: string
}

export interface RequestType {
  code: string
  value: string
}

export interface Currency {
  value: string
  code: string
}

export interface CostCenter {
  code: string
  name: string
}

export interface EmployeeDocument {
  id: string
  file: string
  mimeType: string
}

export interface ExpensePlan {
  planDate: string
  decisionDate: string
  employeeDocument: EmployeeDocument
  employee: Employee
  code: string
  requestType: RequestType
  currency: Currency
  totalAmount: number
  title: string
}

export interface AdvancePaymentData {
  expensePlanId: string
  status: string
  version: number
  transactionDate?: string
  transactionNumber?: string
  transactionConfirmedByEmployee?: {
    id: string
    firstName: string
    lastName: string
  }
  expensePlan: ExpensePlan
  amount: number
  currency: Currency
  paymentMethod: string
  costCenter: CostCenter
}

// TypeScript interfaces for expense plan approval data

export interface Currency {
  code: string
  translations?: Array<{
    localeCode: string
    value: string
  }>
  catalog?: {
    defaultLocale: string
  }
  alternativeCode?: string
  value?: string
  id?: string
}

export interface CostCenter {
  code?: string
  name: string
}

export interface JobPosition {
  name: string
}

export interface EmployeePosition {
  jobPosition: JobPosition
}

export interface Employee {
  id: string
  firstName: string
  lastName: string
  picture?: string
  pictureThumbnail?: string
  employeePosition: EmployeePosition
}

export interface Project {
  id: string
  name: string
}

export interface RequestType {
  code: string
}

export interface ExpenseClass {
  translations?: Array<{
    localeCode: string
    value: string
  }>
  catalog?: {
    defaultLocale: string
  }
  value: string
}

export interface ExpenseGroup {
  translations?: Array<{
    localeCode: string
    value: string
  }>
  catalog?: {
    defaultLocale: string
  }
  value: string
}

export interface ExpenseRuleGeneralExpense {
  name: string
}

export interface ExpensePlanItem {
  id: string
  expenseDate: string
  reimbursable: boolean
  expenseClass: ExpenseClass
  title: string
  currency: Currency
  expenseGroup: ExpenseGroup
  expenseRuleGeneralExpense?: ExpenseRuleGeneralExpense
  totalAmount: number
}

export interface TravelRegion {
  translations?: Array<{
    localeCode: string
    value: string
  }>
  catalog?: {
    defaultLocale: string
  }
  value: string
}

export interface ExpenseRequestTrip {
  address: string
  expenseRequestId: string
  pointType: string
  tripDateTime: string
  travelRegion: TravelRegion
}

export interface AdvancePayment {
  amount: number
  code: string
  currency: Currency
  costCenter: CostCenter
  paymentMethod: string
}

export interface AdvancePaymentAggregate {
  aggregate: {
    sum: {
      amount: number
    }
  }
}

export interface ExpensePlanApprovalData {
  id: string
  code: string
  title: string
  status?: string
  project?: Project
  description?: string
  startDate: string
  endDate: string
  totalAmount: number
  reimbursableAmount: number
  nonReimbursableAmount: number
  advancePaymentTotalAmount: number
  advancePayment: AdvancePayment[]
  advancePaymentAggregate: AdvancePaymentAggregate
  currency: Currency
  costCenter: CostCenter
  requestType: RequestType
  employee: Employee
  expensePlanItem: ExpensePlanItem[]
  expenseRequestTrip: ExpenseRequestTrip[]
}

// Type definitions for Team Spending Analytics

export interface EmployeePosition {
  organizationalUnit?: {
    id: string
    name: string
  }
  siteLocation?: {
    id: string
    name: string
  }
}

export interface Employee {
  id: string
  fullName: string
  employeePosition?: EmployeePosition
}

export interface ExpensePosition {
  expenseGroupRef: string
  expenseGroup?: {
    value?: string
    translations?: Array<{ value?: string; localeCode?: string }>
  }
}

export interface ExpenseItem {
  id: string
  title: string
  expenseDate: string
  createdAt: string
  status: string
  totalAmount: number
  currencyRef: string
  employee: Employee
  expensePosition?: ExpensePosition[]
  expenseRequest?: {
    requestTypeRef: string
    startDate?: string
  }
}

export interface ExpenseRequest {
  id: string
  title: string
  createdAt: string
  status: string
  totalAmount: number
  currencyRef: string
  employee: Employee
  requestTypeRef?: string
  startDate?: string
}

export interface ExpensePlan {
  id: string
  title: string
  code: string
  createdAt: string
  status: string
  totalAmount: number
  currencyRef: string
  employee: Employee
}

export interface AdvancePayment {
  id: string
  code: string
  amount: number
  status: string
  transactionDate: string
  createdAt: string
  currencyRef: string
  expensePlan: {
    id: string
    title: string
    employee: Employee
  }
}

export interface AnalyticsData {
  expenseItems: ExpenseItem[]
  expenseRequests: ExpenseRequest[]
  expensePlans: ExpensePlan[]
  advancePayments: AdvancePayment[]
}

// Processed data types
export interface ChartData {
  name: string
  value: number
}

export interface TimeSeriesData {
  date: string
  value: number
}

export interface StatusBreakdown {
  status: string
  count: number
  amount: number
}

export interface OrgUnitBreakdown {
  orgUnit: string
  count: number
  amount: number
}

export interface LocationBreakdown {
  location: string
  count: number
  amount: number
}

export interface ProcessedAnalyticsData {
  expenseItemsByCategory: ChartData[]
  expenseItemsByMonth: TimeSeriesData[]
  expenseItemsByStatus: StatusBreakdown[]
  expenseRequestsByMonth: TimeSeriesData[]
  expenseRequestsByStatus: StatusBreakdown[]
  expensePlansByMonth: TimeSeriesData[]
  expensePlansByStatus: StatusBreakdown[]
  advancePaymentsByMonth: TimeSeriesData[]
  advancePaymentsByStatus: StatusBreakdown[]
  expensesByOrgUnit: OrgUnitBreakdown[]
  expensesByLocation: LocationBreakdown[]
  totalExpenseAmount: number
  totalRequestAmount: number
  totalPlanAmount: number
  totalAdvanceAmount: number
}

// Date range types
export enum DateRangeOption {
  LAST_30_DAYS = 'last30Days',
  LAST_90_DAYS = 'last90Days',
  LAST_6_MONTHS = 'last6Months',
  LAST_YEAR = 'lastYear',
  CURRENT_YEAR = 'currentYear', // Full calendar year (Jan 1 - Dec 31)
  ALL_TIME = 'allTime'
}

export interface DateRangeValues {
  startDate: string | null
  endDate: string | null
}

// Filter types
export interface LocationFilter {
  id: string
  name: string
  selected: boolean
}

export interface DepartmentFilter {
  id: string
  name: string
  selected: boolean
}

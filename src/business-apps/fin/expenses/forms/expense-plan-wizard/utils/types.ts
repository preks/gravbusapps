/**
 * Trip data interface
 */
export interface TripData {
  address: string
  tripDateTime: string
  pointType: string
  tripDirection: string
  costCenter: string
  tripOrder: number
  travelRegionRef: string
  countryRef: string
  expensePlan: string
  project: string
  allowanceRegionRuleDetail: string
  [key: string]: any
}

/**
 * Expense item interface for log object
 */
export interface ExpensePlanItemData {
  id: string
  code: string
  title: string
  ruleId: string
  expensePlan: string
}

/**
 * Log object interface
 */
export interface LogObject {
  advancePayment: {
    id: any
    version: any
    currencyRef: any
    amount: any
    paymentMethod: any
    status: any
    expensePlan: any
    costCenter: any
  } | null
  stepKey: string
  event: string
  expensePlan: {
    id: any
    startDate: any
    endDate: any
    expenseRule: string
    version: any
    description: string
    costCenter: any
    employee: any
    title: any
    status: any
    planDate: string
    requestTypeRef: any
    additionalProperties: any
    currencyRef: any
    totalAmount: any
    project: any
    decisionDate: any
  }
  expenseRequestTrips?: {
    expenseTrips: TripData[] | any[]
  }
  expensePlanItems?: {
    planItems: ExpensePlanItemData[] | any[]
  }
  createBusinessTrip?: boolean
  employeeAbsence?: {
    typeRef: string
    employeeId: any
    startDate: any
    endDate: any
    description: string
    substituteEmployee: string
  }
}

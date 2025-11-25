// TypeScript interfaces for expense request V2 utilities

// ============================================
// Main Expense Request Types (V2 independent)
// ============================================

export interface ExpenseRequestApprovalData {
  id: string
  code: string
  title: string
  project?: {
    id: string
    name: string
  }
  totalAmount: number
  totalRemainingAmount: number
  reimbursableAmount: number
  nonReimbursableAmount: number
  currency?: {
    translations: Array<{
      localeCode: string
      value: string
    }>
    catalog: {
      defaultLocale: string
    }
    code: string
  }
  expensePlanId: string
  description?: string
  costCenter?: {
    name: string
  }
  requestType?: {
    code: string
  }
  employee?: {
    id: string
    firstName: string
    lastName: string
    picture?: string
    pictureThumbnail?: string
    employeePosition?: {
      jobPosition?: {
        name: string
      }
    }
  }
  expensePlan?: {
    totalAmount: number
    advancePaymentTotalAmount: number
    advancePayment: Array<{
      status: string
      amount: number
      code: string
      currency: {
        translations: Array<{
          localeCode: string
          value: string
        }>
        catalog: {
          defaultLocale: string
        }
        alternativeCode: string
        value: string
        code: string
        id: string
      }
      costCenter: {
        code: string
        name: string
      }
      paymentMethod: string
    }>
    currency: {
      translations: Array<{
        localeCode: string
        value: string
      }>
      catalog: {
        defaultLocale: string
      }
      code: string
    }
  }
  expenseItem: Array<ExpenseRequestItem>
  expenseRequestTrip: Array<ExpenseRequestTrip>
  expenseAllowance: Array<ExpenseRequestAllowance>
  expenseRequestComment?: Array<ExpenseRequestComment>
}

export interface ExpenseRequestItem {
  id: string
  totalAmount: number
  expenseDate: string
  reimbursable: boolean
  expenseClass: {
    translations: Array<{
      localeCode: string
      value: string
    }>
    catalog: {
      defaultLocale: string
    }
    value: string
  }
  title: string
  currency: {
    translations: Array<{
      localeCode: string
      value: string
    }>
    catalog: {
      defaultLocale: string
    }
    code: string
  }
  expensePosition: Array<{
    expenseGroup: {
      translations: Array<{
        localeCode: string
        value: string
      }>
      catalog: {
        defaultLocale: string
      }
      value: string
    }
    expenseRuleGeneralExpense: {
      name: string
    }
    totalAmount: number
  }>
}

export interface ExpenseRequestAllowance {
  dayRate: number
  allowanceDate: string
  currency: {
    code: string
  }
}

export interface ExpenseRequestComment {
  id: string
  comment: string
  commentDate: string
  commentType: string
  authorEmployee?: {
    id: string
    firstName: string
    lastName: string
    displayName: string
    pictureThumbnail?: string
  }
}

// ============================================
// Utility Types
// ============================================

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

export interface ExpensePlanItem {
  id: string
  expenseDate: string
  reimbursable: boolean
  expenseClass?: any
  title: string
  currency?: any
  expenseGroup: ExpenseGroup
  expenseRuleGeneralExpense?: any
  totalAmount: number
}

// TypeScript interfaces for expense request V2 utilities

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

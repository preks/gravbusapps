/**
 * Constants for the expense item form
 */
export const REQUEST_STATUS = {
  CREATED: 'CREATED',
  ASSIGNED: 'ASSIGNED'
} as const

export const FORM_STEPS = {
  START: 'start',
  FORM: 'form'
} as const

export type FormStepType = (typeof FORM_STEPS)[keyof typeof FORM_STEPS]

export const DEFAULT_EMPLOYEE_ID = ''
export const DEFAULT_EXPENSE_SOURCE = 'GENERAL_EXPENSE_RULE'
export const DEFAULT_EXPENSE_STATUS = REQUEST_STATUS.CREATED
export const PRIORITY_CURRENCIES = ['EUR', 'USD', 'RON']
export const DEFAULT_CURRENCY_ID = 'Currency:v1:EUR'
export const DEFAULT_EXPENSE_CLASS_ID = 'ExpenseClass:v1:EXPENSE'
export const EXPENSE_SEARCH_TERM = 'expense'

export const generateUniqueId = () => `position-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

export const DEFAULT_POSITION = {
  id: generateUniqueId(),
  expenseGroup: '',
  expenseType: '',
  amount: 0,
  costCenter: '',
  customField: '',
  isReimbursable: true
}

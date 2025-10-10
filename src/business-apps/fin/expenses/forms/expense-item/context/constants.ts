export const DEFAULT_EMPLOYEE_ID = ''

export const DEFAULT_EXPENSE_SOURCE = 'GENERAL_EXPENSE_RULE'

export const DEFAULT_EXPENSE_STATUS = 'CREATED'

export const PRIORITY_CURRENCIES = ['EUR', 'USD', 'RON']

export const DEFAULT_CURRENCY_CODE = 'EUR'

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

export const FLOW_DOMAIN = 'employee-expense'
export const FLOW_PROCESS_NAME = 'changeExpenseItem'

// Constants for the expense plan item form - extending expense item constants

// Re-export constants from expense-item that we can reuse
export {
  DEFAULT_EMPLOYEE_ID,
  DEFAULT_EXPENSE_SOURCE,
  DEFAULT_EXPENSE_STATUS,
  PRIORITY_CURRENCIES,
  DEFAULT_CURRENCY_CODE
} from '../expense-item/context/constants'

export const FLOW_DOMAIN = 'employee-expense'
export const FLOW_PROCESS_NAME = 'changeExpensePlanItem'

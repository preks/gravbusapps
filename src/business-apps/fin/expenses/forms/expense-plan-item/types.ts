// Types for the ExpensePlanItem component - extending expense item types

export interface ExpensePlanItemProps {
  title?: string
  additionalData?: any
  onClose?: (shouldRefetch?: boolean) => void
}

export interface ExpensePlanItemData {
  id?: string
  title: string
  expenseDate: string
  totalAmount: number
  currency: string
  reimbursable: boolean
  expenseGroupRef: string
  expenseRuleGeneralExpenseId?: string
  costCenter: string
  project?: string
}

// Re-export types from expense-item that we can reuse
export type { ExpenseGroup, ExpenseType, CostCenter, Currency, CustomField } from '../expense-item/types'

// Types for the ExpenseItem component

export interface ExpenseItemProps {
  title?: string
  additionalData?: any
  onClose?: (shouldRefetch?: boolean) => void
}

export interface ExpensePosition {
  id: string
  expenseGroup: string
  expenseType: string
  amount: number
  costCenter: string
  customField?: string
  isReimbursable?: boolean
  persistedId?: string
  persistedVersion?: string | number
}

export interface ExpenseItemData {
  id?: string
  title: string
  date: string
  positions: ExpensePosition[]
  totalAmount: number
  currency: string
  attachmentUrl?: string
  fileName?: string
  expenseRequestId?: string | null
}

export interface ExpenseGroup {
  id: string
  value: string
  translations?: Array<{
    localeCode: string
    value: string
  }>
  catalog?: {
    defaultLocale: string
  }
  code?: string
}

export interface ExpenseType {
  id: string
  name: string
  classId: string
  code?: string
  additionalProperties?: Record<string, unknown>
  attachmentInstruction?: string
}

export interface CustomField {
  id: string
  infoValue: string
  mandatory: boolean
  source: string
  expenseRuleGeneralExpenseId: string
  expenseGroupRef?: string
}

export interface CostCenter {
  id: string
  name: string
}

export interface Currency {
  id: string
  code: string
  name: string
}

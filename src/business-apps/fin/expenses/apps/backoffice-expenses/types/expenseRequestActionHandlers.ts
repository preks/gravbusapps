import type { ExpenseData } from './index'

export interface ExpenseRequestActionHandlers {
  onNavigateToExpenseRequest: (record: ExpenseData) => void
  onDownloadAccountingNote: (record: ExpenseData) => void
  onTriggerCSV: (record: ExpenseData) => void
  onPrintExpenseRequest: (record: ExpenseData) => void
  onTransferPayment: (record: ExpenseData) => void
}

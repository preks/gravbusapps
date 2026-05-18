/**
 * Manager expense requests table: column ids and Fluent keys (`manager-expenses/_i18n`).
 */
export const EXPENSE_REQUEST_COLUMN_DEFINITIONS = [
  { id: 'title', fluentKey: 'expense-requests-column-title' },
  { id: 'planCode', fluentKey: 'expense-requests-column-plan-code' },
  { id: 'startDate', fluentKey: 'expense-requests-column-start-date' },
  { id: 'endDate', fluentKey: 'expense-requests-column-end-date' },
  { id: 'employee', fluentKey: 'expense-requests-column-employee' },
  { id: 'requestDate', fluentKey: 'expense-requests-column-request-date' },
  { id: 'totalAmount', fluentKey: 'expense-requests-column-amount' },
  { id: 'status', fluentKey: 'expense-requests-column-status' }
] as const

export type ExpenseRequestColumnId = (typeof EXPENSE_REQUEST_COLUMN_DEFINITIONS)[number]['id']

export const EXPENSE_REQUEST_DEFAULT_VISIBLE_COLUMN_IDS: ExpenseRequestColumnId[] =
  EXPENSE_REQUEST_COLUMN_DEFINITIONS.map(column => column.id)

export function getExpenseRequestColumnTitle(t: (key: string) => string, id: ExpenseRequestColumnId): string {
  const column = EXPENSE_REQUEST_COLUMN_DEFINITIONS.find(entry => entry.id === id)
  return column ? t(column.fluentKey) : id
}

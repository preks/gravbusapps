/**
 * Expense Plans table: column ids and Fluent keys (sources noted in en-US.ftl).
 */
export const EXPENSE_PLAN_COLUMN_DEFINITIONS = [
  { id: 'title', fluentKey: 'expense-plans-column-title' },
  { id: 'requestCode', fluentKey: 'expense-plans-column-request-code' },
  { id: 'startDate', fluentKey: 'expense-plans-column-start-date' },
  { id: 'endDate', fluentKey: 'expense-plans-column-end-date' },
  { id: 'employee', fluentKey: 'expense-plans-column-employee' },
  { id: 'createdAt', fluentKey: 'expense-plans-column-creation-date' },
  { id: 'totalAmount', fluentKey: 'expense-plans-column-amount' },
  { id: 'status', fluentKey: 'expense-plans-column-status' }
] as const

export type ExpensePlanColumnId = (typeof EXPENSE_PLAN_COLUMN_DEFINITIONS)[number]['id']

export const EXPENSE_PLAN_DEFAULT_VISIBLE_COLUMN_IDS: ExpensePlanColumnId[] = EXPENSE_PLAN_COLUMN_DEFINITIONS.map(
  column => column.id
)

export function getExpensePlanColumnTitle(t: (key: string) => string, id: ExpensePlanColumnId): string {
  const column = EXPENSE_PLAN_COLUMN_DEFINITIONS.find(entry => entry.id === id)
  return column ? t(column.fluentKey) : id
}

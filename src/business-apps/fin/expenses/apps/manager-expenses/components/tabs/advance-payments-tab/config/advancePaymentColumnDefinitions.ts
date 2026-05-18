/**
 * Advance Payments table: column ids and Fluent keys (manager `_i18n`).
 */
export const ADVANCE_PAYMENT_COLUMN_DEFINITIONS = [
  { id: 'expensePlan.title', fluentKey: 'advance-payments-column-expense-plan' },
  { id: 'expensePlan.startDate', fluentKey: 'advance-payments-column-start-date' },
  { id: 'expensePlan.endDate', fluentKey: 'advance-payments-column-end-date' },
  { id: 'expensePlan.employee.fullName', fluentKey: 'advance-payments-column-employee' },
  { id: 'createdAt', fluentKey: 'advance-payments-column-creation-date' },
  { id: 'amount', fluentKey: 'advance-payments-column-amount' },
  { id: 'status', fluentKey: 'advance-payments-column-status' }
] as const

export type AdvancePaymentColumnId = (typeof ADVANCE_PAYMENT_COLUMN_DEFINITIONS)[number]['id']

export const ADVANCE_PAYMENT_DEFAULT_VISIBLE_COLUMN_IDS: AdvancePaymentColumnId[] =
  ADVANCE_PAYMENT_COLUMN_DEFINITIONS.map(column => column.id)

export function getAdvancePaymentColumnTitle(t: (key: string) => string, id: AdvancePaymentColumnId): string {
  const column = ADVANCE_PAYMENT_COLUMN_DEFINITIONS.find(entry => entry.id === id)
  return column ? t(column.fluentKey) : id
}

import type { ColumnConfig } from '../../../../../../common/types/columnTypes'

const ADVANCE_PAYMENT_COLUMNS_META: ReadonlyArray<{ id: string; labelKey: string }> = [
  { id: 'expensePlan', labelKey: 'personal-expenses-column-expense-plan' },
  { id: 'planNumber', labelKey: 'expense-plans-column-plan-number' },
  { id: 'status', labelKey: 'expense-items-column-status' },
  { id: 'amount', labelKey: 'personal-expenses-column-amount' },
  { id: 'advance', labelKey: 'personal-expenses-column-advance-payment' },
  { id: 'paymentMethod', labelKey: 'personal-expenses-column-payment-method' }
]

export const ADVANCE_PAYMENT_TABLE_COLUMN_IDS = ADVANCE_PAYMENT_COLUMNS_META.map(c => c.id)

export const advancePaymentDefaultVisibleColumnIds = [...ADVANCE_PAYMENT_TABLE_COLUMN_IDS]

export function createAdvancePaymentAvailableColumns(t: (key: string) => string): ColumnConfig[] {
  return ADVANCE_PAYMENT_COLUMNS_META.map(({ id, labelKey }) => ({ id, label: t(labelKey) }))
}

export type { ColumnConfig as AvailableColumn } from '../../../../../../common/types/columnTypes'

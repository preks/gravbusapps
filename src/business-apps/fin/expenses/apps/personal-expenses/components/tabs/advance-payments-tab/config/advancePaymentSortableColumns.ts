import type { ColumnConfig } from '../../../../../../common/types/columnTypes'

/**
 * Sort field ids must match `useGetAdvancePayments` `buildOrderBy`
 * (e.g. `expensePlan` for plan title, `planNumber` for nested plan code).
 * The `amount` sort maps to plan `totalAmount` (same column as the “Amount” plan-total column).
 */
export function createAdvancePaymentSortableColumns(t: (key: string) => string): ColumnConfig[] {
  return [
    { id: 'createdAt', label: t('personal-expenses-advance-sort-created') },
    { id: 'expensePlan', label: t('personal-expenses-column-expense-plan') },
    { id: 'planNumber', label: t('expense-plans-column-plan-number') },
    { id: 'status', label: t('expense-items-column-status') },
    { id: 'amount', label: t('personal-expenses-column-amount') },
    { id: 'paymentMethod', label: t('personal-expenses-column-payment-method') }
  ]
}

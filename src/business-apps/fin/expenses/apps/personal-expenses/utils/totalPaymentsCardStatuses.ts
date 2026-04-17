import { ExpenseStatus } from '@/business-apps/fin/expenses/common/utils/statusDisplayUtils'

/**
 * Statuses shown in the personal advance payments sidebar filter.
 * Keep in sync with product status grid.
 */
export const ADVANCE_PAYMENT_SIDEBAR_FILTER_STATUSES: ExpenseStatus[] = [
  ExpenseStatus.PREPARED,
  ExpenseStatus.CREATED,
  ExpenseStatus.PENDING,
  ExpenseStatus.APPROVED,
  ExpenseStatus.RETURNED,
  ExpenseStatus.REJECTED,
  ExpenseStatus.VERIFIED,
  ExpenseStatus.BOOKED,
  ExpenseStatus.PAID,
  ExpenseStatus.TRANSFERRED
]

const EXCLUDED_FROM_TOTAL_PAYMENTS_CARD = new Set<ExpenseStatus>([
  ExpenseStatus.PREPARED,
  ExpenseStatus.CREATED,
  ExpenseStatus.REJECTED
])

/**
 * "Total Payments" statistics card (month count) and filter when that card is clicked:
 * sidebar advance payment statuses minus PREPARED, CREATED, REJECTED.
 */
export const TOTAL_PAYMENTS_CARD_STATUSES: string[] = ADVANCE_PAYMENT_SIDEBAR_FILTER_STATUSES.filter(
  s => !EXCLUDED_FROM_TOTAL_PAYMENTS_CARD.has(s)
)
  .map(s => s as string)
  .sort((a, b) => a.localeCompare(b))

import { ExpenseStatus } from '../utils'

// Shared filter status list (kept in one place to avoid duplication).
export const availableFilterStatuses: ExpenseStatus[] = [
  ExpenseStatus.PREPARED,
  ExpenseStatus.ASSIGNED,
  ExpenseStatus.PENDING,
  ExpenseStatus.APPROVED,
  ExpenseStatus.REJECTED,
  ExpenseStatus.VERIFIED,
  ExpenseStatus.BOOKED,
  ExpenseStatus.PAID,
  ExpenseStatus.CLOSED,
  ExpenseStatus.DISCARDED,
  ExpenseStatus.TRANSFERRED
]

import { ExpenseStatus } from '../utils'

// Entity-specific filter statuses ordered by lifecycle progression.

export const requestFilterStatuses: ExpenseStatus[] = [
  ExpenseStatus.CREATED,
  ExpenseStatus.PENDING,
  ExpenseStatus.APPROVED,
  ExpenseStatus.REJECTED,
  ExpenseStatus.VERIFIED,
  ExpenseStatus.BOOKED,
  ExpenseStatus.TRANSFERRED,
  ExpenseStatus.PAID,
  ExpenseStatus.DISCARDED
]

export const planFilterStatuses: ExpenseStatus[] = [
  ExpenseStatus.CREATED,
  ExpenseStatus.ASSIGNED,
  ExpenseStatus.PENDING,
  ExpenseStatus.APPROVED,
  ExpenseStatus.REJECTED,
  ExpenseStatus.CLOSED,
  ExpenseStatus.DISCARDED
]

// Same status options as backoffice (excluding CREATED, RETURNED, DISCARDED, VERIFIED), alphabetical order
export const advancePaymentFilterStatuses: ExpenseStatus[] = [
  ExpenseStatus.APPROVED,
  ExpenseStatus.BOOKED,
  ExpenseStatus.PAID,
  ExpenseStatus.PENDING,
  ExpenseStatus.PREPARED,
  ExpenseStatus.REJECTED,
  ExpenseStatus.TRANSFERRED
]

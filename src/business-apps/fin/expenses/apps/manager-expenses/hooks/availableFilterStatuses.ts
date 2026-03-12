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

export const advancePaymentFilterStatuses: ExpenseStatus[] = [
  ExpenseStatus.CREATED,
  ExpenseStatus.PREPARED,
  ExpenseStatus.PENDING,
  ExpenseStatus.APPROVED,
  ExpenseStatus.RETURNED,
  ExpenseStatus.REJECTED,
  ExpenseStatus.VERIFIED,
  ExpenseStatus.BOOKED,
  ExpenseStatus.TRANSFERRED,
  ExpenseStatus.PAID
]

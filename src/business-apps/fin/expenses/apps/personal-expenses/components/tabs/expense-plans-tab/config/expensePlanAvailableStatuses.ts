import { ExpenseStatus } from '../../../../utils'

export const expensePlanAvailableStatuses: string[] = [
  ExpenseStatus.CREATED,
  ExpenseStatus.ASSIGNED,
  ExpenseStatus.PENDING,
  ExpenseStatus.APPROVED,
  ExpenseStatus.REJECTED,
  ExpenseStatus.CLOSED
]

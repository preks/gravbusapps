import type { ExpenseRequestListSortField } from '../../../hooks/useExpenseRequests'

/** Maps TanStack column `id` to GraphQL order-by field used in {@link useExpenseRequests}. */
export function expenseRequestColumnIdToSortField(columnId: string): ExpenseRequestListSortField {
  switch (columnId) {
    case 'employee':
      return 'employee.fullName'
    case 'employeeCode':
      return 'employee.code'
    case 'requestNumber':
      return 'code'
    case 'totalAmount':
      return 'totalAmount'
    default:
      return columnId as ExpenseRequestListSortField
  }
}

export function expenseRequestSortFieldToColumnId(field: ExpenseRequestListSortField): string {
  switch (field) {
    case 'employee.fullName':
      return 'employee'
    case 'employee.code':
      return 'employeeCode'
    case 'code':
      return 'requestNumber'
    case 'reimbursableAmount':
      return 'totalAmount'
    default:
      return field
  }
}

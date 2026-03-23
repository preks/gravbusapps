import type { ExpenseRequestListSortField } from './expenseRequestListSortTypes'

const DEFAULT_ORDER: unknown[] = [{ createdAt: 'DESC' }, { id: 'DESC' }]

/**
 * Maps list sort field + direction to the GraphQL `orderBy` array for {@link GET_EXPENSE_REQUESTS}.
 */
export function buildBackofficeExpenseRequestOrderBy(
  field: ExpenseRequestListSortField | null,
  order: 'ASC' | 'DESC' | null
): unknown[] {
  if (!field || !order) {
    return []
  }
  switch (field) {
    case 'title':
      return [{ title: order }, { id: order }]
    case 'startDate':
      return [{ startDate: order }, { id: order }]
    case 'endDate':
      return [{ endDate: order }, { id: order }]
    case 'createdAt':
      return [{ createdAt: order }, { id: order }]
    case 'status':
      return [{ status: order }, { id: order }]
    case 'totalAmount':
    case 'reimbursableAmount':
      return [{ reimbursableAmount: order }, { id: order }]
    case 'totalRemainingAmount':
      return [{ totalRemainingAmount: order }, { id: order }]
    case 'employee.fullName':
      return [{ employee: { firstName: order } }, { employee: { lastName: order } }, { id: order }]
    case 'employee.code':
      return [{ employee: { code: order } }, { id: order }]
    case 'code':
      return [{ code: order }, { id: order }]
    default:
      return DEFAULT_ORDER
  }
}

/**
 * Builds GraphQL orderBy clause for manager expense requests list.
 * Sort field ids must match expenseRequestColumnDefinitions.ts. Maps UI sort field/order to overview requests orderBy.
 */

const DEFAULT_ORDER: unknown[] = [{ requestDate: 'DESC' }]

export function buildExpenseRequestOrderBy(field: string | null, order: 'ASC' | 'DESC' | null): unknown[] {
  if (!field || !order) return DEFAULT_ORDER
  switch (field) {
    case 'title':
      return [{ title: order }]
    case 'planCode':
    case 'code':
      return [{ code: order }]
    case 'startDate':
      return [{ startDate: order }]
    case 'endDate':
      return [{ endDate: order }]
    case 'employee':
    case 'employee.fullName':
      return [{ employee: { fullName: order } }]
    case 'requestDate':
      return [{ requestDate: order }]
    case 'amount':
    case 'totalAmount':
      return [{ totalAmount: order }]
    case 'status':
      return [{ status: order }]
    default:
      return DEFAULT_ORDER
  }
}

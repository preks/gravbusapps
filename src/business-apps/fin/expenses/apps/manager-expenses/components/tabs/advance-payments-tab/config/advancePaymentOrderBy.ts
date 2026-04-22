/**
 * Builds GraphQL orderBy clause for manager advance payments list.
 * Single responsibility: map UI sort field/order to ManagerExpensesOverview orderBy shape.
 */

const DEFAULT_ORDER: unknown[] = [{ createdAt: 'DESC' }]

/**
 * Maps sort field id (must match ids in advancePaymentColumnDefinitions.ts) and order to orderBy for the overview query.
 */
export function buildAdvancePaymentOrderBy(field: string | null, order: 'ASC' | 'DESC' | null): unknown[] {
  if (!field || !order) return DEFAULT_ORDER
  const dir = order
  switch (field) {
    case 'expensePlan.title':
      return [{ expensePlan: { title: dir } }]
    case 'expensePlan.startDate':
      return [{ expensePlan: { startDate: dir } }]
    case 'expensePlan.endDate':
      return [{ expensePlan: { endDate: dir } }]
    case 'expensePlan.employee.fullName':
      return [{ expensePlan: { employee: { fullName: dir } } }]
    case 'createdAt':
    case 'amount':
    case 'status':
      return [{ [field]: dir }]
    default:
      return DEFAULT_ORDER
  }
}

/**
 * Maps UI sort field / order to GraphQL AdvancePayment orderBy (Hasura shape).
 * expensePlan-related sorts use nested ExpensePlanOrderBy objects.
 */

type SortOrder = 'ascend' | 'descend' | null | undefined

const DEFAULT_ORDER = [{ createdAt: 'DESC_NULLS_LAST' as const }]

const DIRECT_FIELD_MAP: Record<string, string> = {
  status: 'status',
  advance: 'amount',
  paymentMethod: 'paymentMethod',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  description: 'description',
  currencyRef: 'currencyRef',
  code: 'code'
}

export function buildAdvancePaymentOrderBy(sortField?: string | null, sortOrder?: SortOrder): any[] {
  if (!sortField || !sortOrder) {
    return [...DEFAULT_ORDER]
  }

  const direction = sortOrder === 'ascend' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'

  if (sortField === 'expensePlan') {
    return [{ expensePlan: { title: direction } }]
  }

  if (sortField === 'planNumber') {
    return [{ expensePlan: { code: direction } }]
  }

  if (sortField === 'amount') {
    return [{ expensePlan: { totalAmount: direction } }]
  }

  const gqlField = DIRECT_FIELD_MAP[sortField] || sortField
  return [{ [gqlField]: direction }]
}

/**
 * Maps UI sort field / order to GraphQL ExpensePlan orderBy (Hasura shape).
 * Uses NULLS_LAST to keep null values at the end regardless of sort direction.
 */

type SortOrder = 'ascend' | 'descend' | null | undefined

const DEFAULT_ORDER = [{ planDate: 'DESC_NULLS_LAST' as const }]

const FIELD_MAP: Record<string, string> = {
  code: 'code',
  title: 'title',
  planDate: 'planDate',
  startDate: 'startDate',
  endDate: 'endDate',
  status: 'status',
  reimbursableAmount: 'reimbursableAmount',
  advancePaymentPaidAmount: 'advancePaymentPaidAmount',
  totalAmount: 'totalAmount',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  description: 'description',
  currencyRef: 'currencyRef',
  requestTypeRef: 'requestTypeRef'
}

export function buildExpensePlanOrderBy(sortField?: string | null, sortOrder?: SortOrder): any[] {
  if (sortField && sortOrder) {
    const gqlField = FIELD_MAP[sortField]
    if (!gqlField) return [...DEFAULT_ORDER]
    const direction = sortOrder === 'ascend' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
    return [{ [gqlField]: direction }]
  }
  return [...DEFAULT_ORDER]
}

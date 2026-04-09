/**
 * Maps UI sort field / order to GraphQL ExpenseRequest orderBy (Hasura shape).
 * Same field mapping ideas as manager `buildExpenseRequestOrderBy`, with NULLS_LAST for personal list.
 */

type SortOrder = 'ascend' | 'descend' | null | undefined

const DEFAULT_ORDER = [{ requestDate: 'DESC_NULLS_LAST' as const }]

const DIRECT_FIELD_MAP: Record<string, string> = {
  code: 'code',
  title: 'title',
  requestDate: 'requestDate',
  startDate: 'startDate',
  endDate: 'endDate',
  status: 'status',
  reimbursableAmount: 'reimbursableAmount',
  totalAmount: 'totalAmount',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  description: 'description',
  currencyRef: 'currencyRef',
  nonReimbursableAmount: 'nonReimbursableAmount'
}

export function buildExpenseRequestOrderBy(sortField?: string | null, sortOrder?: SortOrder): any[] {
  if (!sortField || !sortOrder) {
    return [...DEFAULT_ORDER]
  }

  const direction = sortOrder === 'ascend' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'

  // Align with manager: planCode / legacy code both sort request code
  if (sortField === 'planCode') {
    return [{ code: direction }]
  }

  const gqlField = DIRECT_FIELD_MAP[sortField]
  if (!gqlField) {
    return [...DEFAULT_ORDER]
  }

  return [{ [gqlField]: direction }]
}

/**
 * Maps UI sort field / order to GraphQL ExpenseItem orderBy (Hasura shape).
 */

type SortOrder = 'ascend' | 'descend' | null | undefined

const DEFAULT_ORDER = [{ expenseDate: 'DESC' as const }]

export function buildExpenseItemOrderBy(sortField?: string | null, sortOrder?: SortOrder): any[] {
  if (sortField && sortOrder) {
    const fieldMap: Record<string, string> = {
      title: 'title',
      expenseDate: 'expenseDate',
      status: 'status',
      reimbursableAmount: 'reimbursableAmount',
      totalAmount: 'totalAmount',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      code: 'code',
      description: 'description'
    }
    const gqlField = fieldMap[sortField]
    if (!gqlField) return [...DEFAULT_ORDER]
    const direction = sortOrder === 'ascend' ? 'ASC' : 'DESC'
    return [{ [gqlField]: direction }]
  }
  return [...DEFAULT_ORDER]
}

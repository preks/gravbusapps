import type { ColumnConfig } from '../../../../../../common/types/columnTypes'

export type ExpenseRequestTableSortOrder = 'ascend' | 'descend'

/** Applied when sort is cleared/reset from toolbar or table state. */
export const expenseRequestDefaultSort = {
  field: 'requestDate',
  order: 'descend' as ExpenseRequestTableSortOrder
}

/** Column ids that support sorting (must match `buildExpenseRequestOrderBy`). */
const SORTABLE_COLUMN_IDS: ReadonlySet<string> = new Set([
  'code',
  'title',
  'requestDate',
  'startDate',
  'endDate',
  'status',
  'reimbursableAmount'
])

function buildExpenseRequestColumns(t: (key: string) => string): ColumnConfig[] {
  return [
    { id: 'code', label: t('expense-requests-column-request-number') },
    { id: 'title', label: t('expense-requests-column-title') },
    { id: 'requestDate', label: t('personal-expenses-label-request-date') },
    { id: 'startDate', label: t('personal-expenses-filter-label-start-date') },
    { id: 'endDate', label: t('expense-plans-column-end-date') },
    { id: 'status', label: t('expense-items-column-status') },
    { id: 'reimbursableAmount', label: t('expense-items-column-reimbursable') },
    { id: 'advance', label: t('personal-expenses-column-advance-payment') }
  ]
}

export function createExpenseRequestAvailableColumns(t: (key: string) => string): ColumnConfig[] {
  return buildExpenseRequestColumns(t)
}

/** Toolbar sort dropdown — excludes non-sortable columns. */
export function createExpenseRequestSortableColumns(t: (key: string) => string): ColumnConfig[] {
  return buildExpenseRequestColumns(t).filter(c => SORTABLE_COLUMN_IDS.has(c.id))
}

/** Includes visibility-only columns (e.g. advance). */
export const expenseRequestDefaultVisibleColumnIds: string[] = [
  'code',
  'title',
  'requestDate',
  'startDate',
  'endDate',
  'status',
  'reimbursableAmount',
  'advance'
]

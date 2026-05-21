import type { ColumnConfig } from '../../../../../../common/types/columnTypes'

const EXPENSE_PLAN_COLUMNS_META: ReadonlyArray<{ id: string; labelKey: string }> = [
  { id: 'code', labelKey: 'expense-plans-column-plan-number' },
  { id: 'title', labelKey: 'expense-items-column-title' },
  { id: 'planDate', labelKey: 'expense-plans-column-plan-date' },
  { id: 'startDate', labelKey: 'personal-expenses-filter-label-start-date' },
  { id: 'endDate', labelKey: 'expense-plans-column-end-date' },
  { id: 'status', labelKey: 'expense-items-column-status' },
  { id: 'reimbursableAmount', labelKey: 'expense-items-column-reimbursable' },
  { id: 'advancePaymentPaidAmount', labelKey: 'expense-plans-column-paid-advance' }
]

/** Stable ids for default visibility state (order matches column definitions). */
export const EXPENSE_PLAN_TABLE_COLUMN_IDS = EXPENSE_PLAN_COLUMNS_META.map(c => c.id)

/** Columns that appear in the table but are not server-sortable. */
const EXPENSE_PLAN_NON_SORTABLE_IDS = new Set<string>(['advancePaymentPaidAmount'])

function buildExpensePlanColumnConfigs(t: (key: string) => string): ColumnConfig[] {
  return EXPENSE_PLAN_COLUMNS_META.map(({ id, labelKey }) => ({ id, label: t(labelKey) }))
}

/** Column picker + visibility: labels must use the same FTL keys as `createExpensePlanColumns`. */
export function createExpensePlanAvailableColumns(t: (key: string) => string): ColumnConfig[] {
  return buildExpensePlanColumnConfigs(t)
}

export function createExpensePlanSortableColumns(t: (key: string) => string): ColumnConfig[] {
  return buildExpensePlanColumnConfigs(t).filter(c => !EXPENSE_PLAN_NON_SORTABLE_IDS.has(c.id))
}

export type { ColumnConfig as AvailableColumn } from '../../../../../../common/types/columnTypes'

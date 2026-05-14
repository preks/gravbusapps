import type { ColumnConfig } from '../../../../common/types/columnTypes'
import { EXPENSE_PLAN_COLUMN_DEFINITIONS } from './expensePlanColumnDefinitions'

export type { ExpensePlanColumnId } from './expensePlanColumnDefinitions'

/** Toolbar sort + column visibility: same ids/labels as {@link EXPENSE_PLAN_COLUMN_DEFINITIONS}. */
export function buildExpensePlanSortableColumns(t: (key: string) => string): ColumnConfig[] {
  return EXPENSE_PLAN_COLUMN_DEFINITIONS.map(({ id, fluentKey }) => ({
    id,
    label: t(fluentKey)
  }))
}

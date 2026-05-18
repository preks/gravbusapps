import type { ColumnConfig } from '../../../../common/types/columnTypes'
import { EXPENSE_REQUEST_COLUMN_DEFINITIONS } from './expenseRequestColumnDefinitions'

/** Toolbar sort + column visibility: same ids/labels as {@link EXPENSE_REQUEST_COLUMN_DEFINITIONS}. */
export function buildExpenseRequestSortableColumns(t: (key: string) => string): ColumnConfig[] {
  return EXPENSE_REQUEST_COLUMN_DEFINITIONS.map(({ id, fluentKey }) => ({
    id,
    label: t(fluentKey)
  }))
}

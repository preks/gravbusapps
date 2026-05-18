import type { ColumnConfig } from '../../../../common/types/columnTypes'
import { ADVANCE_PAYMENT_COLUMN_DEFINITIONS } from './advancePaymentColumnDefinitions'

export type { AdvancePaymentColumnId } from './advancePaymentColumnDefinitions'

/** Toolbar sort + column visibility: same ids/labels as {@link ADVANCE_PAYMENT_COLUMN_DEFINITIONS}. */
export function buildAdvancePaymentSortableColumns(t: (key: string) => string): ColumnConfig[] {
  return ADVANCE_PAYMENT_COLUMN_DEFINITIONS.map(({ id, fluentKey }) => ({
    id,
    label: t(fluentKey)
  }))
}

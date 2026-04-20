import type { ColumnConfig } from '../../../../common/types/columnTypes'
import type { TranslateFn } from '../../../../utils/utils'
import type { AdvancePaymentVisibleColumnId } from '../hooks/advancePaymentTableSort'
import { backofficeAdvancePaymentDataColumnLabel } from './backofficeAdvancePaymentColumnLabels'

const ADVANCE_PAYMENT_DATA_COLUMN_IDS: AdvancePaymentVisibleColumnId[] = [
  'title',
  'employee',
  'orgUnit',
  'costCenter',
  'planId',
  'status',
  'amount',
  'advance',
  'paymentMethod'
]

const SORTABLE_ONLY_COLUMN_IDS = ['createdAt'] as const

/** All data columns for the visibility dropdown. */
export function createBackofficeAdvancePaymentAllDataColumns(t: TranslateFn): ColumnConfig[] {
  return ADVANCE_PAYMENT_DATA_COLUMN_IDS.map(id => ({
    id,
    label: backofficeAdvancePaymentDataColumnLabel(t, id)
  }))
}

/** Toolbar / DataDisplay sortable columns (includes createdAt which is not a visibility column). */
export function createBackofficeAdvancePaymentSortableColumns(t: TranslateFn): ColumnConfig[] {
  const sortOnly = SORTABLE_ONLY_COLUMN_IDS.map(id => ({
    id,
    label: backofficeAdvancePaymentDataColumnLabel(t, id)
  }))
  return [...createBackofficeAdvancePaymentAllDataColumns(t), ...sortOnly]
}

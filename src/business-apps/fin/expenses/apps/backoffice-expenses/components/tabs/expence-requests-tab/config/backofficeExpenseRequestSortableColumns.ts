import type { ColumnConfig } from '../../../../common/types/columnTypes'
import type { TranslateFn } from '../../../../utils/utils'
import { BACKOFFICE_EXPENSE_REQUEST_TABLE_COLUMN_IDS } from '../table/backofficeExpenseRequestColumns'
import { backofficeExpenseRequestDataColumnLabel } from './backofficeExpenseRequestColumnLabels'

/** Data column ids (no select / actions). */
export const BACKOFFICE_EXPENSE_REQUEST_DATA_COLUMN_IDS: string[] = [
  ...BACKOFFICE_EXPENSE_REQUEST_TABLE_COLUMN_IDS
].filter(id => id !== 'select')

const NON_SORTABLE_DATA_COLUMN_IDS = new Set(['sapNumber'])

/** All data columns for the visibility dropdown. */
export function createBackofficeExpenseRequestAllDataColumns(t: TranslateFn): ColumnConfig[] {
  return BACKOFFICE_EXPENSE_REQUEST_DATA_COLUMN_IDS.map(id => ({
    id,
    label: backofficeExpenseRequestDataColumnLabel(t, id)
  }))
}

/** Toolbar / DataDisplay sortable columns (TanStack column ids). */
export function createBackofficeExpenseRequestSortableColumns(t: TranslateFn): ColumnConfig[] {
  return BACKOFFICE_EXPENSE_REQUEST_DATA_COLUMN_IDS.filter(id => !NON_SORTABLE_DATA_COLUMN_IDS.has(id)).map(id => ({
    id,
    label: backofficeExpenseRequestDataColumnLabel(t, id)
  }))
}

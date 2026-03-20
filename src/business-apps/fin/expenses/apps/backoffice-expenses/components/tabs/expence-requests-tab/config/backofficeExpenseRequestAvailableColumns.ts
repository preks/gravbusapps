import type { ColumnConfig } from '../../../../common/types/columnTypes'
import type { TranslateFn } from '../../../../utils/utils'
import { backofficeExpenseRequestDataColumnLabel } from './backofficeExpenseRequestColumnLabels'
import { BACKOFFICE_EXPENSE_REQUEST_DATA_COLUMN_IDS } from './backofficeExpenseRequestSortableColumns'

/** All data columns for column visibility (TanStack column ids). */
export function createBackofficeExpenseRequestAvailableColumns(t: TranslateFn): ColumnConfig[] {
  return BACKOFFICE_EXPENSE_REQUEST_DATA_COLUMN_IDS.map(id => ({
    id,
    label: backofficeExpenseRequestDataColumnLabel(t, id)
  }))
}

export type { ColumnConfig as AvailableColumn } from '../../../../common/types/columnTypes'

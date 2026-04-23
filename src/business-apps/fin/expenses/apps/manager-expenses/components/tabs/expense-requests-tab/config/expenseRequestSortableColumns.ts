import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { ColumnConfig } from '../../../../common/types/columnTypes'
import { EXPENSE_REQUEST_COLUMN_DEFINITIONS } from './expenseRequestColumnDefinitions'

/** Toolbar sort + column visibility: same ids/labels as {@link EXPENSE_REQUEST_COLUMN_DEFINITIONS}. */
export const expenseRequestSortableColumns: ColumnConfig[] = EXPENSE_REQUEST_COLUMN_DEFINITIONS.map(
  ({ id, i18nKey, fallback }) => ({
    id,
    label: getTranslationFromI18nKeyAndLabel(i18nKey, fallback)
  })
)

export const expenseRequestAvailableColumns = expenseRequestSortableColumns

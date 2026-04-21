import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { ColumnConfig } from '../../../../common/types/columnTypes'
import { EXPENSE_PLAN_COLUMN_DEFINITIONS } from './expensePlanColumnDefinitions'

/** Toolbar sort + column visibility: same ids/labels as {@link EXPENSE_PLAN_COLUMN_DEFINITIONS}. */
export const expensePlanSortableColumns: ColumnConfig[] = EXPENSE_PLAN_COLUMN_DEFINITIONS.map(
  ({ id, i18nKey, fallback }) => ({
    id,
    label: getTranslationFromI18nKeyAndLabel(i18nKey, fallback)
  })
)

export const expensePlanAvailableColumns = expensePlanSortableColumns

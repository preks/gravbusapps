import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { ColumnConfig } from '../../../../common/types/columnTypes'
import { ADVANCE_PAYMENT_COLUMN_DEFINITIONS } from './advancePaymentColumnDefinitions'

/** Toolbar sort + column visibility: same ids/labels as {@link ADVANCE_PAYMENT_COLUMN_DEFINITIONS}. */
export const advancePaymentSortableColumns: ColumnConfig[] = ADVANCE_PAYMENT_COLUMN_DEFINITIONS.map(
  ({ id, i18nKey, fallback }) => ({
    id,
    label: getTranslationFromI18nKeyAndLabel(i18nKey, fallback)
  })
)

export const advancePaymentAvailableColumns = advancePaymentSortableColumns

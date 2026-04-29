import { formatExpenseRequestDateShort } from '../../utils/dateUtils'
import type { TranslateFn } from '../../utils/utils'

export {
  naLabel,
  expenseTableColumnHeader,
  createFormatCurrency,
  renderTitleCodeCell,
  renderCodeCell,
  createDateColumn,
  createEmployeeColumn,
  createCurrencyColumn,
  createStatusBadgeColumn
} from '../../../../common/columns/expenseColumnHelpers'

export type {
  BadgeVariant,
  StatusDisplayConfig,
  EmployeeLike,
  DateColumnOptions,
  CurrencyColumnOptions,
  StatusBadgeColumnOptions
} from '../../../../common/columns/expenseColumnHelpers'

export function createFormatDate(t: TranslateFn) {
  return (v: string | null | undefined) => formatExpenseRequestDateShort(v, t('common-not-available'))
}

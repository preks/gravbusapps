import type { ColumnConfig } from '../../../../../../common/types/columnTypes'

/** All columns shown in the column visibility picker (includes non-sortable columns). */
export function createExpenseItemAvailableColumns(
  expenseDateLabel: string,
  t: (key: string) => string
): ColumnConfig[] {
  return [
    {
      id: 'selection',
      label: t('expense-items-column-selection')
    },
    {
      id: 'title',
      label: t('expense-items-column-title')
    },
    {
      id: 'expenseDate',
      label: expenseDateLabel
    },
    {
      id: 'status',
      label: t('expense-items-column-status')
    },
    {
      id: 'attachment',
      label: t('expense-items-column-attachment')
    },
    {
      id: 'reimbursableAmount',
      label: t('expense-items-column-reimbursable')
    }
  ]
}

export type { ColumnConfig as AvailableColumn } from '../../../../../../common/types/columnTypes'

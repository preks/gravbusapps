import type { ColumnConfig } from '../../../../../../common/types/columnTypes'

export function createExpenseItemSortableColumns(expenseDateLabel: string, t: (key: string) => string): ColumnConfig[] {
  return [
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
      id: 'reimbursableAmount',
      label: t('expense-items-column-reimbursable')
    }
  ]
}

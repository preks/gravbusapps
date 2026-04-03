import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { ColumnConfig } from '../../../../../../common/types/columnTypes'

export function createExpenseItemSortableColumns(expenseDateLabel: string): ColumnConfig[] {
  return [
    {
      id: 'title',
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_request.expense_request_container.current_title_label',
        'Title'
      )
    },
    {
      id: 'expenseDate',
      label: expenseDateLabel
    },
    {
      id: 'status',
      label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status')
    },
    {
      id: 'reimbursableAmount',
      label: getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_request.reimbursable', 'Reimbursable Amount')
    }
  ]
}

import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { ColumnConfig } from '../../../../../../common/types/columnTypes'

export const expensePlanSortableColumns: ColumnConfig[] = [
  {
    id: 'code',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:expense_request_list.expense_request_filter.plan_number_input',
      'Plan Number'
    )
  },
  { id: 'title', label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.expense_table.title', 'Title') },
  {
    id: 'planDate',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.plan_details.plan_date', 'Plan Date')
  },
  {
    id: 'startDate',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.expense_plan_table.start_date', 'Start Date')
  },
  {
    id: 'endDate',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.expense_plan_table.end_date', 'End Date')
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

import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface SortableColumn {
  id: string
  label: string
}

/**
 * Sortable column definitions for the manager expense plans DataDisplay sort dropdown.
 * IDs must match column ids in expensePlanColumns.tsx.
 */
export const expensePlanSortableColumns: SortableColumn[] = [
  { id: 'title', label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.expense_table.title', 'Title') },
  {
    id: 'requestCode',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:expense_request_list.expense_request_filter.request_number_input',
      'Request Code'
    )
  },
  {
    id: 'startDate',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start Date')
  },
  {
    id: 'endDate',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End Date')
  },
  {
    id: 'employee',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.employee', 'Employee')
  },
  {
    id: 'createdAt',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:manager_expense_request_list.expense_table.creation_date',
      'Creation Date'
    )
  },
  {
    id: 'totalAmount',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:sales_hub.amount', 'Amount')
  },
  {
    id: 'status',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status')
  }
]

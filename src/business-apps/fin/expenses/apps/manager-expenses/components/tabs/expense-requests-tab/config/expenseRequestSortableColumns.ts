import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { ColumnConfig } from '../../../../common/types/columnTypes'

export type { ColumnConfig as SortableColumn }

export const expenseRequestSortableColumns: ColumnConfig[] = [
  {
    id: 'title',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.title', 'Title')
  },
  {
    id: 'planCode',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_table.code', 'Plan Code')
  },
  { id: 'startDate', label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start Date') },
  { id: 'endDate', label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End Date') },
  {
    id: 'employee',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.employee', 'Employee')
  },
  {
    id: 'requestDate',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:confirm_transfer_advance_payment.request_date_label',
      'Request Date'
    )
  },
  {
    id: 'totalAmount',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:manager_expense_request_list.expense_table.amount', 'Amount')
  },
  { id: 'status', label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_details.status', 'Status') }
]

export const expenseRequestAvailableColumns = expenseRequestSortableColumns

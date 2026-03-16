import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface AvailableColumn {
  id: string
  label: string
}

/**
 * Available column definitions for the manager advance payments DataDisplay column visibility toggle.
 * IDs must match column ids in advancePaymentColumns.tsx.
 */
export const advancePaymentAvailableColumns: AvailableColumn[] = [
  {
    id: 'expensePlan.title',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:create_expense_request.initial_expense_plan_select_label',
      'Expense Plan'
    )
  },
  {
    id: 'expensePlan.startDate',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start Date')
  },
  {
    id: 'expensePlan.endDate',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End Date')
  },
  {
    id: 'expensePlan.employee.fullName',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:expense_config_calculation_rule_list.expense_table.employee',
      'Employee'
    )
  },
  {
    id: 'createdAt',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:manager_expense_request_list.expense_table.creation_date',
      'Creation Date'
    )
  },
  {
    id: 'amount',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:sales_hub.amount', 'Amount')
  },
  {
    id: 'status',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.expense_table.status', 'Status')
  }
]

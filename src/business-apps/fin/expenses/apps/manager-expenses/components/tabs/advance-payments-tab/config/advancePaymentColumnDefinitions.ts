import { defineManagerTableColumns } from '../../../../utils/managerTableColumnDefinitions'

/**
 * Single source of truth for manager Advance Payments table column ids and header copy.
 * Sortable / column-picker configs derive from this list; TanStack column defs use {@link getAdvancePaymentColumnHeader}.
 */
export const {
  columnDefinitions: ADVANCE_PAYMENT_COLUMN_DEFINITIONS,
  defaultVisibleColumnIds: ADVANCE_PAYMENT_DEFAULT_VISIBLE_COLUMN_IDS,
  getColumnHeader: getAdvancePaymentColumnHeader
} = defineManagerTableColumns([
  {
    id: 'expensePlan.title',
    i18nKey: 'lowcoder:create_expense_request.initial_expense_plan_select_label',
    fallback: 'Expense Plan'
  },
  {
    id: 'expensePlan.startDate',
    i18nKey: 'lowcoder:personal_expenses.start_date',
    fallback: 'Start Date'
  },
  {
    id: 'expensePlan.endDate',
    i18nKey: 'lowcoder:personal_expenses.end_date',
    fallback: 'End Date'
  },
  {
    id: 'expensePlan.employee.fullName',
    i18nKey: 'lowcoder:expense_config_calculation_rule_list.expense_table.employee',
    fallback: 'Employee'
  },
  {
    id: 'createdAt',
    i18nKey: 'lowcoder:manager_expense_request_list.expense_table.creation_date',
    fallback: 'Creation Date'
  },
  {
    id: 'amount',
    i18nKey: 'lowcoder:sales_hub.amount',
    fallback: 'Amount'
  },
  {
    id: 'status',
    i18nKey: 'lowcoder:expense_item_list.expense_table.status',
    fallback: 'Status'
  }
] as const)

export type AdvancePaymentColumnId = (typeof ADVANCE_PAYMENT_COLUMN_DEFINITIONS)[number]['id']

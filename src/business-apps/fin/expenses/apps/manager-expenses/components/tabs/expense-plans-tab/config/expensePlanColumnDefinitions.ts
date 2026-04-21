import { defineManagerTableColumns } from '../../../../utils/managerTableColumnDefinitions'

/**
 * Single source of truth for manager Expense Plans table column ids and header copy.
 * Sortable / column-picker configs derive from this list; TanStack column defs use {@link getExpensePlanColumnHeader}.
 */
export const {
  columnDefinitions: EXPENSE_PLAN_COLUMN_DEFINITIONS,
  defaultVisibleColumnIds: EXPENSE_PLAN_DEFAULT_VISIBLE_COLUMN_IDS,
  getColumnHeader: getExpensePlanColumnHeader
} = defineManagerTableColumns([
  {
    id: 'title',
    i18nKey: 'lowcoder:expense_item_list.expense_table.title',
    fallback: 'Title'
  },
  {
    id: 'requestCode',
    i18nKey: 'lowcoder:expense_request_list.expense_request_filter.request_number_input',
    fallback: 'Request Code'
  },
  {
    id: 'startDate',
    i18nKey: 'lowcoder:personal_expenses.start_date',
    fallback: 'Start Date'
  },
  {
    id: 'endDate',
    i18nKey: 'lowcoder:personal_expenses.end_date',
    fallback: 'End Date'
  },
  {
    id: 'employee',
    i18nKey: 'lowcoder:hr_absences.create_absence.employee',
    fallback: 'Employee'
  },
  {
    id: 'createdAt',
    i18nKey: 'lowcoder:manager_expense_request_list.expense_table.creation_date',
    fallback: 'Creation Date'
  },
  {
    id: 'totalAmount',
    i18nKey: 'lowcoder:sales_hub.amount',
    fallback: 'Amount'
  },
  {
    id: 'status',
    i18nKey: 'lowcoder:expense_request_list.expense_plan_table.status',
    fallback: 'Status'
  }
] as const)

export type ExpensePlanColumnId = (typeof EXPENSE_PLAN_COLUMN_DEFINITIONS)[number]['id']

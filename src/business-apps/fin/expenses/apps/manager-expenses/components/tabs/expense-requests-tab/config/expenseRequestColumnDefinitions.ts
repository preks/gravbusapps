import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

/**
 * Single source of truth for manager Expense Requests table column ids and header copy.
 * Sortable / column-picker configs derive from this list; TanStack column defs use {@link getExpenseRequestColumnHeader}.
 */
export const EXPENSE_REQUEST_COLUMN_DEFINITIONS = [
  {
    id: 'title',
    i18nKey: 'lowcoder:expense_request_list.expense_plan_table.title',
    fallback: 'Title'
  },
  {
    id: 'planCode',
    i18nKey: 'lowcoder:expense_calculation_rule.expense_table.code',
    fallback: 'Plan Code'
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
    id: 'requestDate',
    i18nKey: 'lowcoder:confirm_transfer_advance_payment.request_date_label',
    fallback: 'Request Date'
  },
  {
    id: 'totalAmount',
    i18nKey: 'lowcoder:manager_expense_request_list.expense_table.amount',
    fallback: 'Amount'
  },
  {
    id: 'status',
    i18nKey: 'lowcoder:expense_request_details.status',
    fallback: 'Status'
  }
] as const

export type ExpenseRequestColumnId = (typeof EXPENSE_REQUEST_COLUMN_DEFINITIONS)[number]['id']

export const EXPENSE_REQUEST_DEFAULT_VISIBLE_COLUMN_IDS: ExpenseRequestColumnId[] =
  EXPENSE_REQUEST_COLUMN_DEFINITIONS.map(column => column.id)

type ExpenseRequestColumnDefinition = (typeof EXPENSE_REQUEST_COLUMN_DEFINITIONS)[number]

const HEADER_BY_ID = Object.fromEntries(
  EXPENSE_REQUEST_COLUMN_DEFINITIONS.map(column => [column.id, column])
) as Record<ExpenseRequestColumnId, ExpenseRequestColumnDefinition>

export function getExpenseRequestColumnHeader(id: ExpenseRequestColumnId): string {
  const column = HEADER_BY_ID[id]
  return getTranslationFromI18nKeyAndLabel(column.i18nKey, column.fallback)
}

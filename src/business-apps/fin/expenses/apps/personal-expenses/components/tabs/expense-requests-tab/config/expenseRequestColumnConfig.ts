import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { ColumnConfig } from '../../../../../../common/types/columnTypes'

export type ExpenseRequestTableSortOrder = 'ascend' | 'descend'

/** Applied when sort is cleared/reset from toolbar or table state. */
export const expenseRequestDefaultSort = {
  field: 'requestDate',
  order: 'descend' as ExpenseRequestTableSortOrder
}

/** Column ids that support sorting (must match `buildExpenseRequestOrderBy`). */
const SORTABLE_COLUMN_IDS: ReadonlySet<string> = new Set([
  'code',
  'title',
  'requestDate',
  'startDate',
  'endDate',
  'status',
  'reimbursableAmount'
])

function buildExpenseRequestColumns(): ColumnConfig[] {
  return [
    {
      id: 'code',
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_request_list.expense_request_filter.request_number_input',
        'Request Number'
      )
    },
    {
      id: 'title',
      label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.expense_table.title', 'Title')
    },
    {
      id: 'requestDate',
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:confirm_transfer_advance_payment.request_date_label',
        'Request Date'
      )
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
    },
    {
      id: 'advance',
      label: getTranslationFromI18nKeyAndLabel('lowcoder:manager_expense_request_list.expense_table.advance', 'Advance')
    }
  ]
}

/** Includes visibility-only columns (e.g. advance). */
export const expenseRequestAvailableColumns: ColumnConfig[] = buildExpenseRequestColumns()

/** Toolbar sort dropdown — excludes non-sortable columns. */
export const expenseRequestSortableColumns: ColumnConfig[] = expenseRequestAvailableColumns.filter(c =>
  SORTABLE_COLUMN_IDS.has(c.id)
)

export const expenseRequestDefaultVisibleColumnIds: string[] = [
  'code',
  'title',
  'requestDate',
  'startDate',
  'endDate',
  'status',
  'reimbursableAmount',
  'advance'
]

import type { ColumnDef } from '@tanstack/react-table'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  createDateColumn,
  createEmployeeColumn,
  createCurrencyColumn,
  createStatusBadgeColumn,
  createFormatDate,
  createFormatCurrency,
  renderTitleCodeCell,
  renderCodeCell
} from '../../../common/columns/expenseColumnHelpers'
import { getExpenseRequestStatusDisplay } from '../../../utils'
import type { ExpenseRequest } from '../../../hooks/useGetExpenseRequests'

const TITLE = 'lowcoder:expense_request_list.expense_plan_table.title'
const TITLE_LABEL = 'Title'
const PLAN_CODE = 'lowcoder:expense_calculation_rule.expense_table.code'
const PLAN_CODE_LABEL = 'Plan Code'
const START_DATE = 'lowcoder:personal_expenses.start_date'
const START_DATE_LABEL = 'Start Date'
const END_DATE = 'lowcoder:personal_expenses.end_date'
const END_DATE_LABEL = 'End Date'
const EMPLOYEE = 'lowcoder:hr_absences.create_absence.employee'
const EMPLOYEE_LABEL = 'Employee'
const REQUEST_DATE = 'lowcoder:confirm_transfer_advance_payment.request_date_label'
const REQUEST_DATE_LABEL = 'Request Date'
const AMOUNT = 'lowcoder:manager_expense_request_list.expense_table.amount'
const AMOUNT_LABEL = 'Amount'
const STATUS = 'lowcoder:expense_request_details.status'
const STATUS_LABEL = 'Status'
const UNTITLED = 'lowcoder:common.untitled_request'
const UNTITLED_LABEL = 'Untitled Request'

/**
 * Builds column definitions for the manager expense requests table.
 * currencyFilter: when set, all amount cells use this currency; otherwise each row uses its own.
 */
export function createExpenseRequestColumns(currencyFilter: string | null): ColumnDef<ExpenseRequest>[] {
  const formatDate = createFormatDate()
  const formatCurrency = createFormatCurrency(currencyFilter)

  return [
    {
      id: 'title',
      accessorKey: 'title',
      header: getTranslationFromI18nKeyAndLabel(TITLE, TITLE_LABEL),
      enableSorting: true,
      size: 200,
      minSize: 160,
      maxSize: 320,
      cell: ({ row }) =>
        renderTitleCodeCell(
          row.original.title,
          row.original.code,
          `expense-requests-title-${row.original.id}`,
          getTranslationFromI18nKeyAndLabel(UNTITLED, UNTITLED_LABEL)
        )
    },
    {
      id: 'planCode',
      accessorFn: (row: ExpenseRequest) => (row as any)?.expensePlan?.code ?? null,
      header: getTranslationFromI18nKeyAndLabel(PLAN_CODE, PLAN_CODE_LABEL),
      enableSorting: true,
      size: 120,
      minSize: 90,
      maxSize: 180,
      cell: ({ row }) => renderCodeCell((row.original as any)?.expensePlan?.code ?? null)
    },
    createDateColumn<ExpenseRequest>(
      'startDate',
      getTranslationFromI18nKeyAndLabel(START_DATE, START_DATE_LABEL),
      'startDate',
      { formatDate }
    ),
    createDateColumn<ExpenseRequest>(
      'endDate',
      getTranslationFromI18nKeyAndLabel(END_DATE, END_DATE_LABEL),
      'endDate',
      { formatDate }
    ),
    createEmployeeColumn<ExpenseRequest>(
      'employee',
      getTranslationFromI18nKeyAndLabel(EMPLOYEE, EMPLOYEE_LABEL),
      (row: ExpenseRequest) => row.employee ?? null
    ),
    createDateColumn<ExpenseRequest>(
      'requestDate',
      getTranslationFromI18nKeyAndLabel(REQUEST_DATE, REQUEST_DATE_LABEL),
      'requestDate',
      { formatDate }
    ),
    createCurrencyColumn<ExpenseRequest>(
      'totalAmount',
      getTranslationFromI18nKeyAndLabel(AMOUNT, AMOUNT_LABEL),
      (row: ExpenseRequest) => {
        if (typeof row.amount === 'number') return row.amount
        if (typeof row.totalAmount === 'number') return row.totalAmount
        return 0
      },
      (row: ExpenseRequest) => currencyFilter ?? row.currency ?? 'EUR',
      formatCurrency
    ),
    createStatusBadgeColumn<ExpenseRequest>(
      'status',
      getTranslationFromI18nKeyAndLabel(STATUS, STATUS_LABEL),
      (row: ExpenseRequest) => getExpenseRequestStatusDisplay(row.status)
    )
  ]
}

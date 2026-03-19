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
import { getExpensePlanStatusDisplay } from '../../../utils'
import type { ExpensePlan } from '../../../hooks/useMainViewExpensePlans'
import type { ExpenseStatus } from '../../../utils'

const TITLE = 'lowcoder:expense_item_list.expense_table.title'
const TITLE_LABEL = 'Title'
const REQUEST_CODE = 'lowcoder:expense_request_list.expense_request_filter.request_number_input'
const REQUEST_CODE_LABEL = 'Request Code'
const START_DATE = 'lowcoder:personal_expenses.start_date'
const START_DATE_LABEL = 'Start Date'
const END_DATE = 'lowcoder:personal_expenses.end_date'
const END_DATE_LABEL = 'End Date'
const EMPLOYEE = 'lowcoder:hr_absences.create_absence.employee'
const EMPLOYEE_LABEL = 'Employee'
const CREATION_DATE = 'lowcoder:manager_expense_request_list.expense_table.creation_date'
const CREATION_DATE_LABEL = 'Creation Date'
const AMOUNT = 'lowcoder:sales_hub.amount'
const AMOUNT_LABEL = 'Amount'
const STATUS = 'lowcoder:expense_request_list.expense_plan_table.status'
const STATUS_LABEL = 'Status'

/**
 * Builds column definitions for the manager expense plans table.
 * currencyFilter: when set, all amount cells use this currency; otherwise each row uses its own.
 */
export function createExpensePlanColumns(currencyFilter: string | null): ColumnDef<ExpensePlan>[] {
  const formatDate = createFormatDate()
  const formatCurrency = createFormatCurrency(currencyFilter)

  return [
    {
      id: 'title',
      accessorKey: 'title',
      header: getTranslationFromI18nKeyAndLabel(TITLE, TITLE_LABEL),
      size: 200,
      minSize: 160,
      maxSize: 320,
      cell: ({ row }) =>
        renderTitleCodeCell(row.original.title, row.original.code, `expense-plan-title-${row.original.id}`)
    },
    {
      id: 'requestCode',
      accessorFn: (row: ExpensePlan) =>
        Array.isArray(row.expenseRequest) && row.expenseRequest.length > 0
          ? (row.expenseRequest[0]?.code ?? null)
          : null,
      header: getTranslationFromI18nKeyAndLabel(REQUEST_CODE, REQUEST_CODE_LABEL),
      size: 120,
      minSize: 90,
      maxSize: 180,
      cell: ({ row }) => {
        const code =
          Array.isArray(row.original.expenseRequest) && row.original.expenseRequest.length > 0
            ? row.original.expenseRequest[0]?.code
            : null
        return renderCodeCell(code)
      }
    },
    createDateColumn<ExpensePlan>(
      'startDate',
      getTranslationFromI18nKeyAndLabel(START_DATE, START_DATE_LABEL),
      'startDate',
      { formatDate }
    ),
    createDateColumn<ExpensePlan>('endDate', getTranslationFromI18nKeyAndLabel(END_DATE, END_DATE_LABEL), 'endDate', {
      formatDate
    }),
    createEmployeeColumn<ExpensePlan>(
      'employee',
      getTranslationFromI18nKeyAndLabel(EMPLOYEE, EMPLOYEE_LABEL),
      (row: ExpensePlan) => row.employee ?? null
    ),
    createDateColumn<ExpensePlan>(
      'createdAt',
      getTranslationFromI18nKeyAndLabel(CREATION_DATE, CREATION_DATE_LABEL),
      'createdAt',
      { formatDate }
    ),
    createCurrencyColumn<ExpensePlan>(
      'totalAmount',
      getTranslationFromI18nKeyAndLabel(AMOUNT, AMOUNT_LABEL),
      (row: ExpensePlan) => (typeof row.totalAmount === 'number' ? row.totalAmount : 0),
      (row: ExpensePlan) => currencyFilter ?? row.currency ?? 'EUR',
      formatCurrency
    ),
    createStatusBadgeColumn<ExpensePlan>(
      'status',
      getTranslationFromI18nKeyAndLabel(STATUS, STATUS_LABEL),
      (row: ExpensePlan) => getExpensePlanStatusDisplay(row.status as ExpenseStatus)
    )
  ]
}

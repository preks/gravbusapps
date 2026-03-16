import type { ColumnDef } from '@tanstack/react-table'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  createDateColumn,
  createEmployeeColumn,
  createCurrencyColumn,
  createStatusBadgeColumn
} from '../../../common/columns/expenseColumnHelpers'
import { ensureShortDateFormat } from '../../../utils/dateUtils'
import { formatCurrencyDisplay } from '../../../../personal-expenses/utils'
import { getAdvancePaymentStatusDisplay } from '../../../utils'
import type { AdvancePayment as AdvancePaymentItem } from '../../../hooks/useMainViewAdvancePayments'

const NOT_AVAILABLE = 'lowcoder:common.not_available'
const NOT_AVAILABLE_LABEL = 'N/A'
const EXPENSE_PLAN = 'lowcoder:create_expense_request.initial_expense_plan_select_label'
const EXPENSE_PLAN_LABEL = 'Expense Plan'
const START_DATE = 'lowcoder:personal_expenses.start_date'
const START_DATE_LABEL = 'Start Date'
const END_DATE = 'lowcoder:personal_expenses.end_date'
const END_DATE_LABEL = 'End Date'
const EMPLOYEE = 'lowcoder:expense_config_calculation_rule_list.expense_table.employee'
const EMPLOYEE_LABEL = 'Employee'
const CREATION_DATE = 'lowcoder:manager_expense_request_list.expense_table.creation_date'
const CREATION_DATE_LABEL = 'Creation Date'
const AMOUNT = 'lowcoder:sales_hub.amount'
const AMOUNT_LABEL = 'Amount'
const STATUS = 'lowcoder:expense_item_list.expense_table.status'
const STATUS_LABEL = 'Status'

/**
 * Builds column definitions for the manager advance payments table.
 * currencyFilter: when set, all amount cells use this currency; otherwise each row uses its own.
 */
export function createAdvancePaymentColumns(currencyFilter: string | null): ColumnDef<AdvancePaymentItem>[] {
  const formatDate = (v: string | null | undefined) =>
    v ? ensureShortDateFormat(v) : getTranslationFromI18nKeyAndLabel(NOT_AVAILABLE, NOT_AVAILABLE_LABEL)

  const normalizeCurrency = (raw: string | undefined): string => {
    if (!raw) return 'EUR'
    const part = raw.split('Currency:v1:').pop()
    return part || raw
  }

  const formatCurrency = (amount: number, currency: string) => formatCurrencyDisplay(amount, currency)

  return [
    {
      id: 'expensePlan.title',
      accessorFn: (row: AdvancePaymentItem) => row.expensePlan?.title ?? null,
      header: getTranslationFromI18nKeyAndLabel(EXPENSE_PLAN, EXPENSE_PLAN_LABEL),
      size: 200,
      minSize: 160,
      maxSize: 320,
      cell: ({ row }) => {
        const plan = row.original.expensePlan
        return (
          <div>
            <div
              className="gba:font-medium gba:text-sm gba:whitespace-nowrap gba:truncate"
              data-testid={`advance-payment-expense-plan-title-${row.original.id}`}
            >
              {plan?.title ?? getTranslationFromI18nKeyAndLabel(NOT_AVAILABLE, NOT_AVAILABLE_LABEL)}
            </div>
            <div className="gba:text-xs gba:text-muted-foreground gba:whitespace-nowrap gba:truncate">
              {plan?.code ?? getTranslationFromI18nKeyAndLabel(NOT_AVAILABLE, NOT_AVAILABLE_LABEL)}
            </div>
          </div>
        )
      }
    },
    createDateColumn<AdvancePaymentItem>(
      'expensePlan.startDate',
      getTranslationFromI18nKeyAndLabel(START_DATE, START_DATE_LABEL),
      (row: AdvancePaymentItem) => row.expensePlan?.startDate ?? null,
      { formatDate }
    ),
    createDateColumn<AdvancePaymentItem>(
      'expensePlan.endDate',
      getTranslationFromI18nKeyAndLabel(END_DATE, END_DATE_LABEL),
      (row: AdvancePaymentItem) => row.expensePlan?.endDate ?? null,
      { formatDate }
    ),
    createEmployeeColumn<AdvancePaymentItem>(
      'expensePlan.employee.fullName',
      getTranslationFromI18nKeyAndLabel(EMPLOYEE, EMPLOYEE_LABEL),
      (row: AdvancePaymentItem) => row.expensePlan?.employee ?? null
    ),
    createDateColumn<AdvancePaymentItem>(
      'createdAt',
      getTranslationFromI18nKeyAndLabel(CREATION_DATE, CREATION_DATE_LABEL),
      'createdAt',
      { formatDate }
    ),
    createCurrencyColumn<AdvancePaymentItem>(
      'amount',
      getTranslationFromI18nKeyAndLabel(AMOUNT, AMOUNT_LABEL),
      (row: AdvancePaymentItem) => (typeof row.amount === 'number' ? row.amount : 0),
      (row: AdvancePaymentItem) =>
        currencyFilter ? normalizeCurrency(currencyFilter) : normalizeCurrency(row.currencyRef),
      formatCurrency
    ),
    createStatusBadgeColumn<AdvancePaymentItem>(
      'status',
      getTranslationFromI18nKeyAndLabel(STATUS, STATUS_LABEL),
      (row: AdvancePaymentItem) => getAdvancePaymentStatusDisplay(row.status)
    )
  ]
}

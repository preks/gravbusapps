import type { CellContext, ColumnDef } from '@tanstack/react-table'
import { Badge } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel, getCatalogValue } from '@/common/utils/windowUtils'
import { getAdvancePaymentStatusDisplayT, formatCurrencyDisplay } from '../../../../../utils'
import type { AdvancePayment } from '../../../../../hooks/useGetAdvancePayments'

export const ADVANCE_PAYMENTS_TABLE_DATA_TEST_ID = 'AdvancePaymentsTable'

function AdvancePaymentExpensePlanCell({ record }: Readonly<{ record: AdvancePayment }>) {
  return (
    <div className="gba:font-medium gba:text-sm gba:truncate" data-testid="advance-payment-expense-plan-cell">
      {record.expensePlan?.title ??
        getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.no_expense_plan', 'No expense plan')}
    </div>
  )
}

function AdvancePaymentPlanNumberCell({ record }: Readonly<{ record: AdvancePayment }>) {
  return (
    <div className="gba:text-sm gba:truncate" data-testid="advance-payment-plan-number-cell">
      {record.expensePlan?.code ?? 'N/A'}
    </div>
  )
}

function AdvancePaymentAmountCell({ record }: Readonly<{ record: AdvancePayment }>) {
  const plan = record.expensePlan
  const amount = plan?.totalAmount
  const currencyCode = plan?.currency?.code ?? 'EUR'
  return (
    <div className="gba:text-right gba:text-sm gba:font-mono gba:truncate" data-testid="advance-payment-amount-cell">
      {amount != null && amount !== undefined
        ? formatCurrencyDisplay(amount, currencyCode)
        : formatCurrencyDisplay(0, 'EUR')}
    </div>
  )
}

function AdvancePaymentAdvanceCell({ record }: Readonly<{ record: AdvancePayment }>) {
  return (
    <div className="gba:text-right gba:text-sm gba:font-mono gba:truncate" data-testid="advance-payment-advance-cell">
      {formatCurrencyDisplay(record.amount, record.currency?.code ?? 'EUR')}
    </div>
  )
}

function AdvancePaymentMethodCell({ record }: Readonly<{ record: AdvancePayment }>) {
  const pm = record.paymentMethod
  let label: string
  if (!pm) {
    label = 'N/A'
  } else if (typeof pm === 'object' && pm !== null && 'value' in pm) {
    label = getCatalogValue(pm)
  } else if (typeof pm === 'string' && pm === 'DIRECT_DEPOSIT') {
    label = getTranslationFromI18nKeyAndLabel(
      'lowcoder:initiate_expense_plan.create_expense_plan.payment_method_select_direct_deposit',
      'Direct Deposit'
    )
  } else if (typeof pm === 'string' && pm === 'CASH_PAYMENT') {
    label = getTranslationFromI18nKeyAndLabel(
      'lowcoder:initiate_expense_plan.create_expense_plan.payment_method_select_cash_payment',
      'Cash Payment'
    )
  } else {
    label = 'N/A'
  }
  return (
    <div className="gba:text-sm gba:truncate" data-testid="advance-payment-method-cell">
      {label}
    </div>
  )
}

function renderAdvExpensePlanCell(info: CellContext<AdvancePayment, unknown>) {
  return <AdvancePaymentExpensePlanCell record={info.row.original} />
}
function renderAdvPlanNumberCell(info: CellContext<AdvancePayment, unknown>) {
  return <AdvancePaymentPlanNumberCell record={info.row.original} />
}
function renderAdvAmountCell(info: CellContext<AdvancePayment, unknown>) {
  return <AdvancePaymentAmountCell record={info.row.original} />
}
function renderAdvAdvanceCell(info: CellContext<AdvancePayment, unknown>) {
  return <AdvancePaymentAdvanceCell record={info.row.original} />
}
function renderAdvMethodCell(info: CellContext<AdvancePayment, unknown>) {
  return <AdvancePaymentMethodCell record={info.row.original} />
}

export function createAdvancePaymentColumns(t: (key: string) => string): ColumnDef<AdvancePayment>[] {
  function AdvancePaymentStatusCell({ record }: Readonly<{ record: AdvancePayment }>) {
    const statusConfig = getAdvancePaymentStatusDisplayT(t, record.status)
    return (
      <Badge variant={statusConfig.badgeVariant ?? 'outline'} data-testid="advance-payment-status-cell">
        {statusConfig.label}
      </Badge>
    )
  }
  function renderAdvStatusCell(info: CellContext<AdvancePayment, unknown>) {
    return <AdvancePaymentStatusCell record={info.row.original} />
  }

  return [
    {
      id: 'expensePlan',
      accessorFn: (row: AdvancePayment) => row.expensePlan?.title,
      header: getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_request.initial_expense_plan_select_label',
        'Expense Plan'
      ),
      size: 200,
      cell: renderAdvExpensePlanCell
    },
    {
      id: 'planNumber',
      accessorFn: (row: AdvancePayment) => row.expensePlan?.code,
      header: getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_request_list.expense_request_filter.plan_number_input',
        'Plan Number'
      ),
      size: 120,
      cell: renderAdvPlanNumberCell
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: getTranslationFromI18nKeyAndLabel('lowcoder:expense_table.status', 'Status'),
      size: 100,
      cell: renderAdvStatusCell
    },
    {
      id: 'amount',
      accessorFn: (row: AdvancePayment) => row.expensePlan?.totalAmount,
      header: getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.expense_plan_table.amount', 'Amount'),
      size: 120,
      sortDescFirst: false,
      meta: { align: 'right' as const },
      cell: renderAdvAmountCell
    },
    {
      id: 'advance',
      accessorKey: 'amount',
      header: getTranslationFromI18nKeyAndLabel(
        'lowcoder:manager_expense_request_list.expense_table.advance',
        'Advance'
      ),
      size: 120,
      sortDescFirst: false,
      meta: { align: 'right' as const },
      cell: renderAdvAdvanceCell
    },
    {
      id: 'paymentMethod',
      accessorKey: 'paymentMethod',
      header: getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_request.add_request_trip_details.payment_method',
        'Payment Method'
      ),
      size: 140,
      cell: renderAdvMethodCell
    }
  ]
}

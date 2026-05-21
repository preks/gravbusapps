import type { CellContext, ColumnDef } from '@tanstack/react-table'
import { Badge } from '@newwork/nw-design-system'
import { getCatalogValue } from '@/common/utils/windowUtils'
import { expenseTableColumnHeader } from '@/business-apps/fin/expenses/common/columns/expenseColumnHelpers'
import { getAdvancePaymentStatusDisplayT, formatCurrencyDisplay } from '../../../../../utils'
import type { AdvancePayment } from '../../../../../hooks/useGetAdvancePayments'

export const ADVANCE_PAYMENTS_TABLE_DATA_TEST_ID = 'AdvancePaymentsTable'

function AdvancePaymentExpensePlanCell({
  record,
  t
}: Readonly<{ record: AdvancePayment; t: (key: string) => string }>) {
  return (
    <div className="gba:font-medium gba:text-sm gba:truncate" data-testid="advance-payment-expense-plan-cell">
      {record.expensePlan?.title ?? t('personal-expenses-no-expense-plan')}
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

function AdvancePaymentMethodCell({ record, t }: Readonly<{ record: AdvancePayment; t: (key: string) => string }>) {
  const pm = record.paymentMethod
  let label: string
  if (!pm) {
    label = t('expense-details-value-not-available')
  } else if (typeof pm === 'object' && pm !== null && 'value' in pm) {
    label = getCatalogValue(pm)
  } else if (typeof pm === 'string' && pm === 'DIRECT_DEPOSIT') {
    label = t('personal-expenses-payment-direct-deposit')
  } else if (typeof pm === 'string' && pm === 'CASH_PAYMENT') {
    label = t('personal-expenses-payment-cash-payment')
  } else {
    label = t('expense-details-value-not-available')
  }
  return (
    <div className="gba:text-sm gba:truncate" data-testid="advance-payment-method-cell">
      {label}
    </div>
  )
}

function renderAdvExpensePlanCell(t: (key: string) => string) {
  return function render(info: CellContext<AdvancePayment, unknown>) {
    return <AdvancePaymentExpensePlanCell record={info.row.original} t={t} />
  }
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
function renderAdvMethodCell(t: (key: string) => string) {
  return function render(info: CellContext<AdvancePayment, unknown>) {
    return <AdvancePaymentMethodCell record={info.row.original} t={t} />
  }
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
      header: expenseTableColumnHeader(t('personal-expenses-column-expense-plan')),
      size: 200,
      minSize: 160,
      cell: renderAdvExpensePlanCell(t)
    },
    {
      id: 'planNumber',
      accessorFn: (row: AdvancePayment) => row.expensePlan?.code,
      header: expenseTableColumnHeader(t('expense-plans-column-plan-number')),
      size: 132,
      minSize: 120,
      cell: renderAdvPlanNumberCell
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: expenseTableColumnHeader(t('expense-items-column-status')),
      size: 100,
      minSize: 96,
      cell: renderAdvStatusCell
    },
    {
      id: 'amount',
      accessorFn: (row: AdvancePayment) => row.expensePlan?.totalAmount,
      header: expenseTableColumnHeader(t('personal-expenses-column-amount')),
      size: 120,
      minSize: 108,
      sortDescFirst: false,
      meta: { align: 'right' as const },
      cell: renderAdvAmountCell
    },
    {
      id: 'advance',
      accessorKey: 'amount',
      header: expenseTableColumnHeader(t('personal-expenses-column-advance-payment')),
      size: 120,
      minSize: 108,
      sortDescFirst: false,
      meta: { align: 'right' as const },
      cell: renderAdvAdvanceCell
    },
    {
      id: 'paymentMethod',
      accessorKey: 'paymentMethod',
      header: expenseTableColumnHeader(t('personal-expenses-column-payment-method')),
      size: 148,
      minSize: 132,
      cell: renderAdvMethodCell(t)
    }
  ]
}

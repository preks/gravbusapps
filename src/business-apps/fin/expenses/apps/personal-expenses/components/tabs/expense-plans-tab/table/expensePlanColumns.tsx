import type { CellContext, ColumnDef } from '@tanstack/react-table'
import { Badge } from '@newwork/nw-design-system'
import { formatDate } from '@/common/utils/windowUtils'
import { expenseTableColumnHeader } from '@/business-apps/fin/expenses/common/columns/expenseColumnHelpers'
import type { ExpensePlan } from '../../../../hooks/useGetExpensePlans'
import { formatCurrencyDisplay, getExpensePlanStatusDisplayT } from '../../../../utils'

export const EXPENSE_PLANS_TABLE_DATA_TEST_ID_PREFIX = 'ExpensePlansTable'

function ExpensePlanCodeCell({ record }: Readonly<{ record: ExpensePlan }>) {
  return (
    <div className="gba:font-medium gba:text-sm gba:truncate" data-testid="expense-plan-code-cell">
      {record.code}
    </div>
  )
}

function ExpensePlanTitleCell({ record }: Readonly<{ record: ExpensePlan }>) {
  return (
    <div className="gba:font-medium gba:text-sm gba:truncate" data-testid="expense-plan-title-cell">
      {record.title}
    </div>
  )
}

function ExpensePlanDateCell({ dateValue, testId }: Readonly<{ dateValue: string | null; testId: string }>) {
  if (!dateValue) {
    return <span className="gba:text-sm gba:text-muted-foreground">N/A</span>
  }
  let formatted: string
  try {
    formatted = formatDate(dateValue, 'date.short') || 'N/A'
  } catch {
    formatted = 'N/A'
  }
  return (
    <div className="gba:text-sm gba:truncate" data-testid={testId}>
      {formatted}
    </div>
  )
}

function ExpensePlanReimbursableAmountCell({ record }: Readonly<{ record: ExpensePlan }>) {
  const amount = record.reimbursableAmount || 0
  return (
    <div
      className="gba:text-right gba:text-sm gba:font-mono gba:truncate"
      data-testid="expense-plan-reimbursable-amount-cell"
    >
      {formatCurrencyDisplay(amount, record.currency?.code)}
    </div>
  )
}

function ExpensePlanPaidAdvanceCell({ record }: Readonly<{ record: ExpensePlan }>) {
  return (
    <div className="gba:text-right gba:text-sm gba:font-mono gba:truncate" data-testid="expense-plan-paid-advance-cell">
      {record.advancePaymentPaidAmount && record.advancePaymentPaidAmount > 0 ? (
        formatCurrencyDisplay(record.advancePaymentPaidAmount, record.currency?.code)
      ) : (
        <span className="gba:text-muted-foreground">-</span>
      )}
    </div>
  )
}

function renderCodeCell(info: CellContext<ExpensePlan, unknown>) {
  return <ExpensePlanCodeCell record={info.row.original} />
}
function renderTitleCell(info: CellContext<ExpensePlan, unknown>) {
  return <ExpensePlanTitleCell record={info.row.original} />
}
function renderPlanDateCell(info: CellContext<ExpensePlan, unknown>) {
  return <ExpensePlanDateCell dateValue={info.row.original.planDate} testId="expense-plan-plan-date-cell" />
}
function renderStartDateCell(info: CellContext<ExpensePlan, unknown>) {
  return <ExpensePlanDateCell dateValue={info.row.original.startDate} testId="expense-plan-start-date-cell" />
}
function renderEndDateCell(info: CellContext<ExpensePlan, unknown>) {
  return <ExpensePlanDateCell dateValue={info.row.original.endDate} testId="expense-plan-end-date-cell" />
}
function renderReimbursableAmountCell(info: CellContext<ExpensePlan, unknown>) {
  return <ExpensePlanReimbursableAmountCell record={info.row.original} />
}
function renderPaidAdvanceCell(info: CellContext<ExpensePlan, unknown>) {
  return <ExpensePlanPaidAdvanceCell record={info.row.original} />
}

export function createExpensePlanColumns(t: (key: string) => string): ColumnDef<ExpensePlan>[] {
  function ExpensePlanStatusCell({ record }: Readonly<{ record: ExpensePlan }>) {
    const statusConfig = getExpensePlanStatusDisplayT(t, record.status)
    return (
      <Badge variant={statusConfig.badgeVariant ?? 'outline'} data-testid="expense-plan-status-cell">
        {statusConfig.label}
      </Badge>
    )
  }
  function renderStatusCell(info: CellContext<ExpensePlan, unknown>) {
    return <ExpensePlanStatusCell record={info.row.original} />
  }

  return [
    {
      id: 'code',
      accessorKey: 'code',
      header: expenseTableColumnHeader(t('expense-plans-column-plan-number')),
      size: 132,
      minSize: 120,
      maxSize: 200,
      cell: renderCodeCell
    },
    {
      id: 'title',
      accessorKey: 'title',
      header: expenseTableColumnHeader(t('expense-items-column-title')),
      size: 200,
      minSize: 160,
      cell: renderTitleCell
    },
    {
      id: 'planDate',
      accessorKey: 'planDate',
      header: expenseTableColumnHeader(t('expense-plans-column-plan-date')),
      size: 128,
      minSize: 118,
      sortDescFirst: true,
      cell: renderPlanDateCell
    },
    {
      id: 'startDate',
      accessorKey: 'startDate',
      header: expenseTableColumnHeader(t('personal-expenses-filter-label-start-date')),
      size: 128,
      minSize: 118,
      cell: renderStartDateCell
    },
    {
      id: 'endDate',
      accessorKey: 'endDate',
      header: expenseTableColumnHeader(t('expense-plans-column-end-date')),
      size: 128,
      minSize: 118,
      cell: renderEndDateCell
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: expenseTableColumnHeader(t('expense-items-column-status')),
      size: 100,
      minSize: 96,
      cell: renderStatusCell
    },
    {
      id: 'reimbursableAmount',
      accessorKey: 'reimbursableAmount',
      header: expenseTableColumnHeader(t('expense-items-column-reimbursable')),
      size: 148,
      minSize: 132,
      sortDescFirst: false,
      meta: { align: 'right' as const },
      cell: renderReimbursableAmountCell
    },
    {
      id: 'advancePaymentPaidAmount',
      accessorKey: 'advancePaymentPaidAmount',
      header: expenseTableColumnHeader(t('expense-plans-column-paid-advance')),
      size: 132,
      minSize: 120,
      sortDescFirst: false,
      meta: { align: 'right' as const },
      cell: renderPaidAdvanceCell
    }
  ]
}

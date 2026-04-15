import type { CellContext, ColumnDef } from '@tanstack/react-table'
import { Badge } from '@newwork/nw-design-system'
import { formatDate, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { ExpensePlan } from '../../../../hooks/useGetExpensePlans'
import { formatCurrencyDisplay, getExpensePlanStatusDisplay } from '../../../../utils'

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

function ExpensePlanStatusCell({ record }: Readonly<{ record: ExpensePlan }>) {
  const statusConfig = getExpensePlanStatusDisplay(record.status)
  return (
    <Badge variant={statusConfig.badgeVariant ?? 'outline'} data-testid="expense-plan-status-cell">
      {statusConfig.label}
    </Badge>
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
function renderStatusCell(info: CellContext<ExpensePlan, unknown>) {
  return <ExpensePlanStatusCell record={info.row.original} />
}
function renderReimbursableAmountCell(info: CellContext<ExpensePlan, unknown>) {
  return <ExpensePlanReimbursableAmountCell record={info.row.original} />
}
function renderPaidAdvanceCell(info: CellContext<ExpensePlan, unknown>) {
  return <ExpensePlanPaidAdvanceCell record={info.row.original} />
}

export function createExpensePlanColumns(): ColumnDef<ExpensePlan>[] {
  return [
    {
      id: 'code',
      accessorKey: 'code',
      header: getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_request_list.expense_request_filter.plan_number_input',
        'Plan Number'
      ),
      size: 120,
      cell: renderCodeCell
    },
    {
      id: 'title',
      accessorKey: 'title',
      header: getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.expense_table.title', 'Title'),
      size: 200,
      cell: renderTitleCell
    },
    {
      id: 'planDate',
      accessorKey: 'planDate',
      header: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.plan_details.plan_date', 'Plan Date'),
      size: 110,
      sortDescFirst: true,
      cell: renderPlanDateCell
    },
    {
      id: 'startDate',
      accessorKey: 'startDate',
      header: getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_plan_list.expense_plan_table.start_date',
        'Start Date'
      ),
      size: 110,
      cell: renderStartDateCell
    },
    {
      id: 'endDate',
      accessorKey: 'endDate',
      header: getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.expense_plan_table.end_date', 'End Date'),
      size: 110,
      cell: renderEndDateCell
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status'),
      size: 100,
      cell: renderStatusCell
    },
    {
      id: 'reimbursableAmount',
      accessorKey: 'reimbursableAmount',
      header: getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_request.reimbursable', 'Reimbursable Amount'),
      size: 140,
      meta: { align: 'right' as const },
      cell: renderReimbursableAmountCell
    },
    {
      id: 'advancePaymentPaidAmount',
      accessorKey: 'advancePaymentPaidAmount',
      header: getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_plan_list.expense_plan_table.paid_advance',
        'Paid Advance'
      ),
      size: 120,
      meta: { align: 'right' as const },
      cell: renderPaidAdvanceCell
    }
  ]
}

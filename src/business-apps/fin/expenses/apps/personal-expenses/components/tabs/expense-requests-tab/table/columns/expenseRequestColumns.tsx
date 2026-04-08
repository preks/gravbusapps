import type { CellContext, ColumnDef } from '@tanstack/react-table'
import { Badge } from '@newwork/nw-design-system'
import { formatDate, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrencyDisplay, getExpenseRequestStatusDisplay } from '../../../../../utils'

export const EXPENSE_REQUESTS_TABLE_DATA_TEST_ID = 'expense-requests'

export type ExpenseRequestRow = {
  id: string
  code?: string
  title?: string
  requestDate?: string
  startDate?: string
  endDate?: string
  status?: string
  reimbursableAmount?: number
  currency?: { code?: string }
  expensePlan?: { advancePaymentAggregate?: { aggregate?: { sum?: { amount?: number } } } }
  employeeDocument?: { file?: string }
}

function ExpenseRequestCodeCell({ record }: Readonly<{ record: ExpenseRequestRow }>) {
  return <div className="gba:font-medium gba:text-sm gba:truncate">{record.code || 'N/A'}</div>
}
function ExpenseRequestTitleCell({ record }: Readonly<{ record: ExpenseRequestRow }>) {
  return <div className="gba:font-medium gba:text-sm gba:truncate">{record.title}</div>
}
function ExpenseRequestDateCell({ dateValue }: Readonly<{ dateValue: string | undefined }>) {
  return <div className="gba:text-sm">{dateValue ? formatDate(dateValue, 'date.short') || '-' : '-'}</div>
}
function ExpenseRequestReimbursableCell({ record }: Readonly<{ record: ExpenseRequestRow }>) {
  return (
    <div className="gba:text-right gba:text-sm gba:font-mono gba:truncate">
      {record.reimbursableAmount && record.reimbursableAmount !== 0 ? (
        formatCurrencyDisplay(record.reimbursableAmount, record.currency?.code)
      ) : (
        <span className="gba:text-muted-foreground">-</span>
      )}
    </div>
  )
}
function ExpenseRequestAdvanceCell({ record }: Readonly<{ record: ExpenseRequestRow }>) {
  const v = record.expensePlan?.advancePaymentAggregate?.aggregate?.sum?.amount
  return (
    <div className="gba:text-right gba:text-sm gba:font-mono gba:truncate">
      {v && v !== 0 ? (
        formatCurrencyDisplay(v, record.currency?.code)
      ) : (
        <span className="gba:text-muted-foreground">-</span>
      )}
    </div>
  )
}

function renderReqCodeCell(info: CellContext<ExpenseRequestRow, unknown>) {
  return <ExpenseRequestCodeCell record={info.row.original} />
}
function renderReqTitleCell(info: CellContext<ExpenseRequestRow, unknown>) {
  return <ExpenseRequestTitleCell record={info.row.original} />
}
function renderReqRequestDateCell(info: CellContext<ExpenseRequestRow, unknown>) {
  return <ExpenseRequestDateCell dateValue={info.row.original.requestDate} />
}
function renderReqStartDateCell(info: CellContext<ExpenseRequestRow, unknown>) {
  return <ExpenseRequestDateCell dateValue={info.row.original.startDate} />
}
function renderReqEndDateCell(info: CellContext<ExpenseRequestRow, unknown>) {
  return <ExpenseRequestDateCell dateValue={info.row.original.endDate} />
}
function renderReqReimbursableCell(info: CellContext<ExpenseRequestRow, unknown>) {
  return <ExpenseRequestReimbursableCell record={info.row.original} />
}
function renderReqAdvanceCell(info: CellContext<ExpenseRequestRow, unknown>) {
  return <ExpenseRequestAdvanceCell record={info.row.original} />
}
function ExpenseRequestStatusCell({ record }: Readonly<{ record: ExpenseRequestRow }>) {
  const statusConfig = getExpenseRequestStatusDisplay(record.status || '')
  return <Badge variant={statusConfig.badgeVariant ?? 'outline'}>{statusConfig.label}</Badge>
}
function renderReqStatusCell(info: CellContext<ExpenseRequestRow, unknown>) {
  return <ExpenseRequestStatusCell record={info.row.original} />
}

export function createExpenseRequestColumns(): ColumnDef<ExpenseRequestRow>[] {
  return [
    {
      id: 'code',
      accessorKey: 'code',
      header: getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_request_list.expense_request_filter.request_number_input',
        'Request Number'
      ),
      size: 120,
      sortDescFirst: false,
      cell: renderReqCodeCell
    },
    {
      id: 'title',
      accessorKey: 'title',
      header: getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.expense_table.title', 'Title'),
      size: 200,
      sortDescFirst: false,
      cell: renderReqTitleCell
    },
    {
      id: 'requestDate',
      accessorKey: 'requestDate',
      header: getTranslationFromI18nKeyAndLabel(
        'lowcoder:confirm_transfer_advance_payment.request_date_label',
        'Request Date'
      ),
      size: 110,
      sortDescFirst: false,
      cell: renderReqRequestDateCell
    },
    {
      id: 'startDate',
      accessorKey: 'startDate',
      header: getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_plan_list.expense_plan_table.start_date',
        'Start Date'
      ),
      size: 110,
      sortDescFirst: false,
      cell: renderReqStartDateCell
    },
    {
      id: 'endDate',
      accessorFn: (row: ExpenseRequestRow) => row.endDate,
      header: getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.expense_plan_table.end_date', 'End Date'),
      size: 110,
      sortDescFirst: false,
      cell: renderReqEndDateCell
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status'),
      size: 100,
      sortDescFirst: false,
      cell: renderReqStatusCell
    },
    {
      id: 'reimbursableAmount',
      accessorFn: (row: ExpenseRequestRow) => row.reimbursableAmount,
      header: getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_request.reimbursable', 'Reimbursable Amount'),
      size: 140,
      sortDescFirst: false,
      meta: { align: 'right' as const },
      cell: renderReqReimbursableCell
    },
    {
      id: 'advance',
      accessorFn: (row: ExpenseRequestRow) => row.expensePlan?.advancePaymentAggregate?.aggregate?.sum?.amount,
      header: getTranslationFromI18nKeyAndLabel(
        'lowcoder:manager_expense_request_list.expense_table.advance',
        'Advance'
      ),
      size: 120,
      enableSorting: false,
      meta: { align: 'right' as const },
      cell: renderReqAdvanceCell
    }
  ]
}

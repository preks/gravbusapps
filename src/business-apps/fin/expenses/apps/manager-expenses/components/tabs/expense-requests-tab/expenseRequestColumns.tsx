import type { ColumnDef } from '@tanstack/react-table'
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
import { getExpenseRequestStatusDisplayT } from '../../../utils'
import type { ExpenseRequest } from '../../../hooks/useGetExpenseRequests'
import { getExpenseRequestColumnTitle } from './config/expenseRequestColumnDefinitions'

/**
 * Builds column definitions for the manager expense requests table.
 * currencyFilter: when set, all amount cells use this currency; otherwise each row uses its own.
 */
export function createExpenseRequestColumns(
  currencyFilter: string | null,
  t: (key: string) => string
): ColumnDef<ExpenseRequest>[] {
  const formatDate = createFormatDate()
  const formatCurrency = createFormatCurrency(currencyFilter)

  return [
    {
      id: 'title',
      accessorKey: 'title',
      header: getExpenseRequestColumnTitle(t, 'title'),
      enableSorting: true,
      sortDescFirst: false,
      size: 200,
      minSize: 160,
      maxSize: 320,
      cell: ({ row }) =>
        renderTitleCodeCell(
          row.original.title,
          row.original.code,
          `expense-requests-title-${row.original.id}`,
          t('expense-requests-untitled-fallback')
        )
    },
    {
      id: 'planCode',
      accessorFn: (row: ExpenseRequest) => (row as any)?.expensePlan?.code ?? null,
      header: getExpenseRequestColumnTitle(t, 'planCode'),
      enableSorting: true,
      sortDescFirst: false,
      size: 120,
      minSize: 90,
      maxSize: 180,
      cell: ({ row }) => renderCodeCell((row.original as any)?.expensePlan?.code ?? null)
    },
    createDateColumn<ExpenseRequest>('startDate', getExpenseRequestColumnTitle(t, 'startDate'), 'startDate', {
      formatDate
    }),
    createDateColumn<ExpenseRequest>('endDate', getExpenseRequestColumnTitle(t, 'endDate'), 'endDate', { formatDate }),
    createEmployeeColumn<ExpenseRequest>(
      'employee',
      getExpenseRequestColumnTitle(t, 'employee'),
      (row: ExpenseRequest) => row.employee ?? null,
      { showEmployeeAvatar: false }
    ),
    createDateColumn<ExpenseRequest>('requestDate', getExpenseRequestColumnTitle(t, 'requestDate'), 'requestDate', {
      formatDate
    }),
    createCurrencyColumn<ExpenseRequest>(
      'totalAmount',
      getExpenseRequestColumnTitle(t, 'totalAmount'),
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
      getExpenseRequestColumnTitle(t, 'status'),
      (row: ExpenseRequest) => getExpenseRequestStatusDisplayT(t, row.status)
    )
  ]
}

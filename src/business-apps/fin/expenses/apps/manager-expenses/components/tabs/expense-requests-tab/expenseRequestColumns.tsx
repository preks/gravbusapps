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
import { getExpenseRequestColumnHeader } from './config/expenseRequestColumnDefinitions'

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
      header: getExpenseRequestColumnHeader('title'),
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
          getTranslationFromI18nKeyAndLabel('lowcoder:common.untitled_request', 'Untitled Request')
        )
    },
    {
      id: 'planCode',
      accessorFn: (row: ExpenseRequest) => (row as any)?.expensePlan?.code ?? null,
      header: getExpenseRequestColumnHeader('planCode'),
      enableSorting: true,
      sortDescFirst: false,
      size: 120,
      minSize: 90,
      maxSize: 180,
      cell: ({ row }) => renderCodeCell((row.original as any)?.expensePlan?.code ?? null)
    },
    createDateColumn<ExpenseRequest>('startDate', getExpenseRequestColumnHeader('startDate'), 'startDate', {
      formatDate
    }),
    createDateColumn<ExpenseRequest>('endDate', getExpenseRequestColumnHeader('endDate'), 'endDate', { formatDate }),
    createEmployeeColumn<ExpenseRequest>(
      'employee',
      getExpenseRequestColumnHeader('employee'),
      (row: ExpenseRequest) => row.employee ?? null,
      { showEmployeeAvatar: false }
    ),
    createDateColumn<ExpenseRequest>('requestDate', getExpenseRequestColumnHeader('requestDate'), 'requestDate', {
      formatDate
    }),
    createCurrencyColumn<ExpenseRequest>(
      'totalAmount',
      getExpenseRequestColumnHeader('totalAmount'),
      (row: ExpenseRequest) => {
        if (typeof row.amount === 'number') return row.amount
        if (typeof row.totalAmount === 'number') return row.totalAmount
        return 0
      },
      (row: ExpenseRequest) => currencyFilter ?? row.currency ?? 'EUR',
      formatCurrency
    ),
    createStatusBadgeColumn<ExpenseRequest>('status', getExpenseRequestColumnHeader('status'), (row: ExpenseRequest) =>
      getExpenseRequestStatusDisplay(row.status)
    )
  ]
}

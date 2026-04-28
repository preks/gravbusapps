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
import { getExpensePlanStatusDisplay, type ExpenseStatus } from '../../../utils'
import type { ExpensePlan } from '../../../hooks/useMainViewExpensePlans'
import { getExpensePlanColumnHeader } from './config/expensePlanColumnDefinitions'

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
      header: getExpensePlanColumnHeader('title'),
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
      header: getExpensePlanColumnHeader('requestCode'),
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
    createDateColumn<ExpensePlan>('startDate', getExpensePlanColumnHeader('startDate'), 'startDate', { formatDate }),
    createDateColumn<ExpensePlan>('endDate', getExpensePlanColumnHeader('endDate'), 'endDate', {
      formatDate
    }),
    createEmployeeColumn<ExpensePlan>(
      'employee',
      getExpensePlanColumnHeader('employee'),
      (row: ExpensePlan) => row.employee ?? null,
      { showEmployeeAvatar: false }
    ),
    createDateColumn<ExpensePlan>('createdAt', getExpensePlanColumnHeader('createdAt'), 'createdAt', { formatDate }),
    createCurrencyColumn<ExpensePlan>(
      'totalAmount',
      getExpensePlanColumnHeader('totalAmount'),
      (row: ExpensePlan) => (typeof row.totalAmount === 'number' ? row.totalAmount : 0),
      (row: ExpensePlan) => currencyFilter ?? row.currency ?? 'EUR',
      formatCurrency
    ),
    createStatusBadgeColumn<ExpensePlan>('status', getExpensePlanColumnHeader('status'), (row: ExpensePlan) =>
      getExpensePlanStatusDisplay(row.status as ExpenseStatus)
    )
  ]
}

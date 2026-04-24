import type { ColumnDef } from '@tanstack/react-table'
import {
  createDateColumn,
  createEmployeeColumn,
  createCurrencyColumn,
  createStatusBadgeColumn,
  createFormatDate,
  renderTitleCodeCell
} from '../../../common/columns/expenseColumnHelpers'
import { formatCurrencyDisplay } from '../../../../personal-expenses/utils'
import { getAdvancePaymentStatusDisplay } from '../../../utils'
import type { AdvancePayment as AdvancePaymentItem } from '../../../hooks/useMainViewAdvancePayments'
import { getAdvancePaymentColumnHeader } from './config/advancePaymentColumnDefinitions'

/**
 * Builds column definitions for the manager advance payments table.
 * currencyFilter: when set, all amount cells use this currency; otherwise each row uses its own.
 */
export function createAdvancePaymentColumns(currencyFilter: string | null): ColumnDef<AdvancePaymentItem>[] {
  const formatDate = createFormatDate()

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
      header: getAdvancePaymentColumnHeader('expensePlan.title'),
      size: 200,
      minSize: 160,
      maxSize: 320,
      cell: ({ row }) =>
        renderTitleCodeCell(
          row.original.expensePlan?.title,
          row.original.expensePlan?.code,
          `advance-payment-expense-plan-title-${row.original.id}`
        )
    },
    createDateColumn<AdvancePaymentItem>(
      'expensePlan.startDate',
      getAdvancePaymentColumnHeader('expensePlan.startDate'),
      (row: AdvancePaymentItem) => row.expensePlan?.startDate ?? null,
      { formatDate }
    ),
    createDateColumn<AdvancePaymentItem>(
      'expensePlan.endDate',
      getAdvancePaymentColumnHeader('expensePlan.endDate'),
      (row: AdvancePaymentItem) => row.expensePlan?.endDate ?? null,
      { formatDate }
    ),
    createEmployeeColumn<AdvancePaymentItem>(
      'expensePlan.employee.fullName',
      getAdvancePaymentColumnHeader('expensePlan.employee.fullName'),
      (row: AdvancePaymentItem) => row.expensePlan?.employee ?? null,
      { showEmployeeAvatar: false }
    ),
    createDateColumn<AdvancePaymentItem>('createdAt', getAdvancePaymentColumnHeader('createdAt'), 'createdAt', {
      formatDate
    }),
    createCurrencyColumn<AdvancePaymentItem>(
      'amount',
      getAdvancePaymentColumnHeader('amount'),
      (row: AdvancePaymentItem) => (typeof row.amount === 'number' ? row.amount : 0),
      (row: AdvancePaymentItem) =>
        currencyFilter ? normalizeCurrency(currencyFilter) : normalizeCurrency(row.currencyRef),
      formatCurrency
    ),
    createStatusBadgeColumn<AdvancePaymentItem>(
      'status',
      getAdvancePaymentColumnHeader('status'),
      (row: AdvancePaymentItem) => getAdvancePaymentStatusDisplay(row.status)
    )
  ]
}

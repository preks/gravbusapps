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
import { getAdvancePaymentStatusDisplayT } from '../../../utils'
import type { AdvancePayment as AdvancePaymentItem } from '../../../hooks/useMainViewAdvancePayments'
import { getAdvancePaymentColumnTitle } from './config/advancePaymentColumnDefinitions'

/**
 * Builds column definitions for the manager advance payments table.
 * currencyFilter: when set, all amount cells use this currency; otherwise each row uses its own.
 */
export function createAdvancePaymentColumns(
  currencyFilter: string | null,
  t: (key: string) => string
): ColumnDef<AdvancePaymentItem>[] {
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
      header: () => {
        const label = getAdvancePaymentColumnTitle(t, 'expensePlan.title')
        return (
          <span className="gba:block gba:w-full gba:min-w-0 gba:truncate" title={label}>
            {label}
          </span>
        )
      },
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
      getAdvancePaymentColumnTitle(t, 'expensePlan.startDate'),
      (row: AdvancePaymentItem) => row.expensePlan?.startDate ?? null,
      { formatDate }
    ),
    createDateColumn<AdvancePaymentItem>(
      'expensePlan.endDate',
      getAdvancePaymentColumnTitle(t, 'expensePlan.endDate'),
      (row: AdvancePaymentItem) => row.expensePlan?.endDate ?? null,
      { formatDate }
    ),
    createEmployeeColumn<AdvancePaymentItem>(
      'expensePlan.employee.fullName',
      getAdvancePaymentColumnTitle(t, 'expensePlan.employee.fullName'),
      (row: AdvancePaymentItem) => row.expensePlan?.employee ?? null,
      { showEmployeeAvatar: false }
    ),
    createDateColumn<AdvancePaymentItem>('createdAt', getAdvancePaymentColumnTitle(t, 'createdAt'), 'createdAt', {
      formatDate
    }),
    createCurrencyColumn<AdvancePaymentItem>(
      'amount',
      getAdvancePaymentColumnTitle(t, 'amount'),
      (row: AdvancePaymentItem) => (typeof row.amount === 'number' ? row.amount : 0),
      (row: AdvancePaymentItem) =>
        currencyFilter ? normalizeCurrency(currencyFilter) : normalizeCurrency(row.currencyRef),
      formatCurrency
    ),
    createStatusBadgeColumn<AdvancePaymentItem>(
      'status',
      getAdvancePaymentColumnTitle(t, 'status'),
      (row: AdvancePaymentItem) => getAdvancePaymentStatusDisplayT(t, row.status)
    )
  ]
}

import type { ColumnDef } from '@tanstack/react-table'
import { BillingStatusBadge } from '../../common/invoices/components/BillingStatusBadge'
import { formatCurrency } from '../../common/utils/currency'
import { calculateOutstanding } from '../../common/invoices/utils/invoiceCalculations'
import { getInvoiceDisplayStatus } from '../../common/invoices/utils/invoiceStatus'
import { invoiceCustomerName } from '../../common/invoices/utils/customers'
import { formatDate } from '../../common/utils/date'
import type { Invoice } from '../../common/invoices/types'

interface ColumnLabels {
  number: string
  customer: string
  status: string
  issueDate: string
  dueDate: string
  currency: string
  gross: string
  outstanding: string
}

export function buildInvoiceColumns(labels: ColumnLabels): ColumnDef<Invoice>[] {
  return [
    {
      accessorKey: 'invoiceNumber',
      header: labels.number,
      cell: ({ row }) => row.original.invoiceNumber ?? '—'
    },
    {
      id: 'customer',
      header: labels.customer,
      cell: ({ row }) => invoiceCustomerName(row.original)
    },
    {
      accessorKey: 'status',
      header: labels.status,
      cell: ({ row }) => <BillingStatusBadge status={getInvoiceDisplayStatus(row.original)} />
    },
    {
      accessorKey: 'issueDate',
      header: labels.issueDate,
      cell: ({ row }) => (row.original.issueDate ? formatDate(row.original.issueDate, 'date.medium') : '—')
    },
    {
      accessorKey: 'dueDate',
      header: labels.dueDate,
      cell: ({ row }) => (row.original.dueDate ? formatDate(row.original.dueDate, 'date.medium') : '—')
    },
    {
      accessorKey: 'currency',
      header: labels.currency,
      cell: ({ row }) => row.original.currency
    },
    {
      id: 'gross',
      header: labels.gross,
      cell: ({ row }) => formatCurrency(row.original.totals.grossTotal, row.original.currency)
    },
    {
      id: 'outstanding',
      header: labels.outstanding,
      cell: ({ row }) =>
        formatCurrency(
          calculateOutstanding(row.original.totals.grossTotal, row.original.paidAmount),
          row.original.currency
        )
    }
  ]
}

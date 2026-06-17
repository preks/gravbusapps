import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import billingTranslations from '../../_i18n'
import { formatCurrency } from '../../utils/currency'
import { calculateOutstanding } from '../utils/invoiceCalculations'
import type { Invoice } from '../types'

interface InvoiceTotalsSummaryProps {
  invoice: Invoice
  dataTestId?: string
}

export const InvoiceTotalsSummary: React.FC<InvoiceTotalsSummaryProps> = ({
  invoice,
  dataTestId = 'invoice-totals-summary'
}) => {
  const { t } = useTranslation(billingTranslations)
  const outstanding = calculateOutstanding(invoice.totals.grossTotal, invoice.paidAmount)

  const rows: Array<{ label: string; value: string; strong?: boolean }> = [
    { label: t('billing-record-net'), value: formatCurrency(invoice.totals.netTotal, invoice.currency) },
    { label: t('billing-record-tax'), value: formatCurrency(invoice.totals.taxTotal, invoice.currency) },
    {
      label: t('billing-record-gross'),
      value: formatCurrency(invoice.totals.grossTotal, invoice.currency),
      strong: true
    },
    { label: t('billing-record-paid'), value: formatCurrency(invoice.paidAmount, invoice.currency) },
    { label: t('billing-record-outstanding'), value: formatCurrency(outstanding, invoice.currency), strong: true }
  ]

  return (
    <div className="gba:flex gba:flex-col gba:gap-2 gba:min-w-64" data-testid={dataTestId}>
      {rows.map(row => (
        <div key={row.label} className="gba:flex gba:items-center gba:justify-between gba:gap-8">
          <span className="gba:text-sm gba:text-muted-foreground">{row.label}</span>
          <span className={row.strong ? 'gba:text-sm gba:font-semibold' : 'gba:text-sm'}>{row.value}</span>
        </div>
      ))}
    </div>
  )
}

export default InvoiceTotalsSummary

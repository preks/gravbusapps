import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import billingTranslations from '../../../common/_i18n'
import { formatCurrency, formatPercent } from '../../../common/utils/currency'
import type { Invoice } from '../../../common/invoices/types'

interface InvoiceLinesTableProps {
  invoice: Invoice
}

export const InvoiceLinesTable: React.FC<InvoiceLinesTableProps> = ({ invoice }) => {
  const { t } = useTranslation(billingTranslations)

  return (
    <div className="gba:w-full gba:overflow-x-auto" data-testid="invoice-lines-table">
      <table className="gba:w-full gba:text-sm">
        <thead>
          <tr className="gba:border-b gba:text-left gba:text-muted-foreground">
            <th className="gba:py-2 gba:pr-4">{t('billing-line-description')}</th>
            <th className="gba:py-2 gba:pr-4 gba:text-right">{t('billing-line-qty')}</th>
            <th className="gba:py-2 gba:pr-4 gba:text-right">{t('billing-line-unit-price')}</th>
            <th className="gba:py-2 gba:pr-4 gba:text-right">{t('billing-line-discount')}</th>
            <th className="gba:py-2 gba:pr-4 gba:text-right">{t('billing-line-tax-rate')}</th>
            <th className="gba:py-2 gba:pr-4 gba:text-right">{t('billing-line-net')}</th>
            <th className="gba:py-2 gba:text-right">{t('billing-line-gross')}</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map(line => (
            <tr key={line.id} className="gba:border-b" data-testid={`invoice-line-${line.id}`}>
              <td className="gba:py-2 gba:pr-4">{line.description}</td>
              <td className="gba:py-2 gba:pr-4 gba:text-right">{line.quantity}</td>
              <td className="gba:py-2 gba:pr-4 gba:text-right">{formatCurrency(line.unitPrice, invoice.currency)}</td>
              <td className="gba:py-2 gba:pr-4 gba:text-right">{formatPercent(line.discountPercent)}</td>
              <td className="gba:py-2 gba:pr-4 gba:text-right">{formatPercent(line.taxRatePercent)}</td>
              <td className="gba:py-2 gba:pr-4 gba:text-right">{formatCurrency(line.netAmount, invoice.currency)}</td>
              <td className="gba:py-2 gba:text-right">{formatCurrency(line.grossAmount, invoice.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default InvoiceLinesTable

import React from 'react'
import { Card, useTranslation } from '@newwork/nw-design-system'
import { formatDate } from '../../utils/date'
import billingTranslations from '../../_i18n'
import type { Invoice } from '../types'
import { InvoiceTotalsSummary } from './InvoiceTotalsSummary'

interface InvoiceFinancialSummaryProps {
  invoice: Invoice
}

export const InvoiceFinancialSummary: React.FC<InvoiceFinancialSummaryProps> = ({ invoice }) => {
  const { t } = useTranslation(billingTranslations)

  return (
    <Card className="gba:p-6 gba:flex gba:flex-wrap gba:gap-8 gba:justify-between">
      <div className="gba:flex gba:flex-col gba:gap-2 gba:text-sm">
        <div>
          <span className="gba:text-muted-foreground">{t('billing-column-issue-date')}: </span>
          {invoice.issueDate ? formatDate(invoice.issueDate, 'date.medium') : '—'}
        </div>
        <div>
          <span className="gba:text-muted-foreground">{t('billing-column-due-date')}: </span>
          {invoice.dueDate ? formatDate(invoice.dueDate, 'date.medium') : '—'}
        </div>
        <div>
          <span className="gba:text-muted-foreground">{t('billing-column-currency')}: </span>
          {invoice.currency}
        </div>
      </div>
      <InvoiceTotalsSummary invoice={invoice} />
    </Card>
  )
}

export default InvoiceFinancialSummary

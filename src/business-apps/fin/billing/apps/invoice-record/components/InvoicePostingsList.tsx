import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import billingTranslations from '../../../common/_i18n'
import { formatDate } from '@/common/utils/windowUtils'
import { getLedgerEventLabel } from '../../../common/utils/billingLabels'
import type { Invoice } from '../../../common/types'

interface InvoicePostingsListProps {
  invoice: Invoice
}

export const InvoicePostingsList: React.FC<InvoicePostingsListProps> = ({ invoice }) => {
  const { t } = useTranslation(billingTranslations)

  if (invoice.ledgerLinks.length === 0) {
    return <p className="gba:text-sm gba:text-muted-foreground">{t('billing-record-no-postings')}</p>
  }

  return (
    <ul className="gba:flex gba:flex-col gba:gap-2" data-testid="invoice-postings-list">
      {invoice.ledgerLinks.map(link => (
        <li
          key={link.eventId}
          className="gba:flex gba:items-center gba:justify-between gba:border-b gba:py-2 gba:text-sm"
        >
          <span className="gba:font-medium">{getLedgerEventLabel(link.eventType, t)}</span>
          <span className="gba:text-muted-foreground">{link.ledgerTransactionRef ?? '—'}</span>
          <span className="gba:text-muted-foreground">
            {link.postedAt ? formatDate(link.postedAt, 'datetime.short') : '—'}
          </span>
        </li>
      ))}
    </ul>
  )
}

export default InvoicePostingsList

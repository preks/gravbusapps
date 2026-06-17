import React from 'react'
import { Button, Card, useTranslation } from '@newwork/nw-design-system'
import billingTranslations from '../../_i18n'
import type { BillingPermissions } from '../../hooks/useBillingPermissions'
import type { BillingCustomer, Invoice } from '../types'
import { canTransition, getInvoiceDisplayStatus } from '../utils/invoiceStatus'
import { invoiceCustomerName } from '../utils/customers'
import { BillingStatusBadge } from './BillingStatusBadge'

interface InvoiceRecordHeaderProps {
  invoice: Invoice
  customers: BillingCustomer[]
  permissions: BillingPermissions
  outstanding: number
  creditNoteEnabled: boolean
  onIssue: () => void
  onRecordPayment: () => void
  onCancel: () => void
  onWriteOff: () => void
  onCreateCreditNote: () => void
  onDownloadPdf: () => void
}

export const InvoiceRecordHeader: React.FC<InvoiceRecordHeaderProps> = ({
  invoice,
  customers,
  permissions,
  outstanding,
  creditNoteEnabled,
  onIssue,
  onRecordPayment,
  onCancel,
  onWriteOff,
  onCreateCreditNote,
  onDownloadPdf
}) => {
  const { t } = useTranslation(billingTranslations)

  const canRecordPayment =
    permissions.canMarkPaid && outstanding > 0 && invoice.status !== 'DRAFT' && invoice.status !== 'CANCELLED'
  const canCreateCreditNote =
    permissions.canCreateCreditNote &&
    creditNoteEnabled &&
    ['ISSUED', 'SENT', 'PARTIALLY_PAID', 'PAID'].includes(invoice.status)

  return (
    <Card className="gba:p-6 gba:mb-4">
      <div className="gba:flex gba:items-start gba:justify-between gba:gap-4 gba:flex-wrap">
        <div className="gba:flex gba:flex-col gba:gap-1">
          <div className="gba:flex gba:items-center gba:gap-3">
            <h1 className="gba:text-xl gba:font-semibold">{invoice.invoiceNumber ?? t('billing-record-title')}</h1>
            <BillingStatusBadge status={getInvoiceDisplayStatus(invoice)} />
          </div>
          <span className="gba:text-sm gba:text-muted-foreground">{invoiceCustomerName(invoice, customers)}</span>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
          {permissions.canIssue && canTransition(invoice.status, 'ISSUED') && (
            <Button size="sm" onClick={onIssue} data-testid="invoice-issue-button">
              {t('billing-record-issue')}
            </Button>
          )}
          {canRecordPayment && (
            <Button size="sm" variant="outline" onClick={onRecordPayment} data-testid="invoice-record-payment-button">
              {t('billing-record-record-payment')}
            </Button>
          )}
          {permissions.canCancel && canTransition(invoice.status, 'CANCELLED') && (
            <Button size="sm" variant="outline" onClick={onCancel} data-testid="invoice-cancel-button">
              {t('billing-record-cancel')}
            </Button>
          )}
          {permissions.canCancel && canTransition(invoice.status, 'WRITTEN_OFF') && (
            <Button size="sm" variant="outline" onClick={onWriteOff} data-testid="invoice-writeoff-button">
              {t('billing-record-write-off')}
            </Button>
          )}
          {canCreateCreditNote && (
            <Button size="sm" variant="outline" onClick={onCreateCreditNote} data-testid="invoice-credit-note-button">
              {t('billing-record-credit-note')}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onDownloadPdf} data-testid="invoice-download-pdf-button">
            {t('billing-record-download-pdf')}
          </Button>
        </div>
      </div>
    </Card>
  )
}

export default InvoiceRecordHeader

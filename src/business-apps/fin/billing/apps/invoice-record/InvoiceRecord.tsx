import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Spinner,
  Alert,
  AlertDescription,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Toaster,
  useTranslation
} from '@newwork/nw-design-system'
import { toast } from 'sonner'
import { ArrowLeftIcon } from '@phosphor-icons/react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { buildPlatformUrl, navigateTo, Navigation } from '@/common/utils/navigationUtils'
import { formatDate } from '../../common/utils/date'
import billingTranslations from '../../common/_i18n'
import { useBillingData } from '../../common/invoices/hooks/useBillingData'
import { useBillingCustomers } from '../../common/invoices/hooks/useBillingCustomers'
import { useLedgerAdmin } from '../../common/ledger/hooks/useLedgerAdmin'
import { useBillingPermissions } from '../../common/hooks/useBillingPermissions'
import { BillingSampleNotice } from '../../common/components/BillingSampleNotice'
import { InvoiceFinancialSummary } from '../../common/invoices/components/InvoiceFinancialSummary'
import { InvoiceRecordHeader } from '../../common/invoices/components/InvoiceRecordHeader'
import { InvoiceLinesTable } from './components/InvoiceLinesTable'
import { InvoicePostingsList } from './components/InvoicePostingsList'
import { RecordPaymentDialog } from './components/RecordPaymentDialog'
import { CreditNoteDialog } from './components/CreditNoteDialog'
import { CancelInvoiceDialog } from './components/CancelInvoiceDialog'
import { WriteOffInvoiceDialog } from './components/WriteOffInvoiceDialog'
import { createCreditNote } from '../../common/invoices/network/creditNoteClient'
import { getInvoice, getInvoiceAudit } from '../../common/invoices/network/invoiceClient'
import { financeAdminEnabled } from '../../common/network/financeHealthClient'
import { formatCurrency } from '../../common/utils/currency'
import { calculateOutstanding } from '../../common/invoices/utils/invoiceCalculations'
import { buildInvoicePdfModel } from '../../common/invoices/utils/invoicePdf'
import { printInvoiceDocument } from '../../common/invoices/utils/invoicePrint'
import { invoiceCustomerName } from '../../common/invoices/utils/customers'
import type { BillingCustomer, Invoice, InvoiceAuditEntry } from '../../common/invoices/types'
import { getAuditActionLabel, getPaymentMethodLabel } from '../../common/utils/billingLabels'

type InvoiceRecordProps = BusinessAppContextProps

interface InvoiceActivityEntry {
  id: string
  action: string
  actorId?: string | null
  timestamp: string
  details?: string | null
  metaData?: Record<string, unknown> | null
  source: 'invoice' | 'audit'
}

function getInvoiceIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('invoiceId')
}

function buildCreditNoteIdempotencyKey(invoiceId: string, actorId: string | undefined): string {
  return `credit-note-${invoiceId}-${actorId ?? 'unknown'}-${new Date().toISOString()}`
}

function buildInvoiceActivity(invoice: Invoice, audit: InvoiceAuditEntry[]): InvoiceActivityEntry[] {
  const syntheticCreated: InvoiceActivityEntry = {
    id: `created-${invoice.id}`,
    action: 'created',
    timestamp: invoice.createdAt,
    details: invoice.status?.toLowerCase() ?? 'draft',
    source: 'invoice'
  }

  const auditEvents = audit.map(
    (entry): InvoiceActivityEntry => ({
      id: entry.id,
      action: entry.action,
      actorId: entry.actorId,
      timestamp: entry.timestamp,
      details: entry.details,
      metaData: entry.metaData,
      source: 'audit'
    })
  )

  return [syntheticCreated, ...auditEvents].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
}

const InvoiceRecord: React.FC<InvoiceRecordProps> = props => {
  const { t } = useTranslation(billingTranslations)
  const billing = useBillingData(props)
  const { customers } = useBillingCustomers(props)
  const ledgerAdmin = useLedgerAdmin(props)
  const permissions = useBillingPermissions(props)
  const [activeTab, setActiveTab] = useState('overview')
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [creditNoteOpen, setCreditNoteOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [writeOffOpen, setWriteOffOpen] = useState(false)
  const [serverInvoice, setServerInvoice] = useState<Invoice | null>(null)
  const [auditEntries, setAuditEntries] = useState<InvoiceAuditEntry[]>([])
  const [recordLoading, setRecordLoading] = useState(false)
  const [auditError, setAuditError] = useState<string | null>(null)

  const invoiceId = getInvoiceIdFromUrl()
  const listedInvoice = useMemo(
    () => billing.invoices.find(item => item.id === invoiceId),
    [billing.invoices, invoiceId]
  )
  const invoice = serverInvoice ?? listedInvoice
  const activity = useMemo(() => (invoice ? buildInvoiceActivity(invoice, auditEntries) : []), [invoice, auditEntries])

  const refreshInvoiceRecord = useCallback(async () => {
    if (!props.accessToken || !invoiceId) return

    setRecordLoading(true)
    setAuditError(null)
    const [invoiceResult, auditResult] = await Promise.allSettled([
      getInvoice(props.accessToken, invoiceId),
      getInvoiceAudit(props.accessToken, invoiceId)
    ])

    if (invoiceResult.status === 'fulfilled' && invoiceResult.value) {
      setServerInvoice(invoiceResult.value)
    }

    if (auditResult.status === 'fulfilled') {
      setAuditEntries(auditResult.value)
    } else {
      setAuditError(auditResult.reason instanceof Error ? auditResult.reason.message : t('billing-action-failed'))
      setAuditEntries([])
    }

    setRecordLoading(false)
  }, [invoiceId, props.accessToken, t])

  useEffect(() => {
    refreshInvoiceRecord().catch(() => undefined)
  }, [refreshInvoiceRecord])

  const runAction = async (action: () => Promise<unknown>, successMessage: string) => {
    try {
      await action()
      toast.success(successMessage)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('billing-action-failed'))
    }
  }

  const handleDownloadPdf = () => {
    if (!invoice) return
    const legalEntity = billing.settings.legalEntities.find(entity => entity.id === invoice.legalEntityId)
    if (!legalEntity) {
      toast.error(t('billing-record-missing-config'))
      return
    }
    // Prefer the live CRM customer; fall back to the name snapshotted on the
    // invoice so the PDF still renders even if the account is gone/renamed.
    const customer: BillingCustomer = customers.find(item => item.id === invoice.billingCustomerId) ?? {
      id: invoice.billingCustomerId,
      crmAccountId: invoice.crmAccountId ?? invoice.billingCustomerId,
      name: invoiceCustomerName(invoice),
      billingAddressLines: [],
      countryCode: '',
      vatId: null,
      taxExempt: false,
      defaultPaymentTermId: null,
      defaultCurrency: null,
      preferredLocale: null
    }
    printInvoiceDocument(buildInvoicePdfModel(invoice, legalEntity, customer))
  }

  if (billing.loading || (recordLoading && !invoice)) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:min-h-[200px]"
        data-testid="invoice-record-loading"
      >
        <Spinner />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="gba:m-4" data-testid="invoice-record-not-found">
        <Alert>
          <AlertDescription>{t('billing-record-not-found')}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const outstanding = calculateOutstanding(invoice.totals.grossTotal, invoice.paidAmount)

  return (
    <div className="gba:min-h-screen gba:p-4" data-testid="invoice-record">
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigateTo(Navigation.FIN_BILLING_INVOICES)}
        className="gba:flex gba:items-center gba:gap-2 gba:mb-4"
        data-testid="invoice-record-back-button"
      >
        <ArrowLeftIcon size={16} />
        {t('billing-back-to-billing')}
      </Button>

      <BillingSampleNotice
        show={billing.usingSampleData}
        error={billing.error}
        dataTestId="invoice-record-sample-notice"
      />

      <InvoiceRecordHeader
        invoice={invoice}
        customers={customers}
        permissions={permissions}
        outstanding={outstanding}
        creditNoteEnabled={financeAdminEnabled()}
        onIssue={() =>
          runAction(async () => {
            await billing.issueInvoice(invoice.id)
            await refreshInvoiceRecord()
          }, t('billing-record-issue'))
        }
        onRecordPayment={() => setPaymentOpen(true)}
        onCancel={() => setCancelOpen(true)}
        onWriteOff={() => setWriteOffOpen(true)}
        onCreateCreditNote={() => setCreditNoteOpen(true)}
        onDownloadPdf={handleDownloadPdf}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="gba:inline-flex gba:w-auto">
          <TabsTrigger value="overview">{t('billing-record-tab-overview')}</TabsTrigger>
          <TabsTrigger value="lines">{t('billing-record-tab-lines')}</TabsTrigger>
          <TabsTrigger value="payments">{t('billing-record-tab-payments')}</TabsTrigger>
          <TabsTrigger value="postings">{t('billing-record-tab-postings')}</TabsTrigger>
          <TabsTrigger value="activity">{t('billing-record-tab-activity')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="gba:mt-4">
          <InvoiceFinancialSummary invoice={invoice} />
        </TabsContent>

        <TabsContent value="lines" className="gba:mt-4">
          <Card className="gba:p-6">
            <InvoiceLinesTable invoice={invoice} />
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="gba:mt-4">
          <Card className="gba:p-6">
            {invoice.payments.length === 0 ? (
              <p className="gba:text-sm gba:text-muted-foreground">{t('billing-record-no-payments')}</p>
            ) : (
              <div className="gba:overflow-x-auto">
                <table className="gba:w-full gba:min-w-full gba:border-collapse" data-testid="invoice-payments-list">
                  <thead>
                    <tr className="gba:border-b gba:text-xs gba:font-medium gba:text-muted-foreground">
                      <th scope="col" className="gba:py-2 gba:pr-4 gba:text-left">
                        {t('billing-payment-date')}
                      </th>
                      <th scope="col" className="gba:py-2 gba:pr-4 gba:text-left">
                        {t('billing-payment-method')}
                      </th>
                      <th scope="col" className="gba:py-2 gba:pr-4 gba:text-left">
                        {t('billing-payment-reference')}
                      </th>
                      <th scope="col" className="gba:py-2 gba:pr-4 gba:text-left">
                        {t('billing-payment-ledger-transaction-ref')}
                      </th>
                      <th scope="col" className="gba:py-2 gba:text-right">
                        {t('billing-payment-amount')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.payments.map(payment => (
                      <tr key={payment.id} className="gba:border-b gba:text-sm last:gba:border-b-0">
                        <td className="gba:py-2 gba:pr-4">{formatDate(payment.paymentDate, 'date.medium')}</td>
                        <td className="gba:py-2 gba:pr-4">{getPaymentMethodLabel(payment.method, t)}</td>
                        <td className="gba:py-2 gba:pr-4 gba:text-muted-foreground">
                          {payment.externalReference || '—'}
                        </td>
                        <td className="gba:py-2 gba:pr-4 gba:text-muted-foreground">
                          {payment.ledgerTransactionRef || '—'}
                        </td>
                        <td className="gba:py-2 gba:text-right gba:font-medium">
                          {formatCurrency(payment.amount, payment.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="postings" className="gba:mt-4">
          <Card className="gba:p-6">
            <InvoicePostingsList invoice={invoice} />
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="gba:mt-4">
          <Card className="gba:p-6">
            <ul className="gba:flex gba:flex-col gba:gap-2" data-testid="invoice-activity-list">
              {auditError && <li className="gba:text-sm gba:text-muted-foreground">{auditError}</li>}
              {recordLoading && (
                <li className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
                  <Spinner size="sm" />
                </li>
              )}
              {activity.map(entry => (
                <li
                  key={entry.id}
                  className="gba:flex gba:items-center gba:justify-between gba:border-b gba:py-2 gba:text-sm"
                >
                  <span className="gba:font-medium">{getAuditActionLabel(entry.action, t)}</span>
                  <span className="gba:text-muted-foreground">{entry.details ?? ''}</span>
                  <span className="gba:text-muted-foreground">{formatDate(entry.timestamp, 'datetime.short')}</span>
                </li>
              ))}
            </ul>
          </Card>
        </TabsContent>
      </Tabs>

      <RecordPaymentDialog
        open={paymentOpen}
        currency={invoice.currency}
        defaultAmount={outstanding}
        transactions={ledgerAdmin.transactions}
        transactionsLoading={ledgerAdmin.loading}
        onClose={() => setPaymentOpen(false)}
        onSubmit={async input => {
          await runAction(async () => {
            await billing.recordPayment(invoice.id, input)
            await refreshInvoiceRecord()
          }, t('billing-record-record-payment'))
        }}
      />
      <CancelInvoiceDialog
        open={cancelOpen}
        invoiceId={invoice.id}
        actorId={props.userInfo?.id}
        hasPayments={invoice.paidAmount > 0 || invoice.payments.length > 0}
        onClose={() => setCancelOpen(false)}
        onSubmit={async input => {
          await runAction(async () => {
            await billing.cancelInvoice(invoice.id, input)
            await refreshInvoiceRecord()
          }, t('billing-record-cancel'))
        }}
      />
      <WriteOffInvoiceDialog
        open={writeOffOpen}
        invoiceId={invoice.id}
        actorId={props.userInfo?.id}
        isPartiallyPaid={invoice.status === 'PARTIALLY_PAID' || invoice.paidAmount > 0 || invoice.payments.length > 0}
        onClose={() => setWriteOffOpen(false)}
        onSubmit={async input => {
          await runAction(async () => {
            await billing.writeOffInvoice(invoice.id, input)
            await refreshInvoiceRecord()
          }, t('billing-record-write-off'))
        }}
      />
      <CreditNoteDialog
        open={creditNoteOpen}
        currency={invoice.currency}
        defaultAmount={invoice.totals.grossTotal}
        maxAmount={invoice.totals.grossTotal}
        originalInvoiceNumber={invoice.invoiceNumber ?? invoice.id}
        onClose={() => setCreditNoteOpen(false)}
        onSubmit={async input => {
          if (!props.accessToken) return
          await runAction(async () => {
            const creditNote = await createCreditNote(props.accessToken, invoice.id, {
              ...input,
              actorId: props.userInfo?.id,
              idempotencyKey: buildCreditNoteIdempotencyKey(invoice.id, props.userInfo?.id)
            })
            await refreshInvoiceRecord()
            if (creditNote?.id) {
              navigateTo(buildPlatformUrl(Navigation.FIN_BILLING_INVOICE_RECORD, { invoiceId: creditNote.id }))
            }
          }, t('billing-credit-note-success'))
        }}
      />
      <Toaster />
    </div>
  )
}

export default InvoiceRecord

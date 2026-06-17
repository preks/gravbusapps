import React, { useMemo, useState } from 'react'
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
import { navigateTo, Navigation } from '@/common/utils/navigationUtils'
import { formatDate } from '../../common/utils/date'
import billingTranslations from '../../common/_i18n'
import { useBillingData } from '../../common/invoices/hooks/useBillingData'
import { useBillingCustomers } from '../../common/invoices/hooks/useBillingCustomers'
import { useBillingPermissions } from '../../common/hooks/useBillingPermissions'
import { BillingSampleNotice } from '../../common/components/BillingSampleNotice'
import { InvoiceFinancialSummary } from '../../common/invoices/components/InvoiceFinancialSummary'
import { InvoiceRecordHeader } from '../../common/invoices/components/InvoiceRecordHeader'
import { InvoiceLinesTable } from './components/InvoiceLinesTable'
import { InvoicePostingsList } from './components/InvoicePostingsList'
import { RecordPaymentDialog } from './components/RecordPaymentDialog'
import { CreditNoteDialog } from './components/CreditNoteDialog'
import { createCreditNote } from '../../common/invoices/network/creditNoteClient'
import { financeAdminEnabled } from '../../common/network/financeHealthClient'
import { formatCurrency } from '../../common/utils/currency'
import { calculateOutstanding } from '../../common/invoices/utils/invoiceCalculations'
import { buildInvoicePdfModel } from '../../common/invoices/utils/invoicePdf'
import { printInvoiceDocument } from '../../common/invoices/utils/invoicePrint'
import { invoiceCustomerName } from '../../common/invoices/utils/customers'
import type { BillingCustomer } from '../../common/invoices/types'
import { getAuditActionLabel, getPaymentMethodLabel } from '../../common/utils/billingLabels'

type InvoiceRecordProps = BusinessAppContextProps

function getInvoiceIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('invoiceId')
}

const InvoiceRecord: React.FC<InvoiceRecordProps> = props => {
  const { t } = useTranslation(billingTranslations)
  const billing = useBillingData(props)
  const { customers } = useBillingCustomers(props)
  const permissions = useBillingPermissions(props)
  const [activeTab, setActiveTab] = useState('overview')
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [creditNoteOpen, setCreditNoteOpen] = useState(false)

  const invoiceId = getInvoiceIdFromUrl()
  const invoice = useMemo(() => billing.invoices.find(item => item.id === invoiceId), [billing.invoices, invoiceId])

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

  if (billing.loading) {
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
        onIssue={() => runAction(() => billing.issueInvoice(invoice.id), t('billing-record-issue'))}
        onRecordPayment={() => setPaymentOpen(true)}
        onCancel={() =>
          runAction(() => billing.cancelInvoice(invoice.id, 'Cancelled from record'), t('billing-record-cancel'))
        }
        onWriteOff={() => runAction(() => billing.writeOffInvoice(invoice.id), t('billing-record-write-off'))}
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
              <ul className="gba:flex gba:flex-col gba:gap-2" data-testid="invoice-payments-list">
                {invoice.payments.map(payment => (
                  <li
                    key={payment.id}
                    className="gba:flex gba:items-center gba:justify-between gba:border-b gba:py-2 gba:text-sm"
                  >
                    <span>{formatDate(payment.paymentDate, 'date.medium')}</span>
                    <span>{getPaymentMethodLabel(payment.method, t)}</span>
                    <span className="gba:font-medium">{formatCurrency(payment.amount, payment.currency)}</span>
                  </li>
                ))}
              </ul>
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
              {invoice.audit.map(entry => (
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
        onClose={() => setPaymentOpen(false)}
        onSubmit={async input => {
          await runAction(() => billing.recordPayment(invoice.id, input), t('billing-record-record-payment'))
        }}
      />
      <CreditNoteDialog
        open={creditNoteOpen}
        currency={invoice.currency}
        defaultAmount={invoice.totals.grossTotal}
        onClose={() => setCreditNoteOpen(false)}
        onSubmit={async input => {
          if (!props.accessToken) return
          await runAction(async () => {
            await createCreditNote(props.accessToken, invoice.id, input)
            await billing.refresh()
          }, t('billing-credit-note-success'))
        }}
      />
      <Toaster />
    </div>
  )
}

export default InvoiceRecord

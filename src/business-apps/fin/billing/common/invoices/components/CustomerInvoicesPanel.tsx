import React, { useMemo, useState } from 'react'
import {
  Card,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { PlusIcon, ReceiptIcon } from '@phosphor-icons/react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { buildPlatformUrl, navigateTo, Navigation } from '@/common/utils/navigationUtils'
import { formatDate } from '../../utils/date'
import billingTranslations from '../../_i18n'
import { useBillingData } from '../hooks/useBillingData'
import { useBillingCustomers } from '../hooks/useBillingCustomers'
import { useBillingPermissions } from '../../hooks/useBillingPermissions'
import { BillingStatusBadge } from './BillingStatusBadge'
import { BillingSampleNotice } from '../../components/BillingSampleNotice'
import { formatCurrency } from '../../utils/currency'
import { calculateOutstanding } from '../utils/invoiceCalculations'
import type { BillingCustomer, Invoice } from '../types'
import { InvoiceFormContent } from './InvoiceFormContent'

interface CustomerInvoicesPanelProps extends BusinessAppContextProps {
  /** CRM account id to scope invoices to. */
  crmAccountId: string
  /** CRM account display name from the current record header. */
  crmAccountName?: string
  /** Optional CRM opportunity id to prefill when creating from an opportunity. */
  crmOpportunityId?: string
}

function withCurrentAccountCustomer(
  customers: BillingCustomer[],
  crmAccountId: string,
  crmAccountName?: string
): BillingCustomer[] {
  const name = crmAccountName?.trim()
  const matchingCustomer = customers.find(
    customer => customer.crmAccountId === crmAccountId || customer.id === crmAccountId
  )

  if (matchingCustomer) {
    return customers.map(customer => (customer.id === matchingCustomer.id && name ? { ...customer, name } : customer))
  }

  if (!name) return customers

  return [
    {
      id: crmAccountId,
      crmAccountId,
      name,
      billingAddressLines: [],
      countryCode: '',
      vatId: null,
      taxExempt: false,
      defaultPaymentTermId: null,
      defaultCurrency: null,
      preferredLocale: null
    },
    ...customers
  ]
}

function CustomerInvoiceRow({ invoice }: Readonly<{ invoice: Invoice }>) {
  return (
    <li>
      <button
        type="button"
        className="gba:flex gba:w-full gba:items-center gba:justify-between gba:gap-3 gba:border-b gba:py-2 gba:text-left gba:text-sm hover:gba:bg-muted"
        onClick={() => navigateTo(buildPlatformUrl(Navigation.FIN_BILLING_INVOICE_RECORD, { invoiceId: invoice.id }))}
        data-testid={`customer-invoice-${invoice.id}`}
      >
        <span className="gba:font-medium">{invoice.invoiceNumber ?? '—'}</span>
        <BillingStatusBadge status={invoice.status} />
        <span>{invoice.issueDate ? formatDate(invoice.issueDate, 'date.medium') : '—'}</span>
        <span>{formatCurrency(invoice.totals.grossTotal, invoice.currency)}</span>
        <span className="gba:text-muted-foreground">
          {formatCurrency(calculateOutstanding(invoice.totals.grossTotal, invoice.paidAmount), invoice.currency)}
        </span>
      </button>
    </li>
  )
}

function CustomerInvoicesList({
  emptyMessage,
  invoices,
  loading
}: Readonly<{ emptyMessage: string; invoices: Invoice[]; loading: boolean }>) {
  if (loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-6" data-testid="customer-invoices-loading">
        <Spinner />
      </div>
    )
  }

  if (invoices.length === 0) {
    return <p className="gba:text-sm gba:text-muted-foreground">{emptyMessage}</p>
  }

  return (
    <ul className="gba:flex gba:flex-col gba:gap-2">
      {invoices.map(invoice => (
        <CustomerInvoiceRow key={invoice.id} invoice={invoice} />
      ))}
    </ul>
  )
}

/**
 * Embeddable invoices panel for CRM records (Customer 360, account record,
 * opportunity record). Lists the account's invoices and offers create + view-all.
 */
export const CustomerInvoicesPanel: React.FC<CustomerInvoicesPanelProps> = props => {
  const { crmAccountId, crmAccountName, crmOpportunityId } = props
  const { t } = useTranslation(billingTranslations)
  const billing = useBillingData(props)
  const { customers, loading: customersLoading } = useBillingCustomers(props)
  const permissions = useBillingPermissions(props)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const invoices = useMemo(
    () => billing.invoices.filter(invoice => invoice.crmAccountId === crmAccountId),
    [billing.invoices, crmAccountId]
  )
  const invoiceCustomers = useMemo(
    () => withCurrentAccountCustomer(customers, crmAccountId, crmAccountName),
    [customers, crmAccountId, crmAccountName]
  )

  return (
    <Card className="gba:p-6" data-testid="customer-invoices-panel">
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
        <div className="gba:flex gba:items-center gba:gap-2">
          <ReceiptIcon size={18} />
          <h3 className="gba:text-base gba:font-semibold">{t('billing-crm-tab-invoices')}</h3>
        </div>
        {permissions.canCreateDraft && (
          <Button size="sm" onClick={() => setCreateDialogOpen(true)} data-testid="customer-invoices-create-button">
            <PlusIcon size={16} className="gba:mr-1" />
            {t('billing-crm-create-invoice')}
          </Button>
        )}
      </div>

      <BillingSampleNotice
        show={billing.usingSampleData}
        error={billing.error}
        dataTestId="customer-invoices-sample-notice"
      />

      <CustomerInvoicesList emptyMessage={t('billing-crm-no-invoices')} invoices={invoices} loading={billing.loading} />

      <div className="gba:mt-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateTo(Navigation.FIN_BILLING_INVOICES)}
          data-testid="customer-invoices-view-all"
        >
          {t('billing-crm-view-all')}
        </Button>
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent data-testid="customer-invoices-create-dialog">
          <DialogHeader>
            <DialogTitle>{t('billing-form-create-title')}</DialogTitle>
          </DialogHeader>
          <InvoiceFormContent
            billing={billing}
            customers={invoiceCustomers}
            customersLoading={customersLoading}
            initialAccountId={crmAccountId}
            initialOpportunityId={crmOpportunityId ?? null}
            onSaved={() => setCreateDialogOpen(false)}
            embedded
          />
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default CustomerInvoicesPanel

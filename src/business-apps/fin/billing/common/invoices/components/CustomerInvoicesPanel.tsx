import React, { useMemo, useState } from 'react'
import { Card, Button, Input, Spinner, useTranslation } from '@newwork/nw-design-system'
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
import { InvoiceCreateDialog } from './InvoiceCreateDialog'

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

function invoiceSearchText(invoice: Invoice): string {
  const outstanding = calculateOutstanding(invoice.totals.grossTotal, invoice.paidAmount)
  return [
    invoice.invoiceNumber,
    invoice.status,
    invoice.issueDate ? formatDate(invoice.issueDate, 'date.medium') : undefined,
    invoice.dueDate ? formatDate(invoice.dueDate, 'date.medium') : undefined,
    invoice.currency,
    formatCurrency(invoice.totals.grossTotal, invoice.currency),
    formatCurrency(outstanding, invoice.currency)
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function CustomerInvoiceRow({ invoice }: Readonly<{ invoice: Invoice }>) {
  const outstanding = calculateOutstanding(invoice.totals.grossTotal, invoice.paidAmount)

  return (
    <tr className="gba:border-b gba:last:border-b-0 hover:gba:bg-muted/50">
      <td className="gba:py-3 gba:pl-3 gba:pr-4">
        <button
          type="button"
          className="gba:text-left gba:text-sm gba:font-medium gba:text-foreground hover:gba:underline"
          onClick={() => navigateTo(buildPlatformUrl(Navigation.FIN_BILLING_INVOICE_RECORD, { invoiceId: invoice.id }))}
          data-testid={`customer-invoice-${invoice.id}`}
        >
          {invoice.invoiceNumber ?? '—'}
        </button>
      </td>
      <td className="gba:py-3 gba:pr-4">
        <BillingStatusBadge status={invoice.status} />
      </td>
      <td className="gba:py-3 gba:pr-4 gba:text-sm gba:text-muted-foreground">
        {invoice.issueDate ? formatDate(invoice.issueDate, 'date.medium') : '—'}
      </td>
      <td className="gba:py-3 gba:pr-4 gba:text-sm gba:text-muted-foreground">
        {invoice.dueDate ? formatDate(invoice.dueDate, 'date.medium') : '—'}
      </td>
      <td className="gba:py-3 gba:pr-4 gba:text-right gba:text-sm gba:font-medium">
        {formatCurrency(invoice.totals.grossTotal, invoice.currency)}
      </td>
      <td className="gba:py-3 gba:text-right gba:text-sm gba:text-muted-foreground">
        {formatCurrency(outstanding, invoice.currency)}
      </td>
    </tr>
  )
}

function CustomerInvoicesTable({ invoices, t }: Readonly<{ invoices: Invoice[]; t: (key: string) => string }>) {
  return (
    <div className="gba:overflow-x-auto gba:rounded-lg gba:border">
      <table className="gba:w-full gba:min-w-full gba:border-collapse">
        <thead className="gba:bg-muted/50">
          <tr className="gba:border-b gba:text-xs gba:font-medium gba:text-muted-foreground">
            <th scope="col" className="gba:py-2 gba:pl-3 gba:pr-4 gba:text-left">
              {t('billing-column-number')}
            </th>
            <th scope="col" className="gba:py-2 gba:pr-4 gba:text-left">
              {t('billing-column-status')}
            </th>
            <th scope="col" className="gba:py-2 gba:pr-4 gba:text-left">
              {t('billing-column-issue-date')}
            </th>
            <th scope="col" className="gba:py-2 gba:pr-4 gba:text-left">
              {t('billing-column-due-date')}
            </th>
            <th scope="col" className="gba:py-2 gba:pr-4 gba:text-right">
              {t('billing-column-gross')}
            </th>
            <th scope="col" className="gba:py-2 gba:pr-3 gba:text-right">
              {t('billing-column-outstanding')}
            </th>
          </tr>
        </thead>
        <tbody className="gba:bg-card">
          {invoices.map(invoice => (
            <CustomerInvoiceRow key={invoice.id} invoice={invoice} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CustomerInvoicesList({
  emptyMessage,
  invoices,
  loading,
  t
}: Readonly<{ emptyMessage: string; invoices: Invoice[]; loading: boolean; t: (key: string) => string }>) {
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

  return <CustomerInvoicesTable invoices={invoices} t={t} />
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
  const [invoiceSearch, setInvoiceSearch] = useState('')

  const invoices = useMemo(
    () => billing.invoices.filter(invoice => invoice.crmAccountId === crmAccountId),
    [billing.invoices, crmAccountId]
  )
  const filteredInvoices = useMemo(() => {
    const query = invoiceSearch.trim().toLowerCase()
    if (!query) return invoices
    return invoices.filter(invoice => invoiceSearchText(invoice).includes(query))
  }, [invoices, invoiceSearch])
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

      {invoices.length > 0 && (
        <div className="gba:mb-3">
          <Input
            value={invoiceSearch}
            onChange={event => setInvoiceSearch(event.target.value)}
            placeholder={t('billing-crm-search-invoices')}
            data-testid="customer-invoices-search"
          />
        </div>
      )}

      <CustomerInvoicesList
        emptyMessage={invoices.length === 0 ? t('billing-crm-no-invoices') : t('billing-crm-no-invoice-results')}
        invoices={filteredInvoices}
        loading={billing.loading}
        t={t}
      />

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

      <InvoiceCreateDialog
        open={createDialogOpen}
        billing={billing}
        customers={invoiceCustomers}
        customersLoading={customersLoading}
        initialAccountId={crmAccountId}
        initialOpportunityId={crmOpportunityId ?? null}
        onClose={() => setCreateDialogOpen(false)}
      />
    </Card>
  )
}

export default CustomerInvoicesPanel

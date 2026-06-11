import React, { useMemo } from 'react'
import { Card, Button, Spinner, useTranslation } from '@newwork/nw-design-system'
import { PlusIcon, ReceiptIcon } from '@phosphor-icons/react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { buildPlatformUrl, navigateTo, Navigation } from '@/common/utils/navigationUtils'
import { formatDate } from '@/common/utils/windowUtils'
import billingTranslations from '../_i18n'
import { useBillingData } from '../hooks/useBillingData'
import { useBillingPermissions } from '../hooks/useBillingPermissions'
import { BillingStatusBadge } from './BillingStatusBadge'
import { BillingSampleNotice } from './BillingSampleNotice'
import { formatCurrency } from '../utils/currency'
import { calculateOutstanding } from '../utils/invoiceCalculations'

interface CustomerInvoicesPanelProps extends BusinessAppContextProps {
  /** CRM account id to scope invoices to. */
  crmAccountId: string
  /** Optional CRM opportunity id to prefill when creating from an opportunity. */
  crmOpportunityId?: string
}

/**
 * Embeddable invoices panel for CRM records (Customer 360, account record,
 * opportunity record). Lists the account's invoices and offers create + view-all.
 */
export const CustomerInvoicesPanel: React.FC<CustomerInvoicesPanelProps> = props => {
  const { crmAccountId, crmOpportunityId } = props
  const { t } = useTranslation(billingTranslations)
  const billing = useBillingData(props)
  const permissions = useBillingPermissions(props)

  const invoices = useMemo(
    () => billing.invoices.filter(invoice => invoice.crmAccountId === crmAccountId),
    [billing.invoices, crmAccountId]
  )

  const handleCreate = () => {
    const params: Record<string, string> = { accountId: crmAccountId }
    if (crmOpportunityId) {
      params.opportunityId = crmOpportunityId
    }
    navigateTo(buildPlatformUrl(Navigation.FIN_BILLING_INVOICE_FORM, params))
  }

  return (
    <Card className="gba:p-6" data-testid="customer-invoices-panel">
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
        <div className="gba:flex gba:items-center gba:gap-2">
          <ReceiptIcon size={18} />
          <h3 className="gba:text-base gba:font-semibold">{t('billing-crm-tab-invoices')}</h3>
        </div>
        {permissions.canCreateDraft && (
          <Button size="sm" onClick={handleCreate} data-testid="customer-invoices-create-button">
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

      {billing.loading ? (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-6" data-testid="customer-invoices-loading">
          <Spinner />
        </div>
      ) : invoices.length === 0 ? (
        <p className="gba:text-sm gba:text-muted-foreground">{t('billing-crm-no-invoices')}</p>
      ) : (
        <ul className="gba:flex gba:flex-col gba:gap-2">
          {invoices.map(invoice => (
            <li
              key={invoice.id}
              className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:border-b gba:py-2 gba:text-sm gba:cursor-pointer hover:gba:bg-muted"
              onClick={() =>
                navigateTo(buildPlatformUrl(Navigation.FIN_BILLING_INVOICE_RECORD, { invoiceId: invoice.id }))
              }
              data-testid={`customer-invoice-${invoice.id}`}
            >
              <span className="gba:font-medium">{invoice.invoiceNumber ?? '—'}</span>
              <BillingStatusBadge status={invoice.status} />
              <span>{invoice.issueDate ? formatDate(invoice.issueDate, 'date.medium') : '—'}</span>
              <span>{formatCurrency(invoice.totals.grossTotal, invoice.currency)}</span>
              <span className="gba:text-muted-foreground">
                {formatCurrency(calculateOutstanding(invoice.totals.grossTotal, invoice.paidAmount), invoice.currency)}
              </span>
            </li>
          ))}
        </ul>
      )}

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
    </Card>
  )
}

export default CustomerInvoicesPanel

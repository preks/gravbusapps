import React, { useMemo, useState } from 'react'
import {
  PageLayout,
  Button,
  Spinner,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import { PlusIcon, ReceiptIcon, DownloadSimpleIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { buildPlatformUrl, navigateTo, Navigation } from '@/common/utils/navigationUtils'
import billingTranslations from '../../common/_i18n'
import { useBillingData } from '../../common/hooks/useBillingData'
import { useBillingPermissions } from '../../common/hooks/useBillingPermissions'
import { BillingSampleNotice } from '../../common/components/BillingSampleNotice'
import { invoiceCustomerName } from '../../common/utils/customers'
import { getInvoiceStatusLabel } from '../../common/utils/billingLabels'
import { getInvoiceDisplayStatus } from '../../common/utils/invoiceStatus'
import { ExpenseDataTable } from '@/business-apps/fin/expenses/common/components/table/ExpenseDataTable'
import { buildInvoiceColumns } from './invoiceColumns'
import { INVOICE_STATUSES, type Invoice, type InvoiceDisplayStatus } from '../../common/types'
import { invoicesToCsv, downloadCsv } from '../../common/utils/invoiceExport'

type InvoiceManagementProps = BusinessAppContextProps

const InvoiceManagement: React.FC<InvoiceManagementProps> = props => {
  const { accessToken, userInfo } = props
  const { t } = useTranslation(billingTranslations)
  const billing = useBillingData(props)
  const permissions = useBillingPermissions(props)
  const [statusFilter, setStatusFilter] = useState<InvoiceDisplayStatus | 'ALL'>('ALL')
  const [search, setSearch] = useState('')

  const isContextReady = Boolean(accessToken && userInfo)

  const columns = useMemo(
    () =>
      buildInvoiceColumns({
        number: t('billing-column-number'),
        customer: t('billing-column-customer'),
        status: t('billing-column-status'),
        issueDate: t('billing-column-issue-date'),
        dueDate: t('billing-column-due-date'),
        currency: t('billing-column-currency'),
        gross: t('billing-column-gross'),
        outstanding: t('billing-column-outstanding')
      }),
    [t]
  )

  const filteredInvoices = useMemo(() => {
    const term = search.trim().toLowerCase()
    return billing.invoices.filter(invoice => {
      if (statusFilter !== 'ALL' && getInvoiceDisplayStatus(invoice) !== statusFilter) {
        return false
      }
      if (!term) {
        return true
      }
      const haystack = [invoice.invoiceNumber ?? '', invoiceCustomerName(invoice), invoice.currency]
        .join(' ')
        .toLowerCase()
      return haystack.includes(term)
    })
  }, [billing.invoices, statusFilter, search])

  const handleRowClick = (invoice: Invoice) => {
    navigateTo(buildPlatformUrl(Navigation.FIN_BILLING_INVOICE_RECORD, { invoiceId: invoice.id }))
  }

  const handleCreate = () => {
    navigateTo(Navigation.FIN_BILLING_INVOICE_FORM)
  }

  const handleExport = () => {
    downloadCsv('invoices.csv', invoicesToCsv(filteredInvoices))
  }

  if (!isContextReady || billing.loading) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:min-h-[200px]"
        data-testid="invoice-management-loading"
      >
        <Spinner />
      </div>
    )
  }

  return (
    <PageLayout
      headerIcon={ReceiptIcon}
      headerTitle={t('billing-invoices-title')}
      headerDescription={t('billing-invoices-description')}
      variant="default"
      data-testid="invoice-management"
    >
      <BillingSampleNotice
        show={billing.usingSampleData}
        error={billing.error}
        dataTestId="invoice-management-sample-notice"
      />

      <div className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:mb-4 gba:flex-wrap">
        <div className="gba:flex gba:items-center gba:gap-3 gba:flex-wrap">
          <div className="gba:relative gba:w-64">
            <MagnifyingGlassIcon
              size={16}
              className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:text-muted-foreground"
            />
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder={t('billing-search-invoices')}
              className="gba:pl-9"
              data-testid="invoice-search"
            />
          </div>
          <div className="gba:w-56">
            <Select
              value={statusFilter}
              onValueChange={value => setStatusFilter(value as InvoiceDisplayStatus | 'ALL')}
            >
              <SelectTrigger data-testid="invoice-status-filter">
                <SelectValue placeholder={t('billing-filter-status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('billing-filter-all')}</SelectItem>
                {INVOICE_STATUSES.map(status => (
                  <SelectItem key={status} value={status}>
                    {getInvoiceStatusLabel(status, t)}
                  </SelectItem>
                ))}
                <SelectItem value="OVERDUE">{getInvoiceStatusLabel('OVERDUE', t)}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2">
          {permissions.canExport && (
            <Button variant="outline" size="sm" onClick={handleExport} data-testid="invoice-export-button">
              <DownloadSimpleIcon size={16} className="gba:mr-1" />
              {t('billing-action-export')}
            </Button>
          )}
          {permissions.canCreateDraft && (
            <Button size="sm" onClick={handleCreate} data-testid="invoice-create-button">
              <PlusIcon size={16} className="gba:mr-1" />
              {t('billing-invoices-create')}
            </Button>
          )}
        </div>
      </div>

      <ExpenseDataTable<Invoice>
        data={filteredInvoices}
        totalCount={filteredInvoices.length}
        columns={columns}
        onRowClick={handleRowClick}
        emptyMessage={t('billing-invoices-empty')}
        dataTestId="invoice-table"
        tableLayout="auto"
      />
    </PageLayout>
  )
}

export default InvoiceManagement

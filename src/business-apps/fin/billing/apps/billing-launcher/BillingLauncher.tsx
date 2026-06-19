import React, { useMemo, useState } from 'react'
import {
  LauncherLayout,
  Spinner,
  type LauncherSectionConfig,
  type QuickActionData,
  useTranslation
} from '@newwork/nw-design-system'
import {
  ReceiptIcon,
  PlusIcon,
  ListChecksIcon,
  ListBulletsIcon,
  ArrowsLeftRightIcon,
  GearIcon,
  ChartBarIcon,
  StackIcon
} from '@phosphor-icons/react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo, Navigation } from '@/common/utils/navigationUtils'
import billingTranslations from '../../common/_i18n'
import { useBillingData } from '../../common/invoices/hooks/useBillingData'
import { useBillingCustomers } from '../../common/invoices/hooks/useBillingCustomers'
import { BillingSampleNotice } from '../../common/components/BillingSampleNotice'
import { BillingHealthChip } from '../../common/components/BillingHealthChip'
import { InvoiceCreateDialog } from '../../common/invoices/components/InvoiceCreateDialog'
import { formatCurrency } from '../../common/utils/currency'
import { calculateOutstanding } from '../../common/invoices/utils/invoiceCalculations'
import { isOverdue } from '../../common/invoices/utils/invoiceStatus'

type BillingLauncherProps = BusinessAppContextProps
type BillingKpiData = {
  id: string
  title: string
  value: string | number
  color?: 'default' | 'primary' | 'success'
}

const BillingLauncher: React.FC<BillingLauncherProps> = props => {
  const { t } = useTranslation(billingTranslations)
  const billing = useBillingData(props)
  const { customers, loading: customersLoading } = useBillingCustomers(props)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const kpis = useMemo((): BillingKpiData[] => {
    const invoices = billing.invoices
    const draftCount = invoices.filter(invoice => invoice.status === 'DRAFT').length
    const issuedCount = invoices.filter(invoice => ['ISSUED', 'SENT', 'PARTIALLY_PAID'].includes(invoice.status)).length
    const overdueAmount = invoices
      .filter(invoice => isOverdue(invoice))
      .reduce((total, invoice) => total + calculateOutstanding(invoice.totals.grossTotal, invoice.paidAmount), 0)
    const paidThisMonth = invoices
      .filter(invoice => invoice.status === 'PAID')
      .reduce((total, invoice) => total + invoice.paidAmount, 0)

    return [
      { id: 'draft', title: t('billing-kpi-draft'), value: draftCount, color: 'default' },
      { id: 'issued', title: t('billing-kpi-issued'), value: issuedCount, color: 'primary' },
      { id: 'overdue', title: t('billing-kpi-overdue'), value: formatCurrency(overdueAmount), color: 'default' },
      { id: 'paid-month', title: t('billing-kpi-paid-month'), value: formatCurrency(paidThisMonth), color: 'success' }
    ]
  }, [billing.invoices, t])

  const quickActions = useMemo((): QuickActionData[] => {
    return [
      {
        id: 'create-invoice',
        label: t('billing-quick-create-invoice'),
        icon: PlusIcon,
        onClick: () => setCreateDialogOpen(true)
      },
      {
        id: 'open-invoices',
        label: t('billing-quick-open-invoices'),
        icon: ListChecksIcon,
        onClick: () => navigateTo(Navigation.FIN_BILLING_INVOICES)
      },
      {
        id: 'transactions',
        label: t('billing-quick-transactions'),
        icon: ListBulletsIcon,
        onClick: () => navigateTo(Navigation.FIN_BILLING_TRANSACTIONS)
      },
      {
        id: 'reconciliation',
        label: t('billing-quick-reconciliation'),
        icon: ArrowsLeftRightIcon,
        onClick: () => navigateTo(Navigation.FIN_BILLING_RECONCILIATION)
      },
      {
        id: 'settings',
        label: t('billing-quick-settings'),
        icon: GearIcon,
        onClick: () => navigateTo(Navigation.FIN_BILLING_SETTINGS)
      }
    ]
  }, [t])

  const sections = useMemo((): LauncherSectionConfig[] => {
    return [
      {
        id: 'workspaces',
        title: t('billing-section-workspaces'),
        cards: [
          {
            id: 'invoices',
            title: t('billing-invoices-title'),
            description: t('billing-invoices-description'),
            icon: ReceiptIcon,
            primaryAction: {
              label: t('billing-quick-open-invoices'),
              onClick: () => navigateTo(Navigation.FIN_BILLING_INVOICES)
            }
          },
          {
            id: 'transactions',
            title: t('billing-transactions-title'),
            description: t('billing-transactions-description'),
            icon: ListBulletsIcon,
            primaryAction: {
              label: t('billing-quick-transactions'),
              onClick: () => navigateTo(Navigation.FIN_BILLING_TRANSACTIONS)
            }
          },
          {
            id: 'reconciliation',
            title: t('billing-reconciliation-title'),
            description: t('billing-reconciliation-description'),
            icon: ArrowsLeftRightIcon,
            primaryAction: {
              label: t('billing-quick-reconciliation'),
              onClick: () => navigateTo(Navigation.FIN_BILLING_RECONCILIATION)
            }
          }
        ]
      },
      {
        id: 'administration',
        title: t('billing-section-administration'),
        cards: [
          {
            id: 'ledger-admin',
            title: t('ledger-admin-title'),
            description: t('ledger-admin-description'),
            icon: StackIcon,
            primaryAction: {
              label: t('ledger-admin-open'),
              onClick: () => navigateTo(Navigation.FIN_BILLING_LEDGER_ADMIN)
            }
          },
          {
            id: 'settings',
            title: t('billing-settings-title'),
            description: t('billing-settings-description'),
            icon: GearIcon,
            primaryAction: {
              label: t('billing-quick-settings'),
              onClick: () => navigateTo(Navigation.FIN_BILLING_SETTINGS)
            }
          }
        ]
      },
      {
        id: 'reports',
        title: t('billing-section-reports'),
        cards: [
          {
            id: 'reports',
            title: t('billing-reports-title'),
            description: t('billing-reports-ar-aging'),
            icon: ChartBarIcon,
            primaryAction: {
              label: t('billing-reports-title'),
              onClick: () => navigateTo(Navigation.FIN_BILLING_REPORTS)
            }
          }
        ]
      }
    ]
  }, [t])

  if (billing.loading) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:min-h-[200px]"
        data-testid="billing-launcher-loading"
      >
        <Spinner />
      </div>
    )
  }

  return (
    <>
      <div className="gba:flex gba:justify-end gba:px-4 gba:pt-4">
        <BillingHealthChip context={props} />
      </div>
      {(billing.usingSampleData || billing.error) && (
        <div className="gba:px-4 gba:pt-4">
          <BillingSampleNotice
            show={billing.usingSampleData}
            error={billing.error}
            dataTestId="billing-launcher-sample-notice"
          />
        </div>
      )}
      <LauncherLayout
        title={t('billing-launcher-title')}
        description={t('billing-launcher-description')}
        icon={ReceiptIcon}
        headerKpis={kpis}
        sections={sections}
        quickActions={quickActions}
        quickActionsTitle={t('billing-launcher-quick-actions')}
        quickActionsDescription={t('billing-launcher-quick-actions-desc')}
        variant="decorative"
      />
      <InvoiceCreateDialog
        open={createDialogOpen}
        billing={billing}
        customers={customers}
        customersLoading={customersLoading}
        onClose={() => setCreateDialogOpen(false)}
      />
    </>
  )
}

export default BillingLauncher

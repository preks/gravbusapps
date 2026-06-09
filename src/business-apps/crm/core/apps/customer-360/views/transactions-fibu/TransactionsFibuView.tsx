import React, { useMemo } from 'react'
import { Badge, useTranslation as useFluentTranslation } from '@newwork/nw-design-system'
import { ReceiptIcon, BankIcon, ArrowsLeftRightIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import customer360I18n from '../../_i18n'
import type { Customer360Snapshot, Customer360Subject } from '../../data/types'
import Customer360Section from '../../components/Customer360Section'
import Customer360Metric from '../../components/Customer360Metric'
import Customer360List, { type Customer360RowData } from '../../components/Customer360List'
import { fibuIntegrationEnabled } from '../../data/network/fibuClient'
import { getStatusBadgeVariant } from '../../utils/statusBadge'
import { formatCurrency, formatDate } from '../../utils/format'

export interface TransactionsFibuViewProps extends BusinessAppContextProps {
  subject: Customer360Subject
  snapshot: Customer360Snapshot
  loading?: boolean
}

/**
 * Transactions & Fibu tab — open/overdue balance summary plus invoice and
 * transaction history from NewWork Connect. Renders an awaiting-backend state
 * until the Fibu integration is configured.
 */
const TransactionsFibuView: React.FC<TransactionsFibuViewProps> = ({ snapshot, loading }) => {
  const { t } = useFluentTranslation(customer360I18n)
  const invoices = snapshot.invoices ?? []
  const transactions = snapshot.transactions ?? []
  const balance = snapshot.balance
  const awaiting = !fibuIntegrationEnabled()
  const awaitingDescription = awaiting ? t('fibu-awaiting-description') : undefined

  const invoiceRows = useMemo<Customer360RowData[]>(
    () =>
      invoices.map(invoice => ({
        id: invoice.id,
        icon: ReceiptIcon,
        primary: invoice.number || invoice.id,
        secondary: invoice.issuedDate ? formatDate(invoice.issuedDate) : undefined,
        testId: `customer-360-invoice-${invoice.id}`,
        trailing: (
          <div className="gba:flex gba:items-center gba:gap-2">
            {invoice.status ? (
              <Badge variant={getStatusBadgeVariant(invoice.status)} size="sm">
                {invoice.status}
              </Badge>
            ) : null}
            <span className="gba:text-sm gba:font-medium">{formatCurrency(invoice.amount, invoice.currency)}</span>
          </div>
        )
      })),
    [invoices]
  )

  const transactionRows = useMemo<Customer360RowData[]>(
    () =>
      transactions.map(transaction => ({
        id: transaction.id,
        icon: ArrowsLeftRightIcon,
        primary: transaction.description || transaction.id,
        secondary: transaction.date ? formatDate(transaction.date) : undefined,
        testId: `customer-360-transaction-${transaction.id}`,
        trailing: (
          <span
            className={
              transaction.direction === 'debit'
                ? 'gba:text-sm gba:font-medium gba:text-destructive'
                : 'gba:text-sm gba:font-medium gba:text-foreground'
            }
          >
            {formatCurrency(transaction.amount, transaction.currency)}
          </span>
        )
      })),
    [transactions]
  )

  return (
    <div className="gba:col-span-12 gba:flex gba:flex-col gba:gap-4" data-testid="customer-360-transactions-fibu-view">
      <Customer360Section
        title={t('fibu-balance-title')}
        icon={BankIcon}
        loading={loading}
        errorTitle={t('error-title')}
        isEmpty={!balance}
        emptyTitle={t('fibu-balance-empty-title')}
        emptyDescription={awaitingDescription ?? t('fibu-balance-empty-description')}
        testId="customer-360-fibu-balance-section"
      >
        <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:sm:grid-cols-3">
          <Customer360Metric label={t('fibu-open-amount')} testId="customer-360-fibu-open">
            {formatCurrency(balance?.openAmount, balance?.currency) || '—'}
          </Customer360Metric>
          <Customer360Metric label={t('fibu-overdue-amount')} testId="customer-360-fibu-overdue">
            {formatCurrency(balance?.overdueAmount, balance?.currency) || '—'}
          </Customer360Metric>
          <Customer360Metric label={t('fibu-lifetime-value')} testId="customer-360-fibu-lifetime">
            {formatCurrency(balance?.lifetimeValue, balance?.currency) || '—'}
          </Customer360Metric>
        </div>
      </Customer360Section>

      <Customer360Section
        title={t('fibu-invoices-title')}
        icon={ReceiptIcon}
        count={loading ? undefined : invoices.length}
        loading={loading}
        errorTitle={t('error-title')}
        isEmpty={invoiceRows.length === 0}
        emptyTitle={t('fibu-invoices-empty-title')}
        emptyDescription={awaitingDescription ?? t('fibu-invoices-empty-description')}
        testId="customer-360-fibu-invoices-section"
      >
        <Customer360List rows={invoiceRows} testId="customer-360-fibu-invoices-list" />
      </Customer360Section>

      <Customer360Section
        title={t('fibu-transactions-title')}
        icon={ArrowsLeftRightIcon}
        count={loading ? undefined : transactions.length}
        loading={loading}
        errorTitle={t('error-title')}
        isEmpty={transactionRows.length === 0}
        emptyTitle={t('fibu-transactions-empty-title')}
        emptyDescription={awaitingDescription ?? t('fibu-transactions-empty-description')}
        testId="customer-360-fibu-transactions-section"
      >
        <Customer360List rows={transactionRows} testId="customer-360-fibu-transactions-list" />
      </Customer360Section>
    </div>
  )
}

export default TransactionsFibuView
export { TransactionsFibuView }

import React, { useMemo } from 'react'
import { useTranslation as useFluentTranslation } from '@newwork/nw-design-system'
import { ArrowsLeftRightIcon, BankIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import customer360I18n from '../../../_i18n'
import type { Customer360Snapshot, Customer360Subject, CustomerTransaction } from '../../../data/types'
import Customer360List, { type Customer360RowData } from '../../../shared/Customer360List'
import Customer360Metric from '../../../shared/Customer360Metric'
import Customer360Section from '../../../shared/Customer360Section'
import { formatCurrency, formatDate } from '../../../utils/format'

export interface TransactionsViewProps extends BusinessAppContextProps {
  subject: Customer360Subject
  snapshot: Customer360Snapshot
  loading?: boolean
}

const TransactionsView: React.FC<TransactionsViewProps> = ({ snapshot, loading }) => {
  const { t } = useFluentTranslation(customer360I18n)
  const transactions = useMemo(() => {
    const byId = new Map<string, CustomerTransaction>()
    for (const transaction of snapshot.transactions ?? []) byId.set(transaction.id, transaction)
    return Array.from(byId.values())
  }, [snapshot.transactions])
  const balance = snapshot.balance

  const transactionRows = useMemo<Customer360RowData[]>(
    () =>
      transactions.map(transaction => ({
        id: transaction.id,
        icon: ArrowsLeftRightIcon,
        primary: transaction.description || transaction.id,
        secondary: transaction.date ? formatDate(transaction.date) : undefined,
        testId: `customer-360-transaction-${transaction.id}`,
        trailing: (
          <span className="gba:text-sm gba:font-medium gba:text-foreground">
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
        emptyDescription={t('fibu-balance-empty-description')}
        testId="customer-360-fibu-balance-section"
      >
        <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:sm:grid-cols-3">
          <Customer360Metric label={t('fibu-open-amount')} testId="customer-360-fibu-open">
            {formatCurrency(balance?.openAmount, balance?.currency) || '-'}
          </Customer360Metric>
          <Customer360Metric label={t('fibu-overdue-amount')} testId="customer-360-fibu-overdue">
            {formatCurrency(balance?.overdueAmount, balance?.currency) || '-'}
          </Customer360Metric>
          <Customer360Metric label={t('fibu-lifetime-value')} testId="customer-360-fibu-lifetime">
            {formatCurrency(balance?.lifetimeValue, balance?.currency) || '-'}
          </Customer360Metric>
        </div>
      </Customer360Section>

      <Customer360Section
        title={t('fibu-transactions-title')}
        icon={ArrowsLeftRightIcon}
        count={loading ? undefined : transactions.length}
        loading={loading}
        errorTitle={t('error-title')}
        isEmpty={transactionRows.length === 0}
        emptyTitle={t('fibu-transactions-empty-title')}
        emptyDescription={t('fibu-transactions-empty-description')}
        testId="customer-360-fibu-transactions-section"
      >
        <Customer360List rows={transactionRows} testId="customer-360-fibu-transactions-list" />
      </Customer360Section>
    </div>
  )
}

export default TransactionsView
export { TransactionsView }

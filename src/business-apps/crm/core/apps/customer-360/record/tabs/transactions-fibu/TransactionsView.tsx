import React, { useMemo, useState } from 'react'
import { Button, useTranslation as useFluentTranslation } from '@newwork/nw-design-system'
import { ArrowsLeftRightIcon, BankIcon, PlusIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useLedgerAdmin } from '@/business-apps/fin/billing/common/hooks/useLedgerAdmin'
import { useBillingData } from '@/business-apps/fin/billing/common/hooks/useBillingData'
import { useBillingPermissions } from '@/business-apps/fin/billing/common/hooks/useBillingPermissions'
import LedgerCreateDialog from '@/business-apps/fin/billing/apps/ledger-admin/LedgerCreateDialog'
import billingTranslations from '@/business-apps/fin/billing/common/_i18n'
import type {
  CreateTransactionInput,
  LedgerTransaction
} from '@/business-apps/fin/billing/common/network/ledgerAdminClient'
import customer360I18n from '../../../_i18n'
import type { Customer360Snapshot, Customer360Subject, CustomerTransaction } from '../../../data/types'
import Customer360List, { type Customer360RowData } from '../../../shared/Customer360List'
import Customer360Metric from '../../../shared/Customer360Metric'
import Customer360Section from '../../../shared/Customer360Section'
import { formatCurrency, formatDate } from '../../../utils/format'

const WORLD_BALANCE_ID = 'bln_a73c8501-a3f6-4a66-b3e8-8b660a6677a0'

function transactionDirection(
  transaction: LedgerTransaction,
  fallback?: CreateTransactionInput
): CustomerTransaction['direction'] {
  if (
    transaction.metaData?.externalTransactionType === 'payment' ||
    fallback?.metaData?.externalTransactionType === 'payment'
  ) {
    return 'credit'
  }
  const destination = transaction.destination ?? fallback?.destination
  return destination === '@World' || destination === WORLD_BALANCE_ID ? 'debit' : 'credit'
}

export interface TransactionsViewProps extends BusinessAppContextProps {
  subject: Customer360Subject
  snapshot: Customer360Snapshot
  loading?: boolean
}

function toCustomerTransaction(transaction: LedgerTransaction, fallback?: CreateTransactionInput): CustomerTransaction {
  return {
    id: transaction.transactionId || transaction.id || fallback?.reference || crypto.randomUUID(),
    description: transaction.description ?? transaction.reference ?? fallback?.description ?? fallback?.reference,
    amount: transaction.amount || fallback?.amount,
    currency: transaction.currency || fallback?.currency,
    date: transaction.createdAt ?? new Date().toISOString(),
    direction: transactionDirection(transaction, fallback)
  }
}

const TransactionsView: React.FC<TransactionsViewProps> = ({ subject, snapshot, loading, ...context }) => {
  const { t } = useFluentTranslation(customer360I18n)
  const { t: tBilling } = useFluentTranslation(billingTranslations)
  const ledgerAdmin = useLedgerAdmin(context)
  const billing = useBillingData(context)
  const permissions = useBillingPermissions(context)
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false)
  const [localTransactions, setLocalTransactions] = useState<CustomerTransaction[]>([])
  const transactions = useMemo(() => {
    const byId = new Map<string, CustomerTransaction>()
    for (const transaction of localTransactions) byId.set(transaction.id, transaction)
    for (const transaction of snapshot.transactions ?? []) byId.set(transaction.id, transaction)
    return Array.from(byId.values())
  }, [localTransactions, snapshot.transactions])
  const balance = snapshot.balance
  const canCreateTransaction = permissions.canCreateDraft || permissions.canEditSettings

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

  const createTransaction = async (input: CreateTransactionInput) => {
    const transaction = await ledgerAdmin.addTransaction({
      ...input,
      metaData: {
        ...input.metaData,
        crmAccountId: subject.id,
        customerType: 'account',
        customerRef: `account:${subject.id}`,
        sourceApp: 'customer-360'
      }
    })
    setLocalTransactions(current => [toCustomerTransaction(transaction, input), ...current])
    return transaction
  }

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
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTransactionDialogOpen(true)}
            disabled={!canCreateTransaction || ledgerAdmin.loading}
            data-testid="customer-360-create-transaction"
          >
            <PlusIcon className="gba:size-4" />
            {t('fibu-create-transaction')}
          </Button>
        }
        testId="customer-360-fibu-transactions-section"
      >
        <Customer360List rows={transactionRows} testId="customer-360-fibu-transactions-list" />
      </Customer360Section>
      <LedgerCreateDialog
        kind={transactionDialogOpen ? 'transaction' : null}
        ledgers={ledgerAdmin.ledgers}
        accounts={ledgerAdmin.accounts}
        invoices={billing.invoices}
        onClose={() => setTransactionDialogOpen(false)}
        onCreateLedger={ledgerAdmin.addLedger}
        onCreateAccount={ledgerAdmin.addAccount}
        onCreateTransaction={createTransaction}
        t={tBilling}
      />
    </div>
  )
}

export default TransactionsView
export { TransactionsView }

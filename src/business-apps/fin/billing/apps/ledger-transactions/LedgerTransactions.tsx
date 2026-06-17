import React, { useMemo, useState } from 'react'
import {
  PageLayout,
  Button,
  Spinner,
  Input,
  Alert,
  AlertDescription,
  Badge,
  useTranslation
} from '@newwork/nw-design-system'
import { PlusIcon, ListBulletsIcon, ArrowsClockwiseIcon, MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import billingTranslations from '../../common/_i18n'
import { useLedgerAdmin } from '../../common/ledger/hooks/useLedgerAdmin'
import { useBillingData } from '../../common/invoices/hooks/useBillingData'
import { useBillingPermissions } from '../../common/hooks/useBillingPermissions'
import { balanceLabel, buildBalanceIndex } from '../../common/ledger/utils/ledgerNames'
import { transactionFamily } from '../../common/ledger/utils/ledgerTransactionStatus'
import LedgerCreateDialog, { type LedgerDialogKind } from '../../common/ledger/components/LedgerCreateDialog'
import LedgerDetailSheet, { type LedgerSelection } from '../../common/ledger/components/LedgerDetailSheet'
import { ExpandableTransactionTable } from './components/ExpandableTransactionTable'
import type { CreateTransactionInput, LedgerBalance } from '../../common/ledger/network/ledgerAdminClient'

type LedgerTransactionsProps = BusinessAppContextProps

function readQueryParam(name: string): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get(name)
}

function transactionMatchesCustomer(
  item: { metaData?: Record<string, unknown> },
  crmAccountId: string | null,
  customerRef: string | null
): boolean {
  const metadata = item.metaData ?? {}
  const accountRefs = [
    metadata.crmAccountId,
    metadata.invoiceAccountId,
    metadata.invoice_account_id,
    metadata.customerAccountId,
    metadata.customer_account_id,
    metadata.accountId,
    metadata.account_id
  ]
  return (crmAccountId !== null && accountRefs.includes(crmAccountId)) || metadata.customerRef === customerRef
}

const LedgerTransactions: React.FC<LedgerTransactionsProps> = props => {
  const { accessToken } = props
  const { t } = useTranslation(billingTranslations)
  const ledgerAdmin = useLedgerAdmin(props)
  const billing = useBillingData(props)
  const permissions = useBillingPermissions(props)
  const crmAccountId = readQueryParam('crmAccountId')
  const customerRef = readQueryParam('customerRef') ?? (crmAccountId ? `account:${crmAccountId}` : null)
  const [dialogKind, setDialogKind] = useState<LedgerDialogKind | null>(() =>
    readQueryParam('create') === 'transaction' ? 'transaction' : null
  )
  const [search, setSearch] = useState('')
  const [selection, setSelection] = useState<LedgerSelection | null>(null)
  const [prefillSource, setPrefillSource] = useState('')
  const [accountFilter, setAccountFilter] = useState<string | null>(() => readQueryParam('accountId'))

  const canManage = permissions.canEditSettings || permissions.canCreateDraft

  const balanceIndex = useMemo(() => buildBalanceIndex(ledgerAdmin.balances), [ledgerAdmin.balances])

  const filterBalance = useMemo(
    () => (accountFilter ? (ledgerAdmin.balances.find(balance => balance.balanceId === accountFilter) ?? null) : null),
    [accountFilter, ledgerAdmin.balances]
  )

  const term = search.trim().toLowerCase()
  const filteredTransactions = useMemo(() => {
    let rows = ledgerAdmin.transactions
    if (crmAccountId || customerRef) {
      rows = rows.filter(item =>
        transactionFamily(item).some(transaction => transactionMatchesCustomer(transaction, crmAccountId, customerRef))
      )
    }
    if (accountFilter) {
      const refs = new Set([accountFilter, filterBalance?.id].filter(Boolean) as string[])
      rows = rows.filter(item =>
        transactionFamily(item).some(
          transaction =>
            (transaction.source && refs.has(transaction.source)) ||
            (transaction.destination && refs.has(transaction.destination))
        )
      )
    }
    if (term) {
      rows = rows.filter(item =>
        transactionFamily(item).some(transaction =>
          `${transaction.reference ?? ''} ${transaction.source ?? ''} ${transaction.destination ?? ''} ${
            transaction.status ?? ''
          } ${transaction.effectiveStatus ?? ''}`
            .toLowerCase()
            .includes(term)
        )
      )
    }
    return rows
  }, [ledgerAdmin.transactions, crmAccountId, customerRef, accountFilter, filterBalance, term])

  const openCreate = () => {
    setPrefillSource(accountFilter ?? '')
    setDialogKind('transaction')
  }

  const adjustAccount = (balance: LedgerBalance) => {
    setSelection(null)
    setPrefillSource(balance.balanceId)
    setDialogKind('transaction')
  }

  const closeDialog = () => {
    setDialogKind(null)
    setPrefillSource('')
  }

  const renameAccount = (balanceId: string, name: string) => {
    ledgerAdmin.renameAccount(balanceId, name)
    const resolved = name.trim() || balanceId
    setSelection(current =>
      current?.kind === 'account' && current.item.balanceId === balanceId
        ? { kind: 'account', item: { ...current.item, name: resolved } }
        : current
    )
  }

  const createTransaction = (input: CreateTransactionInput) =>
    ledgerAdmin.addTransaction({
      ...input,
      metaData: {
        ...input.metaData,
        ...(crmAccountId
          ? {
              crmAccountId,
              customerType: 'account',
              customerRef: customerRef ?? `account:${crmAccountId}`,
              sourceApp: 'customer-360'
            }
          : {})
      }
    })

  if (!accessToken || ledgerAdmin.loading) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:min-h-[200px]"
        data-testid="ledger-transactions-loading"
      >
        <Spinner />
      </div>
    )
  }

  return (
    <PageLayout
      headerIcon={ListBulletsIcon}
      headerTitle={t('billing-transactions-title')}
      headerDescription={t('billing-transactions-description')}
      variant="default"
      data-testid="ledger-transactions"
    >
      {(ledgerAdmin.usingSampleData || ledgerAdmin.error) && (
        <Alert className="gba:mb-4" data-testid="ledger-transactions-sample-notice">
          <AlertDescription>
            {ledgerAdmin.usingSampleData ? t('ledger-admin-sample-notice') : t('ledger-admin-backend-error-notice')}
            {ledgerAdmin.error && (
              <span
                className="gba:block gba:mt-1 gba:text-muted-foreground"
                data-testid="ledger-transactions-error-detail"
              >
                {`${t('ledger-admin-connection-detail')}: ${ledgerAdmin.error}`}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {(filterBalance || crmAccountId) && (
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4" data-testid="ledger-transactions-account-filter">
          <span className="gba:text-sm gba:text-muted-foreground">{t('billing-transactions-account-filter')}:</span>
          <Badge variant="secondary">{filterBalance ? balanceLabel(filterBalance, t) : customerRef}</Badge>
          {filterBalance ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAccountFilter(null)}
              data-testid="ledger-transactions-clear-filter"
            >
              <XIcon size={14} className="gba:mr-1" />
              {t('billing-transactions-clear-filter')}
            </Button>
          ) : null}
        </div>
      )}

      <div className="gba:flex gba:items-center gba:justify-end gba:gap-2 gba:mb-4 gba:flex-wrap">
        <div className="gba:relative gba:w-64">
          <MagnifyingGlassIcon
            size={16}
            className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:text-muted-foreground"
          />
          <Input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder={t('ledger-admin-search')}
            className="gba:pl-9"
            data-testid="ledger-transactions-search"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => ledgerAdmin.reload()}
          data-testid="ledger-transactions-refresh"
        >
          <ArrowsClockwiseIcon size={16} className="gba:mr-1" />
          {t('ledger-admin-action-refresh')}
        </Button>
        {canManage && (
          <Button size="sm" onClick={openCreate} data-testid="ledger-transactions-create">
            <PlusIcon size={16} className="gba:mr-1" />
            {t('ledger-admin-create-transaction')}
          </Button>
        )}
      </div>

      <ExpandableTransactionTable
        balanceIndex={balanceIndex}
        emptyMessage={t('ledger-admin-empty-transactions')}
        onRowClick={item => setSelection({ kind: 'transaction', item })}
        rows={filteredTransactions}
        t={t}
      />

      <LedgerDetailSheet
        selection={selection}
        ledgers={ledgerAdmin.ledgers}
        balances={ledgerAdmin.balances}
        transactions={ledgerAdmin.transactions}
        balanceIndex={balanceIndex}
        onClose={() => setSelection(null)}
        onSelect={setSelection}
        onAdjustAccount={adjustAccount}
        onRenameAccount={renameAccount}
        onUpdateInflight={ledgerAdmin.updateInflight}
        t={t}
      />

      <LedgerCreateDialog
        kind={dialogKind}
        ledgers={ledgerAdmin.ledgers}
        balances={ledgerAdmin.balances}
        invoices={billing.invoices}
        initialSource={prefillSource}
        onClose={closeDialog}
        onCreateLedger={ledgerAdmin.addLedger}
        onCreateAccount={ledgerAdmin.addAccount}
        onCreateTransaction={createTransaction}
        t={t}
      />
    </PageLayout>
  )
}

export default LedgerTransactions

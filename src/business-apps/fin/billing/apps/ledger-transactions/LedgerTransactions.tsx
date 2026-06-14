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
import { ExpenseDataTable } from '@/business-apps/fin/expenses/common/components/table/ExpenseDataTable'
import billingTranslations from '../../common/_i18n'
import { useLedgerAdmin } from '../../common/hooks/useLedgerAdmin'
import { useBillingData } from '../../common/hooks/useBillingData'
import { useBillingPermissions } from '../../common/hooks/useBillingPermissions'
import { buildAccountIndex, displayAccountName } from '../../common/utils/ledgerNames'
import { buildTransactionColumns } from '../ledger-admin/ledgerColumns'
import LedgerCreateDialog, { type LedgerDialogKind } from '../ledger-admin/LedgerCreateDialog'
import LedgerDetailSheet, { type LedgerSelection } from '../ledger-admin/LedgerDetailSheet'
import type { CreateTransactionInput, LedgerAccount } from '../../common/network/ledgerAdminClient'

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
  return (
    metadata.crmAccountId === crmAccountId ||
    metadata.invoiceAccountId === crmAccountId ||
    metadata.customerRef === customerRef
  )
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

  const accountIndex = useMemo(() => buildAccountIndex(ledgerAdmin.accounts), [ledgerAdmin.accounts])

  const filterAccount = useMemo(
    () => (accountFilter ? (ledgerAdmin.accounts.find(account => account.balanceId === accountFilter) ?? null) : null),
    [accountFilter, ledgerAdmin.accounts]
  )

  const transactionColumns = useMemo(
    () =>
      buildTransactionColumns(
        {
          reference: t('ledger-admin-col-reference'),
          amount: t('ledger-admin-col-amount'),
          source: t('ledger-admin-col-source'),
          destination: t('ledger-admin-col-destination'),
          status: t('ledger-admin-col-status'),
          created: t('ledger-admin-col-created')
        },
        t,
        accountIndex
      ),
    [t, accountIndex]
  )

  const term = search.trim().toLowerCase()
  const filteredTransactions = useMemo(() => {
    let rows = ledgerAdmin.transactions
    if (crmAccountId || customerRef) {
      rows = rows.filter(item => transactionMatchesCustomer(item, crmAccountId, customerRef))
    }
    if (accountFilter) {
      const refs = new Set([accountFilter, filterAccount?.id].filter(Boolean) as string[])
      rows = rows.filter(
        item => (item.source && refs.has(item.source)) || (item.destination && refs.has(item.destination))
      )
    }
    if (term) {
      rows = rows.filter(item =>
        `${item.reference ?? ''} ${item.source ?? ''} ${item.destination ?? ''} ${item.status ?? ''}`
          .toLowerCase()
          .includes(term)
      )
    }
    return rows
  }, [ledgerAdmin.transactions, crmAccountId, customerRef, accountFilter, filterAccount, term])

  const openCreate = () => {
    setPrefillSource(accountFilter ?? '')
    setDialogKind('transaction')
  }

  const adjustAccount = (account: LedgerAccount) => {
    setSelection(null)
    setPrefillSource(account.balanceId)
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

      {(filterAccount || crmAccountId) && (
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4" data-testid="ledger-transactions-account-filter">
          <span className="gba:text-sm gba:text-muted-foreground">{t('billing-transactions-account-filter')}:</span>
          <Badge variant="secondary">{filterAccount ? displayAccountName(filterAccount, t) : customerRef}</Badge>
          {filterAccount ? (
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

      <ExpenseDataTable
        data={filteredTransactions}
        totalCount={filteredTransactions.length}
        columns={transactionColumns}
        emptyMessage={t('ledger-admin-empty-transactions')}
        dataTestId="ledger-transactions-table"
        tableLayout="auto"
        onRowClick={item => setSelection({ kind: 'transaction', item })}
      />

      <LedgerDetailSheet
        selection={selection}
        ledgers={ledgerAdmin.ledgers}
        accounts={ledgerAdmin.accounts}
        transactions={ledgerAdmin.transactions}
        accountIndex={accountIndex}
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
        accounts={ledgerAdmin.accounts}
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

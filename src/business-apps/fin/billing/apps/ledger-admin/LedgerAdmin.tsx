import React, { useMemo, useState } from 'react'
import {
  PageLayout,
  Button,
  Spinner,
  Input,
  Alert,
  AlertDescription,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  useTranslation
} from '@newwork/nw-design-system'
import { PlusIcon, StackIcon, ArrowsClockwiseIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ExpenseDataTable } from '@/business-apps/fin/expenses/common/components/table/ExpenseDataTable'
import { Navigation, buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import billingTranslations from '../../common/_i18n'
import { useLedgerAdmin } from '../../common/hooks/useLedgerAdmin'
import { useBillingPermissions } from '../../common/hooks/useBillingPermissions'
import { buildAccountIndex } from '../../common/utils/ledgerNames'
import { buildAccountColumns, buildLedgerColumns } from './ledgerColumns'
import LedgerCreateDialog, { type LedgerDialogKind } from './LedgerCreateDialog'
import LedgerDetailSheet, { type LedgerSelection } from './LedgerDetailSheet'
import type { Ledger, LedgerAccount } from '../../common/network/ledgerAdminClient'

type LedgerAdminProps = BusinessAppContextProps

const LedgerAdmin: React.FC<LedgerAdminProps> = props => {
  const { accessToken } = props
  const { t } = useTranslation(billingTranslations)
  const ledgerAdmin = useLedgerAdmin(props)
  const permissions = useBillingPermissions(props)
  const [dialogKind, setDialogKind] = useState<LedgerDialogKind | null>(null)
  const [activeTab, setActiveTab] = useState('ledgers')
  const [search, setSearch] = useState('')
  const [selection, setSelection] = useState<LedgerSelection | null>(null)
  const [prefillSource, setPrefillSource] = useState('')

  const canManage = permissions.canEditSettings || permissions.canCreateDraft

  const accountIndex = useMemo(() => buildAccountIndex(ledgerAdmin.accounts), [ledgerAdmin.accounts])

  const ledgerColumns = useMemo(
    () => buildLedgerColumns({ name: t('ledger-admin-col-name'), created: t('ledger-admin-col-created') }),
    [t]
  )
  const accountColumns = useMemo(
    () =>
      buildAccountColumns(
        {
          name: t('ledger-admin-col-name'),
          currency: t('ledger-admin-col-currency'),
          balance: t('ledger-admin-col-balance'),
          inflight: t('ledger-admin-col-inflight')
        },
        t
      ),
    [t]
  )
  const term = search.trim().toLowerCase()
  const filteredLedgers = useMemo(
    () =>
      term
        ? ledgerAdmin.ledgers.filter(item => `${item.name} ${item.ledgerId}`.toLowerCase().includes(term))
        : ledgerAdmin.ledgers,
    [ledgerAdmin.ledgers, term]
  )
  const filteredAccounts = useMemo(
    () =>
      term
        ? ledgerAdmin.accounts.filter(item =>
            `${item.name} ${item.currency} ${item.balanceId}`.toLowerCase().includes(term)
          )
        : ledgerAdmin.accounts,
    [ledgerAdmin.accounts, term]
  )
  const createLabel = activeTab === 'accounts' ? t('ledger-admin-create-account') : t('ledger-admin-create-ledger')

  const openCreate = () => {
    setPrefillSource('')
    setDialogKind(activeTab === 'accounts' ? 'account' : 'ledger')
  }

  const viewAccountTransactions = (account: LedgerAccount) => {
    setSelection(null)
    navigateTo(buildPlatformUrl(Navigation.FIN_BILLING_TRANSACTIONS, { accountId: account.balanceId }))
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

  if (!accessToken || ledgerAdmin.loading) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:min-h-[200px]"
        data-testid="ledger-admin-loading"
      >
        <Spinner />
      </div>
    )
  }

  return (
    <PageLayout
      headerIcon={StackIcon}
      headerTitle={t('ledger-admin-title')}
      headerDescription={t('ledger-admin-description')}
      variant="default"
      data-testid="ledger-admin"
    >
      {ledgerAdmin.usingSampleData && (
        <Alert className="gba:mb-4" data-testid="ledger-admin-sample-notice">
          <AlertDescription>
            {t('ledger-admin-sample-notice')}
            {ledgerAdmin.error && (
              <span className="gba:block gba:mt-1 gba:text-muted-foreground" data-testid="ledger-admin-error-detail">
                {`${t('ledger-admin-connection-detail')}: ${ledgerAdmin.error}`}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:mb-4 gba:flex-wrap">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="ledgers" data-testid="ledger-tab-ledgers">
              {t('ledger-admin-tab-ledgers')}
            </TabsTrigger>
            <TabsTrigger value="accounts" data-testid="ledger-tab-accounts">
              {t('ledger-admin-tab-accounts')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
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
              data-testid="ledger-admin-search"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => ledgerAdmin.reload()} data-testid="ledger-admin-refresh">
            <ArrowsClockwiseIcon size={16} className="gba:mr-1" />
            {t('ledger-admin-action-refresh')}
          </Button>
          {canManage && (
            <Button size="sm" onClick={openCreate} data-testid="ledger-admin-create">
              <PlusIcon size={16} className="gba:mr-1" />
              {createLabel}
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsContent value="ledgers">
          <ExpenseDataTable<Ledger>
            data={filteredLedgers}
            totalCount={filteredLedgers.length}
            columns={ledgerColumns}
            emptyMessage={t('ledger-admin-empty-ledgers')}
            dataTestId="ledger-table-ledgers"
            tableLayout="auto"
            onRowClick={item => setSelection({ kind: 'ledger', item })}
          />
        </TabsContent>
        <TabsContent value="accounts">
          <ExpenseDataTable<LedgerAccount>
            data={filteredAccounts}
            totalCount={filteredAccounts.length}
            columns={accountColumns}
            emptyMessage={t('ledger-admin-empty-accounts')}
            dataTestId="ledger-table-accounts"
            tableLayout="auto"
            onRowClick={item => setSelection({ kind: 'account', item })}
          />
        </TabsContent>
      </Tabs>

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
        onViewAccountTransactions={viewAccountTransactions}
        t={t}
      />

      <LedgerCreateDialog
        kind={dialogKind}
        ledgers={ledgerAdmin.ledgers}
        accounts={ledgerAdmin.accounts}
        initialSource={prefillSource}
        onClose={closeDialog}
        onCreateLedger={ledgerAdmin.addLedger}
        onCreateAccount={ledgerAdmin.addAccount}
        onCreateTransaction={ledgerAdmin.addTransaction}
        t={t}
      />
    </PageLayout>
  )
}

export default LedgerAdmin

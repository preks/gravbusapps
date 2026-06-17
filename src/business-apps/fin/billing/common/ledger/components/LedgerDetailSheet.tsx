import React, { useMemo, useState } from 'react'
import { Sheet, SheetContent, SheetTitle, Button, Input, Separator } from '@newwork/nw-design-system'
import { PlusIcon, PencilSimpleIcon, ArrowSquareOutIcon } from '@phosphor-icons/react'
import { formatCurrency } from '../../utils/currency'
import { balanceLabel, resolveTransactionPartyName } from '../utils/ledgerNames'
import { transactionFamily } from '../utils/ledgerTransactionStatus'
import { formatDate } from '../../utils/date'
import type {
  Ledger,
  LedgerBalance,
  LedgerTransaction,
  UpdateInflightTransactionInput
} from '../network/ledgerAdminClient'
import { Field, RelatedRow, SectionTitle } from './detail-sheet/LedgerDetailPrimitives'
import { TransactionDetailView } from './detail-sheet/TransactionDetailView'

type TranslateFn = (key: string) => string

export type LedgerSelection =
  | { kind: 'ledger'; item: Ledger }
  | { kind: 'account'; item: LedgerBalance }
  | { kind: 'transaction'; item: LedgerTransaction }

interface LedgerDetailSheetProps {
  selection: LedgerSelection | null
  ledgers: Ledger[]
  balances: LedgerBalance[]
  transactions: LedgerTransaction[]
  balanceIndex: Map<string, LedgerBalance>
  onClose: () => void
  onSelect: (selection: LedgerSelection) => void
  onAdjustAccount: (balance: LedgerBalance) => void
  onRenameAccount: (balanceId: string, name: string) => void
  onUpdateInflight?: (input: UpdateInflightTransactionInput) => Promise<LedgerTransaction | null>
  /** When provided, shows a "View all transactions" action on the account view. */
  onViewAccountTransactions?: (balance: LedgerBalance) => void
  t: TranslateFn
}

const SHEET_CLASS = 'gba:w-[560px] gba:sm:w-[560px] gba:max-w-none gba:p-0'

function detailTitle(selection: LedgerSelection | null, t: TranslateFn): string {
  if (selection?.kind === 'ledger') return t('ledger-admin-detail-ledger')
  if (selection?.kind === 'account') return t('ledger-admin-detail-account')
  return t('ledger-admin-detail-transaction')
}

/** Balance name field with inline edit backed by a local display-name override. */
function EditableAccountName({
  balance,
  onRename,
  t
}: Readonly<{
  balance: LedgerBalance
  onRename: (balanceId: string, name: string) => void
  t: TranslateFn
}>) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')

  const start = () => {
    setValue(balance.name && balance.name !== balance.balanceId ? balance.name : '')
    setEditing(true)
  }
  const save = () => {
    onRename(balance.balanceId, value)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="gba:flex gba:flex-col gba:gap-1">
        <span className="gba:text-xs gba:text-muted-foreground">{t('ledger-admin-col-name')}</span>
        <div className="gba:flex gba:items-center gba:gap-2">
          <Input
            value={value}
            onChange={event => setValue(event.target.value)}
            placeholder={t('ledger-admin-detail-name-placeholder')}
            data-testid="ledger-detail-name-input"
          />
          <Button size="sm" onClick={save} data-testid="ledger-detail-name-save">
            {t('ledger-admin-detail-save')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(false)} data-testid="ledger-detail-name-cancel">
            {t('ledger-admin-action-cancel')}
          </Button>
        </div>
        <span className="gba:text-xs gba:text-muted-foreground">{t('ledger-admin-detail-name-local-note')}</span>
      </div>
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-0.5">
      <span className="gba:text-xs gba:text-muted-foreground">{t('ledger-admin-col-name')}</span>
      <div className="gba:flex gba:items-center gba:gap-2">
        <span className="gba:text-sm gba:font-medium">{balanceLabel(balance, t)}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={start}
          data-testid="ledger-detail-name-edit"
          aria-label={t('ledger-admin-detail-edit-name')}
        >
          <PencilSimpleIcon size={16} />
        </Button>
      </div>
    </div>
  )
}

const LedgerDetailSheet: React.FC<LedgerDetailSheetProps> = ({
  selection,
  ledgers,
  balances,
  transactions,
  balanceIndex,
  onClose,
  onSelect,
  onAdjustAccount,
  onRenameAccount,
  onUpdateInflight,
  onViewAccountTransactions,
  t
}) => {
  const ledgerById = useMemo(() => new Map(ledgers.map(l => [l.ledgerId, l])), [ledgers])

  const ledgerBalances = useMemo(() => {
    if (selection?.kind !== 'ledger') return []
    return balances.filter(balance => balance.ledgerId === selection.item.ledgerId)
  }, [selection, balances])

  const accountTransactions = useMemo(() => {
    if (selection?.kind !== 'account') return []
    const refs = new Set([selection.item.balanceId, selection.item.id].filter(Boolean))
    return transactions.filter(txn =>
      transactionFamily(txn).some(
        transaction =>
          (transaction.source && refs.has(transaction.source)) ||
          (transaction.destination && refs.has(transaction.destination))
      )
    )
  }, [selection, transactions])

  const title = detailTitle(selection, t)

  return (
    <Sheet open={Boolean(selection)} onOpenChange={open => (open ? null : onClose())}>
      <SheetContent side="right" className={SHEET_CLASS} aria-describedby={undefined} data-testid="ledger-detail-sheet">
        <div className="gba:flex gba:flex-col gba:h-full">
          <div className="gba:px-6 gba:py-4 gba:border-b gba:border-border">
            <SheetTitle className="gba:text-lg gba:font-semibold">{title}</SheetTitle>
          </div>
          <div className="gba:flex-1 gba:overflow-y-auto gba:px-6 gba:py-5">
            {selection?.kind === 'ledger' && (
              <div className="gba:flex gba:flex-col gba:gap-4">
                <Field label={t('ledger-admin-col-name')} value={selection.item.name} />
                <Field label={t('ledger-admin-detail-ledger-id')} value={selection.item.ledgerId} mono />
                <Field
                  label={t('ledger-admin-col-created')}
                  value={selection.item.createdAt ? formatDate(selection.item.createdAt, 'date.medium') : '—'}
                />
                <Separator />
                <div>
                  <SectionTitle>{t('ledger-admin-detail-accounts-in-ledger')}</SectionTitle>
                  {ledgerBalances.length === 0 ? (
                    <p className="gba:text-sm gba:text-muted-foreground">{t('ledger-admin-detail-no-accounts')}</p>
                  ) : (
                    <div className="gba:flex gba:flex-col gba:gap-1">
                      {ledgerBalances.map(balance => (
                        <RelatedRow
                          key={balance.id}
                          testId={`ledger-detail-account-${balance.id}`}
                          primary={balanceLabel(balance, t)}
                          secondary={balance.currency}
                          trailing={formatCurrency(balance.balance, balance.currency)}
                          onClick={() => onSelect({ kind: 'account', item: balance })}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {selection?.kind === 'account' && (
              <div className="gba:flex gba:flex-col gba:gap-4">
                <EditableAccountName
                  key={selection.item.balanceId}
                  balance={selection.item}
                  onRename={onRenameAccount}
                  t={t}
                />
                <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                  <Field
                    label={t('ledger-admin-col-balance')}
                    value={formatCurrency(selection.item.balance, selection.item.currency)}
                  />
                  <Field
                    label={t('ledger-admin-col-inflight')}
                    value={formatCurrency(selection.item.inflightBalance, selection.item.currency)}
                  />
                  <Field label={t('ledger-admin-col-currency')} value={selection.item.currency} />
                  <Field
                    label={t('ledger-admin-detail-ledger-field')}
                    value={ledgerById.get(selection.item.ledgerId)?.name ?? selection.item.ledgerId}
                  />
                </div>
                <Field label={t('ledger-admin-detail-balance-id')} value={selection.item.balanceId} mono />
                <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
                  <Button size="sm" onClick={() => onAdjustAccount(selection.item)} data-testid="ledger-detail-adjust">
                    <PlusIcon size={16} className="gba:mr-1" />
                    {t('ledger-admin-detail-new-from-account')}
                  </Button>
                  {onViewAccountTransactions && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewAccountTransactions(selection.item)}
                      data-testid="ledger-detail-view-transactions"
                    >
                      <ArrowSquareOutIcon size={16} className="gba:mr-1" />
                      {t('ledger-admin-view-all-transactions')}
                    </Button>
                  )}
                </div>
                <p className="gba:text-xs gba:text-muted-foreground">{t('ledger-admin-detail-immutable-note')}</p>
                <Separator />
                <div>
                  <SectionTitle>{t('ledger-admin-detail-related-transactions')}</SectionTitle>
                  {accountTransactions.length === 0 ? (
                    <p className="gba:text-sm gba:text-muted-foreground">{t('ledger-admin-detail-no-transactions')}</p>
                  ) : (
                    <div className="gba:flex gba:flex-col gba:gap-1">
                      {accountTransactions.map(txn => (
                        <RelatedRow
                          key={txn.id}
                          testId={`ledger-detail-txn-${txn.id}`}
                          primary={txn.reference ?? txn.transactionId}
                          secondary={`${resolveTransactionPartyName(txn, 'source', balanceIndex, t)} → ${resolveTransactionPartyName(txn, 'destination', balanceIndex, t)}`}
                          trailing={formatCurrency(txn.amount, txn.currency)}
                          onClick={() => onSelect({ kind: 'transaction', item: txn })}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {selection?.kind === 'transaction' && (
              <TransactionDetailView
                balanceIndex={balanceIndex}
                onClose={onClose}
                onSelectTransaction={item => onSelect({ kind: 'transaction', item })}
                onUpdateInflight={onUpdateInflight}
                transaction={selection.item}
                t={t}
              />
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default LedgerDetailSheet

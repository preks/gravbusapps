import React, { useMemo, useState } from 'react'
import { Sheet, SheetContent, SheetTitle, Badge, Button, Input, Separator } from '@newwork/nw-design-system'
import { PlusIcon, PencilSimpleIcon, ArrowSquareOutIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { formatCurrency } from '../../common/utils/currency'
import { getTransactionStatusLabel } from '../../common/utils/billingLabels'
import { displayAccountName, resolveRefName } from '../../common/utils/ledgerNames'
import { formatDate } from '@/common/utils/windowUtils'
import type {
  Ledger,
  LedgerAccount,
  LedgerTransaction,
  UpdateInflightTransactionInput
} from '../../common/network/ledgerAdminClient'

type TranslateFn = (key: string) => string

export type LedgerSelection =
  | { kind: 'ledger'; item: Ledger }
  | { kind: 'account'; item: LedgerAccount }
  | { kind: 'transaction'; item: LedgerTransaction }

interface LedgerDetailSheetProps {
  selection: LedgerSelection | null
  ledgers: Ledger[]
  accounts: LedgerAccount[]
  transactions: LedgerTransaction[]
  accountIndex: Map<string, LedgerAccount>
  onClose: () => void
  onSelect: (selection: LedgerSelection) => void
  onAdjustAccount: (account: LedgerAccount) => void
  onRenameAccount: (balanceId: string, name: string) => void
  onUpdateInflight?: (input: UpdateInflightTransactionInput) => Promise<LedgerTransaction | null>
  /** When provided, shows a "View all transactions" action on the account view. */
  onViewAccountTransactions?: (account: LedgerAccount) => void
  t: TranslateFn
}

const SHEET_CLASS = 'gba:w-[560px] gba:sm:w-[560px] gba:max-w-none gba:p-0'

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="gba:flex gba:flex-col gba:gap-0.5">
      <span className="gba:text-xs gba:text-muted-foreground">{label}</span>
      <span className={mono ? 'gba:text-sm gba:break-all gba:font-mono' : 'gba:text-sm gba:font-medium'}>
        {value || '—'}
      </span>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="gba:text-sm gba:font-semibold gba:mb-2 gba:mt-1">{children}</h3>
}

function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) throw new Error('Amount must be a valid number')
  return parsed
}

function isInflightTransaction(transaction: LedgerTransaction): boolean {
  const status = transaction.status?.toLowerCase() ?? ''
  return status.includes('inflight') || status.includes('in_flight')
}

/** A clickable row used in the "related" lists. */
function RelatedRow({
  primary,
  secondary,
  trailing,
  onClick,
  testId
}: {
  primary: React.ReactNode
  secondary?: React.ReactNode
  trailing?: React.ReactNode
  onClick: () => void
  testId: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className="gba:flex gba:w-full gba:items-center gba:justify-between gba:gap-3 gba:rounded-md gba:px-3 gba:py-2 gba:text-left gba:hover:bg-muted gba:transition-colors"
    >
      <span className="gba:flex gba:flex-col gba:min-w-0">
        <span className="gba:text-sm gba:font-medium gba:truncate">{primary}</span>
        {secondary && <span className="gba:text-xs gba:text-muted-foreground gba:truncate">{secondary}</span>}
      </span>
      {trailing && <span className="gba:text-sm gba:shrink-0">{trailing}</span>}
    </button>
  )
}

/** Account name field with inline edit backed by a local display-name override. */
function EditableAccountName({
  account,
  onRename,
  t
}: {
  account: LedgerAccount
  onRename: (balanceId: string, name: string) => void
  t: TranslateFn
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')

  const start = () => {
    setValue(account.name && account.name !== account.balanceId ? account.name : '')
    setEditing(true)
  }
  const save = () => {
    onRename(account.balanceId, value)
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
        <span className="gba:text-sm gba:font-medium">{displayAccountName(account, t)}</span>
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
  accounts,
  transactions,
  accountIndex,
  onClose,
  onSelect,
  onAdjustAccount,
  onRenameAccount,
  onUpdateInflight,
  onViewAccountTransactions,
  t
}) => {
  const [inflightAmount, setInflightAmount] = useState('')
  const [inflightPreciseAmount, setInflightPreciseAmount] = useState('')
  const [inflightSubmitting, setInflightSubmitting] = useState(false)
  const ledgerById = useMemo(() => new Map(ledgers.map(l => [l.ledgerId, l])), [ledgers])

  const updateInflight = async (status: 'commit' | 'void') => {
    if (!onUpdateInflight || selection?.kind !== 'transaction') return

    setInflightSubmitting(true)
    try {
      await onUpdateInflight({
        transactionId: selection.item.transactionId,
        status,
        amount: parseOptionalNumber(inflightAmount),
        preciseAmount: parseOptionalNumber(inflightPreciseAmount)
      })
      toast.success(
        t(status === 'commit' ? 'ledger-admin-inflight-commit-success' : 'ledger-admin-inflight-void-success')
      )
      setInflightAmount('')
      setInflightPreciseAmount('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('ledger-admin-inflight-update-error'))
    } finally {
      setInflightSubmitting(false)
    }
  }

  const ledgerAccounts = useMemo(() => {
    if (selection?.kind !== 'ledger') return []
    return accounts.filter(account => account.ledgerId === selection.item.ledgerId)
  }, [selection, accounts])

  const accountTransactions = useMemo(() => {
    if (selection?.kind !== 'account') return []
    const refs = new Set([selection.item.balanceId, selection.item.id].filter(Boolean))
    return transactions.filter(
      txn => (txn.source && refs.has(txn.source)) || (txn.destination && refs.has(txn.destination))
    )
  }, [selection, transactions])

  const title =
    selection?.kind === 'ledger'
      ? t('ledger-admin-detail-ledger')
      : selection?.kind === 'account'
        ? t('ledger-admin-detail-account')
        : t('ledger-admin-detail-transaction')

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
                  {ledgerAccounts.length === 0 ? (
                    <p className="gba:text-sm gba:text-muted-foreground">{t('ledger-admin-detail-no-accounts')}</p>
                  ) : (
                    <div className="gba:flex gba:flex-col gba:gap-1">
                      {ledgerAccounts.map(account => (
                        <RelatedRow
                          key={account.id}
                          testId={`ledger-detail-account-${account.id}`}
                          primary={displayAccountName(account, t)}
                          secondary={account.currency}
                          trailing={formatCurrency(account.balance, account.currency)}
                          onClick={() => onSelect({ kind: 'account', item: account })}
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
                  account={selection.item}
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
                          secondary={`${resolveRefName(txn.source, accountIndex, t)} → ${resolveRefName(txn.destination, accountIndex, t)}`}
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
              <div className="gba:flex gba:flex-col gba:gap-4">
                <Field
                  label={t('ledger-admin-col-reference')}
                  value={selection.item.reference ?? selection.item.transactionId}
                />
                <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                  <Field
                    label={t('ledger-admin-col-amount')}
                    value={formatCurrency(selection.item.amount, selection.item.currency)}
                  />
                  <Field
                    label={t('ledger-admin-col-status')}
                    value={
                      selection.item.status ? (
                        <Badge variant="secondary">{getTransactionStatusLabel(selection.item.status, t)}</Badge>
                      ) : (
                        '—'
                      )
                    }
                  />
                  <Field
                    label={t('ledger-admin-col-source')}
                    value={resolveRefName(selection.item.source, accountIndex, t)}
                  />
                  <Field
                    label={t('ledger-admin-col-destination')}
                    value={resolveRefName(selection.item.destination, accountIndex, t)}
                  />
                </div>
                {selection.item.description && (
                  <Field label={t('ledger-admin-field-description')} value={selection.item.description} />
                )}
                <Field
                  label={t('ledger-admin-col-created')}
                  value={selection.item.createdAt ? formatDate(selection.item.createdAt, 'date.medium') : '—'}
                />
                <Field label={t('ledger-admin-detail-transaction-id')} value={selection.item.transactionId} mono />
                {onUpdateInflight && isInflightTransaction(selection.item) && (
                  <>
                    <Separator />
                    <div className="gba:flex gba:flex-col gba:gap-3" data-testid="ledger-inflight-actions">
                      <SectionTitle>{t('ledger-admin-inflight-actions')}</SectionTitle>
                      <div className="gba:grid gba:grid-cols-2 gba:gap-3">
                        <div className="gba:flex gba:flex-col gba:gap-1">
                          <span className="gba:text-xs gba:text-muted-foreground">
                            {t('ledger-admin-inflight-amount')}
                          </span>
                          <Input
                            type="number"
                            value={inflightAmount}
                            onChange={event => setInflightAmount(event.target.value)}
                            data-testid="ledger-inflight-amount"
                          />
                        </div>
                        <div className="gba:flex gba:flex-col gba:gap-1">
                          <span className="gba:text-xs gba:text-muted-foreground">
                            {t('ledger-admin-inflight-precise-amount')}
                          </span>
                          <Input
                            type="number"
                            value={inflightPreciseAmount}
                            onChange={event => setInflightPreciseAmount(event.target.value)}
                            data-testid="ledger-inflight-precise-amount"
                          />
                        </div>
                      </div>
                      <p className="gba:text-xs gba:text-muted-foreground">{t('ledger-admin-inflight-empty-note')}</p>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Button
                          size="sm"
                          onClick={() => void updateInflight('commit')}
                          disabled={inflightSubmitting}
                          data-testid="ledger-inflight-commit"
                        >
                          {t('ledger-admin-inflight-commit')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void updateInflight('void')}
                          disabled={inflightSubmitting}
                          data-testid="ledger-inflight-void"
                        >
                          {t('ledger-admin-inflight-void')}
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default LedgerDetailSheet

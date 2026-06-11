import React, { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea
} from '@newwork/nw-design-system'
import { toast } from 'sonner'
import { accountOptionLabel } from '../../common/utils/ledgerNames'
import type {
  CreateAccountInput,
  CreateLedgerInput,
  CreateTransactionInput,
  Ledger,
  LedgerAccount
} from '../../common/network/ledgerAdminClient'

export type LedgerDialogKind = 'ledger' | 'account' | 'transaction'

interface LedgerCreateDialogProps {
  kind: LedgerDialogKind | null
  ledgers: Ledger[]
  accounts: LedgerAccount[]
  /** Pre-selected source account (balance id) when adjusting from an account. */
  initialSource?: string
  onClose: () => void
  onCreateLedger: (input: CreateLedgerInput) => Promise<unknown>
  onCreateAccount: (input: CreateAccountInput) => Promise<unknown>
  onCreateTransaction: (input: CreateTransactionInput) => Promise<unknown>
  t: (key: string) => string
}

const CURRENCY_OPTIONS = ['EUR', 'USD', 'GBP', 'CHF', 'RON']
const EXTERNAL_REF = '@World'

const LedgerCreateDialog: React.FC<LedgerCreateDialogProps> = ({
  kind,
  ledgers,
  accounts,
  initialSource,
  onClose,
  onCreateLedger,
  onCreateAccount,
  onCreateTransaction,
  t
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [ledgerId, setLedgerId] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [source, setSource] = useState('')
  const [destination, setDestination] = useState('')
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [description, setDescription] = useState('')

  const accountByRef = useMemo(() => new Map(accounts.map(account => [account.balanceId, account])), [accounts])

  const reset = () => {
    setName('')
    setLedgerId('')
    setCurrency('EUR')
    setSource('')
    setDestination('')
    setAmount('')
    setReference('')
    setDescription('')
  }

  // Apply the pre-selected source (and its currency) when opening a transaction
  // dialog from an account, e.g. via the account detail "adjust" action.
  useEffect(() => {
    if (kind === 'transaction' && initialSource) {
      setSource(initialSource)
      const account = accountByRef.get(initialSource)
      if (account?.currency) setCurrency(account.currency)
    }
  }, [kind, initialSource, accountByRef])

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSourceChange = (value: string) => {
    setSource(value)
    const account = accountByRef.get(value)
    if (account?.currency) setCurrency(account.currency)
  }

  const submit = async () => {
    setSubmitting(true)
    try {
      if (kind === 'ledger') {
        if (!name.trim()) throw new Error(t('ledger-admin-validation-name'))
        await onCreateLedger({ name: name.trim() })
      } else if (kind === 'account') {
        if (!name.trim()) throw new Error(t('ledger-admin-validation-name'))
        if (!ledgerId) throw new Error(t('ledger-admin-validation-ledger'))
        await onCreateAccount({ ledgerId, currency, name: name.trim() })
      } else if (kind === 'transaction') {
        const numericAmount = Number(amount)
        if (!source.trim() || !destination.trim()) throw new Error(t('ledger-admin-validation-accounts'))
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) throw new Error(t('ledger-admin-validation-amount'))
        await onCreateTransaction({
          source: source.trim(),
          destination: destination.trim(),
          amount: numericAmount,
          currency,
          reference: reference.trim() || undefined,
          description: description.trim() || undefined,
          skipQueue: true
        })
      }
      toast.success(t('ledger-admin-create-success'))
      handleClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('ledger-admin-create-error'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!kind) return null

  const title =
    kind === 'ledger'
      ? t('ledger-admin-create-ledger')
      : kind === 'account'
        ? t('ledger-admin-create-account')
        : t('ledger-admin-create-transaction')

  return (
    <Dialog open={Boolean(kind)} onOpenChange={open => (open ? null : handleClose())}>
      <DialogContent data-testid="ledger-create-dialog">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="gba:flex gba:flex-col gba:gap-3">
          {(kind === 'ledger' || kind === 'account') && (
            <div className="gba:flex gba:flex-col gba:gap-1">
              <Label htmlFor="ledger-name">{t('ledger-admin-field-name')}</Label>
              <Input
                id="ledger-name"
                value={name}
                onChange={e => setName(e.target.value)}
                data-testid="ledger-field-name"
              />
            </div>
          )}

          {kind === 'account' && (
            <div className="gba:flex gba:flex-col gba:gap-1">
              <Label>{t('ledger-admin-field-ledger')}</Label>
              <Select value={ledgerId} onValueChange={setLedgerId}>
                <SelectTrigger data-testid="ledger-field-ledger">
                  <SelectValue placeholder={t('ledger-admin-field-ledger')} />
                </SelectTrigger>
                <SelectContent>
                  {ledgers.map(ledger => (
                    <SelectItem key={ledger.ledgerId} value={ledger.ledgerId}>
                      {ledger.name || ledger.ledgerId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {kind === 'transaction' && (
            <>
              <div className="gba:flex gba:flex-col gba:gap-1">
                <Label>{t('ledger-admin-field-source')}</Label>
                <Select value={source} onValueChange={handleSourceChange}>
                  <SelectTrigger data-testid="ledger-field-source">
                    <SelectValue placeholder={t('ledger-admin-field-source-placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EXTERNAL_REF}>{t('ledger-admin-external')}</SelectItem>
                    {accounts.map(account => (
                      <SelectItem key={account.id} value={account.balanceId}>
                        {accountOptionLabel(account, t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="gba:flex gba:flex-col gba:gap-1">
                <Label>{t('ledger-admin-field-destination')}</Label>
                <Select value={destination} onValueChange={setDestination}>
                  <SelectTrigger data-testid="ledger-field-destination">
                    <SelectValue placeholder={t('ledger-admin-field-destination-placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EXTERNAL_REF}>{t('ledger-admin-external')}</SelectItem>
                    {accounts.map(account => (
                      <SelectItem key={account.id} value={account.balanceId}>
                        {accountOptionLabel(account, t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="gba:flex gba:flex-col gba:gap-1">
                <Label htmlFor="txn-amount">{t('ledger-admin-field-amount')}</Label>
                <Input
                  id="txn-amount"
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  data-testid="ledger-field-amount"
                />
              </div>
            </>
          )}

          {(kind === 'account' || kind === 'transaction') && (
            <div className="gba:flex gba:flex-col gba:gap-1">
              <Label>{t('ledger-admin-field-currency')}</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger data-testid="ledger-field-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map(code => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {kind === 'transaction' && (
            <>
              <div className="gba:flex gba:flex-col gba:gap-1">
                <Label htmlFor="txn-reference">{t('ledger-admin-field-reference')}</Label>
                <Input
                  id="txn-reference"
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  data-testid="ledger-field-reference"
                />
              </div>
              <div className="gba:flex gba:flex-col gba:gap-1">
                <Label htmlFor="txn-description">{t('ledger-admin-field-description')}</Label>
                <Textarea
                  id="txn-description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  data-testid="ledger-field-description"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting} data-testid="ledger-dialog-cancel">
            {t('ledger-admin-action-cancel')}
          </Button>
          <Button onClick={submit} disabled={submitting} data-testid="ledger-dialog-submit">
            {t('ledger-admin-action-create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default LedgerCreateDialog

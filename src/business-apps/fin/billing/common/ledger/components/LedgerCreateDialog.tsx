import React, { useState } from 'react'
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
  SelectValue
} from '@newwork/nw-design-system'
import { toast } from 'sonner'
import type {
  CreateBalanceInput,
  CreateLedgerInput,
  CreateTransactionInput,
  Ledger,
  LedgerBalance
} from '../network/ledgerAdminClient'
import type { Invoice } from '../../invoices/types'
import { TransactionCreateForm } from './TransactionCreateForm'

export type LedgerDialogKind = 'ledger' | 'account' | 'transaction'
const FIELD_LABEL_CLASS = 'gba:text-sm gba:font-medium'

interface LedgerCreateDialogProps {
  kind: LedgerDialogKind | null
  ledgers: Ledger[]
  balances: LedgerBalance[]
  invoices: Invoice[]
  /** Pre-selected source account (balance id) when adjusting from an account. */
  initialSource?: string
  onClose: () => void
  onCreateLedger: (input: CreateLedgerInput) => Promise<unknown>
  onCreateAccount: (input: CreateBalanceInput) => Promise<unknown>
  onCreateTransaction: (input: CreateTransactionInput) => Promise<unknown>
  t: (key: string) => string
}

function dialogTitle(kind: LedgerDialogKind, t: (key: string) => string): string {
  if (kind === 'ledger') return t('ledger-admin-create-ledger')
  if (kind === 'account') return t('ledger-admin-create-account')
  return t('ledger-admin-create-transaction')
}

const LedgerCreateDialog: React.FC<LedgerCreateDialogProps> = ({
  kind,
  ledgers,
  balances,
  invoices,
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

  const reset = () => {
    setName('')
    setLedgerId('')
    setCurrency('EUR')
  }

  const handleClose = () => {
    reset()
    onClose()
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

  const title = dialogTitle(kind, t)

  return (
    <Dialog open={Boolean(kind)} onOpenChange={open => (open ? null : handleClose())}>
      <DialogContent className="gba:max-h-screen gba:overflow-y-auto" data-testid="ledger-create-dialog">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="gba:flex gba:flex-col gba:gap-4">
          {(kind === 'ledger' || kind === 'account') && (
            <div className="gba:flex gba:flex-col gba:gap-2">
              <Label className={FIELD_LABEL_CLASS} htmlFor="ledger-name">
                {t('ledger-admin-field-name')}
              </Label>
              <Input
                id="ledger-name"
                value={name}
                onChange={e => setName(e.target.value)}
                data-testid="ledger-field-name"
              />
            </div>
          )}

          {kind === 'account' && (
            <div className="gba:flex gba:flex-col gba:gap-2">
              <Label className={FIELD_LABEL_CLASS}>{t('ledger-admin-field-ledger')}</Label>
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
            <TransactionCreateForm
              balances={balances}
              invoices={invoices}
              initialSource={initialSource}
              onCancel={handleClose}
              onCreateTransaction={onCreateTransaction}
              onSuccess={handleClose}
              setSubmitting={setSubmitting}
              submitting={submitting}
              t={t}
            />
          )}
        </div>

        {kind !== 'transaction' && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={submitting} data-testid="ledger-dialog-cancel">
              {t('ledger-admin-action-cancel')}
            </Button>
            <Button onClick={submit} disabled={submitting} data-testid="ledger-dialog-submit">
              {t('ledger-admin-action-create')}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default LedgerCreateDialog

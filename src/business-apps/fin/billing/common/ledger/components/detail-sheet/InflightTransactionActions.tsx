import { useState } from 'react'
import { Button, Input } from '@newwork/nw-design-system'
import { toast } from 'sonner'
import type { LedgerTransaction, UpdateInflightTransactionInput } from '../../network/ledgerAdminClient'
import type { TranslateFn } from '../../utils/ledgerTransactionStatus'
import { SectionTitle } from './LedgerDetailPrimitives'

interface InflightTransactionActionsProps {
  onClose: () => void
  onUpdateInflight: (input: UpdateInflightTransactionInput) => Promise<LedgerTransaction | null>
  transaction: LedgerTransaction
  t: TranslateFn
}

function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) throw new Error('Amount must be a valid number')
  return parsed
}

export function InflightTransactionActions({
  onClose,
  onUpdateInflight,
  transaction,
  t
}: Readonly<InflightTransactionActionsProps>) {
  const [amount, setAmount] = useState('')
  const [preciseAmount, setPreciseAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const updateInflight = async (status: 'commit' | 'void') => {
    setSubmitting(true)
    try {
      await onUpdateInflight({
        transactionId: transaction.actionTargetTransactionId ?? transaction.transactionId,
        status,
        amount: parseOptionalNumber(amount),
        preciseAmount: parseOptionalNumber(preciseAmount)
      })
      toast.success(
        t(status === 'commit' ? 'ledger-admin-inflight-commit-success' : 'ledger-admin-inflight-void-success')
      )
      setAmount('')
      setPreciseAmount('')
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('ledger-admin-inflight-update-error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-3" data-testid="ledger-inflight-actions">
      <SectionTitle>{t('ledger-admin-inflight-actions')}</SectionTitle>
      <div className="gba:grid gba:grid-cols-2 gba:gap-3">
        <div className="gba:flex gba:flex-col gba:gap-1">
          <span className="gba:text-xs gba:text-muted-foreground">{t('ledger-admin-inflight-amount')}</span>
          <Input
            type="number"
            value={amount}
            onChange={event => setAmount(event.target.value)}
            data-testid="ledger-inflight-amount"
          />
        </div>
        <div className="gba:flex gba:flex-col gba:gap-1">
          <span className="gba:text-xs gba:text-muted-foreground">{t('ledger-admin-inflight-precise-amount')}</span>
          <Input
            type="number"
            value={preciseAmount}
            onChange={event => setPreciseAmount(event.target.value)}
            data-testid="ledger-inflight-precise-amount"
          />
        </div>
      </div>
      <p className="gba:text-xs gba:text-muted-foreground">{t('ledger-admin-inflight-empty-note')}</p>
      <div className="gba:flex gba:items-center gba:gap-2">
        <Button
          size="sm"
          onClick={() => void updateInflight('commit')}
          disabled={submitting}
          data-testid="ledger-inflight-commit"
        >
          {t('ledger-admin-inflight-commit')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void updateInflight('void')}
          disabled={submitting}
          data-testid="ledger-inflight-void"
        >
          {t('ledger-admin-inflight-void')}
        </Button>
      </div>
    </div>
  )
}

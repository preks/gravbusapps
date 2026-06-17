import { getTransactionStatusLabel } from '../../utils/billingLabels'
import type { LedgerTransaction } from '../network/ledgerAdminClient'

export type TranslateFn = (key: string) => string
export type LedgerTransactionBadgeVariant = 'success' | 'destructive' | 'info' | 'secondary' | 'outline'

export function transactionFamily(transaction: LedgerTransaction): LedgerTransaction[] {
  return transaction.groupedTransactions ?? [transaction, ...(transaction.childTransactions ?? [])]
}

export function displayTransactionStatus(transaction: LedgerTransaction, t: TranslateFn): string {
  return transaction.effectiveStatus ?? getTransactionStatusLabel(transaction.status, t)
}

export function transactionStatusBadgeVariant(
  transaction: LedgerTransaction,
  fallback: 'secondary' | 'outline' = 'secondary'
): LedgerTransactionBadgeVariant {
  const status = (transaction.effectiveStatus ?? transaction.status ?? '').toLowerCase()
  if (status === 'settled' || status === 'applied') return 'success'
  if (status === 'voided' || status === 'void') return 'destructive'
  if (status === 'in-flight' || status === 'inflight' || status === 'in_flight') return 'info'
  return fallback
}

export function hasTransactionAmountRollup(transaction: LedgerTransaction): boolean {
  return Boolean(
    (transaction.committedAmount && transaction.committedAmount > 0) ||
      (transaction.voidedAmount && transaction.voidedAmount > 0) ||
      (transaction.remainingInflightAmount && transaction.remainingInflightAmount > 0)
  )
}

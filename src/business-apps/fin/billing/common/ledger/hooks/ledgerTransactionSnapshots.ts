import type { LedgerTransaction } from '../network/ledgerAdminClient'

export function mergeTransactionSnapshot(
  transactions: LedgerTransaction[],
  transaction: LedgerTransaction | null
): LedgerTransaction[] {
  if (!transaction) return transactions
  const hasTransaction = transactions.some(item => item.transactionId === transaction.transactionId)
  if (!hasTransaction) return [transaction, ...transactions]
  return transactions.map(item =>
    item.transactionId === transaction.transactionId ? { ...item, ...transaction } : item
  )
}

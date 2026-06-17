import type { LedgerPostingRequest } from '../../queries/billingCoreApi'
import { createTransaction } from './ledgerTransactionClient'
import type { LedgerTransfer, PostLedgerResult } from './ledgerAdminTypes'

/** Map a GL posting account code to a stable, named ledger balance reference. */
export function ledgerBalanceRef(accountCode: string): string {
  return `nw-gl-${accountCode}`
}

/**
 * Decompose a balanced posting into source -> destination transfers.
 * Accounting debit accounts receive (destination); credit accounts give
 * (source). Amounts are matched greedily so the sum of transfers equals the
 * posting's gross movement.
 */
export function buildTransfers(request: LedgerPostingRequest): LedgerTransfer[] {
  const debits = request.entries
    .filter(entry => (entry.debit ?? 0) > 0)
    .map(entry => ({ accountCode: entry.accountCode, amount: entry.debit as number, description: entry.description }))
  const credits = request.entries
    .filter(entry => (entry.credit ?? 0) > 0)
    .map(entry => ({ accountCode: entry.accountCode, amount: entry.credit as number, description: entry.description }))

  const transfers: LedgerTransfer[] = []
  let debitIndex = 0
  let creditIndex = 0
  const epsilon = 1e-9

  while (debitIndex < debits.length && creditIndex < credits.length) {
    const debit = debits[debitIndex]
    const credit = credits[creditIndex]
    const amount = Math.min(debit.amount, credit.amount)
    if (amount > epsilon) {
      transfers.push({
        source: ledgerBalanceRef(credit.accountCode),
        destination: ledgerBalanceRef(debit.accountCode),
        amount: Number(amount.toFixed(6)),
        description: debit.description ?? credit.description
      })
    }
    debit.amount -= amount
    credit.amount -= amount
    if (debit.amount <= epsilon) debitIndex += 1
    if (credit.amount <= epsilon) creditIndex += 1
  }

  return transfers
}

/**
 * Post a balanced double-entry invoice posting to the real BLNK ledger via the
 * NEWWORK Connect lane. Returns the engine transaction ids; the first id (or
 * the eventId as a stable fallback) is used as the posting reference.
 */
export async function postLedgerTransaction(
  accessToken: string,
  request: LedgerPostingRequest
): Promise<PostLedgerResult> {
  const transfers = buildTransfers(request)
  const transactionIds: string[] = []

  for (let index = 0; index < transfers.length; index += 1) {
    const transfer = transfers[index]
    const transaction = await createTransaction(accessToken, {
      amount: transfer.amount,
      currency: request.currency,
      source: transfer.source,
      destination: transfer.destination,
      reference: `${request.eventId}#${index}`,
      description: transfer.description ? `${request.eventType}: ${transfer.description}` : request.eventType,
      skipQueue: true,
      metaData: {
        ...request.metaData,
        ledgerEventType: request.eventType,
        ledgerEventId: request.eventId,
        ledgerPostingReference: request.reference,
        ledgerTransferIndex: index
      }
    })
    if (transaction.transactionId) {
      transactionIds.push(transaction.transactionId)
    }
  }

  return {
    ledgerTransactionRef: transactionIds[0] ?? request.eventId,
    transactionIds,
    postedAt: new Date().toISOString()
  }
}

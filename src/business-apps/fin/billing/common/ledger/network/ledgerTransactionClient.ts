import { mapTransaction, requireTransactionRow, toLedgerAmount } from './ledgerAdminMappers'
import { LedgerTools, invokeLedgerAction as invoke } from './ledgerAdminTransport'
import type {
  CreateSplitTransactionInput,
  CreateTransactionInput,
  LedgerTransaction,
  RefundTransactionInput,
  ReimburseExpenseInput,
  UpdateInflightTransactionInput
} from './ledgerAdminTypes'

/**
 * List recent transactions. The MCP `blnk_list_transactions` tool defaults to
 * only 20 rows (newest-first), which hides most activity in Ledger Admin and
 * caps how many invoices the document store can reconstruct. We request a large
 * page so the admin view and invoice store see the full recent history.
 */
export async function listTransactions(accessToken: string, limit = 500): Promise<LedgerTransaction[]> {
  const result = await invoke(accessToken, LedgerTools.listTransactions, { limit })
  return result.rows.map(mapTransaction)
}

export async function createTransaction(
  accessToken: string,
  input: CreateTransactionInput
): Promise<LedgerTransaction> {
  const precision = input.precision ?? 100
  const hasSplitSources = Boolean(input.sources?.length)
  const hasSplitDestinations = Boolean(input.destinations?.length)
  const result = await invoke(accessToken, LedgerTools.createTransaction, {
    amount: toLedgerAmount(input.amount, precision, input.preciseAmount),
    precision,
    rate: input.rate,
    overdraft_limit: input.overdraftLimit,
    currency: input.currency,
    ...(hasSplitSources ? { sources: input.sources } : { source: input.source }),
    ...(hasSplitDestinations ? { destinations: input.destinations } : { destination: input.destination }),
    reference: input.reference,
    description: input.description,
    allow_overdraft: input.allowOverdraft,
    inflight: input.inflight,
    skip_queue: input.skipQueue ?? true,
    atomic: input.atomic,
    scheduled_for: input.scheduledFor,
    inflight_expiry_date: input.inflightExpiryDate,
    inflight_commit_date: input.inflightCommitDate,
    effective_date: input.effectiveDate,
    ...(input.metaData ? { meta_data: input.metaData } : {})
  })
  return mapTransaction(requireTransactionRow(result, LedgerTools.createTransaction))
}

export async function createSplitTransaction(
  accessToken: string,
  input: CreateSplitTransactionInput
): Promise<LedgerTransaction[]> {
  const result = await invoke(accessToken, LedgerTools.createTransaction, {
    amount: toLedgerAmount(input.amount, input.precision ?? 100, input.preciseAmount),
    precision: input.precision ?? 100,
    currency: input.currency,
    source: input.source,
    destinations: input.destinations,
    reference: input.reference,
    description: input.description,
    allow_overdraft: input.allowOverdraft,
    skip_queue: input.skipQueue ?? true,
    ...(input.metaData ? { meta_data: input.metaData } : {})
  })
  return result.rows.map(mapTransaction)
}

export async function updateInflightTransaction(
  accessToken: string,
  input: UpdateInflightTransactionInput
): Promise<LedgerTransaction | null> {
  const result = await invoke(accessToken, LedgerTools.updateInflightTransaction, {
    transaction_id: input.transactionId,
    status: input.status,
    amount: input.amount
  })
  return result.rows[0] ? mapTransaction(result.rows[0]) : null
}

export async function refundTransaction(
  accessToken: string,
  input: RefundTransactionInput
): Promise<LedgerTransaction | null> {
  if (!accessToken) {
    throw new Error('Ledger Admin requires a valid access token')
  }
  if (!input.transactionId) {
    throw new Error('Transaction id is required for refunds.')
  }
  throw new Error('Refund transactions are not supported by the limited MCP wrapper.')
}

export async function getTransaction(accessToken: string, transactionId: string): Promise<LedgerTransaction | null> {
  const transactions = await listTransactions(accessToken)
  return transactions.find(transaction => transaction.transactionId === transactionId) ?? null
}

export async function getTransactionByReference(
  accessToken: string,
  reference: string
): Promise<LedgerTransaction | null> {
  const transactions = await listTransactions(accessToken)
  return transactions.find(transaction => transaction.reference === reference) ?? null
}

export async function reimburseExpense(
  accessToken: string,
  input: ReimburseExpenseInput
): Promise<LedgerTransaction | null> {
  const transaction = await createTransaction(accessToken, {
    amount: input.amount,
    currency: input.currency,
    source: input.source,
    destination: input.destination,
    reference: input.reference,
    description: `Expense reimbursement ${input.expenseId}`,
    allowOverdraft: input.source.startsWith('@'),
    skipQueue: true,
    metaData: {
      ...input.metaData,
      expenseId: input.expenseId
    }
  })
  return transaction.transactionId ? transaction : null
}

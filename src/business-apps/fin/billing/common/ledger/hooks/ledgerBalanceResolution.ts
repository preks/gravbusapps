import { DEFAULT_LEDGER_ID, getBalance, type LedgerBalance, type LedgerTransaction } from '../network/ledgerAdminClient'
import {
  getAccountNameOverrides,
  getStoredLedgerBalances,
  upsertStoredLedgerBalance,
  type StoredLedgerBalance
} from '../utils/accountNameStore'
import { buildBalanceIndex, labelFromTransactionMeta } from '../utils/ledgerNames'

/** Merge local display-name overrides into freshly loaded balances. */
export function applyNameOverrides(balances: LedgerBalance[]): LedgerBalance[] {
  const overrides = getAccountNameOverrides()
  if (Object.keys(overrides).length === 0) return balances
  return balances.map(balance =>
    overrides[balance.balanceId] ? { ...balance, name: overrides[balance.balanceId] } : balance
  )
}

function isBalanceRef(ref: string | undefined): ref is string {
  return typeof ref === 'string' && /^bln[_-]/.test(ref)
}

function stringMetaValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && value ? value : fallback
}

function transactionBalanceRefs(transactions: LedgerTransaction[], balanceIndex: Map<string, LedgerBalance>): string[] {
  const refs = new Set<string>()
  for (const transaction of transactions) {
    if (
      isBalanceRef(transaction.source) &&
      !labelFromTransactionMeta(transaction, 'source') &&
      !balanceIndex.has(transaction.source)
    ) {
      refs.add(transaction.source)
    }
    if (
      isBalanceRef(transaction.destination) &&
      !labelFromTransactionMeta(transaction, 'destination') &&
      !balanceIndex.has(transaction.destination)
    ) {
      refs.add(transaction.destination)
    }
  }
  return Array.from(refs)
}

async function fetchTransactionBalances(
  accessToken: string,
  balances: LedgerBalance[],
  transactions: LedgerTransaction[]
): Promise<LedgerBalance[]> {
  const refs = transactionBalanceRefs(transactions, buildBalanceIndex(balances))
  if (refs.length === 0) return []

  const results = await Promise.allSettled(refs.map(ref => getBalance(accessToken, ref)))
  const hydratedBalances = results
    .map(result => (result.status === 'fulfilled' ? result.value : null))
    .filter((balance): balance is LedgerBalance => Boolean(balance?.balanceId))
  for (const balance of hydratedBalances) {
    upsertStoredLedgerBalance({
      balanceId: balance.balanceId,
      ledgerId: balance.ledgerId,
      label: balance.name || balance.indicator || balance.balanceId,
      currency: balance.currency || 'EUR',
      indicator: balance.indicator,
      type: stringMetaValue(balance.metaData?.account_type, 'hydrated')
    })
  }
  return hydratedBalances
}

export function mergeBalances(...balanceGroups: LedgerBalance[][]): LedgerBalance[] {
  const byBalanceId = new Map<string, LedgerBalance>()
  for (const balances of balanceGroups) {
    for (const balance of balances) {
      if (balance.balanceId) byBalanceId.set(balance.balanceId, balance)
    }
  }
  return Array.from(byBalanceId.values())
}

function storedBalanceToLedgerBalance(balance: StoredLedgerBalance): LedgerBalance {
  return {
    id: balance.balanceId,
    balanceId: balance.balanceId,
    ledgerId: balance.ledgerId ?? DEFAULT_LEDGER_ID,
    name: balance.label,
    currency: balance.currency,
    balance: 0,
    inflightBalance: 0,
    indicator: balance.indicator,
    metaData: {
      name: balance.label,
      account_type: balance.type
    }
  }
}

export function storedBalances(): LedgerBalance[] {
  return getStoredLedgerBalances().map(storedBalanceToLedgerBalance)
}

function transactionSideBalance(transaction: LedgerTransaction, side: 'source' | 'destination'): LedgerBalance | null {
  const balanceId = side === 'source' ? transaction.source : transaction.destination
  const label = labelFromTransactionMeta(transaction, side)
  if (!balanceId || !isBalanceRef(balanceId) || !label) return null

  const indicatorKey = side === 'source' ? 'source_indicator' : 'destination_indicator'
  const indicator = transaction.metaData?.[indicatorKey]

  return {
    id: balanceId,
    balanceId,
    ledgerId: DEFAULT_LEDGER_ID,
    name: label,
    currency: transaction.currency,
    balance: 0,
    inflightBalance: 0,
    indicator: typeof indicator === 'string' ? indicator : undefined,
    metaData: {
      name: label,
      label_source: 'transaction_meta'
    }
  }
}

function storeTransactionMetaBalance(balance: LedgerBalance) {
  upsertStoredLedgerBalance({
    balanceId: balance.balanceId,
    ledgerId: DEFAULT_LEDGER_ID,
    label: balance.name || balance.balanceId,
    currency: balance.currency || 'EUR',
    indicator: balance.indicator,
    type: 'transaction_meta'
  })
}

export function transactionMetaBalances(transactions: LedgerTransaction[]): LedgerBalance[] {
  const balances: LedgerBalance[] = []
  for (const transaction of transactions) {
    for (const side of ['source', 'destination'] as const) {
      const balance = transactionSideBalance(transaction, side)
      if (!balance) continue
      balances.push(balance)
      storeTransactionMetaBalance(balance)
    }
  }
  return balances
}

export async function resolveBalancesForTransactions(
  accessToken: string,
  balances: LedgerBalance[],
  transactions: LedgerTransaction[]
): Promise<LedgerBalance[]> {
  const transactionBalances = await fetchTransactionBalances(accessToken, balances, transactions)
  return applyNameOverrides(mergeBalances(balances, transactionBalances))
}

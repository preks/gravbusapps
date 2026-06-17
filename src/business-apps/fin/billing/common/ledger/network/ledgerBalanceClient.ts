import { extractAccounts, mapBalance, unwrapBalanceRow } from './ledgerAdminMappers'
import { DEFAULT_LEDGER_ID, LedgerTools, invokeLedgerAction as invoke } from './ledgerAdminTransport'
import type { CreateBalanceInput, CreateLedgerInput, Ledger, LedgerBalance } from './ledgerAdminTypes'

function assertLedgerAccessToken(accessToken: string): void {
  if (!accessToken) {
    throw new Error('Ledger Admin requires a valid access token')
  }
}

export async function checkLedgerHealth(accessToken: string): Promise<boolean> {
  try {
    await invoke(accessToken, LedgerTools.findAccount, { query: '', currency: 'EUR' })
    return true
  } catch {
    return false
  }
}

export async function listLedgers(accessToken: string): Promise<Ledger[]> {
  assertLedgerAccessToken(accessToken)
  return [{ id: DEFAULT_LEDGER_ID, ledgerId: DEFAULT_LEDGER_ID, name: 'General Ledger' }]
}

export async function createLedger(accessToken: string, input: CreateLedgerInput): Promise<Ledger> {
  assertLedgerAccessToken(accessToken)
  if (!input.name.trim()) {
    throw new Error('Ledger name is required.')
  }
  throw new Error('Ledger creation is not supported by the limited MCP wrapper. Create balances under General Ledger.')
}

export async function getLedger(accessToken: string, ledgerId: string): Promise<Ledger | null> {
  assertLedgerAccessToken(accessToken)
  return ledgerId === DEFAULT_LEDGER_ID ? { id: DEFAULT_LEDGER_ID, ledgerId, name: 'General Ledger' } : null
}

async function listLegacyAccounts(accessToken: string): Promise<LedgerBalance[]> {
  const result = await invoke(accessToken, LedgerTools.findAccount, { query: '', currency: 'EUR' })
  const accounts = extractAccounts(result)
  if (process.env.NODE_ENV === 'development') {
    console.info('[ledger] find account accounts', {
      rowCount: result.rows.length,
      accountCount: accounts.length,
      sampleAccounts: accounts.slice(0, 5).map(row => ({
        balanceId: row.balance_id ?? row.balanceId,
        name: row.name ?? (row.meta_data as Record<string, unknown> | undefined)?.name,
        indicator: row.indicator,
        keys: Object.keys(row)
      }))
    })
  }
  return accounts.map(mapBalance)
}

export async function listBalances(accessToken: string, limit = 1000, offset = 0): Promise<LedgerBalance[]> {
  const balances = await listLegacyAccounts(accessToken)
  return balances.slice(offset, offset + limit)
}

/** @deprecated Use listBalances for transaction-facing data. */
export const listAccounts = listBalances

export async function createBalance(accessToken: string, input: CreateBalanceInput): Promise<LedgerBalance> {
  if (process.env.NODE_ENV === 'development') {
    console.info('[ledger] create balance request', {
      ledgerId: input.ledgerId,
      currency: input.currency,
      name: input.name,
      metaData: input.metaData
    })
  }
  const result = await invoke(accessToken, LedgerTools.createBalance, {
    ledger_id: input.ledgerId,
    currency: input.currency,
    precision: 100,
    meta_data: { name: input.name, ...input.metaData }
  })
  const rawBalance = unwrapBalanceRow(result.rows[0])
  if (process.env.NODE_ENV === 'development') {
    console.info('[ledger] create balance response', {
      balanceId: rawBalance.balance_id ?? rawBalance.balanceId,
      name: (rawBalance.meta_data as Record<string, unknown> | undefined)?.name,
      indicator: rawBalance.indicator,
      keys: Object.keys(rawBalance)
    })
  }
  return mapBalance(rawBalance)
}

/** @deprecated Use createBalance. */
export const createAccount = createBalance

export async function getBalance(accessToken: string, balanceId: string): Promise<LedgerBalance | null> {
  const result = await invoke(accessToken, LedgerTools.getBalance, { account: balanceId, with_queued: false })
  const rawBalance = result.rows[0] ? unwrapBalanceRow(result.rows[0]) : null
  if (process.env.NODE_ENV === 'development') {
    console.info('[ledger] get balance response', {
      requestedBalanceId: balanceId,
      found: Boolean(rawBalance),
      balanceId: rawBalance?.balance_id ?? rawBalance?.balanceId,
      name: (rawBalance?.meta_data as Record<string, unknown> | undefined)?.name,
      indicator: rawBalance?.indicator,
      keys: rawBalance ? Object.keys(rawBalance) : []
    })
  }
  return rawBalance ? mapBalance(rawBalance) : null
}

export async function getBalanceAtTime(
  accessToken: string,
  balanceId: string,
  timestamp: string
): Promise<LedgerBalance | null> {
  assertLedgerAccessToken(accessToken)
  if (!balanceId || !timestamp) {
    throw new Error('Balance id and timestamp are required for historical balance lookup.')
  }
  throw new Error('Historical balance lookup is not supported by the limited MCP wrapper.')
}

/**
 * Ledger Admin client.
 *
 * Reaches the real ledger backend through NEWWORK Connect's connector framework
 * (the "BLNK Ledger" external connection, lane = mcp_servers). The browser calls
 * the prompt-manager connector API with the user's bearer token; the connector's
 * own credentials stay server-side.
 *
 * Transport: POST {promptManager}/external-connections/{connectionId}/invoke
 *   body: { action: "<tool>", arguments: {...} }
 *   resp: { success, result: { rows, fields, totalEstimate } }
 *
 * The connection id is environment-specific; we resolve it from
 * NEXT_PUBLIC_LEDGER_CONNECTION_ID, otherwise auto-discover the active BLNK /
 * ledger MCP connection from the connector list.
 */
import { env } from '@/common/env/EnvUtils'
import { PROMPT_MANAGER_API_URL } from '@/common/utils/serviceResolver'
import type { LedgerPostingRequest } from '../queries/billingCoreApi'

/** A ledger: a container/grouping for accounts (balances). */
export interface Ledger {
  /** Stable row id (mirrors ledgerId) required by the data table. */
  id: string
  ledgerId: string
  name: string
  metaData?: Record<string, unknown>
  createdAt?: string
}

/** An account (balance) inside a ledger, in a single currency. Amounts are major units. */
export interface LedgerAccount {
  /** Stable row id (mirrors balanceId) required by the data table. */
  id: string
  balanceId: string
  ledgerId: string
  name: string
  currency: string
  balance: number
  inflightBalance: number
  /** Engine-side human reference (e.g. an account number or GL ref) when set. */
  indicator?: string
  metaData?: Record<string, unknown>
  createdAt?: string
}

/** A posted ledger transaction (double-entry money movement). Amount in major units. */
export interface LedgerTransaction {
  /** Stable row id (mirrors transactionId) required by the data table. */
  id: string
  transactionId: string
  reference?: string
  amount: number
  currency: string
  source?: string
  destination?: string
  description?: string
  status?: string
  /** Free-form engine metadata; used to carry NEWWORK billing document snapshots. */
  metaData?: Record<string, unknown>
  createdAt?: string
}

export interface CreateLedgerInput {
  name: string
  metaData?: Record<string, unknown>
}

export interface CreateAccountInput {
  ledgerId: string
  currency: string
  name: string
  metaData?: Record<string, unknown>
}

export interface CreateTransactionInput {
  /** Major units (e.g. 100.50); the connector converts to the engine's precision. */
  amount: number
  currency: string
  /** Account name/email or balance id, or '@World' to mint/burn external funds. */
  source: string
  destination: string
  reference?: string
  description?: string
  /** Settle immediately (recommended for interactive use). */
  skipQueue?: boolean
  /** Free-form metadata stored on the transaction. */
  metaData?: Record<string, unknown>
}

/** MCP tool names exposed by the BLNK Ledger connection. */
const LedgerTools = {
  health: 'blnk_health',
  listLedgers: 'blnk_list_ledgers',
  createLedger: 'blnk_create_ledger',
  findAccount: 'blnk_find_account',
  createBalance: 'blnk_create_balance',
  listTransactions: 'blnk_list_transactions',
  createTransaction: 'blnk_create_transaction'
} as const

const CONNECTOR_BASE = `${PROMPT_MANAGER_API_URL}/external-connections`

/** The Ledger Admin lane is available whenever the prompt-manager base resolves. */
export const ledgerAdminEnabled = (): boolean => Boolean(PROMPT_MANAGER_API_URL)

interface InvokeResult {
  rows: Array<Record<string, unknown>>
  fields?: Array<{ name: string }>
  totalEstimate?: number
}

interface ConnectionSummary {
  connection_id: string
  name?: string
  kind?: string
  url?: string
  active?: boolean
}

let cachedConnectionId: string | null = null

async function connectorGet<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`${CONNECTOR_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  if (!response.ok) throw new Error(`NEWWORK Connect request failed: ${response.status} ${path}`)
  return (await response.json()) as T
}

/** Resolve the BLNK ledger connection id (env override, else auto-discover). */
async function resolveConnectionId(accessToken: string): Promise<string> {
  const override = env('NEXT_PUBLIC_LEDGER_CONNECTION_ID')
  if (override) return override
  if (cachedConnectionId) return cachedConnectionId

  const json = await connectorGet<{ data?: ConnectionSummary[] } | ConnectionSummary[]>('/', accessToken)
  const list = Array.isArray(json) ? json : (json.data ?? [])
  const match =
    list.find(c => c.active && /blnk|ledger/i.test(`${c.name ?? ''} ${c.url ?? ''}`)) ??
    list.find(c => /blnk|ledger/i.test(`${c.name ?? ''} ${c.url ?? ''}`))
  if (!match) throw new Error('No active BLNK ledger connection found in NEWWORK Connect')
  cachedConnectionId = match.connection_id
  return cachedConnectionId
}

/** Invoke an MCP tool on the BLNK ledger connection and return its normalized result. */
async function invoke(accessToken: string, action: string, args: Record<string, unknown> = {}): Promise<InvokeResult> {
  const connectionId = await resolveConnectionId(accessToken)
  const response = await fetch(`${CONNECTOR_BASE}/${connectionId}/invoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ action, arguments: args })
  })
  const text = await response.text()
  const json = text ? JSON.parse(text) : {}
  if (!response.ok || json?.success === false) {
    const detail = json?.detail ?? json?.message ?? `${response.status}`
    throw new Error(`Ledger action "${action}" failed: ${detail}`)
  }
  const result = json?.result ?? {}
  return {
    rows: Array.isArray(result.rows) ? result.rows : [],
    fields: result.fields,
    totalEstimate: result.totalEstimate
  }
}

// ---------------------------------------------------------------------------
// Mappers: engine snake_case -> NEWWORK domain camelCase.
//
// Units are NOT uniform across the engine:
//   - Balance fields (balance, inflight_balance, credit/debit) are stored in
//     MINOR units (cents), so divide by 100 to get major units.
//   - Transaction `amount` is already in MAJOR units (e.g. 1 == EUR 1.00); the
//     minor-unit value lives in `precise_amount`. Never divide `amount` again.
// ---------------------------------------------------------------------------

function toMajorUnits(minor: unknown): number {
  const value = Number(minor ?? 0)
  return Number.isFinite(value) ? value / 100 : 0
}

// Transaction amounts come back in major units. Fall back to precise_amount /
// precision only when the major value is absent, so unusual precisions still map.
export function transactionAmount(raw: Record<string, unknown>): number {
  const major = Number(raw.amount)
  if (Number.isFinite(major) && raw.amount != null) {
    return major
  }
  const precise = Number(raw.precise_amount ?? raw.preciseAmount ?? 0)
  const precision = Number(raw.precision ?? 0) || 100
  return Number.isFinite(precise) ? precise / precision : 0
}

function metaName(metaData: Record<string, unknown> | undefined, fallback: string): string {
  const name =
    metaData?.name ??
    metaData?.account_name ??
    metaData?.display_name ??
    metaData?.account ??
    metaData?.email ??
    metaData?.customer_id
  return typeof name === 'string' && name.length > 0 ? name : fallback
}

function mapLedger(raw: Record<string, unknown>): Ledger {
  const ledgerId = String(raw.ledger_id ?? raw.ledgerId ?? '')
  return {
    id: ledgerId,
    ledgerId,
    name: String(raw.name ?? ''),
    metaData: (raw.meta_data ?? raw.metaData) as Record<string, unknown> | undefined,
    createdAt: (raw.created_at ?? raw.createdAt) as string | undefined
  }
}

function mapAccount(raw: Record<string, unknown>): LedgerAccount {
  const metaData = (raw.meta_data ?? raw.metaData) as Record<string, unknown> | undefined
  const balanceId = String(raw.balance_id ?? raw.balanceId ?? '')
  const indicator = (raw.indicator ?? undefined) as string | undefined
  return {
    id: balanceId,
    balanceId,
    ledgerId: String(raw.ledger_id ?? raw.ledgerId ?? ''),
    name: metaName(metaData, ''),
    currency: String(raw.currency ?? ''),
    balance: toMajorUnits(raw.balance),
    inflightBalance: toMajorUnits(raw.inflight_balance ?? raw.inflightBalance),
    indicator: indicator && indicator.length > 0 ? indicator : undefined,
    metaData,
    createdAt: (raw.created_at ?? raw.createdAt) as string | undefined
  }
}

function mapTransaction(raw: Record<string, unknown>): LedgerTransaction {
  const transactionId = String(raw.transaction_id ?? raw.transactionId ?? raw.id ?? '')
  return {
    id: transactionId,
    transactionId,
    reference: (raw.reference ?? undefined) as string | undefined,
    amount: transactionAmount(raw),
    currency: String(raw.currency ?? ''),
    source: (raw.source ?? undefined) as string | undefined,
    destination: (raw.destination ?? undefined) as string | undefined,
    description: (raw.description ?? undefined) as string | undefined,
    status: (raw.status ?? undefined) as string | undefined,
    metaData: (raw.meta_data ?? raw.metaData) as Record<string, unknown> | undefined,
    createdAt: (raw.created_at ?? raw.createdAt) as string | undefined
  }
}

/** blnk_find_account returns a single row { count, accounts: [...] }. */
function extractAccounts(result: InvokeResult): Array<Record<string, unknown>> {
  const rowWithAccounts = result.rows.find(row => Array.isArray((row as { accounts?: unknown }).accounts))
  if (rowWithAccounts) {
    return (rowWithAccounts as { accounts: Array<Record<string, unknown>> }).accounts
  }
  // Fallback: the engine already returned account rows directly.
  return result.rows
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Invoke an arbitrary tool on the shared BLNK connection and return its rows.
 * Used by sibling clients (e.g. the invoice client) that target the same
 * connector lane without duplicating connection resolution/transport.
 */
export async function invokeLedgerTool(
  accessToken: string,
  action: string,
  args: Record<string, unknown> = {}
): Promise<Array<Record<string, unknown>>> {
  const result = await invoke(accessToken, action, args)
  return result.rows
}

export async function checkLedgerHealth(accessToken: string): Promise<boolean> {
  try {
    await invoke(accessToken, LedgerTools.health)
    return true
  } catch {
    return false
  }
}

export async function listLedgers(accessToken: string): Promise<Ledger[]> {
  const result = await invoke(accessToken, LedgerTools.listLedgers)
  return result.rows.map(mapLedger)
}

export async function createLedger(accessToken: string, input: CreateLedgerInput): Promise<Ledger> {
  const result = await invoke(accessToken, LedgerTools.createLedger, {
    name: input.name,
    meta_data: input.metaData ?? {}
  })
  return mapLedger(result.rows[0] ?? {})
}

export async function listAccounts(accessToken: string): Promise<LedgerAccount[]> {
  const result = await invoke(accessToken, LedgerTools.findAccount, {})
  return extractAccounts(result).map(mapAccount)
}

export async function createAccount(accessToken: string, input: CreateAccountInput): Promise<LedgerAccount> {
  const result = await invoke(accessToken, LedgerTools.createBalance, {
    ledger_id: input.ledgerId,
    currency: input.currency,
    meta_data: { name: input.name, ...(input.metaData ?? {}) }
  })
  return mapAccount(result.rows[0] ?? {})
}

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
  const result = await invoke(accessToken, LedgerTools.createTransaction, {
    amount: input.amount,
    currency: input.currency,
    source: input.source,
    destination: input.destination,
    reference: input.reference,
    description: input.description,
    skip_queue: input.skipQueue ?? true,
    ...(input.metaData ? { meta_data: input.metaData } : {})
  })
  return mapTransaction(result.rows[0] ?? {})
}

// ---------------------------------------------------------------------------
// Invoice lifecycle -> real BLNK transactions
//
// The Billing module produces balanced double-entry postings
// (LedgerPostingRequest). BLNK models money movement as single source ->
// destination transfers, so we decompose each posting into one transfer per
// matched debit/credit amount. GL account codes are mapped to stable, named
// ledger balances (`nw-gl-<code>`) so the same accounts accumulate over time
// and show up in Ledger Admin. Each transfer carries a deterministic reference
// (`<eventId>#<index>`) so retries are idempotent and never double-post.
// ---------------------------------------------------------------------------

export interface LedgerTransfer {
  source: string
  destination: string
  amount: number
  description?: string
}

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

export interface PostLedgerResult {
  ledgerTransactionRef: string
  transactionIds: string[]
  postedAt: string
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
      skipQueue: true
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

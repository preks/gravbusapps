import type { LedgerBalance, LedgerTransaction } from './ledgerAdminTypes'
import type { InvokeResult } from './ledgerAdminTransport'

// Units are NOT uniform across the engine:
// - Balance fields are stored in minor units, so divide by 100.
// - Transaction `amount` is precision-based in MCP rows; use `precision`.
function toMajorUnits(minor: unknown): number {
  const value = Number(minor ?? 0)
  return Number.isFinite(value) ? value / 100 : 0
}

function stringValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

export function transactionAmount(raw: Record<string, unknown>): number {
  if (raw.amount !== undefined) {
    const amount = Number(raw.amount)
    return Number.isFinite(amount) ? amount : 0
  }

  const precise = Number(raw.precise_amount ?? raw.preciseAmount ?? 0)
  const precision = Number(raw.precision ?? 0) || 100
  return Number.isFinite(precise) ? precise / precision : 0
}

export function toLedgerAmount(amount: number, precision = 100, preciseAmount?: number | null): number {
  if (typeof preciseAmount === 'number' && Number.isFinite(preciseAmount)) return preciseAmount
  return Math.round(amount * precision)
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

export function mapBalance(raw: Record<string, unknown>): LedgerBalance {
  const metaData = (raw.meta_data ?? raw.metaData) as Record<string, unknown> | undefined
  const balanceId = stringValue(raw.balance_id ?? raw.balanceId)
  const indicator = (raw.indicator ?? undefined) as string | undefined
  return {
    id: balanceId,
    balanceId,
    ledgerId: stringValue(raw.ledger_id ?? raw.ledgerId),
    name: metaName(metaData, ''),
    currency: stringValue(raw.currency),
    balance: toMajorUnits(raw.balance),
    inflightBalance: toMajorUnits(raw.inflight_balance ?? raw.inflightBalance),
    indicator: indicator && indicator.length > 0 ? indicator : undefined,
    metaData,
    createdAt: (raw.created_at ?? raw.createdAt) as string | undefined
  }
}

export function unwrapBalanceRow(raw: Record<string, unknown> | undefined): Record<string, unknown> {
  const nested = raw?.balance
  return nested && typeof nested === 'object' ? (nested as Record<string, unknown>) : (raw ?? {})
}

function transactionIdFromValue(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value
  if (!value || typeof value !== 'object') return undefined

  const record = value as Record<string, unknown>
  const transactionId = record.transaction_id ?? record.transactionId ?? record.id
  return typeof transactionId === 'string' && transactionId.length > 0 ? transactionId : undefined
}

export function mapTransaction(raw: Record<string, unknown>): LedgerTransaction {
  const transactionId = stringValue(raw.transaction_id ?? raw.transactionId ?? raw.id)
  const parentTransaction = transactionIdFromValue(
    raw.parent_transaction ??
      raw.parentTransaction ??
      raw.parent_transaction_id ??
      raw.parentTransactionId ??
      raw.parent_id ??
      raw.parentId ??
      raw.parent
  )
  return {
    id: transactionId,
    transactionId,
    reference: (raw.reference ?? undefined) as string | undefined,
    amount: transactionAmount(raw),
    currency: stringValue(raw.currency),
    source: (raw.source ?? undefined) as string | undefined,
    destination: (raw.destination ?? undefined) as string | undefined,
    description: (raw.description ?? undefined) as string | undefined,
    status: (raw.status ?? undefined) as string | undefined,
    parentTransaction,
    metaData: (raw.meta_data ?? raw.metaData) as Record<string, unknown> | undefined,
    createdAt: (raw.created_at ?? raw.createdAt) as string | undefined
  }
}

export function requireTransactionRow(result: InvokeResult, action: string): Record<string, unknown> {
  const row = result.rows[0]
  const transactionId = row?.transaction_id ?? row?.transactionId ?? row?.id
  if (!row || !transactionId) {
    throw new Error(`Ledger action "${action}" failed: response did not include a transaction id`)
  }
  return row
}

/** Some list tools return a single wrapper row with the actual collection nested inside. */
function extractCollection(result: InvokeResult, key: string): Array<Record<string, unknown>> {
  const rowWithCollection = result.rows.find(row => Array.isArray(row[key]))
  if (rowWithCollection) {
    return rowWithCollection[key] as Array<Record<string, unknown>>
  }
  return result.rows
}

/** blnk_find_account returns a single row { count, accounts: [...] }. */
export function extractAccounts(result: InvokeResult): Array<Record<string, unknown>> {
  return extractCollection(result, 'accounts')
}

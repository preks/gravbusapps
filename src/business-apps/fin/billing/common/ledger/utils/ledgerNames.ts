/**
 * Friendly-name resolution for Ledger Admin.
 *
 * The ledger backend identifies balances by opaque balance ids (e.g. `bln_...`)
 * and the invoice posting lane references stable GL balances (`nw-gl-<code>`).
 * These helpers turn those technical references into human-readable names so the
 * UI can "always use names" wherever a name is known.
 */
import type { LedgerBalance, LedgerTransaction } from '../network/ledgerAdminClient'

type TranslateFn = (key: string) => string

/** GL posting account code -> i18n key for a friendly name. */
const GL_ACCOUNT_NAME_KEYS: Record<string, string> = {
  '1400': 'billing-settings-account-ar',
  '8000': 'billing-settings-account-revenue',
  '3806': 'billing-settings-account-tax',
  '1800': 'billing-settings-account-cash',
  '6999': 'billing-settings-account-rounding',
  '6960': 'billing-settings-account-fx',
  '6920': 'billing-settings-account-bad-debt'
}

const GL_PREFIX = 'nw-gl-'

/** True when the ref represents external (mint/burn) funds rather than an account. */
export function isExternalRef(ref?: string | null): boolean {
  if (!ref) return false
  return ref.toLowerCase() === '@world' || ref.toLowerCase() === 'world'
}

/** Index balances by balance id, row id, and indicator for quick name lookups. */
export function buildBalanceIndex(balances: LedgerBalance[]): Map<string, LedgerBalance> {
  const index = new Map<string, LedgerBalance>()
  for (const balance of balances) {
    if (balance.balanceId) index.set(balance.balanceId, balance)
    if (balance.id) index.set(balance.id, balance)
    if (balance.indicator) index.set(balance.indicator, balance)
  }
  return index
}

/** @deprecated Use buildBalanceIndex. */
export const buildAccountIndex = buildBalanceIndex

/** A GL balance ref has a known, named posting account behind it. */
function glName(ref: string, t?: TranslateFn): string | null {
  if (!ref.startsWith(GL_PREFIX)) return null
  const code = ref.slice(GL_PREFIX.length)
  const key = GL_ACCOUNT_NAME_KEYS[code]
  const name = key && t ? t(key) : undefined
  return name ? `${name} (${code})` : `GL ${code}`
}

/** True when the balance carries a human-friendly name (not just its id). */
export function hasFriendlyName(balance: LedgerBalance): boolean {
  return Boolean(balance.name) && balance.name !== balance.balanceId && balance.name !== balance.id
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

/** Label from raw balance data, with metadata and indicators before ids. */
export function labelFromBalance(balance?: LedgerBalance | null): string | null {
  if (!balance) return null
  return (
    (hasFriendlyName(balance) ? balance.name : null) ??
    stringValue(balance.metaData?.name) ??
    stringValue(balance.metaData?.account) ??
    stringValue(balance.metaData?.customer_id) ??
    stringValue(balance.indicator) ??
    stringValue(balance.balanceId)
  )
}

/** Label explicitly persisted on a transaction side when it was created. */
export function labelFromTransactionMeta(
  transaction: LedgerTransaction,
  side: 'source' | 'destination'
): string | null {
  const meta = transaction.metaData ?? {}
  if (side === 'source') {
    return stringValue(meta.source_label) ?? stringValue(meta.source_indicator)
  }
  return stringValue(meta.destination_label) ?? stringValue(meta.destination_indicator)
}

/** Resolve an engine indicator to a display name (GL ref or plain reference). */
function indicatorName(indicator: string | undefined, t?: TranslateFn): string | null {
  if (!indicator) return null
  if (isExternalRef(indicator)) return t ? t('ledger-admin-external') : 'External (@World)'
  const gl = glName(indicator, t)
  if (gl) return gl
  // A plain, non-id indicator (e.g. an account number) is a useful name.
  return indicator
}

/** Display name for a balance using metadata, GL refs, indicators, then balance id. */
export function balanceLabel(balance: LedgerBalance, t?: TranslateFn): string {
  if (hasFriendlyName(balance)) return balance.name
  const metaLabel =
    stringValue(balance.metaData?.name) ??
    stringValue(balance.metaData?.account) ??
    stringValue(balance.metaData?.customer_id)
  if (metaLabel) return metaLabel
  const gl = glName(balance.balanceId, t)
  if (gl) return gl
  const fromIndicator = indicatorName(balance.indicator, t)
  if (fromIndicator) return fromIndicator
  return balance.balanceId
}

/** @deprecated Use balanceLabel. */
export const displayAccountName = balanceLabel

/** A short, human-scannable suffix of a balance id for disambiguation. */
export function shortRef(id: string): string {
  if (!id) return ''
  const tail = id.length > 6 ? id.slice(-6) : id
  return `…${tail}`
}

/**
 * Label for balance pickers/lists: the resolved label plus currency.
 */
export function balanceOptionLabel(balance: LedgerBalance, t?: TranslateFn): string {
  const label = balanceLabel(balance, t)
  return balance.currency ? `${label} · ${balance.currency}` : label
}

/** @deprecated Use balanceOptionLabel. */
export const accountOptionLabel = balanceOptionLabel

/** Resolve a transaction source/destination balance ref to a friendly name. */
export function resolveBalanceRefName(
  ref: string | undefined,
  index?: Map<string, LedgerBalance>,
  t?: TranslateFn
): string {
  if (!ref) return '—'
  if (isExternalRef(ref)) return t ? t('ledger-admin-external') : 'External (@World)'
  const balance = index?.get(ref)
  if (balance) return balanceLabel(balance, t)
  const gl = glName(ref, t)
  if (gl) return gl
  return ref
}

/** Resolve a transaction side label from transaction metadata, cache, indicator, then raw id. */
export function resolveTransactionPartyName(
  transaction: LedgerTransaction,
  side: 'source' | 'destination',
  index?: Map<string, LedgerBalance>,
  t?: TranslateFn
): string {
  const metaLabel = labelFromTransactionMeta(transaction, side)
  if (metaLabel) return metaLabel

  const ref = side === 'source' ? transaction.source : transaction.destination
  if (!ref) return 'Unknown balance'
  if (ref.startsWith('@')) return ref

  const balance = index?.get(ref)
  const balanceName = balance ? balanceLabel(balance, t) : null
  return balanceName || resolveBalanceRefName(ref, index, t)
}

/** @deprecated Use resolveBalanceRefName. */
export const resolveRefName = resolveBalanceRefName

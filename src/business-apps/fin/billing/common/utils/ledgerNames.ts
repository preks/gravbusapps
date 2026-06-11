/**
 * Friendly-name resolution for Ledger Admin.
 *
 * The ledger backend identifies accounts by opaque balance ids (e.g. `bln_...`)
 * and the invoice posting lane references stable GL balances (`nw-gl-<code>`).
 * These helpers turn those technical references into human-readable names so the
 * UI can "always use names" wherever a name is known.
 */
import type { LedgerAccount } from '../network/ledgerAdminClient'

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
  if (!ref) return true
  return ref.toLowerCase() === '@world' || ref.toLowerCase() === 'world'
}

/** Index accounts by balance id and row id for quick name lookups. */
export function buildAccountIndex(accounts: LedgerAccount[]): Map<string, LedgerAccount> {
  const index = new Map<string, LedgerAccount>()
  for (const account of accounts) {
    if (account.balanceId) index.set(account.balanceId, account)
    if (account.id) index.set(account.id, account)
  }
  return index
}

/** A GL balance ref has a known, named posting account behind it. */
function glName(ref: string, t?: TranslateFn): string | null {
  if (!ref.startsWith(GL_PREFIX)) return null
  const code = ref.slice(GL_PREFIX.length)
  const key = GL_ACCOUNT_NAME_KEYS[code]
  const name = key && t ? t(key) : undefined
  return name ? `${name} (${code})` : `GL ${code}`
}

/** True when the account carries a human-friendly name (not just its id). */
export function hasFriendlyName(account: LedgerAccount): boolean {
  return Boolean(account.name) && account.name !== account.balanceId && account.name !== account.id
}

/** Resolve an engine indicator to a display name (GL ref or plain reference). */
function indicatorName(indicator: string | undefined, t?: TranslateFn): string | null {
  if (!indicator) return null
  const gl = glName(indicator, t)
  if (gl) return gl
  // A plain, non-id indicator (e.g. an account number) is a useful name.
  return indicator
}

/** Display name for an account, resolving GL refs / indicators and avoiding raw ids. */
export function displayAccountName(account: LedgerAccount, t?: TranslateFn): string {
  if (hasFriendlyName(account)) return account.name
  const gl = glName(account.balanceId, t)
  if (gl) return gl
  const fromIndicator = indicatorName(account.indicator, t)
  if (fromIndicator) return fromIndicator
  return t ? t('ledger-admin-unnamed-account') : 'Unnamed account'
}

/** A short, human-scannable suffix of a balance id for disambiguation. */
export function shortRef(id: string): string {
  if (!id) return ''
  const tail = id.length > 6 ? id.slice(-6) : id
  return `…${tail}`
}

/**
 * Label for account pickers/lists: the resolved name plus currency, with a short
 * id suffix when the account has no real name so duplicates stay distinguishable.
 */
export function accountOptionLabel(account: LedgerAccount, t?: TranslateFn): string {
  const name = displayAccountName(account, t)
  const unnamed = (t ? t('ledger-admin-unnamed-account') : 'Unnamed account') === name
  const base = unnamed ? `${name} ${shortRef(account.balanceId)}` : name
  return account.currency ? `${base} · ${account.currency}` : base
}

/** Resolve a transaction source/destination ref to a friendly name. */
export function resolveRefName(ref: string | undefined, index?: Map<string, LedgerAccount>, t?: TranslateFn): string {
  if (isExternalRef(ref)) return t ? t('ledger-admin-external') : 'External (@World)'
  const value = ref as string
  const account = index?.get(value)
  if (account) return displayAccountName(account, t)
  const gl = glName(value, t)
  if (gl) return gl
  return value
}

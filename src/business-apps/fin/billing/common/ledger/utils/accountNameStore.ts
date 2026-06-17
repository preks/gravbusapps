/**
 * Local display-name overrides for ledger accounts.
 *
 * The BLNK ledger is append-only and exposes no balance-update operation, so an
 * existing balance cannot be renamed on the backend. To still let users give
 * accounts meaningful names on dev/preview, we persist a NEWWORK-owned override
 * map (balanceId -> display name) in localStorage and merge it into the account
 * data. When a real Billing Core backend is available these overrides can be
 * promoted to a shared store.
 */
const STORAGE_KEY = 'nw-billing-ledger-account-names'
const BALANCE_STORAGE_KEY = 'nw-billing-ledger-local-balances'

export interface StoredLedgerBalance {
  balanceId: string
  ledgerId?: string
  label: string
  currency: string
  indicator?: string
  type?: string
}

function readMap(): Record<string, string> {
  const storage = globalThis.window?.localStorage
  if (storage === undefined) return {}
  try {
    const raw = storage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {}
  } catch {
    return {}
  }
}

function writeMap(map: Record<string, string>): void {
  const storage = globalThis.window?.localStorage
  if (storage === undefined) return
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // Ignore quota / serialization errors: overrides are a non-critical nicety.
  }
}

/** All current display-name overrides keyed by balance id. */
export function getAccountNameOverrides(): Record<string, string> {
  return readMap()
}

/** Set (or clear, when blank) the display name for a balance id. */
export function setAccountNameOverride(balanceId: string, name: string): void {
  if (!balanceId) return
  const map = readMap()
  const trimmed = name.trim()
  if (trimmed) {
    map[balanceId] = trimmed
  } else {
    delete map[balanceId]
  }
  writeMap(map)
}

function readBalances(): StoredLedgerBalance[] {
  const storage = globalThis.window?.localStorage
  if (storage === undefined) return []
  try {
    const raw = storage.getItem(BALANCE_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is StoredLedgerBalance => {
      return Boolean(item?.balanceId && item?.label && item?.currency)
    })
  } catch {
    return []
  }
}

function writeBalances(balances: StoredLedgerBalance[]): void {
  const storage = globalThis.window?.localStorage
  if (storage === undefined) return
  try {
    storage.setItem(BALANCE_STORAGE_KEY, JSON.stringify(balances))
  } catch {
    // Ignore quota / serialization errors: MCP can still resolve known ids later.
  }
}

export function getStoredLedgerBalances(): StoredLedgerBalance[] {
  return readBalances()
}

export function upsertStoredLedgerBalance(balance: StoredLedgerBalance): void {
  if (!balance.balanceId) return
  const balances = readBalances()
  const next = balances.filter(item => item.balanceId !== balance.balanceId)
  next.unshift(balance)
  writeBalances(next)
}

/**
 * When `localStorage` contains this key set to `'1'`, Univer workbook snapshot cache
 * reads and writes are skipped (bootstrap goes remote/rows-only; checkpoints do not persist to cache).
 * Independent of spreadsheet debug logging flags.
 *
 * Console: `localStorage.setItem('spreadsheet:disable-univer-workbook-cache', '1')` then reload.
 * Re-enable: `localStorage.removeItem('spreadsheet:disable-univer-workbook-cache')`.
 */
export const SPREADSHEET_DISABLE_UNIVER_WORKBOOK_CACHE_KEY = 'spreadsheet:disable-univer-workbook-cache'

const SNAPSHOT_KEY_PREFIX = 'spreadsheet:univer:workbook-snapshot:v2'
const INDEX_KEY_PREFIX = 'spreadsheet:univer:workbook-index:v2'
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 * 7
const DEFAULT_MAX_ENTRIES_PER_APP = 2
const DEFAULT_MAX_SNAPSHOT_BYTES = 4_500_000

interface SnapshotIndexEntry {
  version: number
  key: string
  savedAt: number
  expiresAt: number
  sizeBytes: number
}

interface SnapshotAppIndex {
  latestVersion: number
  entries: SnapshotIndexEntry[]
}

export interface SnapshotCacheReadResult {
  snapshot: Record<string, unknown>
  version: number
  savedAt: number
  source: 'localStorage'
}

export interface SnapshotCacheWriteResult {
  stored: boolean
  reason?:
    | 'storage_unavailable'
    | 'invalid_payload'
    | 'payload_too_large'
    | 'quota_exceeded'
    | 'unknown_error'
    | 'cache_disabled'
  sizeBytes: number
  evictedKeys: number
}

function getSnapshotKey(appId: string, version: number): string {
  return `${SNAPSHOT_KEY_PREFIX}:${appId}:v${version}`
}

function getIndexKey(appId: string): string {
  return `${INDEX_KEY_PREFIX}:${appId}`
}

function getSnapshotByteSize(json: string): number {
  try {
    return new Blob([json]).size
  } catch {
    return json.length
  }
}

function parseJsonObject<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function isStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined') return false
    if (!window.localStorage) return false
    return true
  } catch {
    return false
  }
}

function isUniverWorkbookCacheDisabledByFlag(): boolean {
  try {
    return globalThis.localStorage?.getItem(SPREADSHEET_DISABLE_UNIVER_WORKBOOK_CACHE_KEY) === '1'
  } catch {
    return false
  }
}

function isQuotaExceeded(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const maybeDom = error as { name?: string; code?: number }
  return maybeDom.name === 'QuotaExceededError' || maybeDom.code === 22
}

function loadAppIndex(appId: string): SnapshotAppIndex {
  const index = parseJsonObject<SnapshotAppIndex>(window.localStorage.getItem(getIndexKey(appId)))
  if (!index || !Array.isArray(index.entries)) {
    return { latestVersion: 0, entries: [] }
  }
  return index
}

function saveAppIndex(appId: string, index: SnapshotAppIndex): void {
  window.localStorage.setItem(getIndexKey(appId), JSON.stringify(index))
}

/**
 * Aggressively evict the oldest snapshot entries across ALL apps until the
 * supplied predicate is satisfied or no more entries remain. Used as a last
 * resort when `localStorage` quota is exhausted: shedding stale entries from
 * other apps lets the current write succeed instead of silently failing on
 * every save.
 */
function evictOldestEntriesUntil(shouldStop: () => boolean): number {
  if (!isStorageAvailable()) return 0
  let evicted = 0
  type EvictionCandidate = { indexKey: string; entry: SnapshotIndexEntry }
  const allEntries: EvictionCandidate[] = []

  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i)
    if (!key || !key.startsWith(INDEX_KEY_PREFIX)) continue
    const index = parseJsonObject<SnapshotAppIndex>(window.localStorage.getItem(key))
    if (!index || !Array.isArray(index.entries)) continue
    for (const entry of index.entries) {
      allEntries.push({ indexKey: key, entry })
    }
  }

  allEntries.sort((a, b) => a.entry.savedAt - b.entry.savedAt)

  for (const candidate of allEntries) {
    if (shouldStop()) break
    try {
      window.localStorage.removeItem(candidate.entry.key)
      evicted += 1
      const index = parseJsonObject<SnapshotAppIndex>(window.localStorage.getItem(candidate.indexKey))
      if (!index || !Array.isArray(index.entries)) continue
      const nextEntries = index.entries.filter(e => e.key !== candidate.entry.key)
      if (nextEntries.length === 0) {
        window.localStorage.removeItem(candidate.indexKey)
      } else {
        window.localStorage.setItem(
          candidate.indexKey,
          JSON.stringify({
            latestVersion: nextEntries[0]?.version ?? index.latestVersion,
            entries: nextEntries
          })
        )
      }
    } catch {
      // Continue evicting the next candidate.
    }
  }

  return evicted
}

function cleanupExpiredEntries(nowMs: number): number {
  if (!isStorageAvailable()) return 0
  let evicted = 0
  for (let i = window.localStorage.length - 1; i >= 0; i--) {
    const key = window.localStorage.key(i)
    if (!key || !key.startsWith(INDEX_KEY_PREFIX)) continue
    const index = parseJsonObject<SnapshotAppIndex>(window.localStorage.getItem(key))
    if (!index || !Array.isArray(index.entries)) continue
    const validEntries = index.entries.filter(entry => entry.expiresAt > nowMs)
    const removed = index.entries.filter(entry => entry.expiresAt <= nowMs)
    for (const entry of removed) {
      window.localStorage.removeItem(entry.key)
      evicted += 1
    }
    if (validEntries.length === 0) {
      window.localStorage.removeItem(key)
      continue
    }
    const nextIndex: SnapshotAppIndex = {
      latestVersion: validEntries[0].version,
      entries: validEntries
    }
    window.localStorage.setItem(key, JSON.stringify(nextIndex))
  }
  return evicted
}

/**
 * Remove all cached workbook snapshots for an app (e.g. after a version restore
 * so that the stale pre-restore snapshot is never served on the next load).
 */
export function clearUniverSnapshotCache(appId: string): void {
  if (!isStorageAvailable()) return
  try {
    const index = loadAppIndex(appId)
    for (const entry of index.entries) {
      window.localStorage.removeItem(entry.key)
    }
    window.localStorage.removeItem(getIndexKey(appId))
  } catch {
    // Ignore — clearing is best-effort
  }
}

export function readLatestUniverSnapshot(appId: string, minVersion = 0): SnapshotCacheReadResult | null {
  if (!isStorageAvailable() || isUniverWorkbookCacheDisabledByFlag()) return null
  const nowMs = Date.now()
  const index = loadAppIndex(appId)
  const candidate = index.entries.find(entry => entry.expiresAt > nowMs && entry.version >= minVersion)
  if (!candidate) return null
  const parsed = parseJsonObject<Record<string, unknown>>(window.localStorage.getItem(candidate.key))
  if (!parsed || typeof parsed !== 'object') return null
  return {
    snapshot: parsed,
    version: candidate.version,
    savedAt: candidate.savedAt,
    source: 'localStorage'
  }
}

function readSnapshotEntry(
  entry: SnapshotIndexEntry
): Pick<SnapshotCacheReadResult, 'snapshot' | 'version' | 'savedAt'> | null {
  const parsed = parseJsonObject<Record<string, unknown>>(window.localStorage.getItem(entry.key))
  if (!parsed || typeof parsed !== 'object') return null
  return { snapshot: parsed, version: entry.version, savedAt: entry.savedAt }
}

/**
 * Picks a cached Univer workbook for bootstrap.
 * Prefer entries with snapshot version &gt;= canonical sheet `minVersion`.
 * When none qualify, fall back to the newest lagging entry (formatting / emergency overlay only).
 * Never replaces a qualifying primary entry with an older-version lag entry based on `savedAt` alone.
 */
export function readUniverSnapshotCacheForBootstrap(appId: string, minVersion: number): SnapshotCacheReadResult | null {
  if (!isStorageAvailable() || isUniverWorkbookCacheDisabledByFlag()) return null
  const nowMs = Date.now()
  const index = loadAppIndex(appId)
  const valid = index.entries.filter(e => e.expiresAt > nowMs)
  if (valid.length === 0) return null

  const primaryEntry = valid
    .filter(e => e.version >= minVersion)
    .sort((a, b) => b.version - a.version || b.savedAt - a.savedAt)[0]
  const lagEntry = valid
    .filter(e => e.version <= minVersion)
    .sort((a, b) => b.savedAt - a.savedAt || b.version - a.version)[0]

  const primary = primaryEntry ? readSnapshotEntry(primaryEntry) : null
  const lag = lagEntry ? readSnapshotEntry(lagEntry) : null

  if (primary) {
    return { ...primary, source: 'localStorage' }
  }
  if (lag) {
    return { ...lag, source: 'localStorage' }
  }
  return null
}

/** All non-expired cached workbooks for an app (newest `savedAt` first), for formatting fallback on bootstrap. */
export function listValidUniverSnapshotCacheEntries(
  appId: string
): Array<{ version: number; savedAt: number; snapshot: Record<string, unknown> }> {
  if (!isStorageAvailable() || isUniverWorkbookCacheDisabledByFlag()) return []
  const nowMs = Date.now()
  const index = loadAppIndex(appId)
  return index.entries
    .filter(e => e.expiresAt > nowMs)
    .sort((a, b) => b.savedAt - a.savedAt || b.version - a.version)
    .map(entry => {
      const parsed = parseJsonObject<Record<string, unknown>>(window.localStorage.getItem(entry.key))
      if (!parsed || typeof parsed !== 'object') return null
      return { version: entry.version, savedAt: entry.savedAt, snapshot: parsed }
    })
    .filter((row): row is { version: number; savedAt: number; snapshot: Record<string, unknown> } => row != null)
}

export function writeUniverSnapshotCache(
  appId: string,
  version: number,
  snapshot: Record<string, unknown>,
  options?: {
    ttlMs?: number
    maxEntriesPerApp?: number
    maxSnapshotBytes?: number
  }
): SnapshotCacheWriteResult {
  if (!isStorageAvailable()) {
    return { stored: false, reason: 'storage_unavailable', sizeBytes: 0, evictedKeys: 0 }
  }
  if (isUniverWorkbookCacheDisabledByFlag()) {
    return { stored: false, reason: 'cache_disabled', sizeBytes: 0, evictedKeys: 0 }
  }

  let serialized = ''
  try {
    serialized = JSON.stringify(snapshot)
  } catch {
    return { stored: false, reason: 'invalid_payload', sizeBytes: 0, evictedKeys: 0 }
  }

  const sizeBytes = getSnapshotByteSize(serialized)
  const maxSnapshotBytes = options?.maxSnapshotBytes ?? DEFAULT_MAX_SNAPSHOT_BYTES
  if (sizeBytes > maxSnapshotBytes) {
    return { stored: false, reason: 'payload_too_large', sizeBytes, evictedKeys: 0 }
  }

  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS
  const maxEntriesPerApp = options?.maxEntriesPerApp ?? DEFAULT_MAX_ENTRIES_PER_APP
  const nowMs = Date.now()
  const snapshotKey = getSnapshotKey(appId, version)
  let evictedKeys = 0

  const persist = () => {
    window.localStorage.setItem(snapshotKey, serialized)
    const index = loadAppIndex(appId)
    const nextEntries = [
      {
        version,
        key: snapshotKey,
        savedAt: nowMs,
        expiresAt: nowMs + ttlMs,
        sizeBytes
      },
      ...index.entries.filter(entry => entry.version !== version && entry.expiresAt > nowMs)
    ]
      .sort((a, b) => b.version - a.version)
      .slice(0, Math.max(1, maxEntriesPerApp))
    const removed = index.entries.filter(entry => !nextEntries.some(next => next.key === entry.key))
    for (const entry of removed) {
      window.localStorage.removeItem(entry.key)
      evictedKeys += 1
    }
    saveAppIndex(appId, {
      latestVersion: nextEntries[0]?.version ?? version,
      entries: nextEntries
    })
  }

  const tryPersistOnce = (): SnapshotCacheWriteResult | null => {
    try {
      persist()
      return { stored: true, sizeBytes, evictedKeys }
    } catch (error) {
      if (isQuotaExceeded(error)) return null
      return { stored: false, reason: 'unknown_error', sizeBytes, evictedKeys }
    }
  }

  const firstAttempt = tryPersistOnce()
  if (firstAttempt) return firstAttempt

  evictedKeys += cleanupExpiredEntries(nowMs)
  const secondAttempt = tryPersistOnce()
  if (secondAttempt) return secondAttempt

  // Quota still exhausted: shed oldest entries across all apps until the
  // current snapshot can be persisted. Without this, repeated save attempts
  // would all log `quota_exceeded` and leave the cache permanently unusable.
  let lastErrorIsQuota = true
  let attempts = 0
  while (lastErrorIsQuota && attempts < 8) {
    const evicted = evictOldestEntriesUntil(() => false)
    evictedKeys += evicted
    if (evicted === 0) break
    try {
      persist()
      return { stored: true, sizeBytes, evictedKeys }
    } catch (retryError) {
      lastErrorIsQuota = isQuotaExceeded(retryError)
      attempts += 1
      if (!lastErrorIsQuota) {
        return { stored: false, reason: 'unknown_error', sizeBytes, evictedKeys }
      }
    }
  }

  return { stored: false, reason: 'quota_exceeded', sizeBytes, evictedKeys }
}

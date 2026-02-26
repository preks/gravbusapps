const SNAPSHOT_KEY_PREFIX = 'spreadsheet:univer:snapshot:v1'
const INDEX_KEY_PREFIX = 'spreadsheet:univer:index:v1'
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 * 7
const DEFAULT_MAX_ENTRIES_PER_SHEET = 2
const DEFAULT_MAX_SNAPSHOT_BYTES = 4_500_000

interface SnapshotIndexEntry {
  version: number
  key: string
  savedAt: number
  expiresAt: number
  sizeBytes: number
}

interface SnapshotSheetIndex {
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
  sizeBytes: number
  evictedKeys: number
}

function getSnapshotKey(appId: string, sheetId: string, version: number): string {
  return `${SNAPSHOT_KEY_PREFIX}:${appId}:${sheetId}:v${version}`
}

function getIndexKey(appId: string, sheetId: string): string {
  return `${INDEX_KEY_PREFIX}:${appId}:${sheetId}`
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

function isQuotaExceeded(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const maybeDom = error as { name?: string; code?: number }
  return maybeDom.name === 'QuotaExceededError' || maybeDom.code === 22
}

function loadSheetIndex(appId: string, sheetId: string): SnapshotSheetIndex {
  const index = parseJsonObject<SnapshotSheetIndex>(window.localStorage.getItem(getIndexKey(appId, sheetId)))
  if (!index || !Array.isArray(index.entries)) {
    return { latestVersion: 0, entries: [] }
  }
  return index
}

function saveSheetIndex(appId: string, sheetId: string, index: SnapshotSheetIndex): void {
  window.localStorage.setItem(getIndexKey(appId, sheetId), JSON.stringify(index))
}

function cleanupExpiredEntries(nowMs: number): number {
  if (!isStorageAvailable()) return 0
  let evicted = 0
  for (let i = window.localStorage.length - 1; i >= 0; i--) {
    const key = window.localStorage.key(i)
    if (!key || !key.startsWith(INDEX_KEY_PREFIX)) continue
    const index = parseJsonObject<SnapshotSheetIndex>(window.localStorage.getItem(key))
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
    const nextIndex: SnapshotSheetIndex = {
      latestVersion: validEntries[0].version,
      entries: validEntries
    }
    window.localStorage.setItem(key, JSON.stringify(nextIndex))
  }
  return evicted
}

export function readLatestUniverSnapshot(
  appId: string,
  sheetId: string,
  minVersion = 0
): SnapshotCacheReadResult | null {
  if (!isStorageAvailable()) return null
  const nowMs = Date.now()
  const index = loadSheetIndex(appId, sheetId)
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

export function writeUniverSnapshotCache(
  appId: string,
  sheetId: string,
  version: number,
  snapshot: Record<string, unknown>,
  options?: {
    ttlMs?: number
    maxEntriesPerSheet?: number
    maxSnapshotBytes?: number
  }
): SnapshotCacheWriteResult {
  if (!isStorageAvailable()) {
    return { stored: false, reason: 'storage_unavailable', sizeBytes: 0, evictedKeys: 0 }
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
  const maxEntriesPerSheet = options?.maxEntriesPerSheet ?? DEFAULT_MAX_ENTRIES_PER_SHEET
  const nowMs = Date.now()
  const snapshotKey = getSnapshotKey(appId, sheetId, version)
  let evictedKeys = 0

  const persist = () => {
    window.localStorage.setItem(snapshotKey, serialized)
    const index = loadSheetIndex(appId, sheetId)
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
      .slice(0, Math.max(1, maxEntriesPerSheet))
    const removed = index.entries.filter(entry => !nextEntries.some(next => next.key === entry.key))
    for (const entry of removed) {
      window.localStorage.removeItem(entry.key)
      evictedKeys += 1
    }
    saveSheetIndex(appId, sheetId, {
      latestVersion: nextEntries[0]?.version ?? version,
      entries: nextEntries
    })
  }

  try {
    persist()
    return { stored: true, sizeBytes, evictedKeys }
  } catch (error) {
    if (isQuotaExceeded(error)) {
      evictedKeys += cleanupExpiredEntries(nowMs)
      try {
        persist()
        return { stored: true, sizeBytes, evictedKeys }
      } catch (retryError) {
        if (isQuotaExceeded(retryError)) {
          return { stored: false, reason: 'quota_exceeded', sizeBytes, evictedKeys }
        }
        return { stored: false, reason: 'unknown_error', sizeBytes, evictedKeys }
      }
    }
    return { stored: false, reason: 'unknown_error', sizeBytes, evictedKeys }
  }
}

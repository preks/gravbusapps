/**
 * Shared Employee Cache Store
 *
 * Single LRU cache with TTL used by all employee-related hooks:
 * - useEmployeeAvatar (single-employee fetch)
 * - useEmployeeAvatarsBatch (batch fetch)
 * - useEmployeeData (task detail header)
 *
 * This prevents duplicate API calls when different hooks fetch the same employee,
 * and ensures bounded memory growth with automatic eviction.
 */

export interface CachedEmployeeData {
  id: string
  userId?: string
  firstName?: string
  lastName?: string
  displayName: string
  pictureThumbnail?: string
  avatarUrl?: string
  position?: string
}

// Single shared cache for all employee hooks
const cache = new Map<string, CachedEmployeeData>()
const timestamps = new Map<string, number>()

const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes
const MAX_CACHE_SIZE = 200

/**
 * Check if a cache entry is still valid (not expired)
 */
export const isCacheValid = (key: string): boolean => {
  const ts = timestamps.get(key)
  if (!ts) return false
  return Date.now() - ts < CACHE_TTL_MS
}

/**
 * Get a cached employee entry (returns undefined if missing or expired)
 */
export const getCached = (key: string): CachedEmployeeData | undefined => {
  if (!isCacheValid(key)) {
    // Clean up expired entry
    if (timestamps.has(key)) {
      cache.delete(key)
      timestamps.delete(key)
    }
    return undefined
  }
  return cache.get(key)
}

/**
 * Evict expired and excess entries (LRU by timestamp)
 */
const evict = () => {
  const now = Date.now()

  // Remove expired entries
  for (const [key, ts] of timestamps.entries()) {
    if (now - ts >= CACHE_TTL_MS) {
      cache.delete(key)
      timestamps.delete(key)
    }
  }

  // If still over limit, remove oldest entries
  if (cache.size > MAX_CACHE_SIZE) {
    const sorted = [...timestamps.entries()].sort((a, b) => a[1] - b[1])
    const toRemove = sorted.slice(0, cache.size - MAX_CACHE_SIZE)
    for (const [key] of toRemove) {
      cache.delete(key)
      timestamps.delete(key)
    }
  }
}

/**
 * Add an entry to the cache with automatic eviction
 */
export const addToCache = (key: string, data: CachedEmployeeData) => {
  cache.set(key, data)
  timestamps.set(key, Date.now())
  if (cache.size > MAX_CACHE_SIZE) {
    evict()
  }
}

/**
 * Remove a specific entry from the cache
 */
export const removeFromCache = (key: string) => {
  cache.delete(key)
  timestamps.delete(key)
}

/**
 * Clear all cached employee data.
 * Call this on logout / user-switch to prevent cross-session data leakage.
 */
export const clearAllEmployeeCaches = () => {
  cache.clear()
  timestamps.clear()
}

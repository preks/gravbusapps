/**
 * Cache utilities for V2 implementation
 *
 * Provides TTL-based caching with LRU eviction for messages, conversations, and user metadata.
 * All caches use Map for O(1) lookups and are stored in refs to avoid re-renders.
 */

export interface CacheEntry<T> {
  data: T
  timestamp: number
  accessCount: number
  lastAccessed: number
}

export interface CacheConfig {
  ttl: number // Time to live in milliseconds
  maxSize: number // Maximum number of entries
}

export class LRUCache<K, V> {
  private cache: Map<K, CacheEntry<V>>
  private config: CacheConfig

  constructor(config: CacheConfig) {
    this.cache = new Map()
    this.config = config
  }

  /**
   * Get value from cache
   * Returns null if not found or expired
   */
  get(key: K): V | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    // Check if expired
    const now = Date.now()
    if (now - entry.timestamp > this.config.ttl) {
      this.cache.delete(key)
      return null
    }

    // Update access metadata
    entry.lastAccessed = now
    entry.accessCount++

    return entry.data
  }

  /**
   * Set value in cache
   * Evicts least recently used entries if cache is full
   */
  set(key: K, value: V): void {
    const now = Date.now()

    // If cache is full, evict LRU entry
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictLRU()
    }

    this.cache.set(key, {
      data: value,
      timestamp: now,
      lastAccessed: now,
      accessCount: 1
    })
  }

  /**
   * Update value in cache (preserves metadata)
   */
  update(key: K, updater: (value: V) => V): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    const now = Date.now()
    entry.data = updater(entry.data)
    entry.lastAccessed = now
    entry.timestamp = now // Refresh TTL on update

    return true
  }

  /**
   * Delete value from cache
   */
  delete(key: K): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: K): boolean {
    return this.get(key) !== null
  }

  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now()
    const entries = Array.from(this.cache.entries())

    const valid = entries.filter(([, entry]) => now - entry.timestamp < this.config.ttl)
    const expired = entries.filter(([, entry]) => now - entry.timestamp >= this.config.ttl)

    return {
      total: entries.length,
      valid: valid.length,
      expired: expired.length,
      hitRate: this.calculateHitRate(valid),
      avgAccessCount: valid.reduce((sum, [, entry]) => sum + entry.accessCount, 0) / (valid.length || 1)
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: K | null = null
    let lruTime = Infinity

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed
        lruKey = key
      }
    }

    if (lruKey !== null) {
      this.cache.delete(lruKey)
    }
  }

  /**
   * Calculate cache hit rate (for monitoring)
   */
  private calculateHitRate(validEntries: Array<[K, CacheEntry<V>]>): number {
    const totalAccesses = validEntries.reduce((sum, [, entry]) => sum + entry.accessCount, 0)
    return totalAccesses / (validEntries.length || 1)
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.ttl) {
        this.cache.delete(key)
        cleaned++
      }
    }

    return cleaned
  }

  /**
   * Get all keys (for debugging)
   */
  keys(): K[] {
    return Array.from(this.cache.keys())
  }

  /**
   * Get all valid entries (for debugging)
   */
  entries(): Array<[K, V]> {
    const now = Date.now()
    return Array.from(this.cache.entries())
      .filter(([, entry]) => now - entry.timestamp < this.config.ttl)
      .map(([key, entry]) => [key, entry.data])
  }
}

/**
 * Default cache configurations
 */
export const DEFAULT_CACHE_CONFIG = {
  messages: {
    ttl: 2 * 60 * 1000, // 2 minutes
    maxSize: 50 // 50 conversations
  },
  conversations: {
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 100 // 100 conversations
  },
  users: {
    ttl: 10 * 60 * 1000, // 10 minutes
    maxSize: 500 // 500 users
  }
}

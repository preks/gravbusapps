// Enhanced cache entry with TTL support and generics for type safety
export interface CacheEntry<T = any> {
  value: T
  expiresAt: number
  timestamp: number
}

// Cache interface for storing entries with TTL
interface MetricsCache<T = any> {
  [key: string]: CacheEntry<T>
}

// Cache configuration with TTL defaults
export interface CacheConfig {
  ttlMs: number
  cleanupIntervalMs: number
  maxEntries: number
}

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ttlMs: 5 * 60 * 1000, // 5 minutes TTL
  cleanupIntervalMs: 2 * 60 * 1000, // 2 minutes cleanup interval
  maxEntries: 100 // Maximum cache entries before forced cleanup
}

// TTL Cache implementation with lifecycle management and type safety
export class TTLCache<T = any> {
  private cache: MetricsCache<T> = {}
  private config: CacheConfig
  private cleanupIntervalId: ReturnType<typeof setTimeout> | null = null
  private activeHookCount = 0

  constructor(config: CacheConfig = DEFAULT_CACHE_CONFIG) {
    this.config = config
  }

  // Register a hook using this cache
  registerHook(): () => void {
    this.activeHookCount++

    // Start cleanup interval if this is the first hook
    if (this.activeHookCount === 1 && !this.cleanupIntervalId) {
      this.startCleanup()
    }

    // Return unregister function
    return () => {
      this.activeHookCount--

      // Stop cleanup if no more hooks are active
      if (this.activeHookCount <= 0) {
        this.stopCleanup()
        this.activeHookCount = 0
      }
    }
  }

  // Get cached value if not expired
  get(key: string): T | null {
    this.cleanupExpiredEntries()

    const entry = this.cache[key]
    if (!entry) return null

    if (Date.now() > entry.expiresAt) {
      delete this.cache[key]
      return null
    }

    return entry.value
  }

  // Set cached value with TTL
  set(key: string, value: T, customTtlMs?: number): void {
    const ttl = customTtlMs || this.config.ttlMs
    const now = Date.now()

    this.cache[key] = {
      value,
      expiresAt: now + ttl,
      timestamp: now
    }

    // Enforce max entries limit
    this.enforceMaxEntries()
  }

  // Remove expired entries
  private cleanupExpiredEntries(): void {
    const now = Date.now()
    const expiredKeys = Object.keys(this.cache).filter(key => this.cache[key].expiresAt <= now)

    expiredKeys.forEach(key => delete this.cache[key])
  }

  // Evict oldest entries when cache exceeds maxEntries
  private evictOldestEntries(): void {
    const entries = Object.entries(this.cache)
    const currentSize = entries.length
    const maxSize = this.config.maxEntries

    if (currentSize <= maxSize) return

    // Calculate target size (keep 80% of maxEntries after cleanup to reduce frequent evictions)
    const targetSize = Math.floor(maxSize * 0.8)

    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)

    // Remove oldest entries until we reach target size
    const toRemove = entries.slice(0, currentSize - targetSize)
    toRemove.forEach(([key]) => delete this.cache[key])
  }

  // Start periodic cleanup
  private startCleanup(): void {
    if (this.cleanupIntervalId) return

    this.cleanupIntervalId = setInterval(() => {
      this.cleanupExpiredEntries()
    }, this.config.cleanupIntervalMs)
  }

  // Stop periodic cleanup
  private stopCleanup(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId)
      this.cleanupIntervalId = null
    }
  }

  // Clear all cache entries
  clear(): void {
    this.cache = {}
  }

  // Get cache statistics
  getStats() {
    const now = Date.now()
    const entries = Object.entries(this.cache)

    return {
      size: entries.length,
      activeHooks: this.activeHookCount,
      isCleanupRunning: this.cleanupIntervalId !== null,
      entries: entries.map(([key, entry]) => ({
        key,
        timestamp: entry.timestamp,
        expiresAt: entry.expiresAt,
        isExpired: now >= entry.expiresAt,
        ttlRemaining: Math.max(0, entry.expiresAt - now)
      }))
    }
  }

  // Update cache configuration with validation and immediate application
  updateConfig(newConfig: Partial<CacheConfig>): void {
    // Validate and normalize the new configuration
    const normalizedConfig = this.validateAndNormalizeConfig(newConfig)

    // Store the old cleanup interval for comparison
    const oldCleanupInterval = this.config.cleanupIntervalMs

    // Merge the validated configuration
    this.config = { ...this.config, ...normalizedConfig }

    // Handle cleanup interval changes
    if (normalizedConfig.cleanupIntervalMs !== undefined) {
      const newInterval = normalizedConfig.cleanupIntervalMs

      // If interval changed or is disabled (0), restart cleanup management
      if (newInterval !== oldCleanupInterval) {
        // Stop existing cleanup
        if (this.cleanupIntervalId) {
          this.stopCleanup()
        }

        // Start new cleanup if interval > 0 and we have active hooks
        if (newInterval > 0 && this.activeHookCount > 0) {
          this.startCleanup()
        }
      }
    }

    // Apply new maxEntries immediately by evicting excess entries
    if (normalizedConfig.maxEntries !== undefined) {
      this.enforceMaxEntries()
    }
  }

  // Validate and normalize configuration values
  private validateAndNormalizeConfig(config: Partial<CacheConfig>): Partial<CacheConfig> {
    const normalized: Partial<CacheConfig> = {}

    // Validate and normalize ttlMs
    if (config.ttlMs !== undefined) {
      if (typeof config.ttlMs !== 'number' || isNaN(config.ttlMs)) {
        throw new Error('ttlMs must be a valid number')
      }
      // Clamp to reasonable bounds (min 1 second, max 24 hours)
      normalized.ttlMs = Math.max(1000, Math.min(config.ttlMs, 24 * 60 * 60 * 1000))
    }

    // Validate and normalize cleanupIntervalMs
    if (config.cleanupIntervalMs !== undefined) {
      if (typeof config.cleanupIntervalMs !== 'number' || isNaN(config.cleanupIntervalMs)) {
        throw new Error('cleanupIntervalMs must be a valid number')
      }
      // Coerce negative values to 0 (disabled), clamp positive values to reasonable bounds
      if (config.cleanupIntervalMs < 0) {
        normalized.cleanupIntervalMs = 0 // Disabled
      } else if (config.cleanupIntervalMs === 0) {
        normalized.cleanupIntervalMs = 0 // Explicitly disabled
      } else {
        // Clamp to reasonable bounds (min 10 seconds, max 1 hour)
        normalized.cleanupIntervalMs = Math.max(10000, Math.min(config.cleanupIntervalMs, 60 * 60 * 1000))
      }
    }

    // Validate and normalize maxEntries
    if (config.maxEntries !== undefined) {
      if (typeof config.maxEntries !== 'number' || isNaN(config.maxEntries)) {
        throw new Error('maxEntries must be a valid number')
      }
      // Clamp to reasonable bounds (min 10, max 10000)
      normalized.maxEntries = Math.max(10, Math.min(Math.floor(config.maxEntries), 10000))
    }

    return normalized
  }

  // Enforce maxEntries limit by evicting oldest entries
  private enforceMaxEntries(): void {
    const currentSize = Object.keys(this.cache).length
    if (currentSize > this.config.maxEntries) {
      this.evictOldestEntries()
    }
  }

  // Force cleanup - useful for testing
  forceCleanup(): void {
    this.cleanupExpiredEntries()
  }

  // Shutdown - clean up resources
  shutdown(): void {
    this.stopCleanup()
    this.clear()
    this.activeHookCount = 0
  }
}

// Create a global singleton instance for metrics caching
export const createTTLCache = <T = any>(config?: CacheConfig): TTLCache<T> => {
  return new TTLCache<T>(config)
}

// Export for testing and debugging
export const createCacheUtils = <T = any>(cache: TTLCache<T>) => ({
  getStats: () => cache.getStats(),
  clear: () => cache.clear(),
  forceCleanup: () => cache.forceCleanup(),
  updateConfig: (config: Partial<CacheConfig>) => cache.updateConfig(config),
  shutdown: () => cache.shutdown()
})
